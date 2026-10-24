// Turn an ExplainerDraft into an Explainer by checking it against the saved
// official text. The same checks run for a person's draft (the build fails on
// any error) and, later, for a generated one (failed lines are dropped and the
// document is flagged). Pure TypeScript.
import type { Quote } from "@/lib/engine/types";
import { FACT_IDS, findBannedWords } from "@/lib/vocab";
import { normalize } from "@/lib/verify/normalize";
import type { CitedLine, DraftLine, Explainer, ExplainerDraft, HistoryEntry } from "./types";

/** Every claim about the document is conditional: it is proposed, not law. */
const CONDITIONAL = /\b(would|could|might|may|if)\b/i;

export interface VerifyInput {
  draft: ExplainerDraft;
  /** The saved official text, as fetched. */
  text: string;
  source: Explainer["source"];
  history: HistoryEntry[];
}

export interface VerifyResult {
  explainer: Explainer;
  errors: string[];
}

/**
 * "Section 4": the nearest bill section heading at or before `index` in normalized
 * text. Bills head sections "SECTION 1." or "SECTION 1:"; a bill with none (one that
 * inserts a whole chapter) is labeled by the chapter's own "Section 1." headings.
 */
export function sectionAt(normalized: string, index: number): string | undefined {
  const re = /SECTION \d+[.:]/.test(normalized) ? /SECTION (\d+)[.:]/g : /\bSection (\d+)\./g;
  let found: string | undefined;
  for (let m = re.exec(normalized); m && m.index <= index; m = re.exec(normalized)) found = m[1];
  return found ? `Section ${found}` : undefined;
}

/** The terms that do appear in the text (word start, ignoring case). Empty means none do. */
export function termsPresent(normalized: string, terms: string[]): string[] {
  return terms.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(normalized));
}

export function verifyExplainer({ draft, text, source, history }: VerifyInput): VerifyResult {
  const errors: string[] = [];
  const body = normalize(text);
  const prefix = `bill-${source.id}`;
  const status = draft.reviewedBy ? "reviewed" : "verified";

  const quotes = new Map<string, Quote>();
  for (const q of draft.quotes) {
    const words = normalize(q.text);
    const at = body.indexOf(words);
    if (at < 0) errors.push(`quote ${q.id}: not found word for word: "${words.slice(0, 70)}..."`);
    if (quotes.has(q.id)) errors.push(`quote ${q.id}: duplicate id`);
    quotes.set(q.id, { id: `${prefix}-${q.id}`, text: words, locator: (at >= 0 && sectionAt(body, at)) || "Bill text", status: at >= 0 ? status : "failed" });
  }

  const used = new Set<string>();
  const check = (where: string, s: string, conditional = true) => {
    const banned = findBannedWords(s);
    if (banned.length) errors.push(`${where}: banned words ${banned.join(", ")}`);
    if (conditional && !CONDITIONAL.test(s)) errors.push(`${where}: say it is proposed ("would", "could"): "${s}"`);
  };
  const line = (l: DraftLine, where: string): CitedLine | null => {
    check(where, l.text);
    const q = quotes.get(l.quote);
    if (!q) {
      errors.push(`${where}: cites unknown quote "${l.quote}"`);
      return null;
    }
    used.add(l.quote);
    if (q.status === "failed") return null;
    if (l.mark && !q.text.includes(normalize(l.mark))) errors.push(`${where}: mark is not in quote ${l.quote}`);
    return { text: l.text, quoteId: q.id, ...(l.mark ? { mark: normalize(l.mark) } : {}) };
  };
  const lines = (ls: DraftLine[], where: string) => ls.map((l, i) => line(l, `${where}[${i}]`)).filter((l): l is CitedLine => l !== null);

  if (draft.proposes.length === 0 || draft.proposes.length > 2) errors.push("proposes: 1 or 2 lines");
  const personal = draft.personal.map((r) => {
    const where = `personal ${r.fact}`;
    if (!(FACT_IDS as readonly string[]).includes(r.fact)) errors.push(`${where}: unknown fact`);
    if (r.lines.length === 0 || r.lines.length > 2) errors.push(`${where}: 1 or 2 lines`);
    if (r.notStated) {
      check(`${where} notStated`, r.notStated.text, false);
      if (r.effect !== "possible") errors.push(`${where}: notStated belongs to a possible effect`);
      const present = termsPresent(body, r.notStated.terms);
      if (present.length) errors.push(`${where}: notStated says the text does not mention ${present.join(", ")}, but it does`);
    }
    return { fact: r.fact, when: r.when, effect: r.effect, lines: lines(r.lines, where), ...(r.notStated ? { notStated: r.notStated } : {}) };
  });
  const explainer: Explainer = {
    source,
    provenance: draft.author === "model" && !draft.reviewedBy ? "ai_draft" : status,
    proposes: lines(draft.proposes, "proposes"),
    changes: draft.changes.map((g, i) => {
      check(`changes[${i}] heading`, g.heading, false);
      return { heading: g.heading, lines: lines(g.lines, `changes "${g.heading}"`) };
    }),
    affects: lines(draft.affects, "affects"),
    personal,
    takesEffect: draft.takesEffect.flatMap((t, i) => {
      check(`takesEffect[${i}] label`, t.label, false);
      if (t.pastOn && !/^\d{4}-\d{2}-\d{2}$/.test(t.pastOn)) errors.push(`takesEffect[${i}]: pastOn is not YYYY-MM-DD`);
      const l = line(t.line, `takesEffect[${i}]`);
      return l ? [{ label: t.label, line: l, ...(t.pastOn ? { pastOn: t.pastOn } : {}) }] : [];
    }),
    versionNotes: (draft.versionNotes ?? []).flatMap((n, i) => {
      check(`versionNotes[${i}]`, n.text, false);
      const entry = history.find((h) => normalize(h.action).includes(normalize(n.action)));
      if (!entry) errors.push(`versionNotes[${i}]: no official history entry says "${n.action}"`);
      return entry ? [{ text: n.text, entry: { ...entry, action: normalize(entry.action) } }] : [];
    }),
    history,
    quotes: [...quotes.values()],
  };
  for (const id of quotes.keys()) if (!used.has(id)) errors.push(`quote ${id}: not cited by any line`);
  return { explainer, errors };
}

