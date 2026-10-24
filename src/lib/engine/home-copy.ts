// Home's words and order: what each card is called, how it explains why it is
// here, which action it offers, and which of the three sections it sits in.
// Everything is built from Legible's data; nothing here adds a fact. Pure
// TypeScript. The headlines and explanations for specific items are written by
// the team, checked by tests for the banned words, and say "would" and "could"
// for anything not yet law.
import { FACT_DEFS, TOPIC_DEFS, type FactId, type TopicId } from "@/lib/vocab";
import type { CivicCard } from "./civic";
import { decideByRelative, shortDate } from "./decide-by";
import { REGISTRATION_LOOKUP_URL } from "./next-steps";
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

/** Headlines a person can read at a glance. Data titles stay on the detail page. */
const HEADLINES: Record<string, string> = {
  "ma-2026-registration-deadline": "Last chance to register for the November 3 election",
  "ma-2026-mail-ballot-deadline": "Vote by mail: applications are due October 27",
  "ma-2026-election-day": "Get ready for the November 3 election",
  "ma-194-s2836": "Massachusetts is considering changes to housing rules",
  "ma-194-s2581": "A proposed statewide policy on student phones in school",
  "ma-194-h4699": "A proposed study of apartment buildings with one stairway",
  "ma-194-h1482": "A proposed state fund for in-law and backyard apartments",
};

export function headline(c: CivicCard): string {
  const i = c.item;
  if (HEADLINES[i.id]) return HEADLINES[i.id];
  if (i.kind === "window") return c.timing === "open" ? "Early voting is open" : i.title;
  if (i.kind === "meeting" && i.at) return `${i.body} meets ${dayName(i.at)}`;
  return i.title;
}

/** One or two sentences on what is happening. Team-written where a summary needs plainer words. */
const EXPLAIN: Record<string, (c: CivicCard) => string> = {
  "ma-2026-registration-deadline": (c) =>
    `Registration ${c.timing === "today" ? "closes today" : "closes October 24"}. If you're eligible to vote in Massachusetts and haven't registered at your current address, you may need to act.`,
  "ma-2026-election-day": () => "Explore what's on your ballot, understand the questions, and find what you need before Election Day.",
  "ma-194-s2836": () => "A proposed bill would limit local rules that block duplexes and small apartment buildings where public water and sewer exist.",
};

export function explanation(c: CivicCard): string {
  return EXPLAIN[c.item.id]?.(c) ?? c.item.summary;
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
  const when = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long", day: "numeric" }).format(new Date(c.timing === "open" && i.until ? i.until : i.at));
  if (c.timing === "today") return `Today · ${when}`;
  if (c.timing === "open") return c.days === 0 ? "Open now · closes today" : `Open now · closes ${when}`;
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

/** A role noun for each fact, for "As a renter, …". Sensitive facts are never named this way. */
const ROLE: Partial<Record<FactId, string>> = {
  rents: "a renter",
  owns: "a homeowner",
  kids_in_schools: "a parent of a public school student",
  state_employee: "a state employee",
  runs_business_here: "a local business owner",
  drives: "a driver",
  rides_transit: "a transit rider",
  wants_single_family: "someone hoping to build or buy a single-family home",
};

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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
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
      const role = b.value ? ROLE[b.fact] : undefined;
      const effect = topic ? TOPIC_EFFECT[topic] : "your situation";
      return {
        kind: "potential",
        text: role ? `As ${role}, you may want to see how this proposal could affect ${effect}.` : `This proposal could affect ${effect}.`,
        basis: [...basis, `This proposal concerns ${topic ? TOPIC_DEFS[topic].label.toLowerCase() : "that"}. It is not law, and any effect on you would be indirect.`],
      };
    }
    const voting = b.fact === "registered_here" || b.fact === "votes_in_primaries";
    return {
      kind: "direct",
      text: `${cap(said.replace(/^you are not registered at your address$/, "you haven't registered at your current address"))}, so this ${NOUN[i.kind]} may be important${voting ? " if you're eligible to vote" : ""}.`,
      basis: [...basis, `This ${NOUN[i.kind]} is about people in that situation.`],
    };
  }
  if (c.onYourList) {
    const t = i.topics.find(Boolean);
    const label = t ? TOPIC_DEFS[t].label.toLowerCase() : "this subject";
    return { kind: "interest", text: `You follow ${label}, so this may be worth exploring.`, basis: [`You follow ${label}.`, "It matches your interests; nothing says it changes your situation."] };
  }
  if (c.open.length) {
    return { kind: "open", text: `This could matter if ${appliesIf(c.open).replace(/^Applies if /, "")}.`, basis: ["It depends on something you haven't told Legible yet."] };
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
  if (i.kind === "bill") return { primary: { label: "Understand the proposal", to: { open: "item" } }, secondary: href(0) && { label: "Read the original bill", to: href(0)! } };
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
