// The prompt for a model to draft a bill explanation from the saved bill. The
// model only proposes; verifyExplainer (prune mode) decides what ships. Receives
// public text only: the bill, its official history, and the fixed fact list.
// Never a person's profile. Pure TypeScript.
import { BANNED_WORDS, FACT_DEFS, FACT_IDS } from "@/lib/vocab";
import type { ExplainerDraft, HistoryEntry } from "./types";

export interface DraftPromptInput {
  bill: string;
  title: string;
  /** Official description, when the Legislature gives one. */
  pinslip?: string | null;
  text: string;
  history: HistoryEntry[];
  /** YYYY-MM-DD, so dates in the text can be flagged once passed. */
  today: string;
  /** A finished draft for a different bill, to show the format and tone. */
  example?: { bill: string; draft: ExplainerDraft };
}

export const DRAFT_SYSTEM = `You draft explanations of Massachusetts bills for Legible, an app that helps residents read official documents. Your draft is checked by a program before anyone sees it: every quote must appear in the bill text exactly, character for character, or every line that cites it is deleted. Lines that break the rules below are deleted too.

What to write, as JSON matching the schema:
- quotes: passages copied exactly from the bill text, one contiguous run each, with the bill's own punctuation and spelling (even its typos). Keep each one as short as it can be while still backing up the line that cites it. Never join two passages, never change a word, never add an ellipsis. Give each a short kebab-case id.
- proposes: 1 or 2 lines saying what the bill would do overall.
- changes: 2 to 5 groups, each with a short plain heading and 1 to 4 lines, covering what would change.
- affects: 1 to 3 lines naming who or what the text itself would reach (cities and towns, property owners, students...).
- personal: lines for a person in one of the listed situations, only where the text backs it up. effect "direct" means the text itself would change something for a person in that situation. effect "possible" means it could reach them indirectly; then add notStated: a sentence saying what the text does not mention, plus the words to search for. Those words must truly be absent from the bill, since the program searches for them. At most 2 lines per situation. Leave personal empty when no situation fits.
- takesEffect: only dates or start rules the text states. If a date in the text is already past as of today, set pastOn to the first day it was past (YYYY-MM-DD); for a vague date such as a school year, pastOn is the day it reasonably began.
- versionNotes: when the official history shows the saved text is not the final word (the other chamber passed a different version, a conference committee was appointed), one note per fact, with action copied exactly from a history entry. Otherwise empty.

How every line reads:
- Each line cites exactly one quote, and that quote alone backs up every claim in the line. No number, place, group, or date that is not in the quote.
- The bill is proposed, not law: every line uses "would", "could", "may", "might", or "if".
- Plain words a 12-year-old could follow, one idea per sentence, neutral. Describe; never judge whether the bill is wise, never suggest how anyone could act or vote.
- Never use these words anywhere: ${BANNED_WORDS.join(", ")}.
- Cover the provisions a resident would most want to know about. Skip pure cross-references and reporting chores unless they matter.`;

export function draftPrompt(i: DraftPromptInput): string {
  const facts = FACT_IDS.map((id) => `- ${id}: ${FACT_DEFS[id].question}`).join("\n");
  const history = i.history.map((h) => `- ${h.date} · ${h.branch}: ${h.action.replace(/\s+/g, " ").trim()}`).join("\n");
  const example = i.example
    ? `\n\nA finished draft for a different bill (${i.example.bill}), to show the format and tone. Do not copy its content.\n<example>\n${JSON.stringify({ ...i.example.draft, author: undefined, reviewedBy: undefined })}\n</example>`
    : "";
  return `Today is ${i.today}.

Bill ${i.bill}: ${i.title}${i.pinslip ? `\nOfficial description: ${i.pinslip}` : ""}

Situations a person may have told Legible about (use these ids in personal):
${facts}

Official history, oldest first:
${history}${example}

The bill text:
<bill>
${i.text}
</bill>`;
}