/** Every line on the page, in reading order, for counts and the trust line. */
export function allLines(e: Explainer): CitedLine[] {
  return [...e.proposes, ...e.changes.flatMap((g) => g.lines), ...e.affects, ...e.personal.flatMap((r) => r.lines), ...e.takesEffect.map((t) => t.line)];
}

/**
 * JSON schema for an ExplainerDraft, for a model call with structured output.
 * A generated draft goes through verifyExplainer like a person's.
 */
export const EXPLAINER_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["author", "quotes", "proposes", "changes", "affects", "personal", "takesEffect"],
  properties: {
    author: { const: "model" },
    quotes: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "text"], properties: { id: { type: "string" }, text: { type: "string" } } } },
    proposes: { type: "array", items: { $ref: "#/$defs/line" } },
    changes: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["heading", "lines"], properties: { heading: { type: "string" }, lines: { type: "array", items: { $ref: "#/$defs/line" } } } },
    },
    affects: { type: "array", items: { $ref: "#/$defs/line" } },
    personal: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fact", "when", "effect", "lines"],
        properties: {
          fact: { enum: [...FACT_IDS] },
          when: { type: "boolean" },
          effect: { enum: ["direct", "possible"] },
          lines: { type: "array", items: { $ref: "#/$defs/line" } },
          notStated: { type: "object", additionalProperties: false, required: ["text", "terms"], properties: { text: { type: "string" }, terms: { type: "array", items: { type: "string" } } } },
        },
      },
    },
    takesEffect: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "line"],
        properties: { label: { type: "string" }, line: { $ref: "#/$defs/line" }, pastOn: { type: "string" } },
      },
    },
    versionNotes: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["text", "action"], properties: { text: { type: "string" }, action: { type: "string" } } },
    },
  },
  $defs: {
    line: { type: "object", additionalProperties: false, required: ["text", "quote"], properties: { text: { type: "string" }, quote: { type: "string" }, mark: { type: "string" } } },
  },
} as const;
