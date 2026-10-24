// Personalization meter: how much of the person's feed Nine can sort for them.
// Pure TypeScript, runs in the browser only. The denominator is built from the
// documents in the feed, so Nine never asks for a fact no document reads.
import { FACT_IDS, ONBOARDING_FACTS, SENSITIVE_FACTS, type FactId } from "@/lib/vocab";
import { isFactSettled, type Profile } from "./profile";
import type { DocumentData } from "./types";

export type ChecklistItem =
  | { kind: "town"; done: boolean }
  | { kind: "topics"; done: boolean }
  | {
      kind: "fact";
      id: FactId;
      state: "answered" | "declined" | "open";
      /** Where the fact is asked. Sensitive facts are asked only on the card that uses them. */
      askedIn: "onboarding" | "card";
      measureIds: string[];
    };

export interface Personalization {
  items: ChecklistItem[];
  done: number;
  total: number;
  /** Rounded down, so 100 appears only when every item is done. */
  percent: number;
}

/** Facts read by any measure in these documents, mapped to the measures that read them, in vocab order. */
export function factsUsed(docs: DocumentData[]): Map<FactId, string[]> {
  const byFact = new Map<FactId, Set<string>>();
  for (const d of docs) {
    for (const m of d.measures) {
      for (const f of [...m.askFacts, ...m.rules.map((r) => r.fact)]) {
        if (!byFact.has(f)) byFact.set(f, new Set());
        byFact.get(f)!.add(m.id);
      }
    }
  }
  const out = new Map<FactId, string[]>();
  for (const id of FACT_IDS) if (byFact.has(id)) out.set(id, [...byFact.get(id)!]);
  return out;
}

/** The fact rows onboarding shows: everyday facts some document in the feed uses. */
export function onboardingFacts(docs: DocumentData[]): FactId[] {
  const used = factsUsed(docs);
  return ONBOARDING_FACTS.filter((id) => used.has(id) && !SENSITIVE_FACTS.includes(id));
}

/**
 * One item per thing that changes the feed: the town, the topics screen, and each
 * fact a feed document uses. Every item weighs the same. Not counted: the remember
 * toggle (storage is opt-in and the meter never nudges it).
 */
export function personalization(p: Profile, docs: DocumentData[]): Personalization {
  const items: ChecklistItem[] = [
    { kind: "town", done: Boolean(p.townId) },
    { kind: "topics", done: Boolean(p.topicsConfirmedAt) || Object.keys(p.topics).length > 0 },
  ];
  for (const [id, measureIds] of factsUsed(docs)) {
    const state = p.facts[id] ? "answered" : isFactSettled(p, id) ? "declined" : "open";
    items.push({ kind: "fact", id, state, askedIn: SENSITIVE_FACTS.includes(id) ? "card" : "onboarding", measureIds });
  }
  const done = items.filter((i) => (i.kind === "fact" ? i.state !== "open" : i.done)).length;
  return { items, done, total: items.length, percent: Math.floor((done / items.length) * 100) };
}
