import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import ballot2026 from "@/data/ballot-2026.json";
import type { DocumentData, Quote } from "@/lib/engine/types";
import { asksHowToVote, BANNED_WORDS, findBannedWords, VOTE_FIXED_RESPONSE } from "@/lib/vocab";

/**
 * Ask route (see .kiro/specs/legible/design.md, "Ask route" and "Chat dock").
 *
 * Only public document text, a measure id, and the question ever reach here.
 * No life profile data is accepted or read. The model answers from the given
 * quotes only; every sentence is citation- and banned-word-checked before it
 * is returned, so a failure on either axis replaces the whole answer.
 */

const FIXED_NO_ANSWER = "The official text does not answer this.";

const DOCUMENT = ballot2026 as unknown as DocumentData;

const MAX_QUESTION_LENGTH = 300;

interface AskRequestBody {
  documentId?: string;
  measureId?: string;
  question?: string;
}

interface ModelSentence {
  text: string;
  quoteId: string;
}

interface ModelResponse {
  answered: boolean;
  sentences: ModelSentence[];
}

function quotesInScope(measureId?: string): Quote[] {
  if (!measureId) {
    // No single measure selected: ground answers in every measure's summary
    // and outcome quotes, which keeps the prompt small but still citable.
    return DOCUMENT.measures.flatMap((m) => {
      const q = [m.summary, m.outcomes.yes, m.outcomes.no, m.outcomes.effect].filter(
        (x): x is Quote => Boolean(x),
      );
      return q;
    });
  }
  const measure = DOCUMENT.measures.find((m) => m.id === measureId);
  return measure ? measure.quotes : [];
}

const RESPONSE_SCHEMA = {
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
        },
        required: ["text", "quoteId"],
        additionalProperties: false,
      },
    },
  },
  required: ["answered", "sentences"],
  additionalProperties: false,
};

function parseModelJson(raw: string): ModelResponse | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.answered === "boolean" &&
      Array.isArray(parsed.sentences) &&
      parsed.sentences.every(
        (s: unknown) =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as ModelSentence).text === "string" &&
          typeof (s as ModelSentence).quoteId === "string",
      )
    ) {
      return parsed as ModelResponse;
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

  // Defense in depth: the browser already checks this before sending.
  if (asksHowToVote(question)) {
    return NextResponse.json({
      fixed: true,
      message: VOTE_FIXED_RESPONSE,
      sent: { documentId: DOCUMENT.id, measureId: body.measureId ?? null, question },
    });
  }

  const quotes = quotesInScope(body.measureId);
  if (quotes.length === 0) {
    return NextResponse.json({
      fixed: true,
      message: FIXED_NO_ANSWER,
      sent: { documentId: DOCUMENT.id, measureId: body.measureId ?? null, question },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chat is not configured on this server." }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey });

  const quoteList = quotes
    .map((q) => `- id: ${q.id}\n  locator: ${q.locator}${q.page ? ` (page ${q.page})` : ""}\n  text: "${q.text}"`)
    .join("\n");

  // The banned list comes from vocab so this prompt holds no banned literals of its own.
  const system = `You are the assistant inside Legible, an app that explains the 9 Massachusetts ballot questions on the Nov 3, 2026 state ballot using only the Attorney General's official text.

Rules, non-negotiable:
- Answer only using the quotes listed below. Never use outside knowledge about these measures, current events, or predictions.
- Every sentence you write must cite exactly one quote id from the list.
- Never tell anyone how to vote or which side to take. Never use these words in your own sentences: ${BANNED_WORDS.join(", ")}.
- Keep the answer to at most 4 short sentences.
- If none of the quotes actually answer the question, set "answered" to false and return an empty sentence list — do not guess.

Quotes:
${quoteList}`;

  let raw: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: question }],
      output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
    });
    const block = message.content.find((c) => c.type === "text");
    raw = block && block.type === "text" ? block.text : "";
  } catch {
    return NextResponse.json({ error: "The model request failed." }, { status: 502 });
  }

  const parsed = parseModelJson(raw);
  const knownQuoteIds = new Set(quotes.map((q) => q.id));
  const quoteById = new Map(quotes.map((q) => [q.id, q]));

  const verified =
    parsed &&
    parsed.answered &&
    parsed.sentences.length > 0 &&
    parsed.sentences.every(
      (s) => knownQuoteIds.has(s.quoteId) && findBannedWords(s.text).length === 0,
    );

  const sent = { documentId: DOCUMENT.id, measureId: body.measureId ?? null, question };

  if (!verified) {
    return NextResponse.json({ fixed: true, message: FIXED_NO_ANSWER, sent });
  }

  const sentences = parsed!.sentences.map((s) => ({
    text: s.text,
    quoteId: s.quoteId,
    quote: quoteById.get(s.quoteId)!,
  }));

  return NextResponse.json({ fixed: false, sentences, sent });
}
