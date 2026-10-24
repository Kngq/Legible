// The rows of the measure page's "For you" card: what NO does, and when a change
// would reach a person. Pure TypeScript, hand-authored like LOCAL_REACH.
// Every line cites a quote id; `mark` names the words to highlight when the
// cited quote is a long passage, and must appear in it word for word.
import { localReach } from "./next-steps";
import type { Card, DocumentData, Measure, Quote, WhySentence } from "./types";

export type PageSentence = WhySentence & { mark?: string };

export interface PageLines {
  /** Shown under "If YES passes" when none of the card's lines describe YES. */
  yes?: PageSentence;
  /** Legible's plain line for what a NO result does. Same weight as the YES lines. */
  no: PageSentence;
  /** When the change would start, if the official text says. */
  takesEffect?: { label: string; why: PageSentence };
  /**
   * Possible wider effects: changes that could reach anyone through budgets, local
   * aid, or how the state works, beyond a person's own situation. Only what the
   * official text says, mostly the fiscal statement. LOCAL_REACH adds the town line.
   */
  indirect?: PageSentence[];
  /** What the official text itself says is not known. Never Legible's own doubt. */
  uncertain?: PageSentence[];
}

export const PAGE_LINES: Record<string, PageLines> = {
  "ballot-2026-q1": {
    no: { text: "The Public Records Law stays as it is today.", quoteId: "q1-no" },
  },
  "ballot-2026-q2": {
    no: { text: "Labor law for public defender office staff stays as it is today.", quoteId: "q2-no" },
    indirect: [
      {
        text: "State finances could be affected, because the agency is funded in part by the state budget.",
        quoteId: "q2-fiscal",
        mark: "The proposed law may have an impact on state finances. CPCS receives its funding, in part, from state government appropriations.",
      },
    ],
    uncertain: [
      {
        text: "How much it would cost is not known. The official fiscal statement says it depends on how bargaining turns out.",
        quoteId: "q2-fiscal",
        mark: "The fiscal impact of the proposed law is difficult to project due to the uncertainty regarding the outcomes of any such collective bargaining by CPCS employees.",
      },
    ],
  },
  "ballot-2026-q3": {
    no: { text: "Primary elections keep working as they do today.", quoteId: "q3-no" },
  },
  "ballot-2026-q4": {
    no: { text: "Registration keeps working as it does today.", quoteId: "q4-no" },
    takesEffect: {
      label: "Jan 1, 2028",
      why: { text: "Later elections, not this one. On November 3, registration works as it does today.", quoteId: "q4-c2" },
    },
  },
  "ballot-2026-q5": {
    no: { text: "State revenue rules stay as they are today.", quoteId: "q5-no" },
    takesEffect: {
      label: "Jul 1, 2027",
      why: {
        text: "The new revenue limit would apply from the middle of 2027.",
        quoteId: "q5-summary",
        mark: "The provisions of the proposed law would all be effective as of July 1, 2027.",
      },
    },
    uncertain: [
      {
        text: "How often taxpayers would get refunds would depend on future conditions.",
        quoteId: "q5-fiscal",
        mark: "Depending on future conditions, the proposal could change the frequency of statutorily-required refunds to taxpayers.",
      },
    ],
  },
  "ballot-2026-q6": {
    no: { text: "No conservation fund is created, and sales tax spending stays as it is today.", quoteId: "q6-no" },
    takesEffect: {
      label: "Jul 1, 2027",
      why: {
        text: "The fund would start in the middle of 2027.",
        quoteId: "q6-summary",
        mark: "The proposed law would take effect on July 1, 2027.",
      },
    },
    indirect: [
      {
        text: "Tens of millions of dollars a year in tax receipts would be diverted to the new fund automatically.",
        quoteId: "q6-fiscal",
        mark: "it is estimated that, on an annual basis, the proposed law would automatically divert tens of millions of dollars of tax receipts",
      },
    ],
    uncertain: [
      {
        text: "The full effect on state and local budgets is not known. The official fiscal statement says a full analysis is not feasible.",
        quoteId: "q6-fiscal",
        mark: "While a full fiscal analysis is not feasible",
      },
    ],
  },
  "ballot-2026-q7": {
    no: { text: "Rules for building single-family homes stay as they are today.", quoteId: "q7-no" },
    indirect: [
      {
        text: "If more homes are built, cities and towns could collect new tax revenue.",
        quoteId: "q7-fiscal",
        mark: "If the proposed law enables the growth of housing in communities, it could provide positive new growth revenues to municipalities.",
      },
    ],
    uncertain: [
      {
        text: "How many new homes would be built is not known. The official fiscal statement says the scale is difficult to project.",
        quoteId: "q7-fiscal",
        mark: "it is difficult to project the potential scale of new growth tied to the proposed law",
      },
    ],
  },
  "ballot-2026-q8": {
    no: { text: "Marijuana law stays as it is today.", quoteId: "q8-no" },
    takesEffect: {
      label: "Jan 1, 2028",
      why: {
        text: "The repeal would start at the beginning of 2028.",
        quoteId: "q8-summary",
        mark: "The proposed law would take effect on January 1, 2028.",
      },
    },
    indirect: [
      {
        text: "The state would also collect less. These taxes raised about $280 million in state revenue in fiscal year 2025.",
        quoteId: "q8-fiscal",
        mark: "In fiscal year 2025, taxation of the retail sale of adult recreational use marijuana raised approximately $280 million in state revenue and $50 million in local revenue.",
      },
    ],
  },
  "ballot-2026-q9": {
    yes: { text: "The 2024 firearms law stays in place.", quoteId: "q9-yes" },
    no: { text: "The 2024 firearms law is repealed.", quoteId: "q9-no" },
    takesEffect: {
      label: "In effect now",
      why: { text: "You already live under this law. The vote decides whether it stays.", quoteId: "q9-yes" },
    },
    indirect: [
      {
        text: "If the law is repealed, the state would spend resources suspending or redirecting what it has put in place for it.",
        quoteId: "q9-fiscal",
        mark: "Repealing the law would require the Commonwealth to expend resources in suspending or re-directing those investments.",
      },
    ],
  },
};

