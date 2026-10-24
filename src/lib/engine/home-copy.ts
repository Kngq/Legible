// Home's words and order: what each card is called, how it explains why it is
// here, which action it offers, and which of the three sections it sits in.
// Everything is built from Legible's data; nothing here adds a fact. Pure
// TypeScript. The headlines and explanations for specific items are written by
// the team, checked by tests for the banned words, and say "would" and "could"
// for anything not yet law.
import { FACT_DEFS, LIFE_AREAS, TOPIC_DEFS, type FactId, type TopicId } from "@/lib/vocab";
import type { CivicCard } from "./civic";
import { decideByRelative, shortDate } from "./decide-by";
import { REGISTRATION_LOOKUP_URL } from "./next-steps";
import type { Profile } from "./profile";
import { appliesIf, type TimelineEntry } from "./timeline";

const TZ = "America/New_York";

/* ------------------------------------------------------------------ labels */

/** The small category line. Bills say "Proposed legislation" so nothing reads as law. */
export const CATEGORY: Record<CivicCard["item"]["kind"], string> = {
  deadline: "Deadline",
  window: "Voting",
  election: "Election",
  meeting: "Public meeting",
  bill: "Proposed legislation",
};

/** "S.2836" from "Zoning for duplexes … (S.2836)". */
export function billNumber(title: string): string | undefined {
  return /\(([HS]\.\s?\d+)\)\s*$/.exec(title)?.[1];
}

function dayName(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" }).format(new Date(iso));
}

const md = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long", day: "numeric" }).format(new Date(iso));

/** "October 17–30", or "October 28 – November 2" across months. */
export function windowRange(from: string, to: string): string {
  const [a, b] = [md(from), md(to)];
  const [am, bm] = [a.split(" ")[0], b.split(" ")[0]];
  return am === bm ? `${a}–${b.split(" ")[1]}` : `${a} – ${b}`;
}

/**
 * The date a person acts by: the closing day for an open window, the item's own
 * day otherwise. Tiles and headlines lead with it, never with a start already past.
 */
export function keyDate(c: CivicCard): string | undefined {
  return c.timing === "open" && c.item.until ? c.item.until : c.item.at;
}

/** "6 days left", "1 day left", "Last day", from the verified close date. */
const left = (days?: number) => (days === 0 ? "Last day" : days === 1 ? "1 day left" : `${days} days left`);

/** Headlines a person can read at a glance. Data titles stay on the detail page. */
const HEADLINES: Record<string, string> = {
  "ma-2026-registration-deadline": "Last chance to register for the November 3 election",
  "ma-2026-mail-ballot-deadline": "Vote by mail: applications are due October 27",
  "ma-2026-election-day": "Get ready for the November 3 election",
  "ma-194-s2836": "Massachusetts is considering changes to housing rules",
  "ma-194-s2581": "A proposed statewide policy on student phones in school",
  "ma-194-h4699": "A proposed study of apartment buildings with one stairway",
  "ma-194-h1482": "A proposed fund for in-law and backyard apartments",
};

export function headline(c: CivicCard): string {
  const i = c.item;
  if (HEADLINES[i.id]) return HEADLINES[i.id];
  if (i.kind === "window" && c.timing === "open" && i.until) return c.days === 0 ? "Early voting ends today" : `Early voting ends ${md(i.until)}`;
  if (i.kind === "meeting" && i.at) return `${i.body} meets ${dayName(i.at)}`;
  return i.title;
}

/** One or two sentences on what is happening. Team-written where a summary needs plainer words. */
const EXPLAIN: Record<string, (c: CivicCard) => string> = {
  "ma-2026-registration-deadline": (c) =>
    `Registration ${c.timing === "today" ? "closes today" : "closes October 24"}. If you're eligible to vote in Massachusetts and haven't registered at your current address, you may need to act.`,
  "ma-2026-election-day": () => "Explore what's on your ballot, understand the questions, and find what you need before Election Day.",
  // Bills: what is proposed, without committee history (that stays on the detail page).
  "ma-194-s2836": () => "A proposed bill would limit local rules that block duplexes and small apartment buildings where public water and sewer exist.",
  "ma-194-h1482": () => "Massachusetts is considering a state trust fund for in-law and backyard apartments.",
  "ma-194-h4699": () => "Massachusetts is considering a study of residential buildings served by a single stairway.",
  "ma-194-s2581": () => "Massachusetts is considering having every public school or district set a policy on student phones during the school day.",
};

