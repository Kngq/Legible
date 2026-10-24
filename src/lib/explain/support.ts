// The second check on a draft: does each claim follow from its evidence?
// verifyExplainer proves a quote is real; it cannot tell whether the sentence
// citing it says only what the quote says. Here every claim in a draft is
// listed with its evidence, a separate model call judges each one, and
// applySupport removes anything not fully backed by its evidence. Pure TypeScript; the call
// itself lives in scripts/draft-bill.ts.
import { BANNED_WORDS } from "@/lib/vocab";
import { normalize } from "@/lib/verify/normalize";
import type { ExplainerDraft, HistoryEntry } from "./types";

export type ClaimKind = "line" | "possible" | "notStated" | "versionNote";

export interface Claim {
  /** Where the claim sits in the draft: "proposes.0", "changes.1.2", "personal.0.notStated". */
  key: string;
  kind: ClaimKind;
  claim: string;
  evidence: string;
}

export type Verdict = "backed" | "partly" | "unbacked";

export interface Judgment {
  key: string;
  verdict: Verdict;
  reason: string;
}

/** Stored with a draft: who checked it and what they found. */
export interface SupportRecord {
  model: string;
  checkedOn: string;
  judgments: Judgment[];
}

export function claimsOf(draft: ExplainerDraft, history: HistoryEntry[]): Claim[] {
  const quote = new Map(draft.quotes.map((q) => [q.id, q.text]));
  const out: Claim[] = [];
  const line = (key: string, l: { text: string; quote: string }, kind: ClaimKind = "line") =>
    out.push({ key, kind, claim: l.text, evidence: quote.get(l.quote) ?? "(no such quote)" });
  draft.proposes.forEach((l, i) => line(`proposes.${i}`, l));
  draft.changes.forEach((g, i) => g.lines.forEach((l, j) => line(`changes.${i}.${j}`, l)));
  draft.affects.forEach((l, i) => line(`affects.${i}`, l));
  draft.personal.forEach((r, i) => {
    r.lines.forEach((l, j) => line(`personal.${i}.${j}`, l, r.effect === "possible" ? "possible" : "line"));
    if (r.notStated) {
      out.push({
        key: `personal.${i}.notStated`,
        kind: "notStated",
        claim: r.notStated.text,
        evidence: `The bill text was searched for these words and none appear: ${r.notStated.terms.map((t) => `"${t}"`).join(", ")}.`,
      });
    }
  });
  draft.takesEffect.forEach((t, i) => line(`takesEffect.${i}`, t.line));
  (draft.versionNotes ?? []).forEach((n, i) => {
    const entry = history.find((h) => normalize(h.action).includes(normalize(n.action)));
    out.push({
      key: `versionNotes.${i}`,
      kind: "versionNote",
      claim: n.text,
      evidence: entry ? `Official history entry, ${entry.date}, ${entry.branch}: ${normalize(entry.action)}` : "(no matching history entry)",
    });
  });
  return out;
}

export const SUPPORT_SYSTEM = `You check explanations of Massachusetts bills before residents see them. For each claim you get the evidence it rests on: a passage of the bill copied word for word, a list of words searched for in the bill, or an entry from the bill's official history. You see nothing else, so judge only from the evidence given.

Verdicts:
- backed: everything the claim states is stated in the evidence or follows directly from it. Plain-language rewording is fine, and so is "would" or "could" for a bill that is not law.
- partly: the core is right, but the claim adds something the evidence does not state: a number, group, place, date, condition, scope ("every", "all", "each"), or consequence; or it drops a limit that changes the meaning.
- unbacked: the evidence does not say this, or says something different.

By kind:
- line: the claim must stay within the passage.
- possible: an indirect effect for a person in some situation. Its description of what the bill does must stay within the passage; a final hedged consequence ("which could change how many homes are available") is allowed if it names no new specific fact.
- notStated: the claim says the bill does not mention certain things. It is backed only if every thing it says is missing is covered by one of the searched words. A missing thing with no searched word is partly.
- versionNote: the claim must match what the history entry records.

Give a one-sentence reason for every verdict, naming the added or wrong detail when there is one. Never use these words in a reason: ${BANNED_WORDS.join(", ")}.`;

export function supportPrompt(bill: string, claims: Claim[]): string {
  return `Bill ${bill}. Judge every claim; return one judgment per key.\n\n${claims
    .map((c) => `<claim key="${c.key}" kind="${c.kind}">\n${c.claim}\n<evidence>\n${c.evidence}\n</evidence>\n</claim>`)
    .join("\n\n")}`;
}

export const SUPPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["judgments"],
  properties: {
    judgments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "verdict", "reason"],
        properties: { key: { type: "string" }, verdict: { enum: ["backed", "partly", "unbacked"] }, reason: { type: "string" } },
      },
    },
  },
} as const;

/**
 * Keep only claims judged backed. A claim with no judgment is removed too:
 * nothing unchecked ships. Returns the trimmed draft and what was removed.
 */
export function applySupport(draft: ExplainerDraft, judgments: Judgment[]): { draft: ExplainerDraft; removed: Judgment[] } {
  const verdict = new Map(judgments.map((j) => [j.key, j]));
  const removed: Judgment[] = [];
  const keep = (key: string, text: string) => {
    const j = verdict.get(key);
    if (j?.verdict === "backed") return true;
    removed.push(j ?? { key, verdict: "unbacked", reason: `Not checked: "${text}"` });
    return false;
  };
  const trimmed: ExplainerDraft = {
    ...draft,
    proposes: draft.proposes.filter((l, i) => keep(`proposes.${i}`, l.text)),
    changes: draft.changes.map((g, i) => ({ ...g, lines: g.lines.filter((l, j) => keep(`changes.${i}.${j}`, l.text)) })).filter((g) => g.lines.length > 0),
    affects: draft.affects.filter((l, i) => keep(`affects.${i}`, l.text)),
    personal: draft.personal
      .map((r, i) => {
        const lines = r.lines.filter((l, j) => keep(`personal.${i}.${j}`, l.text));
        const notStated = r.notStated && keep(`personal.${i}.notStated`, r.notStated.text) ? r.notStated : undefined;
        return { ...r, lines, notStated };
      })
      .filter((r) => r.lines.length > 0)
      .map(({ notStated, ...r }) => (notStated ? { ...r, notStated } : r)),
    takesEffect: draft.takesEffect.filter((t, i) => keep(`takesEffect.${i}`, t.line.text)),
    versionNotes: (draft.versionNotes ?? []).filter((n, i) => keep(`versionNotes.${i}`, n.text)),
  };
  return { draft: trimmed, removed };
}
