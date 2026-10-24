// Ask a model to draft a bill explanation from the bill saved by
// `npm run data:bills`, then check it with verifyExplainer in prune mode and
// write it to data/drafts/<bill>.json. Sends only public text: the bill, its
// official history, and the fixed fact list.
//
//   npm run data:draft -- S2836 [H4699 ...]
//
// build-civic uses a draft only for a bill with no hand-written explainer in
// scripts/bills.content.ts (or with --prefer-drafts, to preview), and ships it
// as an AI draft until a person reviews it.
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { DRAFT_SYSTEM, draftPrompt } from "@/lib/explain/prompt";
import type { ExplainerDraft, HistoryEntry } from "@/lib/explain/types";
import { allLines, EXPLAINER_DRAFT_SCHEMA, verifyExplainer } from "@/lib/explain/verify";
import { BILL_EXPLAINERS } from "./bills.content";

const MODEL = "claude-opus-5";
const root = path.resolve(__dirname, "..");
const SAVED = path.join(root, "data/official/bills");
const DRAFTS = path.join(root, "data/drafts");

interface Snapshot {
  fetchedOn: string;
  document: { Title?: string; Pinslip?: string | null; DocumentText?: string | null };
  history: { Date: string; Branch: string; Action: string; IsStricken?: boolean }[];
}

export interface SavedDraft {
  bill: string;
  model: string;
  generatedOn: string;
  /** The bill snapshot the draft was written from. */
  fetchedOn: string;
  draft: ExplainerDraft;
}

function readBill(bill: string) {
  const file = path.join(SAVED, `${bill}.json`);
  if (!fs.existsSync(file)) throw new Error(`${bill}: no saved snapshot; run npm run data:bills`);
  const snap = JSON.parse(fs.readFileSync(file, "utf8")) as Snapshot;
  const text = (snap.document.DocumentText ?? "").replace(/\r\n/g, "\n").replace(/\t/g, "").trim();
  const history: HistoryEntry[] = snap.history
    .filter((h) => !h.IsStricken)
    .map((h) => ({ date: h.Date.slice(0, 10), branch: h.Branch, action: h.Action }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { snap, text, history, title: snap.document.Title?.trim() ?? bill };
}

async function draftOne(client: Anthropic, bill: string, today: string): Promise<void> {
  const { snap, text, history, title } = readBill(bill);
  // Show the format with a reviewed draft for a different bill.
  const exampleBill = Object.keys(BILL_EXPLAINERS).find((b) => b !== bill);
  const example = exampleBill ? { bill: exampleBill, draft: BILL_EXPLAINERS[exampleBill] } : undefined;

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema: EXPLAINER_DRAFT_SCHEMA as unknown as Record<string, unknown> } },
    system: DRAFT_SYSTEM,
    messages: [{ role: "user", content: draftPrompt({ bill, title, pinslip: snap.document.Pinslip, text, history, today, example }) }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error(`${bill}: the model declined (${message.stop_details?.category ?? "no category"})`);
  if (message.stop_reason === "max_tokens") throw new Error(`${bill}: the draft was cut off at max_tokens`);
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error(`${bill}: no text in the response`);
  const draft: ExplainerDraft = { ...(JSON.parse(block.text) as Omit<ExplainerDraft, "author">), author: "model" };

  const saved: SavedDraft = { bill, model: message.model, generatedOn: today, fetchedOn: snap.fetchedOn, draft };
  fs.mkdirSync(DRAFTS, { recursive: true });
  fs.writeFileSync(path.join(DRAFTS, `${bill}.json`), JSON.stringify(saved, null, 2) + "\n");

  // The same check the build runs, reported here so a person sees what would ship.
  const source = { kind: "bill" as const, id: bill, title, url: `https://malegislature.gov/Bills/194/${bill}`, file: `/official/bills/${bill}.json`, hash: "", savedOn: snap.fetchedOn };
  const r = verifyExplainer({ draft, text, history, source, mode: "prune" });
  const written = draft.proposes.length + draft.changes.reduce((n, g) => n + g.lines.length, 0) + draft.affects.length + draft.personal.reduce((n, p) => n + p.lines.length, 0) + draft.takesEffect.length;
  const found = r.explainer.quotes.length;
  console.log(`\n${bill}: ${message.model}, ${message.usage.input_tokens} in / ${message.usage.output_tokens} out tokens`);
  console.log(`  quotes found word for word: ${found} of ${draft.quotes.length}`);
  console.log(`  lines kept: ${allLines(r.explainer).length} of ${written}; version notes kept: ${r.explainer.versionNotes.length} of ${draft.versionNotes?.length ?? 0}`);
  for (const d of r.dropped) console.log(`  dropped: ${d}`);
  for (const e of r.errors) console.log(`  BLOCKS SHIPPING: ${e}`);
  console.log(`  wrote data/drafts/${bill}.json`);
}

async function main() {
  // The key lives in .env.local (never committed); the shell environment wins if set.
  if (!process.env.ANTHROPIC_API_KEY && fs.existsSync(path.join(root, ".env.local"))) process.loadEnvFile(path.join(root, ".env.local"));
  const bills = process.argv.slice(2).filter((a) => /^[HS]\d+$/.test(a));
  if (!bills.length) throw new Error("usage: npm run data:draft -- S2836 [H4699 ...]");
  const client = new Anthropic();
  const today = new Date().toISOString().slice(0, 10);
  for (const bill of bills) {
    try {
      await draftOne(client, bill, today);
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new Error("No valid API key: set ANTHROPIC_API_KEY in .env.local or run ant auth login");
      if (e instanceof Anthropic.RateLimitError) throw new Error("Rate limited: try again in a minute");
      if (e instanceof Anthropic.APIError) console.error(`${bill}: API error ${e.status}: ${e.message}`);
      else console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
    }
  }
}

main();
