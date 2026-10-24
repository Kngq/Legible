// Build src/data/civic-ma.json from scripts/civic-ma.content.ts.
// Fails when a booklet quote is not found word for word, a source is not an
// official domain, app-written text uses a banned word, or a seed item is
// neither used nor listed as excluded.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CivicItem } from "@/lib/engine/civic";
import { verifyExplainer } from "@/lib/explain/verify";
import { findBannedWords } from "@/lib/vocab";
import { locateQuote, normalize } from "@/lib/verify/normalize";
import { BILL_EXPLAINERS } from "./bills.content";
import { CIVIC, EXCLUDED } from "./civic-ma.content";

const OFFICIAL_HOSTS = ["sec.state.ma.us", "malegislature.gov", "www.cambridgema.gov", "www.cpsd.us", "www.mass.gov", "www.VoteInMA.com"];

const root = path.resolve(__dirname, "..");
const pages: string[] = JSON.parse(fs.readFileSync(path.join(root, "data/official/IFV_2026_English.pages.json"), "utf8"));
const seed: { civic_items: { id: string }[] } = JSON.parse(fs.readFileSync(path.join(root, "data/legible_ma_seed.json"), "utf8"));

const errors: string[] = [];
const booklet = JSON.parse(fs.readFileSync(path.join(root, "src/data/ballot-2026.json"), "utf8")).source as { file: string; hash: string; savedOn: string };
const official = (url: string) => {
  try {
    const host = new URL(url).host;
    return OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`) || host.toLowerCase() === h.toLowerCase());
  } catch {
    return false;
  }
};

const warnings: string[] = [];
const BILLS_SAVED = path.join(root, "data/official/bills");
const BILLS_PUBLIC = path.join(root, "public/official/bills");

interface BillSnapshot {
  fetchedOn: string;
  source: string;
  document: { Title?: string; Pinslip?: string | null; DocumentText?: string | null };
  history: { Date: string; Branch: string; Action: string; IsStricken?: boolean }[];
}

/** A bill's saved original: read the snapshot from npm run data:bills, publish a reader copy. */
function billOriginal(c: (typeof CIVIC)[number]): Pick<CivicItem, "original" | "lastAction" | "explainer"> {
  const bill = c.source.url.match(/Bills\/\d+\/([HS]\d+)/)?.[1];
  const file = bill && path.join(BILLS_SAVED, `${bill}.json`);
  if (!bill || !file || !fs.existsSync(file)) {
    errors.push(`${c.id}: no saved bill snapshot; run npm run data:bills`);
    return {};
  }
  const raw = fs.readFileSync(file);
  const snap = JSON.parse(raw.toString("utf8")) as BillSnapshot;
  const text = (snap.document.DocumentText ?? "").replace(/\r\n/g, "\n").replace(/\t/g, "").trim();
  if (!text) errors.push(`${c.id}: the saved snapshot has no bill text`);
  const history = snap.history
    .filter((h) => !h.IsStricken)
    .map((h) => ({ date: h.Date.slice(0, 10), branch: h.Branch, action: h.Action }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = history[history.length - 1];
  if (latest && c.lastAction && latest.date !== c.lastAction.date) {
    warnings.push(`${c.id}: official history's latest action is ${latest.date}, the content says ${c.lastAction.date}; check "status"`);
  }
  fs.mkdirSync(BILLS_PUBLIC, { recursive: true });
  fs.writeFileSync(
    path.join(BILLS_PUBLIC, `${bill}.json`),
    JSON.stringify({ bill, title: snap.document.Title?.trim(), pinslip: snap.document.Pinslip ?? null, text, history, fetchedOn: snap.fetchedOn, source: snap.source }) + "\n",
  );
  const words = text.split(/\s+/).length;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  // A structured explanation, if one is written: every quote found in this saved text, or the build fails.
  let explainer: CivicItem["explainer"];
  const draft = BILL_EXPLAINERS[bill];
  if (draft) {
    const title = snap.document.Title?.trim() ?? bill;
    const r = verifyExplainer({ draft, text, history, source: { kind: "bill", id: bill, title, url: c.source.url, file: `/official/bills/${bill}.json`, hash, savedOn: snap.fetchedOn } });
    for (const e of r.errors) errors.push(`${c.id} explainer: ${e}`);
    explainer = r.explainer;
  }
  return {
    explainer,
    // The official history is the truth for the latest action.
    lastAction: latest ? { date: latest.date, text: `${latest.branch}: ${latest.action}` } : c.lastAction,
    original: {
      kind: "bill",
      label: `Bill text and history from the Legislature, saved ${snap.fetchedOn}`,
      file: `/official/bills/${bill}.json`,
      url: c.source.url,
      hash,
      savedOn: snap.fetchedOn,
      note: `${words.toLocaleString("en-US")} words of bill text and ${history.length} official actions.`,
    },
  };
}

