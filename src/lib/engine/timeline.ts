// Home as one timeline: every dated thing near the person that relates to them,
// soonest first, each with what it is and how it reaches them. Pure TypeScript.
import { FACT_DEFS, TOPIC_DEFS } from "@/lib/vocab";
import type { CivicCard } from "./civic";
import { daysBetween, type FeedItem } from "./feed";
import { measureNoun } from "./decide-by";

/**
 * Ranking: relevance first, time second, as one score so a near deadline can
 * still lift an item within its tier.
 *
 *   score     = 0.65 * relevance + 0.35 * urgency
 *   relevance = 1 + 0.05 per extra match (touches you, capped at 1.2)
 *             | 0.6  (on your list) | 0.35 (applies to everyone)
 *   urgency   = 1 / (1 + days / 7) to the due day (closing day for an open
 *               window); 0.1 for undated bills
 *
 * With these weights anything that touches the person outranks anything that
 * only applies to everyone, even when the latter is due today.
 */
export const WEIGHTS = { relevance: 0.65, urgency: 0.35 } as const;

export function relevanceScore(level: "touches" | "list" | "everyone" | "other", matches = 1): number {
  if (level === "touches") return Math.min(1.2, 1 + 0.05 * Math.max(0, matches - 1));
  return level === "list" ? 0.6 : level === "everyone" ? 0.35 : 0.15;
}

export function urgencyScore(days?: number): number {
  if (days === undefined) return 0.1;
  return 1 / (1 + Math.max(0, days) / 7);
}

export type TimelineEntry = {
  key: string;
  /** Day shown on the tile, YYYY-MM-DD. Today for an open window. */
  date?: string;
  /** Days until it is due: the deadline, the meeting, or the window's close. */
  days?: number;
  relevance: number;
  urgency: number;
  score: number;
  forYou: string;
  touches: boolean;
} & ({ kind: "civic"; card: CivicCard; ballot?: FeedItem } | { kind: "doc"; item: FeedItem });

function scored<T extends { relevance: number; urgency: number }>(e: T): T & { score: number } {
  return { ...e, score: WEIGHTS.relevance * e.relevance + WEIGHTS.urgency * e.urgency };
}

/** One line on how a civic item reaches the person. */
export function civicForYou(c: CivicCard): string {
  if (c.because.length) {
    const why = c.because.map((b) => (b.value ? FACT_DEFS[b.fact].because.yes : FACT_DEFS[b.fact].because.no));
    return `For you, because ${why.join(" and ")}.`;
  }
  if (c.onYourList) {
    const t = c.item.topics.map((id) => TOPIC_DEFS[id].label.toLowerCase());
    return `On your list: you follow ${t[0]}.`;
  }
  if (c.item.body === "Voters") return "Applies to every voter in Massachusetts.";
  return `Applies to everyone in ${c.item.place.name}.`;
}

/** One line on how a document reaches the person, naming the measures, never a count alone. */
export function docForYou(item: FeedItem): string {
  const touching = item.cards.filter((c) => c.relevance === "touches").map((c) => c.measure.title);
  const noun = measureNoun(item.doc.docType, 2);
  if (touching.length === 1) return `One touches your answers: ${touching[0]}.`;
  if (touching.length > 1) return `${touching.length} touch your answers: ${touching.join("; ")}.`;
  return `None of the ${noun} points to your answers yet. Each applies to everyone ${item.scope === "state" ? "in Massachusetts" : `in ${item.doc.place.name}`}.`;
}

/** What a document is, in one line. */
export function docWhat(item: FeedItem): string {
  const n = item.total;
  if (item.doc.docType === "ballot") return `${n} statewide ${measureNoun("ballot", n)} on your ballot.`;
  return `${n} ${measureNoun(item.doc.docType, n)} for ${item.doc.decideBy?.who ?? "the town"} to decide.`;
}

/**
 * Upcoming documents and civic items that relate to the person (touch them, are on
 * their list, or apply to everyone), most relevant and soonest first. With
 * `includeOthers`, the remaining local meetings and state bills follow at the
 * lowest relevance (0.15), so Home can still show what is happening nearby. A ballot is
 * folded into the election on its date instead of appearing twice.
 */
export function buildTimeline(docs: FeedItem[], civic: CivicCard[], today: string, opts: { includeOthers?: boolean } = {}): TimelineEntry[] {
  type CivicEntry = Extract<TimelineEntry, { kind: "civic" }>;
  const civicEntries: CivicEntry[] = [];
  const elections = new Map<string, number>();

  for (const c of civic) {
    if (c.timing === "past") continue;
    const level = c.relevance === "touches" ? "touches" : c.onYourList ? "list" : c.relevance === "everyone" ? "everyone" : opts.includeOthers ? "other" : null;
    if (!level) continue;
    const date = c.item.at ? (c.timing === "open" ? today : c.item.at.slice(0, 10)) : undefined;
    const days = c.item.at ? daysBetween(today, (c.timing === "open" && c.item.until ? c.item.until : c.item.at).slice(0, 10)) : undefined;
    if (c.item.kind === "election" && date) elections.set(date, civicEntries.length);
    civicEntries.push({
      kind: "civic",
      key: `c:${c.item.id}`,
      date,
      days,
      relevance: relevanceScore(level, c.because.length),
      urgency: urgencyScore(days),
      score: 0,
      card: c,
      forYou: civicForYou(c),
      touches: level === "touches",
    });
  }

  const docEntries: TimelineEntry[] = [];
  for (const item of docs) {
    if (item.status !== "upcoming") continue;
    const date = item.doc.decideBy?.date;
    const days = date ? daysBetween(today, date) : undefined;
    const listed = item.cards.some((c) => c.onYourList);
    const level = item.touches > 0 ? "touches" : listed ? "list" : "everyone";
    const relevance = relevanceScore(level, item.touches);
    const at = date && item.doc.docType === "ballot" ? elections.get(date) : undefined;
    if (at !== undefined) {
      const e = civicEntries[at];
      civicEntries[at] = { ...e, ballot: item, forYou: docForYou(item), touches: e.touches || level === "touches", relevance: Math.max(e.relevance, relevance) };
      continue;
    }
    docEntries.push({ kind: "doc", key: `d:${item.doc.id}`, date, days, relevance, urgency: urgencyScore(days), score: 0, item, forYou: docForYou(item), touches: level === "touches" });
  }

  return [...civicEntries, ...docEntries]
    .map(scored)
    .sort((a, b) => b.score - a.score || (a.days ?? Infinity) - (b.days ?? Infinity) || a.key.localeCompare(b.key));
}

/** How many "applies to everyone" entries For you adds after the personal ones. */
export const EVERYONE_SHOWN = 3;

/**
 * Home's For you, in two groups: entries that touch the person or are on their
 * list, then the most pressing entries that apply to everyone, so the section
 * is never empty for someone who skipped the questions. Order is kept from
 * `timeline`, which buildTimeline already ranks.
 */
export function forYouGroups(timeline: TimelineEntry[]): { personal: TimelineEntry[]; everyone: TimelineEntry[] } {
  const isPersonal = (e: TimelineEntry) => e.touches || e.relevance >= relevanceScore("list");
  return {
    personal: timeline.filter(isPersonal),
    everyone: timeline.filter((e) => !isPersonal(e)).slice(0, EVERYONE_SHOWN),
  };
}
