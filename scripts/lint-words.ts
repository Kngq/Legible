// Banned-word check over app-authored strings and shipped data.
// Verbatim quote fields (Quote.text, officialTitle) are skipped.
//   npx tsx scripts/lint-words.ts
import fs from "node:fs";
import path from "node:path";
import { findBannedWords } from "@/lib/vocab";

const root = path.resolve(__dirname, "..");
const problems: string[] = [];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const SKIP_FILES = [path.join(root, "src/lib/vocab/banned.ts")];
const VERBATIM_KEYS = new Set(["text", "officialTitle", "source"]);

/** Pull string literals and JSX text out of a TS/TSX file. */
function appStrings(src: string): string[] {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const out: string[] = [];
  for (const m of noComments.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
    out.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  for (const m of noComments.matchAll(/>([^<>{}]+)</g)) out.push(m[1]);
  return out;
}

function checkJson(value: unknown, file: string, trail: string, inQuote: boolean) {
  if (typeof value === "string") {
    if (inQuote) return;
    const hits = findBannedWords(value);
    if (hits.length) problems.push(`${file} ${trail}: ${hits.join(", ")}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => checkJson(v, file, `${trail}[${i}]`, inQuote));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      checkJson(v, file, `${trail}.${k}`, inQuote || VERBATIM_KEYS.has(k));
    }
  }
}

for (const file of walk(path.join(root, "src"))) {
  const rel = path.relative(root, file);
  if (SKIP_FILES.includes(file) || /\.test\.tsx?$/.test(file)) continue;
  if (/\.(ts|tsx)$/.test(file)) {
    for (const s of appStrings(fs.readFileSync(file, "utf8"))) {
      const hits = findBannedWords(s);
      if (hits.length) problems.push(`${rel}: "${s.slice(0, 60)}" -> ${hits.join(", ")}`);
    }
  } else if (file.endsWith(".json") && rel.startsWith("src/data")) {
    checkJson(JSON.parse(fs.readFileSync(file, "utf8")), rel, "", false);
  }
}
for (const file of walk(path.join(root, "public/demo"))) {
  if (file.endsWith(".json")) {
    checkJson(JSON.parse(fs.readFileSync(file, "utf8")), path.relative(root, file), "", false);
  }
}

if (problems.length) {
  console.error(`lint:words found ${problems.length} problem(s):\n  ` + problems.join("\n  "));
  process.exit(1);
}
console.log("lint:words: no banned words in app strings or shipped data");
