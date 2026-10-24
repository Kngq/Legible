// Links between the two kinds of feed content: measures inside documents, and
// civic items (deadlines, meetings, bills). Related means a shared life fact
// (strongest) or a shared subject. Pure TypeScript.
import type { FactId } from "@/lib/vocab";
import type { CivicCard, CivicItem } from "./civic";
import type { FeedItem } from "./feed";
import { daysBetween } from "./feed";
import type { Card, Measure } from "./types";

function measureFacts(m: Measure): Set<FactId> {
  return new Set<FactId>([...m.askFacts, ...m.rules.map((r) => r.fact)]);
}

function score(m: Measure, item: CivicItem): number {
  const facts = measureFacts(m);
  const sharedFact = item.touches.some((t) => facts.has(t.fact));
  const sharedTopic = item.topics.some((t) => m.topics.includes(t));
  return (sharedFact ? 2 : 0) + (sharedTopic ? 1 : 0);
}

/** Civic items related to a measure, strongest first, then in feed order. */
export function relatedCivic(m: Measure, cards: CivicCard[], max = 3): CivicCard[] {
  return cards
    .map((c, i) => ({ c, i, s: score(m, c.item) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, max)
    .map((x) => x.c);
}

/** Measures related to a civic item, across the feed's upcoming documents. */
export function relatedMeasures(item: CivicItem, feed: FeedItem[], max = 3): { item: FeedItem; card: Card }[] {
  return feed
    .filter((f) => f.status === "upcoming")
    .flatMap((f) => f.cards.map((card, i) => ({ item: f, card, i, s: score(card.measure, item) })))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, max)
    .map(({ item, card }) => ({ item, card }));
}

/**
 * A civic item takes the Up next card when it touches the person and comes no
 * later than the document Up next (or that document touches nothing).
 */
export function civicUpNext(docUp: FeedItem | null, civic: CivicCard[], today: string): CivicCard | null {
  const c = civic.find((x) => x.relevance === "touches" && (x.timing === "today" || x.timing === "open" || x.timing === "upcoming"));
  if (!c) return null;
  if (!docUp || docUp.touches === 0 || !docUp.doc.decideBy) return c;
  return (c.days ?? 0) <= daysBetween(today, docUp.doc.decideBy.date) ? c : null;
}
