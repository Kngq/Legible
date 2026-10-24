import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AskSource } from "@/lib/ask/context";
import { ground } from "@/lib/ask/ground";
import { asksHowToVote, BANNED_WORDS, findBannedWords } from "@/lib/vocab";

/**
 * Suggest route: three short questions about a highlighted official passage.
 * Receives only the source id and the highlighted words (public text); never the
 * profile. The passage must be found in the official text. With no API key it
 * answers 503 and the browser keeps its rule-based questions.
 */

const SCHEMA = {
  type: "object",
  properties: { questions: { type: "array", items: { type: "string" } } },
  required: ["questions"],
  additionalProperties: false,
};

export async function POST(request: Request) {
  let body: { source?: { kind?: unknown; id?: unknown; title?: unknown }; passage?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const s = body.source;
  const passage = typeof body.passage === "string" ? body.passage.trim() : "";
  if (!s || !["ballot", "bill", "civic"].includes(String(s.kind)) || typeof s.id !== "string" || passage.length < 3 || passage.length > 1200) {
    return NextResponse.json({ error: "Missing source or passage." }, { status: 400 });
  }
  const source: AskSource = { kind: s.kind as AskSource["kind"], id: s.id, title: typeof s.title === "string" ? s.title : s.id };
  const g = ground(source, passage);
  if (!g?.passageFound) return NextResponse.json({ error: "That passage is not in the official text." }, { status: 422 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const context = g.quotes.find((q) => q.id === g.passageQuoteId)?.text ?? passage;
  const system = `You write follow-up questions for Legible, which explains Massachusetts public decisions using official text.
Document: ${g.title}. It is ${g.status}.
Write exactly 3 short questions (under 70 characters each) that a person with no legal background would ask about the highlighted words: what they mean in practice, who they apply to, what would change. Write them in the first person when natural ("my neighborhood", "renters like me").
Never ask how to vote or which side to take. Never use these words: ${BANNED_WORDS.join(", ")}. Do not state facts in the questions.

Text around the highlight, from the official source:
"${context}"`;

  try {
    const message = await new Anthropic({ apiKey }).messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      system,
      messages: [{ role: "user", content: `Highlighted: "${passage}"` }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });
    const block = message.content.find((c) => c.type === "text");
    const parsed = JSON.parse(block && block.type === "text" ? block.text : "{}") as { questions?: unknown };
    const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.trim())
      .filter((q) => q.length > 5 && q.length <= 90 && !findBannedWords(q).length && !asksHowToVote(q))
      .slice(0, 3);
    if (!questions.length) return NextResponse.json({ error: "No usable questions." }, { status: 502 });
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: "The model request failed." }, { status: 502 });
  }
}
