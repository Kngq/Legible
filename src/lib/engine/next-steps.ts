// What a measure means at town level, and what a person can do next.
// Pure TypeScript. Every sentence about a measure cites a quote id, like WhySentence.
// Next steps are civic actions (read, check, ask), never a vote.
import { canAskInCard, type Profile } from "./profile";
import type { Card, WhySentence } from "./types";

/** "{town}" is replaced with the person's town, or "your city or town". */
export const LOCAL_REACH: Record<string, WhySentence> = {
  "ballot-2026-q4": {
    text: "You would register at the polling place in your own precinct in {town}, with proof of residency.",
    quoteId: "q4-summary",
  },
  "ballot-2026-q5": {
    text: "A tighter state revenue limit means less in the state budget, which includes local aid for schools and town budgets.",
    quoteId: "q5-fiscal",
  },
  "ballot-2026-q6": {
    text: "{town} could receive money from the new fund for parks, trails, and land conservation.",
    quoteId: "q6-c2",
  },
  "ballot-2026-q7": {
    text: "{town} would keep the power to regulate height, setbacks, open space, parking, and short-term rentals for these homes.",
    quoteId: "q7-c3",
  },
  "ballot-2026-q8": {
    text: "Cities and towns would receive less from marijuana sales taxes, about $50 million statewide in fiscal year 2025.",
    quoteId: "q8-fiscal",
  },
  "ballot-2026-q9": {
    text: "Local licensing authorities could request prior license and permit information from the state when reviewing applications.",
    quoteId: "q9-summary",
  },
};

export function localReach(measureId: string, townName?: string): WhySentence | undefined {
  const s = LOCAL_REACH[measureId];
  if (!s) return undefined;
  const town = townName ?? "your city or town";
  let text = s.text.replaceAll("{town}", town);
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return { ...s, text };
}

export type NextStep =
  | { kind: "answer"; label: string; detail: string }
  | { kind: "registration"; label: string; detail: string; href: string }
  | { kind: "read"; label: string; detail: string }
  | { kind: "ask_legislator"; label: string; detail: string };

// Secretary of the Commonwealth voter lookup. Bot-walled for scripts; checked by hand.
export const REGISTRATION_LOOKUP_URL = "https://www.sec.state.ma.us/VoterRegistrationSearch/MyVoterRegStatus.aspx";

/** Ordered: the first step is the one the card shows as its button. */
export function nextSteps(card: Card, profile: Profile): NextStep[] {
  const steps: NextStep[] = [];
  const askable = card.pendingQuestions.filter((f) => canAskInCard(profile, f));
  if (askable.length) {
    steps.push({
      kind: "answer",
      label: "Answer one question to sort this",
      detail: "Your answer stays in this browser.",
    });
  }
  if (card.measure.id === "ballot-2026-q4" && profile.facts.registered_here?.value === false) {
    steps.push({
      kind: "registration",
      label: "Look up your registration",
      detail: "This change would start in 2028. For November 3, registration works as it does today.",
      href: REGISTRATION_LOOKUP_URL,
    });
  }
  steps.push({
    kind: "read",
    label: "Read what YES and NO do",
    detail: "The official text, word for word.",
  });
  steps.push({
    kind: "ask_legislator",
    label: "Ask your legislator a factual question",
    detail: "A short draft you can edit and copy. Nine never sends it.",
  });
  return steps;
}

export const DRAFT_QUESTIONS = [
  "When would this take effect?",
  "What would it cost the state and my city or town?",
  "Which office would carry it out?",
] as const;

/** Requirement 15: at most 80 words, no life facts, no topics, never sent. */
export function draftMessage(measureNumber: string, measureTitle: string, question: string): string {
  return [
    "Hello,",
    `I am a constituent with a factual question about Question ${measureNumber} on the November 3 ballot, "${measureTitle}."`,
    question,
    "Thank you for your time.",
  ].join("\n\n");
}

export function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}
