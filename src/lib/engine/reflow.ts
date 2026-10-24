// Turn printed page text into readable paragraphs: drop running headers (page
// number, "Full Texts (continued)", "QUESTION n: ... (continued)"), join lines
// the printer broke mid-sentence, and start a paragraph at each SECTION and at
// each lettered or numbered clause. Words are never changed, only line breaks.
const HEADER = [/^\d{1,3}\s*$/, /^Full Texts? \(continued\)\s*$/i, /^QUESTION \d+: Full Text of (Proposed|Existing) Law \(continued\)\s*$/i];
const STARTS_PARAGRAPH = /^(SECTION \d+[A-Z]?\.|Section \d+[A-Z]?\.|\([a-z]{1,3}\)|\([ivx]+\)|\(\d+\)|An Act |AN ACT |Be it enacted|QUESTION \d+:)/;

export function reflow(text: string): string[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !HEADER.some((h) => h.test(l)));
  const out: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    const last = out[out.length - 1];
    if (last === undefined || last === "" || STARTS_PARAGRAPH.test(line)) out.push(line);
    else out[out.length - 1] = last.endsWith("-") && /^[a-z]/.test(line) ? `${last}${line}` : `${last} ${line}`;
  }
  return out.filter(Boolean);
}
