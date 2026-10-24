// What a highlight may send. Text on screen mixes official words with lines that
// exist only because of the person's answers ("If you rent ..."), so sending any
// highlight could reveal a life fact. Only text found word for word in an
// official quote is sent; anything else stays in the browser. Pure TypeScript.
import type { DocumentData, Quote } from "./types";

const MIN_CHARS = 12;
const MAX_CHARS = 240;

export function normalizeSelection(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function quotesOf(doc: DocumentData, measureId?: string): { measureId: string; quote: Quote }[] {
  const ms = measureId ? doc.measures.filter((m) => m.id === measureId) : doc.measures;
  return ms.flatMap((m) =>
    [...m.quotes, m.summary, m.outcomes.yes, m.outcomes.no, m.outcomes.effect, m.fiscal]
      .filter((q): q is Quote => Boolean(q))
      .map((quote) => ({ measureId: m.id, quote })),
  );
}

/**
 * The highlighted text if it is official wording (trimmed to MAX_CHARS), with the
 * measure it came from; null when it is too short or not in any official quote.
 */
export function publicExcerpt(selection: string, doc: DocumentData, measureId?: string): { text: string; measureId: string } | null {
  const sel = normalizeSelection(selection);
  if (sel.length < MIN_CHARS) return null;
  const hit = [...quotesOf(doc, measureId), ...(measureId ? quotesOf(doc) : [])].find((x) => normalizeSelection(x.quote.text).includes(sel));
  if (!hit) return null;
  return { text: sel.length > MAX_CHARS ? `${sel.slice(0, MAX_CHARS).replace(/\s+\S*$/, "")}…` : sel, measureId: hit.measureId };
}
