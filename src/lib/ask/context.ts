// What Ask Kiro is talking about: the official source a passage came from and
// the passage itself. The highlight menu and the "Ask about this question"
// buttons send an AskRequest; ChatDock (the one assistant) receives it.
// Browser-safe: no Node imports.

export type AskSourceKind = "ballot" | "bill" | "civic";

export interface AskSource {
  kind: AskSourceKind;
  /** ballot: the ballot question id ("ballot-2026-q4"); bill: "S2836"; civic: the item id. */
  id: string;
  /** "Question 4: Election Day registration", "Bill S2836", "Vote by Mail applications due". */
  title: string;
  /** "Full Text of Proposed Law", "YES statement", "Bill text"... */
  locator?: string;
  page?: number;
  /** The official page, taken from Legible's data, never generated. */
  url?: string;
}

export interface AskRequest {
  source?: AskSource;
  /** The highlighted official words, as selected. */
  passage?: string;
  /** "explain" asks for a plain-language walk-through of the passage. */
  mode: "explain" | "ask";
  question?: string;
  /** Things the person told Legible that bear on this source ("you rent"). Shared only if they switch it on. */
  personal?: string[];
}

export const ASK_EVENT = "legible:ask-kiro";

/** Open Ask Kiro with this context. */
export function askKiro(req: AskRequest): void {
  window.dispatchEvent(new CustomEvent<AskRequest>(ASK_EVENT, { detail: req }));
}

/** Two requests about the same document share a conversation; a different one starts fresh. */
export function sourceKey(s?: AskSource): string {
  return s ? `${s.kind}:${s.id}` : "catalog";
}

export const EXPLAIN_QUESTION = "Explain this in plain words.";