const firstSentence = (s: string) => /^.*?[.!?](?=\s|$)/.exec(s)?.[0] ?? s;

export function explanation(c: CivicCard): string {
  const own = EXPLAIN[c.item.id]?.(c);
  if (own) return own;
  // A bill's summary ends with its committee history; the card keeps only what is proposed.
  return c.item.kind === "bill" ? firstSentence(c.item.summary) : c.item.summary;
}

/** The subject a bill is filed under, for the card's small header: "Housing · H.1482". */
const AREA: Partial<Record<TopicId, string>> = {
  housing_costs: "Housing",
  schools: "Schools",
  local_control: "Local government",
  public_safety: "Public safety",
  voting_access: "Voting",
  elections: "Elections",
  taxes: "Taxes",
  open_space: "Parks and open space",
};

/**
 * The card's compact header: a quiet metadata line and a neutral status chip.
 * Bills: "Housing · H.1482" and "Proposal under review", so nothing reads as law.
 * Dated items: "Deadline · October 27" and "In 3 days" / "Today".
 * Open windows: "Voting · October 17–30" and "6 days left", counted to the close.
 */
export function cardHeader(c: CivicCard): { meta: string; status?: string } {
  const i = c.item;
  if (i.kind === "bill") {
    const area = i.topics.map((t) => AREA[t]).find(Boolean) ?? "Proposed legislation";
    return { meta: [area, billNumber(i.title)].filter(Boolean).join(" · "), status: "Proposal under review" };
  }
  if (!i.at) return { meta: CATEGORY[i.kind] };
  if (c.timing === "open" && i.until) return { meta: `${CATEGORY[i.kind]} · ${windowRange(i.at, i.until)}`, status: left(c.days) };
  const status = c.timing === "today" ? "Today" : c.days === 1 ? "Tomorrow" : c.days !== undefined ? `In ${c.days} days` : undefined;
  return { meta: `${CATEGORY[i.kind]} · ${md(i.at)}`, status };
}

/** The date line: "Today · Registration closes 11:59 PM", "November 3 · in 10 days", "Under consideration". */
export function dateLine(e: TimelineEntry, today: string): string {
  if (e.kind === "doc") {
    const d = e.item.doc.decideBy;
    return d ? `${shortDate(d.date)} · ${decideByRelative(d, today)}` : "";
  }
  const c = e.card;
  const i = c.item;
  if (i.kind === "bill") return [billNumber(i.title), "Under consideration"].filter(Boolean).join(" · ");
  if (!i.at) return "";
  const when = md(keyDate(c)!);
  if (c.timing === "today") return `Today · ${when}`;
  if (c.timing === "open") return c.days === 0 ? "Ends today" : `Ends ${when} · ${left(c.days)}`;
  return c.days === 1 ? `Tomorrow · ${when}` : `${when} · in ${c.days} days`;
}

/* --------------------------------------------------------------- relevance */

/**
 * How an item connects to the person:
 * - direct: the item itself is about their situation (a deadline for people not
 *   registered at their address; school meetings for parents of public school kids);
 * - potential: a decision could reach their situation indirectly (housing rules for a renter);
 * - interest: it matches a subject they follow, not their circumstances;
 * - open: it depends on something they haven't told Legible.
 */
export type RelevanceKind = "direct" | "potential" | "interest" | "open";

export interface Relevance {
  kind: RelevanceKind;
  /** The one sentence on the card. */
  text: string;
  /** For "Why you're seeing this": what contributed, in plain words. */
  basis: string[];
}

/** What a topic is about, in everyday words, for "could affect …". */
const TOPIC_EFFECT: Partial<Record<TopicId, string>> = {
  housing_costs: "housing options in your community over time",
  schools: "your child's school day",
  local_control: "what your city or town can decide",
  public_safety: "building safety rules",
  voting_access: "how you vote",
  elections: "how elections run",
  taxes: "state and local budgets",
  open_space: "parks and open land",
};

const phrase = (fact: FactId, value: boolean) => (value ? FACT_DEFS[fact].because.yes : FACT_DEFS[fact].because.no);
const NOUN: Record<CivicCard["item"]["kind"], string> = { deadline: "deadline", window: "voting period", election: "election", meeting: "meeting", bill: "proposal" };

