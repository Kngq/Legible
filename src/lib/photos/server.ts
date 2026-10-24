// Server-only: Pixabay search and the Supabase table and bucket behind feed photos.
// Imported only by src/app/api/photos/route.ts. Reads keys from the server
// environment; none of them carry a NEXT_PUBLIC_ prefix.
import { isFresh, type FeedPhoto, type PixabayHit } from "./pick";

interface Config {
  pixabayKey: string;
  supabaseUrl: string;
  serviceKey: string;
  bucket: string;
}

/** Null when any variable is missing, so the route can answer "not configured". */
export function photoConfig(): Config | null {
  const pixabayKey = process.env.PIXABAY_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_PHOTO_BUCKET;
  if (!pixabayKey || !supabaseUrl || !serviceKey || !bucket) return null;
  return { pixabayKey, supabaseUrl, serviceKey, bucket };
}

export class RateLimited extends Error {
  constructor(public retryAfter: number) {
    super("Pixabay rate limit reached");
  }
}

// ---- Supabase (PostgREST and Storage over fetch; no client library) ----

function headers(c: Config, extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}`, ...extra };
}

async function rest<T>(c: Config, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${c.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: headers(c, { "Content-Type": "application/json", ...(init.headers as Record<string, string>) }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${path.split("?")[0]} ${res.status}`);
  return (res.status === 204 ? null : await res.json()) as T;
}

interface PhotoRow {
  item_key: string;
  url: string;
  alt: string;
  contributor: string;
  source_url: string;
  pixabay_id: number;
  fetched_at: string;
}

const toPhoto = (r: PhotoRow): FeedPhoto => ({ key: r.item_key, url: r.url, alt: r.alt, contributor: r.contributor, sourceUrl: r.source_url, fetchedAt: r.fetched_at });

export async function listPhotoRows(c: Config): Promise<PhotoRow[]> {
  return rest<PhotoRow[]>(c, "item_photos?select=*");
}

export const rowsToPhotos = (rows: PhotoRow[]) => rows.map(toPhoto);

export async function savePhoto(c: Config, row: PhotoRow): Promise<void> {
  await rest(c, "item_photos?on_conflict=item_key", { method: "POST", body: JSON.stringify(row), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
}

/** Uploads bytes and returns the bucket's public URL for them. */
export async function uploadImage(c: Config, path: string, body: ArrayBuffer, contentType: string): Promise<string> {
  const res = await fetch(`${c.supabaseUrl}/storage/v1/object/${c.bucket}/${path}`, {
    method: "POST",
    headers: headers(c, { "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "31536000" }),
    body,
  });
  if (!res.ok) throw new Error(`Storage upload ${res.status}`);
  return `${c.supabaseUrl}/storage/v1/object/public/${c.bucket}/${path}`;
}

// ---- Pixabay search, cached 24 hours in memory and in Supabase ----

interface CachedSearch {
  hits: PixabayHit[];
  fetchedAt: string;
}

// Warm instances skip the database read; cold ones fall back to the table.
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

  const [row] = await rest<{ hits: PixabayHit[]; fetched_at: string }[]>(c, `photo_search_cache?select=hits,fetched_at&query=eq.${encodeURIComponent(query)}`);
  if (row && isFresh(row.fetched_at, now)) {
    memory.set(query, { hits: row.hits, fetchedAt: row.fetched_at });
    return row.hits;
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
  const hits = (data.hits ?? []).map(trim);
  const fetchedAt = new Date(now).toISOString();

  memory.set(query, { hits, fetchedAt });
  await rest(c, "photo_search_cache?on_conflict=query", {
    method: "POST",
    body: JSON.stringify({ query, hits, fetched_at: fetchedAt }),
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  });
  return hits;
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
