// Which of an explanation's personal lines apply to this person, and which one
// answer would settle more. Runs in the browser; the profile never leaves it.
import { factValues, isFactSettled, type Profile } from "@/lib/engine/profile";
import type { FactId } from "@/lib/vocab";
import type { Explainer, PersonalRule } from "./types";

export interface PersonalView {
  /** Rules whose answer matches, direct effects first. */
  matched: PersonalRule[];
  /** Facts a rule depends on that the person has not settled, in rule order. */
  open: FactId[];
}

export function personalView(e: Explainer, profile: Profile): PersonalView {
  const facts = factValues(profile);
  const matched = e.personal.filter((r) => facts[r.fact] === r.when).sort((a, b) => (a.effect === b.effect ? 0 : a.effect === "direct" ? -1 : 1));
  const open = [...new Set(e.personal.map((r) => r.fact))].filter((f) => facts[f] === undefined && !isFactSettled(profile, f));
  return { matched, open };
}