const AGENDAS_SAVED = path.join(root, "data/official/agendas");
const AGENDAS_PUBLIC = path.join(root, "public/official/agendas");

/**
 * A meeting's original is its posted agenda. Save the PDF as
 * data/official/agendas/<item id>.pdf once it is posted; until then the item says
 * no agenda is posted (none), and never lists agenda items.
 */
function meetingOriginal(c: (typeof CIVIC)[number]): Pick<CivicItem, "original"> {
  const file = path.join(AGENDAS_SAVED, `${c.id}.pdf`);
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file);
    fs.mkdirSync(AGENDAS_PUBLIC, { recursive: true });
    fs.copyFileSync(file, path.join(AGENDAS_PUBLIC, `${c.id}.pdf`));
    return {
      original: {
        kind: "agenda",
        label: `Posted agenda, saved ${fs.statSync(file).mtime.toISOString().slice(0, 10)}`,
        file: `/official/agendas/${c.id}.pdf`,
        url: c.source.url,
        hash: crypto.createHash("sha256").update(raw).digest("hex"),
        savedOn: fs.statSync(file).mtime.toISOString().slice(0, 10),
      },
    };
  }
  return {
    original: {
      kind: "none",
      label: "No agenda posted yet",
      url: c.source.url,
      note: "No agenda is posted for this meeting yet. When it is posted, Legible saves it here with its fingerprint. Until then, the official page has the latest.",
    },
  };
}

const items: CivicItem[] = CIVIC.map((c) => {
  const { seedId: _seedId, check, ...rest } = c;
  void _seedId;
  if (!official(c.source.url)) errors.push(`${c.id}: source is not an official domain: ${c.source.url}`);
  for (const a of c.actions) if (a.url && !official(a.url)) errors.push(`${c.id}: action link is not official: ${a.url}`);
  for (const [field, text] of [["title", c.title], ["summary", c.summary], ...c.actions.map((a) => ["action", a.label])]) {
    const hits = findBannedWords(text);
    if (hits.length) errors.push(`${c.id}: banned word in ${field}: ${hits.join(", ")}`);
  }
  if (/illustrative/i.test(c.summary + c.title)) errors.push(`${c.id}: illustrative text`);

  if (check.kind === "booklet") {
    const where = locateQuote(check.quote.text, pages, check.quote.page);
    if (!where) errors.push(`${c.id}: booklet quote not found word for word: "${check.quote.text.slice(0, 70)}..."`);
    return {
      ...rest,
      check: { kind: "quote", quote: { id: `${c.id}-quote`, text: normalize(check.quote.text), page: where?.page, locator: check.quote.locator, status: where ? "verified" : "failed" } },
      // The original is the booklet itself: the quoted words, the page, and the PDF's fingerprint.
      original: {
        kind: "booklet",
        label: `Information for Voters 2026, page ${where?.page ?? "?"}`,
        text: normalize(check.quote.text),
        file: `${booklet.file}#page=${where?.page ?? 1}`,
        url: c.source.url,
        hash: booklet.hash,
        savedOn: booklet.savedOn,
      },
    };
  }
  if (c.kind === "bill") return { ...rest, check, ...billOriginal(c) };
  if (c.kind === "meeting") return { ...rest, check, ...meetingOriginal(c) };
  return { ...rest, check };
});

const used = new Set(CIVIC.map((c) => c.seedId).filter(Boolean));
for (const s of seed.civic_items) {
  if (!used.has(s.id) && !EXCLUDED[s.id]) errors.push(`seed item ${s.id} is neither used nor excluded`);
}
for (const bill of Object.keys(BILL_EXPLAINERS)) {
  if (!items.some((i) => i.explainer?.source.id === bill)) errors.push(`explainer for ${bill}: no bill item uses it`);
}
const ids = items.map((i) => i.id);
if (new Set(ids).size !== ids.length) errors.push("duplicate item ids");

if (errors.length) {
  console.error(`civic build failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

for (const i of items) if (!i.original) errors.push(`${i.id}: no original, and no statement that none exists`);
for (const w of warnings) console.warn(`warning: ${w}`);
const out = path.join(root, "src/data/civic-ma.json");
fs.writeFileSync(out, JSON.stringify(items, null, 2) + "\n");
console.log(`wrote ${items.length} civic items to src/data/civic-ma.json`);
console.log(`left out ${Object.keys(EXCLUDED).length} seed items:`);
for (const [id, why] of Object.entries(EXCLUDED)) console.log(`  ${id}: ${why}`);
