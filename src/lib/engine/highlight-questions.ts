// Questions about the words someone highlighted, built from those words, so the
// suggestions follow the highlight instead of being the same three every time.
// Pure and deterministic; every question stays neutral and never asks how to vote.

/** A short handle for the highlight: a quoted term, a section number, or its first words. */
function handle(text: string): string {
  const quoted = text.match(/[“"]([^”"]{3,40})[”"]/);
  if (quoted) return `“${quoted[1]}”`;
  const words = text.replace(/^(SECTION|Section)\s+\d+[A-Z]?\.\s*/, "").split(/\s+/).slice(0, 6).join(" ");
  return `“${words.replace(/[,;:.]$/, "")}…”`;
}

/** Up to three questions about this highlight, most specific first. */
export function highlightQuestions(excerpt: string): string[] {
  const t = excerpt.trim();
  const out: string[] = [];
  const add = (q: string) => {
    if (!out.includes(q) && out.length < 3) out.push(q);
  };
  const section = t.match(/\b(?:SECTION|Section)\s+(\d+[A-Z]?)\b/);
  const quoted = t.match(/[“"]([^”"]{3,40})[”"]/);
  if (quoted) add(`What counts as “${quoted[1]}” here?`);
  if (/\$\s?\d|fine|fee|tax|appropriat|fund|cost|revenue/i.test(t)) add("Who would pay, and how much?");
  if (/repeal|strik(e|ing) out|struck|hereby repealed/i.test(t)) add("What would this remove from current law?");
  if (/take effect|effective|January|February|March|April|May|June|July|August|September|October|November|December|\b20\d\d\b/.test(t)) add("When would this start?");
  if (/penalt|felony|imprison|punish/i.test(t)) add("What is the penalty, and for whom?");
  if (/\b(shall|must|require[sd]?)\b/i.test(t)) add("Who would have to do this?");
  if (/\bmay\b|\bpermit|\ballow/i.test(t)) add("Who would be allowed to do this?");
  if (/city|town|municipal|local/i.test(t)) add("What could cities and towns still decide?");
  if (section) add(`What does Section ${section[1]} change?`);
  add(`What does ${handle(t)} mean in plain words?`);
  return out;
}
