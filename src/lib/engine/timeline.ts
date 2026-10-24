// Home as one timeline: every dated thing near the person that relates to them,
// soonest first, each with what it is and how it reaches them. Pure TypeScript.
import { FACT_DEFS, TOPIC_DEFS } from "@/lib/vocab";
import type { CivicCard } from "./civic";
import { daysBetween, type FeedItem } from "./feed";
import { measureNoun } from "./decide-by";

export type TimelineGroup = "today" | "week" | "later" | "undated";

export const GROUP_LABEL: Record<TimelineGroup, string> = {
  today: "Today",
  week: "This week",
  later: "Later",
  undated: "In the Legislature, no date yet",
};

export type TimelineEntry =
  | { kind: "civic"; key: string; date?: string; group: TimelineGroup; card: CivicCard; forYou: string; touches: boolean; ballot?: FeedItem }
  | { kind: "doc"; key: string; date?: string; group: TimelineGroup; item: FeedItem; forYou: string; touches: boolean };

function groupFor(today: string, date?: string): TimelineGroup {
  if (!date) return "undated";
  const n = daysBetween(today, date);
  return n <= 0 ? "today" : n <= 7 ? "week" : "later";
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
 * their list, or apply to everyone), soonest first. A ballot is folded into the
 * election on its date instead of appearing twice.
 */
export function buildTimeline(docs: FeedItem[], civic: CivicCard[], today: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const elections = new Map<string, Extract<TimelineEntry, { kind: "civic" }>>();

  for (const c of civic) {
    if (c.timing === "past") continue;
    if (c.relevance === "probably_not" && !c.onYourList) continue;
    const date = c.item.at ? (c.timing === "open" ? today : c.item.at.slice(0, 10)) : undefined;
    const e = { kind: "civic" as const, key: `c:${c.item.id}`, date, group: groupFor(today, date), card: c, forYou: civicForYou(c), touches: c.relevance === "touches" };
    if (c.item.kind === "election" && date) elections.set(date, e);
    entries.push(e);
  }

  for (const item of docs) {
    if (item.status !== "upcoming") continue;
    const date = item.doc.decideBy?.date;
    const touches = item.touches > 0;
    const election = date && item.doc.docType === "ballot" ? elections.get(date) : undefined;
    if (election) {
      election.ballot = item;
      election.forYou = docForYou(item);
      election.touches = election.touches || touches;
      continue;
    }
    entries.push({ kind: "doc", key: `d:${item.doc.id}`, date, group: groupFor(today, date), item, forYou: docForYou(item), touches });
  }

  const order: TimelineGroup[] = ["today", "week", "later", "undated"];
  return entries.sort(
    (a, b) =>
      order.indexOf(a.group) - order.indexOf(b.group) ||
      (a.date ?? "").localeCompare(b.date ?? "") ||
      Number(b.touches) - Number(a.touches) ||
      a.key.localeCompare(b.key),
  );
}
