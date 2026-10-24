// The home feed: which documents a person sees, how much of each touches them,
// and in what order. Pure TypeScript; runs in the browser on documents already
// downloaded whole, so the town and facts never leave the device.
import { FACT_IDS, LIFE_AREAS, type FactId, type LifeAreaId } from "@/lib/vocab";
import { buildCards, touchCount } from "./cards";
import { isFactSettled, type Profile } from "./profile";
import type { Card, DocumentData } from "./types";

export type FeedStatus = "upcoming" | "decided";

export interface FeedItem {
  doc: DocumentData;
  cards: Card[];
  touches: number;
  total: number;
  /** Short title of the first measure that touches the person, for the card preview. */
  topTouching?: string;
  status: FeedStatus;
  scope: "state" | "town";
}

export interface Feed {
  /** Upcoming items in feed order, then decided items, most recent first. */
  items: FeedItem[];
  upNext: FeedItem | null;
  /** Facts some feed document asks that the profile has not settled, in vocab order. */
  openQuestions: FactId[];
  /** Life areas holding an open question. Facts outside the areas are asked on their cards. */
  openAreas: LifeAreaId[];
}

/** Today as YYYY-MM-DD on the device clock. */
export function localISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole days from `today` to `date`, both YYYY-MM-DD. */
export function daysBetween(today: string, date: string): number {
  const t = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(date) - t(today)) / 86_400_000);
}

/** State documents, plus documents for the profile's town. Nothing else is shown. */
export function inFeed(doc: DocumentData, townId?: string): boolean {
  return doc.place.kind === "state" || (townId !== undefined && doc.place.townId === townId);
}

// Dated items sort before undated ones; within each, soonest first.
function byDecideBy(a: FeedItem, b: FeedItem): number {
  const da = a.doc.decideBy?.date;
  const db = b.doc.decideBy?.date;
  if (da && db) return da.localeCompare(db);
  return da ? -1 : db ? 1 : 0;
}

function byNewest(a: FeedItem, b: FeedItem): number {
  return (b.doc.date ?? "").localeCompare(a.doc.date ?? "");
}

export function buildFeed(docs: DocumentData[], profile: Profile, today: string): Feed {
  const items: FeedItem[] = docs
    .filter((d) => inFeed(d, profile.townId))
    .map((doc) => {
      const cards = buildCards(doc, profile);
      const top = cards.find((c) => c.relevance === "touches");
      const decided = doc.decideBy !== undefined && doc.decideBy.date < today;
      return {
        doc,
        cards,
        touches: touchCount(cards),
        total: doc.measures.length,
        topTouching: top?.measure.title,
        status: decided ? "decided" : "upcoming",
        scope: doc.place.kind,
      };
    });

  const upcoming = items
    .filter((i) => i.status === "upcoming")
    .sort((a, b) => Number(b.touches > 0) - Number(a.touches > 0) || byDecideBy(a, b) || byNewest(a, b) || a.doc.id.localeCompare(b.doc.id));
  const decided = items
    .filter((i) => i.status === "decided")
    .sort((a, b) => b.doc.decideBy!.date.localeCompare(a.doc.decideBy!.date) || a.doc.id.localeCompare(b.doc.id));

  const touching = upcoming.filter((i) => i.touches > 0);
  const pool = touching.length ? touching : upcoming;
  const upNext = pool.length ? [...pool].sort((a, b) => byDecideBy(a, b) || byNewest(a, b))[0] : null;

  const asked = new Set(items.flatMap((i) => i.doc.measures.flatMap((m) => m.askFacts)));
  const openQuestions = FACT_IDS.filter((f) => asked.has(f) && !isFactSettled(profile, f));
  const openAreas = LIFE_AREAS.filter((a) => a.facts.some((f) => openQuestions.includes(f))).map((a) => a.id);

  return { items: [...upcoming, ...decided], upNext, openQuestions, openAreas };
}
