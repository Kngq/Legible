// First run's three steps (town, home, subjects) as pure functions over the
// profile, so the screen only holds which choice is on. Every step can be undone
// back to what the profile held before first run began: Skip, Back-and-change,
// and "Something else" never turn an unanswered fact into a no.
import type { FactId } from "@/lib/vocab";
import { answerFact, confirmTopics, type FactAnswer, type FactSkip, type Profile } from "./profile";

const ONBOARDING = { kind: "onboarding" } as const;

export type FirstRunStep = "town" | "home" | "topics";

/**
 * One answer to "Which best describes your home?". Renting and owning your home
 * rule each other out, so picking one answers both. Living with family is
 * independent of either, so it answers only itself. "Something else" denies
 * nothing the person said, so it writes nothing and leaves all three unanswered
 * for a card to ask in context.
 */
export type HomeChoice = "rents" | "owns" | "family" | "else";
export const HOME_FACTS = ["rents", "owns", "lives_with_family"] as const satisfies readonly FactId[];
const HOME_ANSWERS: Record<HomeChoice, Partial<Record<FactId, boolean>>> = {
  rents: { rents: true, owns: false },
  owns: { owns: true, rents: false },
  family: { lives_with_family: true },
  else: {},
};

/** The profile as it stood when first run began; each step restores its part of this. */
export interface FirstRunStart {
  townId?: string;
  topics: Profile["topics"];
  topicsConfirmedAt?: string;
  home: Partial<Record<FactId, { fact?: FactAnswer; skip?: FactSkip }>>;
}

export function firstRunStart(p: Profile): FirstRunStart {
  const home: FirstRunStart["home"] = {};
  for (const f of HOME_FACTS) home[f] = { fact: p.facts[f], skip: p.skipped[f] };
  return { townId: p.townId, topics: p.topics, topicsConfirmedAt: p.topicsConfirmedAt, home };
}

/** Put the three home facts (answers and skips) back as they were at the start. */
export function restoreHome(p: Profile, start: FirstRunStart): Profile {
  const facts = { ...p.facts };
  const skipped = { ...p.skipped };
  for (const f of HOME_FACTS) {
    const was = start.home[f];
    if (was?.fact) facts[f] = was.fact;
    else delete facts[f];
    if (was?.skip) skipped[f] = was.skip;
    else delete skipped[f];
  }
  return { ...p, facts, skipped };
}

/** Record a home choice. Starts from the pre-run state, so changing the choice never leaves a stale answer behind. */
export function applyHome(p: Profile, start: FirstRunStart, choice: HomeChoice, now = new Date().toISOString()): Profile {
  const answers = Object.entries(HOME_ANSWERS[choice]) as [FactId, boolean][];
  return answers.reduce((acc, [f, v]) => answerFact(acc, f, v, ONBOARDING, now), restoreHome(p, start));
}

/** Leave the subjects step with Continue: confirmed only when something is followed. */
export function confirmFirstRunTopics(p: Profile, now = new Date().toISOString()): Profile {
  return Object.keys(p.topics).length ? confirmTopics(p, now) : p;
}

/** Skip a step: undo only what this run changed in it. */
export function skipStep(p: Profile, start: FirstRunStart, step: FirstRunStep): Profile {
  if (step === "town") return { ...p, townId: start.townId };
  if (step === "home") return restoreHome(p, start);
  return { ...p, topics: start.topics, topicsConfirmedAt: start.topicsConfirmedAt };
}

/** Did this run add anything personal? Decides "Show my Legible" over "Explore Legible", and the keep prompt. */
export function firstRunGave(p: Profile, start: FirstRunStart): boolean {
  if (p.townId && p.townId !== start.townId) return true;
  if (Object.keys(p.topics).some((t) => !(t in start.topics))) return true;
  return HOME_FACTS.some((f) => p.facts[f] !== start.home[f]?.fact);
}
