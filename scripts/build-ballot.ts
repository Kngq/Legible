// Convert data/questions.json + hand-authored content into src/data/ballot-2026.json
// in the DocumentData format. Every quote is located word for word in the official
// booklet's page text; the build fails if any quote is missing.
//
//   npx tsx scripts/build-ballot.ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DocumentData, Measure, Quote, WhySentence } from "@/lib/engine/types";
import { findBannedWords } from "@/lib/vocab";
import { locateQuote, normalize } from "@/lib/verify/normalize";
import { CONTENT, DOCUMENT } from "./ballot-2026.content";

interface RawQuestion {
  id: number;
  official_title: string;
  type: "initiative" | "referendum";
  ag_summary: string;
  yes_means: string;
  no_means: string;
  fiscal_statement: string | null;
  full_text_url: string;
}

const root = path.resolve(__dirname, "..");
const raw: RawQuestion[] = JSON.parse(
  fs.readFileSync(path.join(root, "data/questions.json"), "utf8"),
);
const pages: string[] = JSON.parse(
  fs.readFileSync(path.join(root, "data/official/IFV_2026_English.pages.json"), "utf8"),
);
const normPages = pages.map(normalize);

const errors: string[] = [];

// Where each question's full law sits in the booklet. Checked below: every page in
// the range must carry that question's "Full Text of ... Law" heading.
const FULL_TEXT_PAGES: Record<number, [number, number]> = {
  1: [36, 36],
  2: [36, 36],
  3: [36, 38],
  4: [38, 39],
  5: [40, 40],
  6: [40, 41],
  7: [41, 41],
  8: [42, 44],
  9: [45, 85],
};
const PDF_PUBLIC = "/official/IFV_2026_English.pdf";
const FULL_DIR = path.join(root, "public/official/ballot-2026");

function fullText(n: number): Measure["fullText"] {
  const [from, to] = FULL_TEXT_PAGES[n] ?? [0, -1];
  let label: string | undefined;
  for (let pg = from; pg <= to; pg++) {
    const m = (pages[pg - 1] ?? "").match(new RegExp(`QUESTION\\s+${n}:\\s*Full Text of (Proposed|Existing) Law`));
    if (!m) errors.push(`Q${n}: page ${pg} has no "QUESTION ${n}: Full Text" heading`);
    else label ??= `Full Text of ${m[1]} Law`;
  }
  if (!label) return undefined;
  const file = `ballot-2026-q${n}.json`;
  const pageTexts = [];
  for (let pg = from; pg <= to; pg++) pageTexts.push({ page: pg, text: pages[pg - 1] });
  fs.mkdirSync(FULL_DIR, { recursive: true });
  fs.writeFileSync(path.join(FULL_DIR, file), JSON.stringify({ measureId: `ballot-2026-q${n}`, label, pdf: PDF_PUBLIC, pages: pageTexts }) + "\n");
  return { label, pages: [from, to], pdf: PDF_PUBLIC, pageText: `/official/ballot-2026/${file}` };
}

/** The extractor cut some summaries at a page-number line. Re-read the summary from its page. */
function repairSummary(q: RawQuestion): string {
  const head = normalize(q.ag_summary).slice(0, 80);
  for (let i = 0; i < normPages.length; i++) {
    const start = normPages[i].indexOf(head);
    if (start < 0) continue;
    const marker = `QUESTION ${q.id}:`;
    const end = normPages[i].indexOf(marker, start);
    if (end > start) return normPages[i].slice(start, end).trim();
  }
  errors.push(`Q${q.id}: summary start not found in any page`);
  return normalize(q.ag_summary);
}

/** Read the fiscal statement from the question's own pages: after the A&F credit, before the arguments. */
function readFiscal(q: RawQuestion, summaryPage: number | undefined): string | null {
  if (!summaryPage) return null;
  for (const i of [summaryPage - 1, summaryPage]) {
    const page = normPages[i] ?? "";
    const credit = "Administration and Finance.";
    const start = page.indexOf(credit);
    if (start < 0) continue;
    const body = page.slice(start + credit.length);
    const end = Math.min(...["ARGUMENTS", "IN FAVOR", "QUESTION "].map((m) => body.indexOf(m)).filter((n) => n >= 0));
    const text = (Number.isFinite(end) ? body.slice(0, end) : body).trim();
    if (text.length > 20) return text;
  }
  errors.push(`Q${q.id}: fiscal statement not found on pages ${summaryPage}-${summaryPage + 1}`);
  return null;
}

function makeQuote(id: string, text: string, locator: string, reviewed: boolean, hintPage?: number): Quote {
  const where = locateQuote(text, pages, hintPage);
  if (!where) errors.push(`${id}: quote not found word for word: "${text.slice(0, 70)}..."`);
  return {
    id,
    text: normalize(text),
    page: where?.page,
    locator,
    status: where ? (reviewed ? "reviewed" : "verified") : "failed",
  };
}

