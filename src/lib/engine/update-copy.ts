// Plain wording for Home's update cards: what kind of thing it is, when, and why
// it is shown to this person. Dates are Boston time. Pure TypeScript.
import { FACT_DEFS, TOPIC_DEFS } from "@/lib/vocab";
import type { CivicCard, CivicKind } from "./civic";
import type { FeedItem } from "./feed";
import { appliesIf } from "./timeline";
import type { Because, Card } from "./types";

const TZ = "America/New_York";

/** "Proposed bill" makes the status plain; nothing on Home is labeled approved unless it is. */
export const KIND_LABEL: Record<CivicKind, string> = {
  deadline: "Deadline",
  window: "Voting",
  election: "Election",
  meeting: "Public meeting",
  bill: "Proposed bill",
};

function parts(iso: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).formatToParts(new Date(iso));
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return { month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), period: get("dayPeriod") };
}

/** "5 PM", "11:59 PM", "7 AM". */
function time(iso: string): string {
  const p = parts(iso);
  return `${p.hour}${p.minute === "00" ? "" : `:${p.minute}`} ${p.period}`;
}

/** "October 27 · 5 PM", "October 17–30", "No vote scheduled yet". */
export function friendlyWhen(c: CivicCard): string {
  const i = c.item;
  if (!i.at) return i.kind === "bill" ? "No vote scheduled yet" : "Date not set";
  const a = parts(i.at);
  if (i.until) {
    const b = parts(i.until);
    return a.month === b.month ? `${a.month} ${a.day}–${b.day}` : `${a.month} ${a.day} – ${b.month} ${b.day}`;
  }
  return `${a.month} ${a.day} · ${time(i.at)}`;
}

/** Why a card is shown to this person, or null when it is shown to everyone. */
export function whyLine(c: CivicCard): string | null {
  if (c.because.length) {
    const why = c.because.map((b) => (b.value ? FACT_DEFS[b.fact].because.yes : FACT_DEFS[b.fact].because.no));
    return `You told us ${why.join(" and ")}.`;
  }
  if (c.onYourList) {
    const t = c.item.topics.find(Boolean);
    return t ? `You follow ${TOPIC_DEFS[t].label.toLowerCase()}.` : null;
  }
  if (c.open.length) return `${appliesIf(c.open)}. You haven't said yet.`;
  return null;
}

/** "a", "a and b", "a, b and c". */
export function joinAnd(parts: string[]): string {
  return parts.length < 2 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Each answer or followed subject behind a card, in plain words, without repeats. */
function becausePhrases(because: Because[], withTopics: boolean): string[] {
  const out = because.flatMap((b) =>
    b.kind === "fact" ? [b.value ? FACT_DEFS[b.id].because.yes : FACT_DEFS[b.id].because.no] : withTopics ? [`you follow ${TOPIC_DEFS[b.id].label.toLowerCase()}`] : [],
  );
  return [...new Set(out)];
}

/** Under one ballot question: "Because you work for the state". Null when nothing matched. */
export function questionBecause(card: Card): string | null {
  const parts = becausePhrases(card.because, true);
  return parts.length ? `Because ${joinAnd(parts)}` : null;
}

/**
 * Why a ballot-backed card (Election Day, or the ballot itself) is shown: every
 * answer behind the questions that touch the person. "You told us you work for
 * the state and you rent." Null when no question touches them.
 */
export function ballotWhyLine(cards: Card[]): string | null {
  const parts = becausePhrases(
    cards.filter((c) => c.relevance === "touches").flatMap((c) => c.because),
    false,
  );
  return parts.length ? `You told us ${joinAnd(parts)}.` : null;
}

/**
 * The first sentence of a summary, for the one-line "what it means". Splits only
 * where a word of two or more letters ends a sentence, so "7 a.m." stays whole;
 * without a clean split the summary is returned as is.
 */
export function firstSentence(text: string): string {
  const m = /^(.+?[A-Za-z0-9)]{2}\.)\s+(?=[A-Z])/.exec(text.trim());
  return m ? m[1] : text.trim();
}

/** "you rent" -> "rent", "you own your home" -> "own their home". From FACT_DEFS, so any fact works. */
function thirdPerson(phrase: string): string {
  return phrase.replace(/^you /, "").replace(/\byour\b/g, "their");
}

/** "a", "a or b", "a, b or c". */
function joinOr(parts: string[]): string {
  return parts.length < 2 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
}

/**
 * Who an item applies to, in plain words, from its data: every voter, everyone
 * in a place, or the people its life facts describe ("Cambridge residents who
 * have kids in the public schools").
 */
export function whoLine(c: CivicCard): string {
  const i = c.item;
  const state = i.place.kind === "state";
  if (i.everyone) return i.body === "Voters" ? "Every voter in Massachusetts" : `Everyone in ${i.place.name}`;
  if (i.touches.length) {
    const who = joinOr([...new Set(i.touches.map((t) => thirdPerson(t.when ? FACT_DEFS[t.fact].because.yes : FACT_DEFS[t.fact].because.no)))]);
    return state ? `People in Massachusetts who ${who}` : `${i.place.name} residents who ${who}`;
  }
  if (i.kind === "meeting") return `Anyone in ${i.place.name}`;
  return state ? "People in Massachusetts the bill would cover" : `People in ${i.place.name} it would cover`;
}

/** Who a document applies to: every voter for a statewide ballot, else everyone in its place. */
export function docWho(item: FeedItem): string {
  if (item.doc.docType === "ballot" && item.scope === "state") return "Every voter in Massachusetts";
  return `Everyone in ${item.doc.place.name}`;
}
