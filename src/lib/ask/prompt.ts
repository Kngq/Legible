// The rules Kiro answers by, and the checks every answer passes before it is
// shown. Pure TypeScript, shared by the ask route and its tests.
import type { Quote } from "@/lib/engine/types";
import { BANNED_WORDS, FACT_DEFS, findBannedWords } from "@/lib/vocab";
import type { Grounding } from "./ground";

export type Part = "means" | "matters" | "you" | "answer";
export const PART_LABEL: Record<Part, string> = {
  means: "What it means",
  matters: "Why it matters",
  you: "How it could affect you",
  answer: "",
};

export interface Turn {
  question: string;
  answer: string;
}

export interface Sentence {
  text: string;
  quoteId: string;
  part: Part;
}

/** Personal context may only be one of Legible's own fact phrases ("you rent"), never free text. */
const ALLOWED_PERSONAL = new Set(Object.values(FACT_DEFS).flatMap((d) => [d.because.yes, d.because.no]));

export function sanitizePersonal(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((x): x is string => typeof x === "string" && ALLOWED_PERSONAL.has(x)))].slice(0, 4);
}

/** The last few turns about the same document, trimmed, so "this" in a follow-up has a referent. */
export function sanitizeHistory(list: unknown): Turn[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((t): t is Turn => Boolean(t) && typeof t.question === "string" && typeof t.answer === "string")
    .slice(-4)
    .map((t) => ({ question: t.question.slice(0, 300), answer: t.answer.slice(0, 700) }));
}

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answered: { type: "boolean" },
    sentences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          quoteId: { type: "string" },
          part: { type: "string", enum: ["means", "matters", "you", "answer"] },
        },
        required: ["text", "quoteId", "part"],
        additionalProperties: false,
      },
    },
  },
  required: ["answered", "sentences"],
  additionalProperties: false,
};

export function systemPrompt(g: Grounding, opts: { mode: "explain" | "ask"; passage?: string; personal: string[] }): string {
  const quotes = g.quotes
    .map((q) => `- id: ${q.id}\n  locator: ${q.locator}${q.page ? ` (page ${q.page})` : ""}\n  text: "${q.text}"`)
    .join("\n");
  const passage =
    opts.passage && g.passageQuoteId
      ? `The person highlighted these exact words, found in quote ${g.passageQuoteId}:\n"${opts.passage.trim()}"\nTheir question is about these words. Read the quote around them to see who and what they apply to.`
      : "Nothing was highlighted; answer about the document as a whole.";
  const personal = opts.personal.length
    ? `The person chose to share: ${opts.personal.join("; ")}. Use this only where the text shows a connection. Separate a direct legal effect (what the text itself changes for someone in their situation) from a possible indirect effect (for example on prices or availability), and say so plainly when the text does not directly change their situation. Never infer anything else about them.`
    : 'Nothing about the person was shared. Do not guess anything about them, and do not write a "you" part.';
  const shape =
    opts.mode === "explain"
      ? `Explain the highlighted words for someone with no legal background, in at most 5 short sentences:
- part "means": 1 or 2 sentences on what the words say, in everyday English.
- part "matters": 1 or 2 sentences on the practical effect the text shows.
- part "you": at most 1 sentence, only if the person shared something relevant.`
      : `Answer the question in at most 4 short sentences, every one with part "answer". Earlier turns in this conversation tell you what "this" or "it" refers to, but answers still come only from the quotes.`;
  return `You are Kiro, the assistant in Legible, which explains public decisions in Massachusetts using official text only.

Document: ${g.title}. It is ${g.status}.

${passage}

${personal}

${shape}

Rules, non-negotiable:
- Use only the quotes below. No outside knowledge, news, predictions, or estimates.
- Every sentence cites exactly one quote id from the list, the one it rests on.
- Keep what the text says apart from what could happen: use "would" for what the law does and "could" for possible effects.
- Never invent amounts, dates, penalties, who is affected, or legal consequences. If the quotes do not settle the question (for example who would pay a fine), say that the official text here does not say, and cite the highlighted quote.
- Never tell anyone how to vote or which side to take. Never use these words: ${BANNED_WORDS.join(", ")}.
- If none of the quotes help, set "answered" to false with no sentences.

Quotes:
${quotes}`;
}

/** Keep an answer only if every sentence cites a known quote, uses an allowed part, and passes the word check. */
export function checkAnswer(
  parsed: { answered: boolean; sentences: Sentence[] } | null,
  quotes: Quote[],
  opts: { mode: "explain" | "ask"; personal: string[] },
): Sentence[] | null {
  if (!parsed?.answered || !parsed.sentences.length) return null;
  const ids = new Set(quotes.map((q) => q.id));
  const allowed: Part[] = opts.mode === "explain" ? ["means", "matters", ...(opts.personal.length ? (["you"] as Part[]) : [])] : ["answer"];
  const ok = parsed.sentences.every((s) => ids.has(s.quoteId) && allowed.includes(s.part) && findBannedWords(s.text).length === 0);
  return ok ? parsed.sentences : null;
}