export function civicRelevance(c: CivicCard): Relevance | null {
  const i = c.item;
  const topic = i.topics.find((t) => TOPIC_EFFECT[t]);
  if (c.because.length) {
    // The one answer that explains the item, not every answer that matched.
    const b = c.because[0];
    const said = phrase(b.fact, b.value);
    const basis = [`You told Legible ${said}.`];
    if (i.kind === "bill") {
      const effect = topic ? TOPIC_EFFECT[topic] : "your situation";
      return {
        kind: "potential",
        text: `You mentioned that ${said}. This proposal could influence ${effect}.`,
        basis: [...basis, `This proposal concerns ${topic ? TOPIC_DEFS[topic].label.toLowerCase() : "that"}. It is not law, and any effect on you would be indirect.`],
      };
    }
    const voting = b.fact === "registered_here" || b.fact === "votes_in_primaries";
    return {
      kind: "direct",
      text: `You mentioned that ${said.replace(/^you are not registered at your address$/, "you aren't registered at your current address")}. This ${NOUN[i.kind]} is for people in that situation${voting ? ", if you're eligible to vote" : ""}.`,
      basis: [...basis, `This ${NOUN[i.kind]} is about people in that situation.`],
    };
  }
  if (c.onYourList) {
    const t = i.topics.find(Boolean);
    const label = t ? TOPIC_DEFS[t].label.toLowerCase() : "this subject";
    return { kind: "interest", text: `You follow ${label}. This ${NOUN[i.kind]} is on that subject.`, basis: [`You follow ${label}.`, "It matches your interests; nothing says it changes your situation."] };
  }
  if (c.open.length) {
    return { kind: "open", text: `May be relevant if ${appliesIf(c.open).replace(/^Applies if /, "")}.`, basis: ["It depends on something you haven't told Legible yet."] };
  }
  return null;
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const count = (n: number) => `${WORDS[n] ?? n} ${n === 1 ? "question" : "questions"}`;

/** For a ballot entry (alone or folded into Election Day): which questions match, without listing answers. */
export function ballotRelevance(e: TimelineEntry): Relevance | null {
  const ballot = e.kind === "doc" ? e.item : e.ballot;
  if (!ballot) return null;
  const touching = ballot.cards.filter((c) => c.relevance === "touches");
  const listed = ballot.cards.filter((c) => c.relevance !== "touches" && c.onYourList);
  if (!touching.length && !listed.length) return null;
  const facts = [...new Set(touching.flatMap((c) => c.because.flatMap((b) => (b.kind === "fact" ? [phrase(b.id, b.value)] : []))))];
  const topics = [...new Set(listed.flatMap((c) => c.because.flatMap((b) => (b.kind === "topic" ? [TOPIC_DEFS[b.id].label.toLowerCase()] : []))))];
  return {
    kind: touching.length ? "direct" : "interest",
    text: touching.length
      ? `${count(touching.length)} on your ballot ${touching.length === 1 ? "relates" : "relate"} to your situation, so your ballot page lists ${touching.length === 1 ? "it" : "them"} first.`
      : `${count(listed.length)} on your ballot ${listed.length === 1 ? "matches" : "match"} your interests, so your ballot page lists ${listed.length === 1 ? "it" : "them"} first.`,
    basis: [
      ...touching.map((c) => `Question ${c.measure.number}, ${c.measure.title}, relates to your situation.`),
      ...(facts.length ? [`From what you told Legible: ${facts.join("; ")}.`] : []),
      ...(topics.length ? [`Your interests: ${topics.join(", ")}.`] : []),
    ],
  };
}

export function relevanceOf(e: TimelineEntry): Relevance | null {
  if (e.kind === "doc") return ballotRelevance(e);
  return civicRelevance(e.card) ?? ballotRelevance(e);
}

/* ------------------------------------------------------------------ header */

const AREA_WORD: Record<string, string> = {
  home: "housing",
  household: "household",
  work: "work",
  getting_around: "how you get around",
  voting: "voting details",
};

/**
 * "Based on your town, housing, and 2 subjects you follow." Names only what the
 * profile holds; skipped and unanswered areas are left out. Null when it is empty.
 */
export function profileBasis(p: Profile): string | null {
  const parts: string[] = [];
  if (p.townId) parts.push("your town");
  for (const a of LIFE_AREAS) if (a.facts.some((f) => p.facts[f])) parts.push(AREA_WORD[a.id] ?? a.heading.toLowerCase());
  const n = Object.keys(p.topics).length;
  if (n) parts.push(`${n === 1 ? "one subject" : `${n} subjects`} you follow`);
  if (!parts.length) return null;
  // "your town" carries the possessive; the rest read on from it.
  if (parts[0] !== "your town") parts[0] = `your ${parts[0]}`;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")}${parts.length > 2 ? "," : ""} and ${parts.at(-1)}`;
  return `Based on ${list}.`;
}

/* ------------------------------------------------------------------ actions */

export type Action = { label: string; to: { open: "item" | "doc" } | { href: string } };

/** A primary action that says what happens, and a secondary one, only where a destination exists. */
export function actionsFor(e: TimelineEntry): { primary: Action; secondary?: Action } {
  if (e.kind === "doc") return { primary: { label: e.item.doc.docType === "ballot" ? "Explore your ballot" : "Understand this decision", to: { open: "doc" } } };
  const i = e.card.item;
  const link = (n: number) => i.actions.filter((a) => a.url)[n];
  const href = (n: number): Action["to"] | undefined => (link(n) ? { href: link(n)!.url! } : undefined);
  if (i.id === "ma-2026-registration-deadline") {
    return { primary: { label: "Check your registration", to: { href: REGISTRATION_LOOKUP_URL } }, secondary: href(0) && { label: "Learn how to register", to: href(0)! } };
  }
  if (i.kind === "election" && e.ballot) return { primary: { label: "Explore your ballot", to: { open: "doc" } }, secondary: href(0) && { label: "Find voting information", to: href(0)! } };
  if (i.kind === "bill") return { primary: { label: "Understand this decision", to: { open: "item" } }, secondary: href(0) && { label: "Read original bill", to: href(0)! } };
  if (i.kind === "meeting") {
    const comment = i.actions.find((a) => a.url && /comment/i.test(a.label));
    return { primary: { label: "View meeting details", to: { open: "item" } }, secondary: comment && { label: "Learn how to comment", to: { href: comment.url! } } };
  }
  return { primary: href(0) ? { label: link(0)!.label, to: href(0)! } : { label: "View details", to: { open: "item" } }, secondary: href(0) && { label: "View details", to: { open: "item" } } };
}

/* ----------------------------------------------------------------- sections */

const ATTENTION_DAYS = 14;
const MEETING_DAYS = 7;
const KIND_ORDER: Record<RelevanceKind, number> = { direct: 0, potential: 1, interest: 2, open: 3 };

/** Time-sensitive: deadlines, voting periods, the election, and meetings this week. */
export function isTimeSensitive(e: TimelineEntry): boolean {
  if (e.kind !== "civic" || e.days === undefined || e.days > ATTENTION_DAYS) return false;
  const k = e.card.item.kind;
  return k === "deadline" || k === "window" || k === "election" || (k === "meeting" && e.days <= MEETING_DAYS);
}

/**
 * Urgent enough to sit above the decisions: a deadline or election today or
 * tomorrow, or the last day of an open window. Only verified dates decide it.
 */
export function isUrgent(e: TimelineEntry): boolean {
  if (e.kind !== "civic" || !isTimeSensitive(e) || e.card.item.kind === "meeting") return false;
  const c = e.card;
  return c.timing === "today" || (c.days !== undefined && c.days <= (c.timing === "open" ? 0 : 1));
}

/**
 * Home's three sections. `ranked` is the timeline of what relates to the person;
 * `all` adds everything else nearby. Needs your attention: time-sensitive items
 * that apply to them, soonest first (a deadline for people in another situation
 * is left out). Decisions that could affect you: the rest that relates to them,
 * direct before potential before interests before open questions. Everything
 * else lives on Explore.
 */
export function homeSections(ranked: TimelineEntry[], all: TimelineEntry[]) {
  const attention = all
    .filter((e) => isTimeSensitive(e) && (e.level !== "other" || (e.kind === "civic" && e.card.item.kind === "meeting")))
    .sort((a, b) => (a.days ?? 99) - (b.days ?? 99) || b.score - a.score)
    .slice(0, 4);
  const taken = new Set(attention.map((e) => e.key));
  const affect = ranked
    .filter((e) => !taken.has(e.key) && (e.level === "touches" || e.level === "list" || e.level === "maybe"))
    .map((e) => ({ e, r: relevanceOf(e) }))
    .sort((a, b) => KIND_ORDER[a.r?.kind ?? "open"] - KIND_ORDER[b.r?.kind ?? "open"] || b.e.score - a.e.score)
    .map(({ e }) => e);
  return { attention, affect };
}
