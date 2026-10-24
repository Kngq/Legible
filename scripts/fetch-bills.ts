// Save the original of every bill in the civic feed from the Legislature's own
// API: the full text, the official description (pinslip), and the action
// history, as a dated snapshot with a SHA-256 fingerprint. build-civic reads
// these snapshots; it never goes to the network.
//
//   npx tsx scripts/fetch-bills.ts   (npm run data:bills)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CIVIC } from "./civic-ma.content";

const root = path.resolve(__dirname, "..");
const SAVED = path.join(root, "data/official/bills");
const API = "https://malegislature.gov/api/GeneralCourts";
const headers = { "User-Agent": "Legible civic app (hackathon); saves public bill text" };

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function main() {
  fs.mkdirSync(SAVED, { recursive: true });
  const fetchedOn = new Date().toISOString().slice(0, 10);
  for (const c of CIVIC.filter((x) => x.kind === "bill")) {
    const m = c.source.url.match(/Bills\/(\d+)\/([HS]\d+)/);
    if (!m) throw new Error(`${c.id}: source is not a malegislature.gov bill page`);
    const [, court, bill] = m;
    const doc = (await getJson(`${API}/${court}/Documents/${bill}`)) as Record<string, unknown>;
    const history = await getJson(`${API}/${court}/Documents/${bill}/DocumentHistoryActions`);
    const snapshot = { fetchedOn, source: `${API}/${court}/Documents/${bill}`, document: doc, history };
    const body = JSON.stringify(snapshot, null, 2) + "\n";
    fs.writeFileSync(path.join(SAVED, `${bill}.json`), body);
    const sha = crypto.createHash("sha256").update(body).digest("hex");
    console.log(`${bill}: ${String(doc.DocumentText ?? "").length} chars of text, ${(history as unknown[]).length} history actions, sha256 ${sha.slice(0, 12)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
