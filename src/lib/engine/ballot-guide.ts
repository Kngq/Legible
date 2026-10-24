// The ballot page as a guide: every question ranked for this person, with a plain
// line, the official YES and NO statements, the official fiscal line, and how it
// reaches them. Built only from checked content: overview and why sentences (each
// cites a quote) and verbatim official text. No polls, no arguments
// for a side. Pure TypeScript.
import { FACT_DEFS, TOPIC_DEFS, type TopicId } from "@/lib/vocab";
import type { PageSentence } from "./measure-page";
import type { Card, WhySentence } from "./types";

export type GuideSort = "relevance" | "ballot";
export type GuideFilter = { kind: "all" } | { kind: "touches" } | { kind: "follow" } | { kind: "topic"; id: TopicId };

export interface GuideEntry {
  card: Card;
  /** 1-based rank in relevance order, shown on the card. */
  rank: number;
  /** One plain, cited sentence on what it does. */
  plain?: WhySentence;
  /** The official YES and NO statements, verbatim. The personal lines live in ifYou. */
  passes?: PageSentence;
  fails?: PageSentence;
  /** First sentence of the official fiscal statement, verbatim. */
  cost?: string;
  /** "If you rent", "If you are not registered at your address", or null when nothing matched. */
  ifYou: string | null;
}

/** "The proposed law has no ... finances. More text." -> first sentence. */
export function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : text).trim();
}

export function guideEntry(card: Card, rank: number): GuideEntry {
  const { yes, no } = card.measure.outcomes;
  const touches = card.relevance === "touches";
  const facts = card.because.filter((b) => b.kind === "fact");
  return {
    card,
    rank,
    plain: card.measure.overview[0],
    passes: yes ? { text: yes.text, quoteId: yes.id } : undefined,
    fails: no ? { text: no.text, quoteId: no.id } : undefined,
    cost: card.measure.fiscal ? firstSentence(card.measure.fiscal.text) : undefined,
    ifYou: touches && facts.length ? `If ${facts.map((b) => (b.kind === "fact" ? (b.value ? FACT_DEFS[b.id].because.yes : FACT_DEFS[b.id].because.no) : "")).join(" and ")}` : null,
  };
}

/** Topics present on the ballot, for filter chips, in first-seen order. */
export function guideTopics(cards: Card[]): TopicId[] {
  const seen: TopicId[] = [];
  for (const c of cards) for (const t of c.measure.topics) if (!seen.includes(t)) seen.push(t);
  return seen;
}

export function topicLabel(id: TopicId): string {
  return TOPIC_DEFS[id].label;
}

/**
 * Cards arrive in buildCards order (touches, on your list, everyone, probably
 * not; ties by ballot order). Rank follows that order; "ballot" re-sorts by number.
 */
export function buildGuide(cards: Card[], sort: GuideSort, filter: GuideFilter): GuideEntry[] {
  const ranked = cards.map((c, i) => guideEntry(c, i + 1));
  const kept = ranked.filter((e) => {
    if (filter.kind === "touches") return e.card.relevance === "touches";
    if (filter.kind === "follow") return e.card.onYourList;
    if (filter.kind === "topic") return e.card.measure.topics.includes(filter.id);
    return true;
  });
  return sort === "ballot" ? [...kept].sort((a, b) => Number(a.card.measure.number) - Number(b.card.measure.number)) : kept;
}
