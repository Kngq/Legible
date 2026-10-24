// Civic items: dated deadlines, meetings, and bills that sit in the home feed next
// to documents. Lighter than a document (no measures), but every item names an
// official source and says how it was checked. Pure TypeScript; runs in the browser.
import type { FactId, TopicId } from "@/lib/vocab";
import { factValues, topicIds, type Profile } from "./profile";
import type { Quote, Relevance } from "./types";

export type CivicKind = "deadline" | "window" | "election" | "meeting" | "bill";

/** How an item was checked. Shown on the item, never hidden. */
export type CivicCheck =
  /** Found word for word in an official PDF. */
  | { kind: "quote"; quote: Quote }
  /** A person read the official page on this date. */
  | { kind: "page"; checkedOn: string }
  /** Date follows the body's published standing schedule; no agenda posted yet. */
  | { kind: "schedule"; checkedOn: string; rule: string };

/**
 * The item's original, saved: the official words themselves, where they live,
 * and a fingerprint of the saved file. "none" says plainly that no original
 * exists yet (an agenda not posted), never pretends one does.
 */
export interface CivicOriginal {
  kind: "booklet" | "bill" | "agenda" | "none";
  /** "Information for Voters 2026, page 4", "Bill text, as filed". */
  label: string;
  /** The official words, verbatim, when they are short enough to show in full. */
  text?: string;
  /** A saved copy served by the app (a PDF page or a text file). */
  file?: string;
  /** The official page for the original. */
  url: string;
  /** SHA-256 of the saved copy, and the day it was saved. */
  hash?: string;
  savedOn?: string;
  /** Shown when there is no original yet, or when the text is long. */
  note?: string;
}

export interface CivicAction {
  label: string;
  url?: string;
}

export interface CivicItem {
  id: string;
  kind: CivicKind;
  place: { kind: "state" | "town"; name: string; townId?: string };
  /** Who acts: "Voters", "Cambridge City Council", "Massachusetts Legislature". */
  body: string;
  title: string;
  /** One or two neutral sentences written by the team. */
  summary: string;
  /** Start, deadline, or meeting time, ISO with offset. Bills have none. */
  at?: string;
  /** End of a window, ISO with offset. */
  until?: string;
  location?: string;
  /** Bills: plain status and the latest official history entry. */
  status?: string;
  lastAction?: { date: string; text: string };
  source: { name: string; url: string };
  check: CivicCheck;
  /** The saved original. Every item carries one, even if it says none exists yet. */
  original?: CivicOriginal;
  /** Applies to every resident of its place (an election date), not to a life fact. */
  everyone: boolean;
  topics: TopicId[];
  /** Fires "Touches you" when the profile's answer matches. */
  touches: { fact: FactId; when: boolean }[];
  actions: CivicAction[];
}

export type CivicTiming = "today" | "open" | "upcoming" | "past" | "ongoing";

export interface CivicCard {
  item: CivicItem;
  relevance: Relevance;
  onYourList: boolean;
  because: { fact: FactId; value: boolean }[];
  timing: CivicTiming;
  /** Whole days from today to `at` (upcoming) or to `until` (open window). */
  days?: number;
}

const dayOf = (iso: string) => iso.slice(0, 10);

function daysFrom(today: string, date: string): number {
  const t = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(date) - t(today)) / 86_400_000);
}

export function timing(item: CivicItem, today: string): { timing: CivicTiming; days?: number } {
  if (!item.at) return { timing: "ongoing" };
  const start = dayOf(item.at);
  const end = item.until ? dayOf(item.until) : start;
  if (end < today) return { timing: "past" };
  if (start <= today && item.until) return { timing: "open", days: daysFrom(today, end) };
  if (start === today) return { timing: "today", days: 0 };
  return { timing: "upcoming", days: daysFrom(today, start) };
}

/** State items, plus items for the profile's town. */
export function civicInFeed(item: CivicItem, townId?: string): boolean {
  return item.place.kind === "state" || (townId !== undefined && item.place.townId === townId);
}

export function civicCard(item: CivicItem, profile: Profile, today: string): CivicCard {
  const facts = factValues(profile);
  const because = item.touches.filter((t) => facts[t.fact] === t.when).map((t) => ({ fact: t.fact, value: t.when }));
  const followed = new Set(topicIds(profile));
  const relevance: Relevance = because.length ? "touches" : item.everyone ? "everyone" : "probably_not";
  return { item, relevance, onYourList: item.topics.some((t) => followed.has(t)), because, ...timing(item, today) };
}

const RANK: Record<CivicTiming, number> = { today: 0, open: 1, upcoming: 2, ongoing: 3, past: 4 };
const relevanceRank = (c: CivicCard) => (c.relevance === "touches" ? 0 : c.onYourList ? 1 : c.relevance === "everyone" ? 2 : 3);

/**
 * Civic cards for the feed, past items dropped. Order: what touches the person,
 * then followed subjects, then everyone; within each, today, open windows,
 * upcoming by date, then undated bills.
 */
export function civicFeed(items: CivicItem[], profile: Profile, today: string): CivicCard[] {
  return items
    .filter((i) => civicInFeed(i, profile.townId))
    .map((i) => civicCard(i, profile, today))
    .filter((c) => c.timing !== "past")
    .sort(
      (a, b) =>
        relevanceRank(a) - relevanceRank(b) ||
        RANK[a.timing] - RANK[b.timing] ||
        (a.item.at ?? "").localeCompare(b.item.at ?? "") ||
        a.item.id.localeCompare(b.item.id),
    );
}

/** Plain label for how the item was checked, for the trust line on the card. */
export function checkLabel(c: CivicCheck): string {
  if (c.kind === "quote") return `Found word for word, page ${c.quote.page}`;
  if (c.kind === "page") return `Checked against the official page on ${c.checkedOn}`;
  return `Usual schedule: ${c.rule}. Check the posted agenda.`;
}
