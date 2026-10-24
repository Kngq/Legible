// Ask a model to draft a bill explanation from the bill saved by
// `npm run data:bills`, check that every quote is real (verifyExplainer, prune
// mode), then have a separate model call judge whether each claim follows from
// its evidence (support.ts). Writes data/drafts/<bill>.json with the draft and
// the judgments. Sends only public text: the bill, its official history, and
// the fixed fact list.
//
//   npm run data:draft -- S2836 [H4699 ...]          draft, then check support
//   npm run data:draft -- --check S2836 [...]        re-check a saved draft
//   npm run data:draft -- --hand S2836 [...]         check a hand-written explainer
//                                                    (report only, data/reviews/)
//
// build-civic uses a draft only for a bill with no hand-written explainer in
// scripts/bills.content.ts (or with --prefer-drafts, to preview), drops every
// claim not judged supported, and ships the rest as an AI draft.
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { DRAFT_SYSTEM, draftPrompt } from "@/lib/explain/prompt";
import { applySupport, claimsOf, SUPPORT_SCHEMA, SUPPORT_SYSTEM, supportPrompt, type Judgment, type SupportRecord } from "@/lib/explain/support";
import type { ExplainerDraft, HistoryEntry } from "@/lib/explain/types";
import { allLines, EXPLAINER_DRAFT_SCHEMA, verifyExplainer } from "@/lib/explain/verify";
import { BILL_EXPLAINERS } from "./bills.content";

const MODEL = "claude-opus-5";
const root = path.resolve(__dirname, "..");
const SAVED = path.join(root, "data/official/bills");
const DRAFTS = path.join(root, "data/drafts");
const REVIEWS = path.join(root, "data/reviews");

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
  /** The support check; the build ships nothing from a draft without one. */
  support?: SupportRecord;
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

/** One structured-output call: the parsed JSON, the model that answered, and token counts. */
async function callJson<T>(client: Anthropic, bill: string, system: string, prompt: string, schema: object): Promise<{ value: T; model: string; usage: string }> {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema: schema as Record<string, unknown> } },
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error(`${bill}: the model declined (${message.stop_details?.category ?? "no category"})`);
  if (message.stop_reason === "max_tokens") throw new Error(`${bill}: the response was cut off at max_tokens`);
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error(`${bill}: no text in the response`);
  return { value: JSON.parse(block.text) as T, model: message.model, usage: `${message.usage.input_tokens} in / ${message.usage.output_tokens} out tokens` };
}

async function checkSupport(client: Anthropic, bill: string, draft: ExplainerDraft, history: HistoryEntry[], today: string): Promise<SupportRecord> {
  const claims = claimsOf(draft, history);
  const r = await callJson<{ judgments: Judgment[] }>(client, bill, SUPPORT_SYSTEM, supportPrompt(bill, claims), SUPPORT_SCHEMA);
  const keys = new Set(claims.map((c) => c.key));
  const judgments = r.value.judgments.filter((j) => keys.has(j.key));
  console.log(`  support check: ${r.model}, ${r.usage}`);
  return { model: r.model, checkedOn: today, judgments };
}

function reportSupport(draft: ExplainerDraft, history: HistoryEntry[], support: SupportRecord) {
  const claims = claimsOf(draft, history);
  const by = new Map(support.judgments.map((j) => [j.key, j]));
  const count = (v: string) => support.judgments.filter((j) => j.verdict === v).length;
  console.log(`  claims judged: ${support.judgments.length} of ${claims.length} (backed ${count("backed")}, partly ${count("partly")}, unbacked ${count("unbacked")})`);
  for (const c of claims) {
    const j = by.get(c.key);
    if (j?.verdict === "backed") continue;
    console.log(`  ${j ? j.verdict.toUpperCase() : "NOT JUDGED"} ${c.key}: "${c.claim}"`);
    if (j) console.log(`      ${j.reason}`);
  }
}

