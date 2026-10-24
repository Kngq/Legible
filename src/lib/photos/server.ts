// Server-only: Pixabay search and the store behind feed photos. Imported only by
// the src/app/api/photos routes. Reads keys from the server environment; none of
// them carry a NEXT_PUBLIC_ prefix.
//
// Two stores share one interface: Supabase (a table and a public bucket), and a
// local one (PHOTO_STORE=local) that keeps files and rows in .photos/ on this
// machine, for development before Supabase is set up.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isFresh, type FeedPhoto, type PixabayHit } from "./pick";

export interface PhotoRow {
  item_key: string;
  url: string;
  alt: string;
  contributor: string;
  source_url: string;
  pixabay_id: number;
  fetched_at: string;
}

interface CachedSearch {
  hits: PixabayHit[];
  fetchedAt: string;
}

interface Store {
  listRows(): Promise<PhotoRow[]>;
  saveRow(row: PhotoRow): Promise<void>;
  /** Saves the bytes and returns the URL a browser loads them from. */
  saveImage(name: string, body: ArrayBuffer, contentType: string): Promise<string>;
  getSearch(query: string): Promise<CachedSearch | null>;
  putSearch(query: string, s: CachedSearch): Promise<void>;
}

export interface Config {
  pixabayKey: string;
  store: Store;
}

/** Null when a variable is missing, so the route can answer "not configured". */
export function photoConfig(): Config | null {
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (!pixabayKey) return null;
  if (process.env.PHOTO_STORE === "local") return { pixabayKey, store: localStore };
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_PHOTO_BUCKET;
  if (!supabaseUrl || !serviceKey || !bucket) return null;
  return { pixabayKey, store: supabaseStore(supabaseUrl, serviceKey, bucket) };
}

export class RateLimited extends Error {
  constructor(public retryAfter: number) {
    super("Pixabay rate limit reached");
  }
}

export const rowsToPhotos = (rows: PhotoRow[]): FeedPhoto[] =>
  rows.map((r) => ({ key: r.item_key, url: r.url, alt: r.alt, contributor: r.contributor, sourceUrl: r.source_url, fetchedAt: r.fetched_at }));

// ---- Supabase (PostgREST and Storage over fetch; no client library) ----

function supabaseStore(url: string, serviceKey: string, bucket: string): Store {
  const auth = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const rest = async <T>(p: string, init: RequestInit = {}): Promise<T> => {
    const res = await fetch(`${url}/rest/v1/${p}`, {
      ...init,
      headers: { ...auth, "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase ${p.split("?")[0]} ${res.status}`);
    return (res.status === 204 || res.status === 201 ? null : await res.json()) as T;
  };
  const upsert = (table: string, conflict: string, row: object) =>
    rest(`${table}?on_conflict=${conflict}`, { method: "POST", body: JSON.stringify(row), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });

  return {
    listRows: () => rest<PhotoRow[]>("item_photos?select=*"),
    saveRow: async (row) => void (await upsert("item_photos", "item_key", row)),
    async saveImage(name, body, contentType) {
      const res = await fetch(`${url}/storage/v1/object/${bucket}/${name}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "31536000" },
        body,
      });
      if (!res.ok) throw new Error(`Storage upload ${res.status}`);
      return `${url}/storage/v1/object/public/${bucket}/${name}`;
    },
    async getSearch(query) {
      const [row] = await rest<{ hits: PixabayHit[]; fetched_at: string }[]>(`photo_search_cache?select=hits,fetched_at&query=eq.${encodeURIComponent(query)}`);
      return row ? { hits: row.hits, fetchedAt: row.fetched_at } : null;
    },
    putSearch: async (query, s) => void (await upsert("photo_search_cache", "query", { query, hits: s.hits, fetched_at: s.fetchedAt })),
  };
}

// ---- Local (.photos/ in the project, git-ignored) ----

export const LOCAL_DIR = path.join(process.cwd(), ".photos");
const LOCAL_INDEX = path.join(LOCAL_DIR, "index.json");

interface LocalIndex {
  rows: PhotoRow[];
  searches: Record<string, CachedSearch>;
}

async function readIndex(): Promise<LocalIndex> {
  try {
    return JSON.parse(await readFile(LOCAL_INDEX, "utf8")) as LocalIndex;
  } catch {
    return { rows: [], searches: {} };
  }
}

async function writeIndex(i: LocalIndex) {
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(LOCAL_INDEX, JSON.stringify(i, null, 2));
}

const localStore: Store = {
  listRows: async () => (await readIndex()).rows,
  async saveRow(row) {
    const i = await readIndex();
    i.rows = [...i.rows.filter((r) => r.item_key !== row.item_key), row];
    await writeIndex(i);
  },
  async saveImage(name, body) {
    const file = path.join(LOCAL_DIR, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(body));
    return `/api/photos/file/${path.basename(name)}`;
  },
  getSearch: async (query) => (await readIndex()).searches[query] ?? null,
  async putSearch(query, s) {
    const i = await readIndex();
    i.searches[query] = s;
    await writeIndex(i);
  },
};

// ---- Pixabay search, cached 24 hours in memory and in the store ----

// Warm instances skip the store read; cold ones fall back to it.
const memory = new Map<string, CachedSearch>();

const trim = (h: PixabayHit): PixabayHit => ({
  id: h.id,
  pageURL: h.pageURL,
  tags: h.tags,
  largeImageURL: h.largeImageURL,
  imageWidth: h.imageWidth,
  imageHeight: h.imageHeight,
  user: h.user,
});

export async function searchPixabay(c: Config, query: string, now = Date.now()): Promise<PixabayHit[]> {
  const mem = memory.get(query);
  if (mem && isFresh(mem.fetchedAt, now)) return mem.hits;

  const stored = await c.store.getSearch(query);
  if (stored && isFresh(stored.fetchedAt, now)) {
    memory.set(query, stored);
    return stored.hits;
  }

  const params = new URLSearchParams({
    key: c.pixabayKey,
    q: query,
    image_type: "photo",
    orientation: "horizontal",
    safesearch: "true",
    min_width: "1280",
    per_page: "30",
  });
  const res = await fetch(`https://pixabay.com/api/?${params}`, { cache: "no-store" });
  if (res.status === 429) {
    const reset = Number(res.headers.get("X-RateLimit-Reset"));
    throw new RateLimited(Number.isFinite(reset) && reset > 0 ? Math.ceil(reset) : 60);
  }
  // Pixabay answers bad keys with plain text; never echo it, it can contain the key.
  if (!res.ok) throw new Error(`Pixabay search ${res.status}`);
  const data = (await res.json()) as { hits?: PixabayHit[] };
  const result = { hits: (data.hits ?? []).map(trim), fetchedAt: new Date(now).toISOString() };

  memory.set(query, result);
  await c.store.putSearch(query, result);
  return result.hits;
}

const MAX_BYTES = 8 * 1024 * 1024;

/** Downloads a Pixabay image on the server. Only Pixabay hosts are fetched. */
export async function downloadImage(url: string): Promise<{ body: ArrayBuffer; contentType: string }> {
  const host = new URL(url).hostname;
  if (host !== "pixabay.com" && !host.endsWith(".pixabay.com")) throw new Error("Unexpected image host");
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 429) throw new RateLimited(60);
  if (!res.ok) throw new Error(`Image download ${res.status}`);
  const contentType = res.headers.get("content-type")?.split(";")[0] ?? "";
  if (!contentType.startsWith("image/")) throw new Error("Not an image");
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_BYTES) throw new Error("Image too large");
  return { body, contentType };
}
