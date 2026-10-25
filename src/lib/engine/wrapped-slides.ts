// The six Ballot stories (first built as "Your ballot, wrapped"), as view models. Pure TypeScript: no
// React, no DOM, no network. Every visible string of a slide is listed in `texts`,
// so tests can check neutrality, counts, and claims for every profile.
//
// Life facts (category A) decide "What connects to you"; followed topics
// (category B) decide "On your radar". The two never stand in for each other.
// What the person has explored (category C) is not tracked and never used.
// See .kiro/specs/ballot-wrapped/design.md, "Story model".
import { FACT_DEFS, TOPIC_DEFS, TOPIC_IDS, type TopicId } from "@/lib/vocab";
import { WRAPPED_STRINGS as S } from "@/lib/vocab/wrapped";
import { routeHash } from "@/lib/nav/route";
import { shortDate } from "./decide-by";
import { topicIds, type Profile } from "./profile";
import type { Card, DocumentData, Measure, WhySentence } from "./types";
import { topicMeasureCount, type WrappedSummary } from "./wrapped";

export const SLIDE_IDS = ["opening", "world", "connects", "radar", "closer", "closing"] as const;
export type SlideId = (typeof SLIDE_IDS)[number];
export const SLIDE_COUNT = SLIDE_IDS.length;

/** At most this many decisions on "What connects to you", and examples on "On your radar". */
const CONNECT_MAX = 3;
const EXAMPLE_TOPICS_MAX = 6;
/** The most subjects the constellation can hold; the player shows fewer on short screens and counts the rest. */
const RADAR_MAX = 8;

export interface DecisionStatus {
  label: string; // "Proposed law"
  detail: string; // "Not law today. Voters decide on November 3, 2026."
}

/** A sentence Legible wrote, tied to a quote that passed verification. */
export interface CitedSentence {
  text: string;
  quoteId: string;
  source: string; // "From the Attorney General's summary, page 12"
}

export interface ConnectItem {
  measureId: string;
  number: string; // "Question 7"
  title: string;
  status: DecisionStatus;
  reasons: string[]; // fact chips only: "Because you rent"
  sentence?: CitedSentence;
  href: string;
}

export interface RadarTopic {
  id: TopicId;
  label: string;
  part: string; // pictogram name
  count: string; // "2 questions", "Not on this ballot"
}

export type SlideModel =
  | { id: "opening"; heading: string; line: string; hint: string; ballotLabel: string; texts: string[] }
  | { id: "world"; heading: string; place: string; placeKnown: boolean; questionCount: number; countLabel: string; statewide?: string; dateLabel?: string; line: string; texts: string[] }
  | { id: "connects"; mode: "personal" | "general"; heading: string; intro: string; items: ConnectItem[]; action?: string; texts: string[] }
  | {
      id: "radar";
      mode: "followed" | "examples";
      heading: string;
      intro: string;
      /** The constellation: followed topics with a ballot question (or, when none has one, every followed topic, without counts). Examples in examples mode. */
      topics: RadarTopic[];
      total: number;
      /** Followed topics with no ballot question, shown as a quiet aside, never as the slide's conclusion. */
      also?: { label: string; topics: string[] };
      note?: string;
      action?: string;
      texts: string[];
    }
  | { id: "closer"; heading: string; decision?: CloserDecision; texts: string[] }
  | { id: "closing"; heading: string; note: string; save: string; explore: string; texts: string[] };

export interface CloserDecision {
  measureId: string;
  number: string;
  title: string;
  status: DecisionStatus;
  basis: string; // why this one: "Connected to your answers", "On your list", "First on the ballot"
  basisPersonal: boolean; // true only for "Connected to your answers"
  sentences: CitedSentence[]; // 0 to 2, verified only
  /** "What the official text says", over the sentences, so they read as the official words' content, not as Legible's view. */
  factsLabel?: string;
  noSummary?: string;
  /** The official voter guide page for this question, when the data names one. */
  official?: { label: string; url: string };
  action: string;
  href: string;
}

export interface Town {
  id: string;
  name: string;
}

