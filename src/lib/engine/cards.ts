// buildCards: one document + one life profile -> sorted cards. Pure and synchronous.
// Never reads the network, never writes storage. See design.md, "Engine".
import { factValues, topicIds, type Profile } from "./profile";
import type { Because, Card, DocumentData, Relevance, WhySentence } from "./types";

const MAX_WHY = 2;

const RANK: Record<Relevance | "list", number> = { touches: 0, list: 1, everyone: 2, probably_not: 3 };

function rank(c: Card): number {
  if (c.relevance === "touches") return RANK.touches;
  if (c.onYourList) return RANK.list;
  return RANK[c.relevance];
}

export function buildCards(doc: DocumentData, profile: Profile): Card[] {
  const facts = factValues(profile);
  const topics = new Set(topicIds(profile));

  const cards = doc.measures.map((measure, order) => {
    const because: Because[] = [];
    const why: WhySentence[] = [];
    let direction = measure.everyoneDirection ?? "none";

    const fired = measure.rules.filter((r) => facts[r.fact] !== undefined && facts[r.fact] === (r.when ?? true));
    for (const r of fired) {
      because.push({ kind: "fact", id: r.fact, value: facts[r.fact]! });
      for (const w of r.why) if (why.length < MAX_WHY && !why.some((x) => x.text === w.text)) why.push(w);
    }

    let relevance: Relevance;
    if (fired.length) {
      relevance = "touches";
      direction = fired[0].direction;
    } else {
      relevance = measure.appliesToEveryone ? "everyone" : "probably_not";
      if (!measure.appliesToEveryone) direction = "none";
      why.push(...measure.overview.slice(0, MAX_WHY));
    }

    const listed = measure.topics.filter((t) => topics.has(t));
    for (const id of listed) because.push({ kind: "topic", id });

    const pendingQuestions = measure.askFacts.filter((f) => facts[f] === undefined);

    const card: Card = { measure, relevance, onYourList: listed.length > 0, direction, why, because, pendingQuestions };
    return { card, order };
  });

  cards.sort((a, b) => rank(a.card) - rank(b.card) || a.order - b.order);
  return cards.map((c) => c.card);
}

export function touchCount(cards: Card[]): number {
  return cards.filter((c) => c.relevance === "touches").length;
}
