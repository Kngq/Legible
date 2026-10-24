// Turn an ExplainerDraft into an Explainer by checking it against the saved
// official text. The same checks run for a person's draft (the build fails on
// any error) and for a model's (failed lines are dropped and listed; the result
// ships as an AI draft). Pure TypeScript.
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
  /** strict for a person's draft (default); prune for a model's. */
  mode?: "strict" | "prune";
}

export interface VerifyResult {
  explainer: Explainer;
  /** Problems that block shipping. */
  errors: string[];
  /** prune mode: what was removed and why. */
  dropped: string[];
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

export function verifyExplainer({ draft, text, source, history, mode = "strict" }: VerifyInput): VerifyResult {
  // strict (a person's draft): every problem is an error and the build fails.
  // prune (a model's draft): a line, note, or rule with a problem is dropped and listed;
  // only a draft left with nothing to say is an error.
  const errors: string[] = [];
  const dropped: string[] = [];
  const prune = mode === "prune";
  const body = normalize(text);
  const prefix = `bill-${source.id}`;
  const status = draft.reviewedBy ? "reviewed" : "verified";

  const quotes = new Map<string, Quote>();
  for (const q of draft.quotes) {
    const words = normalize(q.text);
    const at = body.indexOf(words);
    if (at < 0) (prune ? dropped : errors).push(`quote ${q.id}: not found word for word: "${words.slice(0, 70)}..."`);
    if (quotes.has(q.id)) errors.push(`quote ${q.id}: duplicate id`);
    quotes.set(q.id, { id: `${prefix}-${q.id}`, text: words, locator: (at >= 0 && sectionAt(body, at)) || "Bill text", status: at >= 0 ? status : "failed" });
  }

  const used = new Set<string>();
  /** Problems with one piece of text: banned words, and a claim not marked as proposed. */
  const problems = (where: string, s: string, conditional = true): string[] => {
    const out: string[] = [];
    const banned = findBannedWords(s);
    if (banned.length) out.push(`${where}: banned words ${banned.join(", ")}`);
    if (conditional && !CONDITIONAL.test(s)) out.push(`${where}: say it is proposed ("would", "could"): "${s}"`);
    return out;
  };
  /** In strict mode report and keep going; in prune mode report as dropped and tell the caller to drop. */
  const fail = (found: string[]): boolean => {
    if (!found.length) return false;
    (prune ? dropped : errors).push(...found);
    return prune;
  };
  const line = (l: DraftLine, where: string): CitedLine | null => {
    const found = problems(where, l.text);
    const q = quotes.get(l.quote);
    if (!q) {
      (prune ? dropped : errors).push(...found, `${where}: cites unknown quote "${l.quote}"`);
      return null;
    }
    used.add(l.quote);
    if (q.status === "failed") {
      if (prune) dropped.push(`${where}: cites a quote that was not found`);
      return null;
    }
    if (l.mark && !q.text.includes(normalize(l.mark))) found.push(`${where}: mark is not in quote ${l.quote}`);
    if (fail(found)) return null;
    return { text: l.text, quoteId: q.id, ...(l.mark ? { mark: normalize(l.mark) } : {}) };
  };
  const lines = (ls: DraftLine[], where: string) => ls.map((l, i) => line(l, `${where}[${i}]`)).filter((l): l is CitedLine => l !== null);

  if (draft.proposes.length === 0 || draft.proposes.length > 2) (prune && draft.proposes.length > 2 ? dropped : errors).push("proposes: 1 or 2 lines");
  const personal = draft.personal.flatMap((r) => {
    const where = `personal ${r.fact}`;
    const found: string[] = [];
    if (!(FACT_IDS as readonly string[]).includes(r.fact)) found.push(`${where}: unknown fact`);
    if (r.lines.length === 0 || r.lines.length > 2) found.push(`${where}: 1 or 2 lines`);
    let notStated = r.notStated;
    if (notStated) {
      const ns = problems(`${where} notStated`, notStated.text, false);
      if (r.effect !== "possible") ns.push(`${where}: notStated belongs to a possible effect`);
      const present = termsPresent(body, notStated.terms);
      if (present.length) ns.push(`${where}: notStated says the text does not mention ${present.join(", ")}, but it does`);
      if (fail(ns)) notStated = undefined;
    }
    if (fail(found)) return [];
    const kept = lines(r.lines.slice(0, prune ? 2 : undefined), where);
    if (prune && kept.length === 0) return [];
    return [{ fact: r.fact, when: r.when, effect: r.effect, lines: kept, ...(notStated ? { notStated } : {}) }];
  });
  const explainer: Explainer = {
    source,
    provenance: draft.author === "model" && !draft.reviewedBy ? "ai_draft" : status,
    proposes: lines(draft.proposes.slice(0, prune ? 2 : undefined), "proposes"),
    changes: draft.changes.flatMap((g, i) => {
      if (fail(problems(`changes[${i}] heading`, g.heading, false))) return [];
      const kept = lines(g.lines, `changes "${g.heading}"`);
      return prune && kept.length === 0 ? [] : [{ heading: g.heading, lines: kept }];
    }),
    affects: lines(draft.affects, "affects"),
    personal,
    takesEffect: draft.takesEffect.flatMap((t, i) => {
      const found = problems(`takesEffect[${i}] label`, t.label, false);
      if (t.pastOn && !/^\d{4}-\d{2}-\d{2}$/.test(t.pastOn)) found.push(`takesEffect[${i}]: pastOn is not YYYY-MM-DD`);
      if (fail(found)) return [];
      const l = line(t.line, `takesEffect[${i}]`);
      return l ? [{ label: t.label, line: l, ...(t.pastOn ? { pastOn: t.pastOn } : {}) }] : [];
    }),
    versionNotes: (draft.versionNotes ?? []).flatMap((n, i) => {
      const found = problems(`versionNotes[${i}]`, n.text, false);
      const entry = history.find((h) => normalize(h.action).includes(normalize(n.action)));
      if (!entry) found.push(`versionNotes[${i}]: no official history entry says "${n.action}"`);
      if (fail(found) || !entry) return [];
      return [{ text: n.text, entry: { ...entry, action: normalize(entry.action) } }];
    }),
    history,
    quotes: [...quotes.values()].filter((q) => !prune || q.status !== "failed"),
  };
  if (!prune) for (const id of quotes.keys()) if (!used.has(id)) errors.push(`quote ${id}: not cited by any line`);
  if (prune && explainer.proposes.length === 0) errors.push("proposes: no line survived verification");
  return { explainer, errors, dropped };
}

/** Every line on the page, in reading order, for counts and the trust line. */
export function allLines(e: Explainer): CitedLine[] {
  return [...e.proposes, ...e.changes.flatMap((g) => g.lines), ...e.affects, ...e.personal.flatMap((r) => r.lines), ...e.takesEffect.map((t) => t.line)];
}

/**
 * JSON schema for an ExplainerDraft without `author`, for a model call with
 * structured output. The caller sets author "model"; the draft then goes through
 * verifyExplainer in prune mode.
 */
export const EXPLAINER_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["quotes", "proposes", "changes", "affects", "personal", "takesEffect", "versionNotes"],
  properties: {
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