export function pageLines(measureId: string): PageLines | undefined {
  return PAGE_LINES[measureId];
}

export interface Impact {
  /** What could change for someone in the person's situation: the card's own lines, only when an answer touches it. */
  direct: PageSentence[];
  takesEffect?: { label: string; why: PageSentence };
  /** Broader changes that could reach them: the town line first, then the official fiscal lines. */
  indirect: PageSentence[];
  /** What the official text says is not known. */
  uncertain: PageSentence[];
}

/**
 * "How could this affect you?", in three groups, each holding only cited lines.
 * An empty group is left off the page rather than filled with a guess.
 */
export function impactFor(card: Card, town?: string): Impact {
  const lines = pageLines(card.measure.id);
  const local = localReach(card.measure.id, town);
  return {
    direct: card.relevance === "touches" ? card.why : [],
    takesEffect: lines?.takesEffect,
    indirect: [...(local ? [local] : []), ...(lines?.indirect ?? [])],
    uncertain: lines?.uncertain ?? [],
  };
}

/** The card's lines that describe YES: lines citing the NO statement belong to the NO row. */
export function yesLines(card: Card, lines?: PageLines): PageSentence[] {
  const noId = card.measure.outcomes.no?.id;
  const own = card.why.filter((s) => s.quoteId !== noId);
  return own.length ? own : lines?.yes ? [lines.yes] : card.why;
}

export function quoteFor(m: Measure, id: string): Quote | undefined {
  return m.quotes.find((q) => q.id === id) ?? [m.summary, m.outcomes.yes, m.outcomes.no, m.outcomes.effect, m.fiscal].find((q) => q?.id === id);
}

/** The words to show under a line: the marked sentence of a long quote, or the whole quote. */
export function excerpt(q: Quote, mark?: string): { before: string; marked: string } {
  const at = mark ? q.text.indexOf(mark) : -1;
  if (mark && at >= 0) return { before: at > 0 ? "… " : "", marked: mark };
  return { before: "", marked: q.text };
}

export interface TrustSummary {
  lines: number;
  quotes: number;
  /** Every cited quote was found word for word. */
  allFound: boolean;
  /** Every cited quote was checked by a person. */
  allReviewed: boolean;
  aiDraft: boolean;
}

/** Counts what the For you card shows: its lines and the distinct quotes they cite. */
export function trustSummary(measure: Measure, doc: DocumentData, lines: WhySentence[]): TrustSummary {
  const ids = [...new Set(lines.map((l) => l.quoteId))];
  const quotes = ids.map((id) => quoteFor(measure, id));
  return {
    lines: lines.length,
    quotes: ids.length,
    allFound: quotes.every((q) => q && q.status !== "failed"),
    allReviewed: quotes.every((q) => q?.status === "reviewed"),
    aiDraft: doc.provenance === "ai_draft",
  };
}
