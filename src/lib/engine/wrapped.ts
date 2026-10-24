// computeWrapped: one document + one life profile -> Ballot Wrapped summary.
// Pure and synchronous. Reuses buildCards (called once) and topicIds; no new ranking.
// No clock, randomness, storage, or fetch. Inputs are only read. See design.md, "Wrapped_Summary".
import type { TopicId } from "@/lib/vocab";
import { buildCards } from "./cards";
import { topicIds, type Profile } from "./profile";
import type { Card, DocumentData } from "./types";

/** Topic_Measure_Count for one returned topic. */
export interface TopicStat {
  id: TopicId;
  measureCount: number;
}

export interface WrappedSummary {
  cards: Card[]; // the single buildCards result, unmodified
  topicRank: TopicId[]; // all Followed_Topics in Topic_Rank order
  topTopics: TopicStat[]; // first min(3, n) of topicRank
  topTopic?: TopicId; // topTopics[0]?.id
  connectedCount: number; // cards with onYourList
  measureTotal: number; // doc.measures.length
  spotlight?: Card; // cards[0] (undefined only for a document with no measures)
}

const TOP_COUNT = 3;

/** Number of measures in the document whose topics include `topic`. Independent of life facts. */
export function topicMeasureCount(doc: DocumentData, topic: TopicId): number {
  return doc.measures.filter((m) => m.topics.includes(topic)).length;
}

export function computeWrapped(doc: DocumentData, profile: Profile): WrappedSummary {
  const cards = buildCards(doc, profile);
  const followed = topicIds(profile); // already in TOPIC_IDS order

  const firstIndex = new Map<TopicId, number>();
  for (const t of followed) {
    const i = cards.findIndex((c) => c.measure.topics.includes(t));
    firstIndex.set(t, i === -1 ? Infinity : i);
  }
  // Array.prototype.sort is stable: ties (including all Infinity) keep TOPIC_IDS order.
  // Infinity - Infinity is NaN, so compare explicitly rather than subtracting.
  const topicRank = [...followed].sort((a, b) => {
    const fa = firstIndex.get(a)!;
    const fb = firstIndex.get(b)!;
    return fa === fb ? 0 : fa < fb ? -1 : 1;
  });

  const topTopics = topicRank
    .slice(0, TOP_COUNT)
    .map((id) => ({ id, measureCount: topicMeasureCount(doc, id) }));

  return {
    cards,
    topicRank,
    topTopics,
    topTopic: topTopics[0]?.id,
    connectedCount: cards.filter((c) => c.onYourList).length,
    measureTotal: doc.measures.length,
    spotlight: cards[0],
  };
}

/** Home entry point: the Wrapped button once any topic is followed, otherwise the unlock prompt. */
export function wrappedEntry(profile: Profile): "button" | "prompt" {
  return topicIds(profile).length > 0 ? "button" : "prompt";
}