async function draftOne(client: Anthropic, bill: string, today: string, mode: "draft" | "check" | "hand"): Promise<void> {
  const { snap, text, history, title } = readBill(bill);
  const file = path.join(DRAFTS, `${bill}.json`);
  console.log(`\n${bill} (${mode})`);

  if (mode === "hand") {
    const hand = BILL_EXPLAINERS[bill];
    if (!hand) throw new Error(`${bill}: no hand-written explainer in scripts/bills.content.ts`);
    const support = await checkSupport(client, bill, hand, history, today);
    reportSupport(hand, history, support);
    fs.mkdirSync(REVIEWS, { recursive: true });
    fs.writeFileSync(path.join(REVIEWS, `${bill}.support.json`), JSON.stringify({ bill, fetchedOn: snap.fetchedOn, ...support }, null, 2) + "\n");
    console.log(`  wrote data/reviews/${bill}.support.json (a second opinion for the person reviewing; changes nothing)`);
    return;
  }

  let saved: SavedDraft;
  if (mode === "check") {
    if (!fs.existsSync(file)) throw new Error(`${bill}: no saved draft; run npm run data:draft -- ${bill}`);
    saved = JSON.parse(fs.readFileSync(file, "utf8")) as SavedDraft;
  } else {
    // Show the format with a hand-written draft for a different bill.
    const exampleBill = Object.keys(BILL_EXPLAINERS).find((b) => b !== bill);
    const example = exampleBill ? { bill: exampleBill, draft: BILL_EXPLAINERS[exampleBill] } : undefined;
    const r = await callJson<Omit<ExplainerDraft, "author">>(client, bill, DRAFT_SYSTEM, draftPrompt({ bill, title, pinslip: snap.document.Pinslip, text, history, today, example }), EXPLAINER_DRAFT_SCHEMA);
    console.log(`  draft: ${r.model}, ${r.usage}`);
    saved = { bill, model: r.model, generatedOn: today, fetchedOn: snap.fetchedOn, draft: { ...r.value, author: "model" } };
  }

  // 1. Quotes real, wording rules held: the same check the build runs.
  const source = { kind: "bill" as const, id: bill, title, url: `https://malegislature.gov/Bills/194/${bill}`, file: `/official/bills/${bill}.json`, hash: "", savedOn: snap.fetchedOn };
  const machine = verifyExplainer({ draft: saved.draft, text, history, source, mode: "prune" });
  console.log(`  quotes found word for word: ${machine.explainer.quotes.length} of ${saved.draft.quotes.length}`);
  for (const d of machine.dropped) console.log(`  machine check dropped: ${d}`);

  // 2. Each claim follows from its evidence.
  saved.support = await checkSupport(client, bill, saved.draft, history, today);
  reportSupport(saved.draft, history, saved.support);
  fs.mkdirSync(DRAFTS, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(saved, null, 2) + "\n");

  // What the build would ship: support-trimmed, then machine-checked.
  const shipped = verifyExplainer({ draft: applySupport(saved.draft, saved.support.judgments).draft, text, history, source, mode: "prune" });
  if (shipped.errors.length) console.log(`  WOULD NOT SHIP: ${shipped.errors.join("; ")}`);
  else console.log(`  would ship as an AI draft: ${allLines(shipped.explainer).length} lines, ${shipped.explainer.versionNotes.length} version notes`);
  console.log(`  wrote data/drafts/${bill}.json`);
}

async function main() {
  // The key lives in .env.local (never committed); the shell environment wins if set.
  if (!process.env.ANTHROPIC_API_KEY && fs.existsSync(path.join(root, ".env.local"))) process.loadEnvFile(path.join(root, ".env.local"));
  const args = process.argv.slice(2);
  const mode = args.includes("--hand") ? "hand" : args.includes("--check") ? "check" : "draft";
  const bills = args.filter((a) => /^[HS]\d+$/.test(a));
  if (!bills.length) throw new Error("usage: npm run data:draft -- [--check | --hand] S2836 [H4699 ...]");
  const client = new Anthropic();
  const today = new Date().toISOString().slice(0, 10);
  for (const bill of bills) {
    try {
      await draftOne(client, bill, today, mode);
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
