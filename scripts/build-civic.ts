// Build src/data/civic-ma.json from scripts/civic-ma.content.ts.
// Fails when a booklet quote is not found word for word, a source is not an
// official domain, app-written text uses a banned word, or a seed item is
// neither used nor listed as excluded.
import fs from "node:fs";
import path from "node:path";
import type { CivicItem } from "@/lib/engine/civic";
import { findBannedWords } from "@/lib/vocab";
import { locateQuote, normalize } from "@/lib/verify/normalize";
import { CIVIC, EXCLUDED } from "./civic-ma.content";

const OFFICIAL_HOSTS = ["sec.state.ma.us", "malegislature.gov", "www.cambridgema.gov", "www.cpsd.us", "www.mass.gov", "www.VoteInMA.com"];

const root = path.resolve(__dirname, "..");
const pages: string[] = JSON.parse(fs.readFileSync(path.join(root, "data/official/IFV_2026_English.pages.json"), "utf8"));
const seed: { civic_items: { id: string }[] } = JSON.parse(fs.readFileSync(path.join(root, "data/legible_ma_seed.json"), "utf8"));

const errors: string[] = [];
const official = (url: string) => {
  try {
    const host = new URL(url).host;
    return OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`) || host.toLowerCase() === h.toLowerCase());
  } catch {
    return false;
  }
};

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
    };
  }
  return { ...rest, check };
});

const used = new Set(CIVIC.map((c) => c.seedId).filter(Boolean));
for (const s of seed.civic_items) {
  if (!used.has(s.id) && !EXCLUDED[s.id]) errors.push(`seed item ${s.id} is neither used nor excluded`);
}
const ids = items.map((i) => i.id);
if (new Set(ids).size !== ids.length) errors.push("duplicate item ids");

if (errors.length) {
  console.error(`civic build failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

const out = path.join(root, "src/data/civic-ma.json");
fs.writeFileSync(out, JSON.stringify(items, null, 2) + "\n");
console.log(`wrote ${items.length} civic items to src/data/civic-ma.json`);
console.log(`left out ${Object.keys(EXCLUDED).length} seed items:`);
for (const [id, why] of Object.entries(EXCLUDED)) console.log(`  ${id}: ${why}`);
