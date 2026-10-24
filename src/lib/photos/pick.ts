// Feed photos: which items get one, what to search for, and which result to keep.
// Pure TypeScript, no network, so the route and the tests share it.
//
// Searches name a plain subject per kind of item (a ballot box, the State House,
// a council chamber), never the item's title or its town, so a photo can't take
// a side or pass for a real local scene. Results that show protests, campaigns,
// or party symbols are skipped.
import type { CivicItem, CivicKind } from "@/lib/engine/civic";
import type { DocType, DocumentData } from "@/lib/engine/types";

/** A Pixabay search hit, trimmed to the fields Legible uses. */
export interface PixabayHit {
  id: number;
  pageURL: string;
  tags: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  user: string;
}

/** A photo saved for one feed item. `key` matches the timeline entry key. */
export interface FeedPhoto {
  key: string;
  url: string;
  alt: string;
  contributor: string;
  sourceUrl: string;
  fetchedAt: string;
}

export interface PhotoTarget {
  /** Timeline entry key: `c:<civic id>` or `d:<document id>`. */
  key: string;
  query: string;
  /** A tag the photo must carry exactly, when a search also returns look-alike places. */
  tag?: string;
}

const CIVIC_QUERY: Record<CivicKind, string> = {
  deadline: "ballot box",
  window: "ballot box",
  election: "polling station",
  meeting: "council chamber",
  bill: "Massachusetts State House dome",
};

// Searches for the State House also return City Hall and the Old State House,
// so bills accept only photos tagged exactly "state house".
const CIVIC_TAG: Partial<Record<CivicKind, string>> = { bill: "state house" };

const DOC_QUERY: Record<DocType, string> = {
  ballot: "ballot box",
  warrant: "town hall",
  budget: "town hall",
  hearing: "council chamber",
  agenda: "council chamber",
  other: "town hall",
};

/** Every item a feed can show, for every town. The server never learns which one a person sees. */
export function photoTargets(civic: CivicItem[], docs: DocumentData[]): PhotoTarget[] {
  return [
    ...docs.map((d) => ({ key: `d:${d.id}`, query: DOC_QUERY[d.docType] })),
    ...civic.map((i) => ({ key: `c:${i.id}`, query: CIVIC_QUERY[i.kind], tag: CIVIC_TAG[i.kind] })),
  ];
}

/** Wide enough for a 16:9 card without heavy cropping. */
export const MIN_WIDTH = 1280;
const MIN_RATIO = 1.3;

// Tags that would put a side, a campaign, or a crowd on a neutral card.
const SKIP_TAGS = ["protest", "demonstration", "rally", "campaign", "politician", "president", "democrat", "republican", "trump", "biden", "flag", "riot", "police"];

export function isLandscape(h: Pick<PixabayHit, "imageWidth" | "imageHeight">): boolean {
  return h.imageWidth >= MIN_WIDTH && h.imageWidth >= h.imageHeight * MIN_RATIO;
}

function tagList(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function isNeutral(h: PixabayHit): boolean {
  const tags = tagList(h.tags);
  return !tags.some((t) => SKIP_TAGS.some((s) => t.includes(s)));
}

/**
 * The first landscape, neutral hit in Pixabay's order (carrying `tag` exactly,
 * when given), preferring one no other item uses yet. Falls back to a reused
 * photo before giving up.
 */
export function pickLandscape(hits: PixabayHit[], used: ReadonlySet<number>, tag?: string): PixabayHit | null {
  const ok = hits.filter((h) => h.largeImageURL && isLandscape(h) && isNeutral(h) && (!tag || tagList(h.tags).includes(tag)));
  return ok.find((h) => !used.has(h.id)) ?? ok[0] ?? null;
}

/** Pixabay gives tags, not captions, so alt text says what it is: a stock photo with these tags. */
export function altText(h: Pick<PixabayHit, "tags">): string {
  const tags = tagList(h.tags).slice(0, 4);
  return tags.length ? `Stock photo: ${tags.join(", ")}` : "Stock photo";
}

/** Object name in the bucket: the Pixabay id only, so the path names no item or town. */
export function storagePath(h: Pick<PixabayHit, "id" | "largeImageURL">): string {
  const ext = /\.(png|webp)(\?|$)/i.exec(h.largeImageURL)?.[1]?.toLowerCase() ?? "jpg";
  return `pixabay/${h.id}.${ext}`;
}

/** 24 hours: Pixabay asks that search responses be cached at least this long. */
export const SEARCH_TTL_MS = 24 * 60 * 60 * 1000;

export function isFresh(fetchedAt: string, now: number): boolean {
  const t = Date.parse(fetchedAt);
  return Number.isFinite(t) && now - t < SEARCH_TTL_MS;
}
