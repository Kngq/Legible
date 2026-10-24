import type { Direction, FactId, TopicId } from "@/lib/vocab";

export type QuoteStatus = "reviewed" | "verified" | "failed";

export interface Quote {
  id: string;
  text: string; // verbatim (whitespace collapsed, straight quotes)
  page?: number; // 1-indexed source page
  locator: string; // "AG summary", "YES statement", "Article 4", ...
  status: QuoteStatus;
}

/** Every sentence Nine writes about a measure cites one quote. */
export interface WhySentence {
  text: string;
  quoteId: string;
}

export interface Rule {
  fact: FactId;
  /** The answer that makes this rule fire. Defaults to true. */
  when?: boolean;
  direction: Direction;
  why: WhySentence[]; // at most 2
}

export type MeasureKind = "initiative" | "referendum" | "article" | "other";

export interface Measure {
  id: string; // "ballot-2026-q7"
  number: string; // "7", "Article 12"
  title: string; // plain-English short title
  officialTitle: string;
  kind: MeasureKind;
  summary: Quote;
  outcomes: { yes?: Quote; no?: Quote; effect?: Quote };
  fiscal?: Quote;
  appliesToEveryone: boolean;
  everyoneDirection?: Direction;
  /** Cited sentences shown when no life fact rule fires. At most 2. */
  overview: WhySentence[];
  rules: Rule[];
  askFacts: FactId[]; // facts to ask inline when unanswered
  topics: TopicId[];
  quotes: Quote[]; // every quote referenced anywhere in this measure
  sourceUrl?: string;
  towns?: string[]; // Massachusetts municipalities named (uploads)
}

export type Provenance = "reviewed" | "verified" | "ai_draft";

export interface DocumentData {
  id: string;
  title: string;
  place: { kind: "state" | "town"; name: string };
  date?: string;
  source: { name: string; url?: string };
  /** reviewed: a person checked every quote. verified: machine-checked, review pending. ai_draft: from an upload. */
  provenance: Provenance;
  measures: Measure[];
  flagged?: { measure: Measure; reasons: string[] }[];
  pages?: string[]; // page text, kept in memory for uploads only
}

export type { Profile } from "./profile";

export type Relevance = "touches" | "everyone" | "probably_not";

export type Because =
  | { kind: "fact"; id: FactId; value: boolean }
  | { kind: "topic"; id: TopicId };

export interface Card {
  measure: Measure;
  relevance: Relevance;
  onYourList: boolean;
  direction: Direction;
  why: WhySentence[];
  because: Because[];
  pendingQuestions: FactId[];
}
