// Personalization meter: how much of the life profile is filled in.
// Pure TypeScript, runs in the browser only. The checklist is the same for every
// person and every document: the town, each life area, and the topics screen.
// Facts asked only inside cards (sensitive or narrow ones) are not counted.
import { LIFE_AREAS, type LifeAreaId } from "@/lib/vocab";
import { isFactSettled, type Profile } from "./profile";

export type ChecklistItem =
  | { kind: "town"; done: boolean }
  | { kind: "area"; id: LifeAreaId; done: boolean }
  | { kind: "topics"; done: boolean };

export interface Personalization {
  items: ChecklistItem[];
  done: number;
  total: number;
  /** Rounded down, so 100 appears only when every item is done. */
  percent: number;
}

/**
 * One item per onboarding screen that holds information, all weighted the same.
 * An area is done when every fact in it is answered or declined. Not counted:
 * the remember toggle (storage is opt-in and the meter never nudges it).
 */
export function personalization(p: Profile): Personalization {
  const items: ChecklistItem[] = [
    { kind: "town", done: Boolean(p.townId) },
    ...LIFE_AREAS.map((a): ChecklistItem => ({ kind: "area", id: a.id, done: a.facts.every((f) => isFactSettled(p, f)) })),
    { kind: "topics", done: Boolean(p.topicsConfirmedAt) || Object.keys(p.topics).length > 0 },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, percent: Math.floor((done / items.length) * 100) };
}

/** The first open checklist item, for the single nudge card in the feed. Null at 100%. */
export function nextItem(p: Profile): ChecklistItem | null {
  return personalization(p).items.find((i) => !i.done) ?? null;
}