/** "Cambridge, MA" for a town in the list; "Massachusetts" for no town or an unknown id. */
export function placeLabel(townId: string | undefined, towns: readonly Town[]): { place: string; known: boolean } {
  const name = townId ? towns.find((t) => t.id === townId)?.name : undefined;
  return name ? { place: `${name}, MA`, known: true } : { place: "Massachusetts", known: false };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** "November 3, 2026". */
export function longDate(iso: string): string | undefined {
  const d = parseDate(iso);
  return d && `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Decided Tuesday, November 3". */
export function decidedLabel(iso: string): string | undefined {
  const d = parseDate(iso);
  return d && `Decided ${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Where a decision stands today, from its kind and the document's decision date. */
export function decisionStatus(m: Measure, doc: DocumentData): DecisionStatus {
  const when = doc.decideBy ? longDate(doc.decideBy.date) : undefined;
  const who = doc.decideBy?.who ?? "Voters";
  const on = when ? ` on ${when}` : "";
  if (m.kind === "initiative") return { label: "Proposed law", detail: `Not law today. ${who} decide${on}.` };
  if (m.kind === "referendum") return { label: "Law in effect", detail: `Already law. ${who} decide${on} whether to keep it.` };
  return { label: "Proposed", detail: `${who} decide${on}.` };
}

/** The sentence, with its source, only when its quote exists and did not fail verification. */
export function citedSentence(m: Measure, s: WhySentence): CitedSentence | undefined {
  const q = m.quotes.find((x) => x.id === s.quoteId);
  if (!q || q.status === "failed") return undefined;
  return { text: s.text, quoteId: s.quoteId, source: S.closerSource(q.locator, q.page) };
}

function verified(m: Measure, why: WhySentence[], max: number): CitedSentence[] {
  const out: CitedSentence[] = [];
  for (const w of why) {
    const c = citedSentence(m, w);
    if (c && !out.some((x) => x.text === c.text)) out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

/** Fact chips for a card ("Because you rent"). Topics are never reasons here. */
export function factReasons(card: Card): string[] {
  return card.because.flatMap((b) => (b.kind === "fact" ? [`Because ${b.value ? FACT_DEFS[b.id].because.yes : FACT_DEFS[b.id].because.no}`] : []));
}

function measureHref(doc: DocumentData, m: Measure): string {
  return routeHash({ kind: "measure", docId: doc.id, measureId: m.id });
}

function connectItem(doc: DocumentData, card: Card, personal: boolean): ConnectItem {
  const m = card.measure;
  // Personal items cite their first fired-rule sentence; general ones their overview.
  const sentence = verified(m, personal ? card.why : m.overview, 1)[0];
  return {
    measureId: m.id,
    number: `Question ${m.number}`,
    title: m.title,
    status: decisionStatus(m, doc),
    reasons: personal ? factReasons(card) : [],
    ...(sentence ? { sentence } : {}),
    href: measureHref(doc, m),
  };
}

function closerDecision(doc: DocumentData, card: Card): CloserDecision {
  const m = card.measure;
  const personal = card.relevance === "touches";
  const sentences = verified(m, card.why, 2);
  const url = m.sourceUrl ?? doc.source.url;
  return {
    measureId: m.id,
    number: `Question ${m.number}`,
    title: m.title,
    status: decisionStatus(m, doc),
    basis: personal ? S.basisTouches : card.onYourList ? S.basisList : S.basisFirst,
    basisPersonal: personal,
    sentences,
    ...(sentences.length > 0 ? { factsLabel: S.closerFacts } : { noSummary: S.closerNoSummary }),
    ...(url ? { official: { label: S.closerOfficial, url } } : {}),
    action: S.closerAction,
    href: measureHref(doc, m),
  };
}

function radarTopic(doc: DocumentData, id: TopicId, withCount: boolean): RadarTopic {
  const n = topicMeasureCount(doc, id);
  return { id, label: TOPIC_DEFS[id].label, part: TOPIC_DEFS[id].avatarPart, count: withCount ? S.radarCount(n) : "" };
}

/** Distinct topics of the document's measures, in ballot order: examples, not interests. */
export function exampleTopics(doc: DocumentData): TopicId[] {
  const out: TopicId[] = [];
  for (const m of doc.measures) for (const t of m.topics) if (!out.includes(t) && TOPIC_IDS.includes(t)) out.push(t);
  return out.slice(0, EXAMPLE_TOPICS_MAX);
}

const itemTexts = (i: ConnectItem) => [i.number, i.title, i.status.label, i.status.detail, ...i.reasons, ...(i.sentence ? [i.sentence.text, i.sentence.source] : [])];

/** The six slides, in fixed order. `summary` is computeWrapped(doc, profile). */
export function buildStory(doc: DocumentData, summary: WrappedSummary, profile: Profile, towns: readonly Town[]): SlideModel[] {
  const { place, known } = placeLabel(profile.townId, towns);
  const total = summary.measureTotal;
  const date = doc.decideBy ? decidedLabel(doc.decideBy.date) : undefined;

  // "Massachusetts · Nov 3", from the ballot's own place and decision date.
  const ballotLabel = [doc.place.name, doc.decideBy ? shortDate(doc.decideBy.date) : undefined].filter(Boolean).join(" · ");
  const opening: SlideModel = { id: "opening", heading: S.openingHeading, line: S.openingLine, hint: S.openingHint, ballotLabel, texts: [S.openingHeading, S.openingLine, S.openingHint, ballotLabel] };

  const statewide = doc.place.kind === "state" ? S.worldStatewide(total) : undefined;
  const world: SlideModel = {
    id: "world",
    heading: S.worldHeading,
    place,
    placeKnown: known,
    questionCount: total,
    countLabel: S.worldCount(total),
    ...(statewide ? { statewide } : {}),
    ...(date ? { dateLabel: date } : {}),
    line: S.worldLine,
    texts: [S.worldHeading, place, String(total), S.worldCount(total), ...(statewide ? [statewide] : []), ...(date ? [date] : []), S.worldLine],
  };

  const touching = summary.cards.filter((c) => c.relevance === "touches");
  let connects: SlideModel;
  if (touching.length > 0) {
    const items = touching.slice(0, CONNECT_MAX).map((c) => connectItem(doc, c, true));
    const intro = S.connectsIntro(touching.length, total);
    connects = { id: "connects", mode: "personal", heading: S.connectsHeading, intro, items, texts: [S.connectsHeading, intro, ...items.flatMap(itemTexts)] };
  } else {
    // Ballot order, never engine order: nothing here is chosen for the person.
    const byOrder = doc.measures.slice(0, CONNECT_MAX).map((m) => summary.cards.find((c) => c.measure.id === m.id)!);
    const items = byOrder.map((c) => connectItem(doc, c, false));
    connects = {
      id: "connects",
      mode: "general",
      heading: S.connectsGeneralHeading,
      intro: S.connectsGeneralIntro,
      items,
      action: S.connectsGeneralAction,
      texts: [S.connectsGeneralHeading, S.connectsGeneralIntro, ...items.flatMap(itemTexts), S.connectsGeneralAction],
    };
  }

  const followed = topicIds(profile);
  let radar: SlideModel;
  if (followed.length > 0) {
    // Topics with a ballot question make the constellation; the rest are an aside.
    const onBallot = summary.topicRank.filter((id) => topicMeasureCount(doc, id) > 0);
    const offBallot = summary.topicRank.filter((id) => topicMeasureCount(doc, id) === 0);
    const none = onBallot.length === 0;
    const shown = (none ? offBallot : onBallot).slice(0, RADAR_MAX).map((id) => radarTopic(doc, id, !none));
    const also = !none && offBallot.length > 0 ? { label: S.radarAlso, topics: offBallot.map((id) => TOPIC_DEFS[id].label) } : undefined;
    const intro = none ? S.radarNoneOnBallot : S.radarIntro;
    radar = {
      id: "radar",
      mode: "followed",
      heading: S.radarHeading,
      intro,
      topics: shown,
      total: none ? offBallot.length : onBallot.length,
      ...(also ? { also } : {}),
      note: S.radarNote,
      texts: [S.radarHeading, intro, ...shown.flatMap((t) => (t.count ? [t.label, t.count] : [t.label])), ...(also ? [also.label, ...also.topics] : []), S.radarNote],
    };
  } else {
    const shown = exampleTopics(doc).map((id) => radarTopic(doc, id, false));
    radar = {
      id: "radar",
      mode: "examples",
      heading: S.radarExamplesHeading,
      intro: S.radarExamplesIntro,
      topics: shown,
      total: shown.length,
      action: S.radarExamplesAction,
      texts: [S.radarExamplesHeading, S.radarExamplesIntro, ...shown.map((t) => t.label), S.radarExamplesAction],
    };
  }

  const pick = summary.spotlight ? closerDecision(doc, summary.spotlight) : undefined;
  const closer: SlideModel = {
    id: "closer",
    heading: S.closerHeading,
    ...(pick ? { decision: pick } : {}),
    texts: [
      S.closerHeading,
      ...(pick
        ? [
            pick.basis,
            pick.number,
            pick.title,
            pick.status.label,
            pick.status.detail,
            ...(pick.factsLabel ? [pick.factsLabel] : []),
            ...pick.sentences.flatMap((s) => [s.text, s.source]),
            ...(pick.noSummary ? [pick.noSummary] : []),
            pick.action,
            ...(pick.official ? [pick.official.label] : []),
          ]
        : []),
    ],
  };

  // The closing slide shows the default share image itself (drawn by the player), so
  // it never shows the town, topics, name, or facts unless the person adds them there.
  const closing: SlideModel = {
    id: "closing",
    heading: S.closingHeading,
    note: S.closingNote,
    save: S.save,
    explore: S.explore,
    texts: [S.closingHeading, S.closingNote, S.save, S.explore],
  };

  return [opening, world, connects, radar, closer, closing];
}
