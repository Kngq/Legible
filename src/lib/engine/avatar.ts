// Avatar parts derived from the profile. Pure; recomputed on every change, never stored.
import { FACT_DEFS, FACT_IDS, SENSITIVE_FACTS, TOPIC_DEFS, TOPIC_IDS, type FactId, type TopicId } from "@/lib/vocab";
import type { Profile } from "./profile";

export type AvatarPart =
  | { kind: "fact"; id: FactId; part: string; label: string }
  | { kind: "topic"; id: TopicId; part: string; label: string };

/** One part per fact answered Yes (never a sensitive fact), then one per topic, in vocab order. */
export function avatarParts(p: Profile): AvatarPart[] {
  const out: AvatarPart[] = [];
  for (const id of FACT_IDS) {
    if (SENSITIVE_FACTS.includes(id) || p.facts[id]?.value !== true) continue;
    const d = FACT_DEFS[id];
    out.push({ kind: "fact", id, part: d.avatarPart, label: d.because.yes.replace(/^you /, "") });
  }
  for (const id of TOPIC_IDS) {
    if (!p.topics[id]) continue;
    out.push({ kind: "topic", id, part: TOPIC_DEFS[id].avatarPart, label: TOPIC_DEFS[id].label });
  }
  return out;
}
