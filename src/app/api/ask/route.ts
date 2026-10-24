import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import ballot2026 from "@/data/ballot-2026.json";
import type { DocumentData, Quote } from "@/lib/engine/types";
import type { AskSource } from "@/lib/ask/context";
import { ground, type Grounding } from "@/lib/ask/ground";
import { checkAnswer, RESPONSE_SCHEMA, sanitizeHistory, sanitizePersonal, systemPrompt, type Sentence } from "@/lib/ask/prompt";
import { asksHowToVote, VOTE_FIXED_RESPONSE } from "@/lib/vocab";

/**
 * Ask route (see .kiro/specs/legible/design.md, "Ask route" and "Chat dock").
 *
 * Only public document text, a source and measure id, the highlighted words, the
 * question, and earlier turns reach here. Profile data never does, except fact
 * phrases the person switched on ("you rent"), checked against Legible's own list. The model answers from the given
 * quotes only; every sentence is citation- and banned-word-checked before it
 * is returned, so a failure on either axis replaces the whole answer.
 */

const FIXED_NO_ANSWER = "The official text does not answer this.";

const DOCUMENT = ballot2026 as unknown as DocumentData;

const MAX_QUESTION_LENGTH = 300;
const MAX_PASSAGE_LENGTH = 1200;
const NOT_OFFICIAL = "Kiro can only explain the official wording, and that highlight isn't in the official text it has for this document. Try highlighting the official words.";

interface AskRequestBody {
  documentId?: string;
  measureId?: string;
  question?: string;
  /** Highlight-to-ask context: the document, the highlighted words, and how to answer. */
  source?: unknown;
  passage?: unknown;
  mode?: unknown;
  /** Earlier turns about the same document, for follow-up questions. */
  history?: unknown;
  /** Fact phrases the person chose to share ("you rent"); checked against Legible's own list. */
  personal?: unknown;
}

/** Every measure's summary and outcome quotes, for questions about the whole ballot. */
function quotesInScope(): Quote[] {
  return DOCUMENT.measures.flatMap((m) => [m.summary, m.outcomes.yes, m.outcomes.no, m.outcomes.effect].filter((x): x is Quote => Boolean(x)));
}

function parseModelJson(raw: string): { answered: boolean; sentences: Sentence[] } | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.answered === "boolean" &&
      Array.isArray(parsed.sentences) &&
      parsed.sentences.every(
        (s: unknown) =>
          typeof s === "object" && s !== null && typeof (s as Sentence).text === "string" && typeof (s as Sentence).quoteId === "string" && typeof (s as Sentence).part === "string",
      )
    ) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

export async function POST(request: Request) {
  let body: AskRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: "Question is missing or too long." }, { status: 400 });
  }
  const mode = body.mode === "explain" ? "explain" : "ask";
  const passage = typeof body.passage === "string" && body.passage.length <= MAX_PASSAGE_LENGTH ? body.passage : undefined;
  const personal = sanitizePersonal(body.personal);
  const history = sanitizeHistory(body.history);
  const source = parseSource(body.source) ?? (body.measureId ? { kind: "ballot" as const, id: body.measureId, title: body.measureId } : undefined);
  const sent = { documentId: DOCUMENT.id, measureId: source?.kind === "ballot" ? source.id : null, question, passage: Boolean(passage), personal };

  // Defense in depth: the browser already checks this before sending.
  if (asksHowToVote(question)) {
    return NextResponse.json({ fixed: true, message: VOTE_FIXED_RESPONSE, sent });
  }

  // What Kiro may answer from: a grounded source, or every measure's summary and outcomes.
  let g: Grounding | null;
  if (source) {
    g = ground(source, passage);
    if (g && passage && !g.passageFound) {
      return NextResponse.json({ fixed: true, message: NOT_OFFICIAL, sent });
    }
  } else {
    const quotes = quotesInScope();
    g = quotes.length ? { status: "the set of 9 statewide ballot questions on the November 3, 2026 ballot", title: "The 2026 Massachusetts ballot", quotes, passageFound: true } : null;
  }
  if (!g) return NextResponse.json({ fixed: true, message: FIXED_NO_ANSWER, sent });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not_configured", message: "Chat is not configured on this server." }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey });
  const system = systemPrompt(g, { mode, passage, personal });
  const messages = [
    ...history.flatMap((t) => [
      { role: "user" as const, content: t.question },
      { role: "assistant" as const, content: t.answer },
    ]),
    { role: "user" as const, content: question },
  ];

  let raw: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 900,
      system,
      messages,
      output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
    });
    const block = message.content.find((c) => c.type === "text");
    raw = block && block.type === "text" ? block.text : "";
  } catch {
    return NextResponse.json({ error: "The model request failed." }, { status: 502 });
  }

  const sentences = checkAnswer(parseModelJson(raw), g.quotes, { mode, personal });
  if (!sentences) return NextResponse.json({ fixed: true, message: FIXED_NO_ANSWER, sent });

  const quoteById = new Map(g.quotes.map((q) => [q.id, q]));
  return NextResponse.json({
    fixed: false,
    sentences: sentences.map((s) => ({ ...s, quote: quoteById.get(s.quoteId)! })),
    source: { title: g.title, url: g.url },
    sent,
  });
}

function parseSource(x: unknown): AskSource | undefined {
  if (!x || typeof x !== "object") return undefined;
  const s = x as Record<string, unknown>;
  if (!["ballot", "bill", "civic"].includes(String(s.kind)) || typeof s.id !== "string" || s.id.length > 64) return undefined;
  return { kind: s.kind as AskSource["kind"], id: s.id, title: typeof s.title === "string" ? s.title.slice(0, 160) : s.id };
}
