// The rows of the measure page's "For you" card: what NO does, and when a change
// would reach a person. Pure TypeScript, hand-authored like LOCAL_REACH.
// Every line cites a quote id; `mark` names the words to highlight when the
// cited quote is a long passage, and must appear in it word for word.
import type { Card, DocumentData, Measure, Quote, WhySentence } from "./types";

export type PageSentence = WhySentence & { mark?: string };

export interface PageLines {
  /** Shown under "If YES passes" when none of the card's lines describe YES. */
  yes?: PageSentence;
  /** Legible's plain line for what a NO result does. Same weight as the YES lines. */
  no: PageSentence;
  /** When the change would start, if the official text says. */
  takesEffect?: { label: string; why: PageSentence };
}

export const PAGE_LINES: Record<string, PageLines> = {
  "ballot-2026-q1": {
    no: { text: "The Public Records Law stays as it is today.", quoteId: "q1-no" },
  },
  "ballot-2026-q2": {
    no: { text: "Labor law for public defender office staff stays as it is today.", quoteId: "q2-no" },
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
  },
  "ballot-2026-q7": {
    no: { text: "Rules for building single-family homes stay as they are today.", quoteId: "q7-no" },
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
  },
  "ballot-2026-q9": {
    yes: { text: "The 2024 firearms law stays in place.", quoteId: "q9-yes" },
    no: { text: "The 2024 firearms law is repealed.", quoteId: "q9-no" },
    takesEffect: {
      label: "In effect now",
      why: { text: "You already live under this law. The vote decides whether it stays.", quoteId: "q9-yes" },
    },
  },
};

export function pageLines(measureId: string): PageLines | undefined {
  return PAGE_LINES[measureId];
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
