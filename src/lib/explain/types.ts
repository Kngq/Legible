// A structured, cited explanation of an official document that is not a ballot
// question (a bill now; later an ordinance or warrant article). An author, a
// person today and a model later, writes an ExplainerDraft; verifyExplainer
// checks it against the saved official text and turns it into an Explainer.
// Nothing reaches the page that the verifier did not pass.
// Pure TypeScript; runs in the browser and in build scripts.
import type { FactId } from "@/lib/vocab";
import type { Provenance, Quote } from "@/lib/engine/types";

/** One plain sentence Legible writes, citing one quote. `mark` narrows a long quote to the words that matter. */
export interface CitedLine {
  text: string;
  quoteId: string;
  mark?: string;
}

export interface LineGroup {
  heading: string;
  lines: CitedLine[];
}

/**
 * direct: the text itself changes something for a person in this situation.
 * possible: it could reach them indirectly; the text does not name their situation.
 */
export type Effect = "direct" | "possible";

export interface PersonalRule {
  fact: FactId;
  /** The answer that makes this rule fire. */
  when: boolean;
  effect: Effect;
  lines: CitedLine[];
  /** For possible effects: a sentence saying what the text does not mention, checked by searching the text for each term. */
  notStated?: { text: string; terms: string[] };
}

export interface HistoryEntry {
  date: string;
  branch: string;
  action: string;
}

export interface Explainer {
  /** The saved original every quote was found in. */
  source: { kind: "bill"; id: string; title: string; url: string; file: string; hash: string; savedOn: string };
  /** reviewed: a person checked every quote. verified: machine-checked. ai_draft: written by a model, machine-checked. */
  provenance: Provenance;
  /** 1. What it proposes: at most 2 lines. */
  proposes: CitedLine[];
  /** 2. What would change, grouped. */
  changes: LineGroup[];
  /** 3. Who the text names: groups of people or places it would reach. */
  affects: CitedLine[];
  /** 3, personal: lines shown when the person's answer matches. */
  personal: PersonalRule[];
  /** When parts would start, if the text says. `pastOn`: from this day the date in the text has passed. */
  takesEffect: { label: string; line: CitedLine; pastOn?: string }[];
  /** Which version the saved text is, each note tied to an entry in the official history. */
  versionNotes: { text: string; entry: HistoryEntry }[];
  /** 4. Where it stands: the official history, verbatim. */
  history: HistoryEntry[];
  quotes: Quote[];
}

// ---- Drafts: what an author writes. Quote ids are short; lines cite them as `quote`.

export interface DraftLine {
  text: string;
  quote: string;
  mark?: string;
}

export interface ExplainerDraft {
  /** team: written by a person. model: generated; shipped as ai_draft until reviewed. */
  author: "team" | "model";
  /** Set only after a person checked every quote against the saved text. */
  reviewedBy?: string;
  /** Verbatim passages of the official text. The verifier finds each one and labels its section. */
  quotes: { id: string; text: string }[];
  proposes: DraftLine[];
  changes: { heading: string; lines: DraftLine[] }[];
  affects: DraftLine[];
  personal: { fact: FactId; when: boolean; effect: Effect; lines: DraftLine[]; notStated?: { text: string; terms: string[] } }[];
  takesEffect: { label: string; line: DraftLine; pastOn?: string }[];
  /** Notes about the saved text's version; `action` must appear in an official history entry. */
  versionNotes?: { text: string; action: string }[];
}