const measures: Measure[] = CONTENT.map((c) => {
  const q = raw.find((r) => r.id === c.number);
  if (!q) throw new Error(`No raw question ${c.number}`);
  const p = `q${c.number}`;
  const reviewed = Boolean(c.reviewedBy);

  const summary = makeQuote(`${p}-summary`, repairSummary(q), "AG summary", reviewed);
  const hint = summary.page;
  const quotes: Record<string, Quote> = {
    summary,
    yes: makeQuote(`${p}-yes`, q.yes_means, "YES statement", reviewed, hint),
    no: makeQuote(`${p}-no`, q.no_means, "NO statement", reviewed, hint),
  };
  const fiscal = readFiscal(q, hint);
  if (fiscal) quotes.fiscal = makeQuote(`${p}-fiscal`, fiscal, "Fiscal statement", reviewed, hint);
  for (const e of c.quotes) quotes[e.id] = makeQuote(`${p}-${e.id}`, e.text, e.locator, reviewed, hint);

  const why = (w: { text: string; quote: string }, where: string): WhySentence => {
    if (!quotes[w.quote]) errors.push(`${p} ${where}: cites unknown quote "${w.quote}"`);
    const banned = findBannedWords(w.text);
    if (banned.length) errors.push(`${p} ${where}: banned words ${banned.join(", ")}`);
    return { text: w.text, quoteId: quotes[w.quote]?.id ?? w.quote };
  };
  for (const s of [c.title]) {
    const banned = findBannedWords(s);
    if (banned.length) errors.push(`${p} title: banned words ${banned.join(", ")}`);
  }
  if (c.overview.length > 2) errors.push(`${p}: overview has more than 2 sentences`);

  return {
    id: `ballot-2026-${p}`,
    number: String(c.number),
    title: c.title,
    officialTitle: q.official_title,
    kind: q.type,
    summary: quotes.summary,
    outcomes: { yes: quotes.yes, no: quotes.no },
    fiscal: quotes.fiscal,
    appliesToEveryone: c.appliesToEveryone,
    everyoneDirection: c.everyoneDirection,
    overview: c.overview.map((w, i) => why(w, `overview[${i}]`)),
    rules: c.rules.map((r) => {
      if (r.why.length > 2) errors.push(`${p} rule ${r.fact}: more than 2 why sentences`);
      return {
        fact: r.fact,
        ...(r.when === false ? { when: false } : {}),
        direction: r.direction,
        why: r.why.map((w, i) => why(w, `rule ${r.fact} why[${i}]`)),
      };
    }),
    askFacts: c.askFacts,
    topics: c.topics,
    quotes: Object.values(quotes),
    sourceUrl: q.full_text_url,
    fullText: fullText(c.number),
  };
});

// Serve the booklet itself, so every full-text link opens the original pages.
const pdfSrc = path.join(root, "data/official/IFV_2026_English.pdf");
const pdfOut = path.join(root, "public", PDF_PUBLIC);
const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
fs.mkdirSync(path.dirname(pdfOut), { recursive: true });
if (!fs.existsSync(pdfOut) || sha(fs.readFileSync(pdfOut)) !== sha(fs.readFileSync(pdfSrc))) fs.copyFileSync(pdfSrc, pdfOut);

const allReviewed = CONTENT.every((c) => c.reviewedBy);
const doc: DocumentData = {
  id: "ballot-2026",
  title: "Massachusetts State Election Ballot Questions, November 3, 2026",
  place: { kind: "state", name: "Massachusetts" },
  docType: DOCUMENT.docType,
  decideBy: DOCUMENT.decideBy,
  date: "2026-11-03",
  source: {
    file: PDF_PUBLIC,
    hash: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "data/official/IFV_2026_English.pdf"))).digest("hex"),
    pagesHash: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "data/official/IFV_2026_English.pages.json"))).digest("hex"),
    // The day the booklet PDF was saved into this repository (first commit, a9834b2).
    savedOn: "2026-10-24",
    name: "Information for Voters 2026, Secretary of the Commonwealth. Summaries by the Attorney General; YES and NO statements by the Attorney General and the Secretary jointly.",
    url: "https://www.sec.state.ma.us/divisions/elections/research-and-statistics/2026-Information-for-voters/",
  },
  provenance: allReviewed ? "reviewed" : "verified",
  measures,
};

if (errors.length) {
  console.error("build-ballot failed:\n  " + errors.join("\n  "));
  process.exit(1);
}

const out = path.join(root, "src/data/ballot-2026.json");
fs.writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
const nQuotes = measures.reduce((n, m) => n + m.quotes.length, 0);
console.log(`wrote ${path.relative(root, out)}: ${measures.length} measures, ${nQuotes} quotes located, provenance=${doc.provenance}`);
for (const m of measures) {
  console.log(`  Q${m.number} p${m.summary.page} ${m.title} | ${m.quotes.map((q) => `${q.id.split("-")[1]}:p${q.page}`).join(" ")}`);
}
