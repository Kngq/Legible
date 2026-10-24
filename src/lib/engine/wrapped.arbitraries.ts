// Shared fast-check generators for "Your ballot, wrapped" property tests (from f20bfe8;
// quotes now carry any status, so failed quotes are generated too).
// Imported only by *.test.ts files. Not a test suite itself (vitest collects *.test.ts only).
import fc from "fast-check";
import ballot from "@/data/ballot-2026.json";
import towns from "@/data/towns.json";
import { DIRECTIONS, FACT_IDS, TOPIC_IDS, type Direction, type FactId, type TopicId } from "@/lib/vocab";
import { emptyProfile, PROFILE_VERSION, type FactAnswer, type Profile, type TopicChoice } from "./profile";
import type { Because, Card, DocumentData, Measure, MeasureKind, Quote, QuoteStatus, Relevance, Rule, WhySentence } from "./types";

const T0 = "2026-10-24T14:00:00.000Z";

/** The real 2026 statewide ballot, typed for the engine. */
export const BALLOT_2026 = ballot as unknown as DocumentData;

export const TOWN_IDS: readonly string[] = (towns as { id: string }[]).map((t) => t.id);

// ---------- vocab ----------

export const arbTopicId: fc.Arbitrary<TopicId> = fc.constantFrom(...TOPIC_IDS);
export const arbFactId: fc.Arbitrary<FactId> = fc.constantFrom(...FACT_IDS);
export const arbDirection: fc.Arbitrary<Direction> = fc.constantFrom(...DIRECTIONS);

/** Any subset of TOPIC_IDS, biased so the empty set and roads_transit / schools show up often. */
export const arbTopicSet: fc.Arbitrary<TopicId[]> = fc.oneof(
  fc.constant<TopicId[]>([]),
  fc.subarray([...TOPIC_IDS]),
  fc.subarray([...TOPIC_IDS]).map((ts) => Array.from(new Set<TopicId>([...ts, "roads_transit"]))),
  fc.subarray([...TOPIC_IDS]).map((ts) => Array.from(new Set<TopicId>([...ts, "schools"]))),
  fc.constant<TopicId[]>(["roads_transit", "schools"]),
);

// ---------- profile ----------

/** A towns.json id, an unknown string, or no town. */
export const arbTownId: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constantFrom(...TOWN_IDS),
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !TOWN_IDS.includes(s)),
  fc.constant(undefined),
);

/** Each fact answered yes, no, or left unanswered. */
const arbFactAnswers: fc.Arbitrary<Partial<Record<FactId, boolean>>> = fc
  .tuple(...FACT_IDS.map(() => fc.constantFrom<boolean | undefined>(true, false, undefined)))
  .map((vals) => {
    const out: Partial<Record<FactId, boolean>> = {};
    FACT_IDS.forEach((id, i) => {
      if (vals[i] !== undefined) out[id] = vals[i];
    });
    return out;
  });

export const arbProfile: fc.Arbitrary<Profile> = fc
  .record({ townId: arbTownId, facts: arbFactAnswers, topics: arbTopicSet })
  .map(({ townId, facts, topics }) => {
    const p = emptyProfile(T0);
    if (townId !== undefined) p.townId = townId;
    const f: Partial<Record<FactId, FactAnswer>> = {};
    for (const [id, value] of Object.entries(facts) as [FactId, boolean][]) {
      f[id] = { value, source: { kind: "onboarding" }, at: T0 };
    }
    const t: Partial<Record<TopicId, TopicChoice>> = {};
    for (const id of topics) t[id] = { via: "chip", at: T0 };
    return { ...p, version: PROFILE_VERSION, facts: f, topics: t };
  });

// ---------- quotes and measures ----------

const arbText = fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim() !== "");

function quote(id: string, text: string, status: QuoteStatus = "reviewed", page?: number): Quote {
  return { id, text, locator: "AG summary", status, ...(page ? { page } : {}) };
}

const arbStatus: fc.Arbitrary<QuoteStatus> = fc.constantFrom("reviewed", "verified", "failed");

/** Why sentences citing quotes from `quoteIds` (at most 2). */
function arbWhyFrom(quoteIds: string[]): fc.Arbitrary<WhySentence[]> {
  return fc.array(fc.record({ text: arbText, quoteId: fc.constantFrom(...quoteIds) }), { maxLength: 2 });
}

const arbKind: fc.Arbitrary<MeasureKind> = fc.constantFrom("initiative", "referendum", "article", "other");

/** One structurally valid measure; every referenced quote is in `quotes`. */
function arbMeasure(docId: string, index: number): fc.Arbitrary<Measure> {
  const id = `${docId}-q${index + 1}`;
  return fc
    .record({
      extraQuotes: fc.array(fc.tuple(arbText, arbStatus, fc.option(fc.integer({ min: 1, max: 40 }), { nil: undefined })), { maxLength: 3 }),
      summaryText: arbText,
      title: arbText,
      kind: arbKind,
      appliesToEveryone: fc.boolean(),
      everyoneDirection: fc.option(arbDirection, { nil: undefined }),
      topics: fc.subarray([...TOPIC_IDS], { maxLength: 4 }),
      askFacts: fc.subarray([...FACT_IDS], { maxLength: 3 }),
      seed: fc.nat(),
    })
    .chain((m) => {
      const quotes = [quote(`${id}-summary`, m.summaryText), ...m.extraQuotes.map(([t, st, page], i) => quote(`${id}-x${i}`, t, st, page))];
      const qids = quotes.map((q) => q.id);
      const arbRule: fc.Arbitrary<Rule> = fc
        .record({
          fact: arbFactId,
          when: fc.option(fc.boolean(), { nil: undefined }),
          direction: arbDirection,
          why: arbWhyFrom(qids),
        })
        .map((r) => {
          const out: Rule = { fact: r.fact, direction: r.direction, why: r.why };
          if (r.when !== undefined) out.when = r.when;
          return out;
        });
      return fc.record({ rules: fc.array(arbRule, { maxLength: 3 }), overview: arbWhyFrom(qids) }).map(
        ({ rules, overview }): Measure => {
          const measure: Measure = {
            id,
            number: String(index + 1),
            title: m.title,
            officialTitle: m.title,
            kind: m.kind,
            summary: quotes[0],
            outcomes: {},
            appliesToEveryone: m.appliesToEveryone,
            overview,
            rules,
            askFacts: m.askFacts,
            topics: m.topics,
            quotes,
          };
          if (m.everyoneDirection !== undefined) measure.everyoneDirection = m.everyoneDirection;
          return measure;
        },
      );
    });
}

/** A document with 1 to 12 measures, unique ids, random topics, rules, and appliesToEveryone. */
export const arbDocument: fc.Arbitrary<DocumentData> = fc
  .integer({ min: 1, max: 12 })
  .chain((n) => fc.tuple(...Array.from({ length: n }, (_, i) => arbMeasure("gen-doc", i))))
  .map(
    (measures): DocumentData => ({
      id: "gen-doc",
      title: "Generated ballot",
      place: { kind: "state", name: "Massachusetts" },
      docType: "ballot",
      source: { name: "Generated" },
      provenance: "reviewed",
      measures,
    }),
  );

/** ballot-2026 or a generated document. */
export const arbAnyDocument: fc.Arbitrary<DocumentData> = fc.oneof(fc.constant(BALLOT_2026), arbDocument);

// ---------- cards ----------

const arbRelevance: fc.Arbitrary<Relevance> = fc.constantFrom("touches", "everyone", "probably_not");

const arbBecause: fc.Arbitrary<Because> = fc.oneof(
  fc.record({ kind: fc.constant("fact" as const), id: arbFactId, value: fc.boolean() }),
  fc.record({ kind: fc.constant("topic" as const), id: arbTopicId }),
);

/**
 * Any card: any relevance and onYourList, a `why` list that may be empty or cite a
 * quote id missing from `measure.quotes`, and any `because` list.
 */
export const arbCard: fc.Arbitrary<Card> = arbMeasure("card-doc", 0).chain((measure) => {
  const known = measure.quotes.map((q) => q.id);
  const arbQuoteId = fc.oneof(
    fc.constantFrom(...known),
    fc.string({ minLength: 1, maxLength: 12 }).map((s) => `missing-${s}`),
  );
  return fc
    .record({
      number: fc.oneof(fc.integer({ min: 1, max: 99 }).map(String), fc.constant("Article 12")),
      relevance: arbRelevance,
      onYourList: fc.boolean(),
      direction: arbDirection,
      why: fc.array(fc.record({ text: arbText, quoteId: arbQuoteId }), { maxLength: 3 }),
      because: fc.array(arbBecause, { maxLength: 4 }),
      pendingQuestions: fc.subarray([...FACT_IDS], { maxLength: 2 }),
    })
    .map(({ number, ...rest }): Card => ({ measure: { ...measure, number }, ...rest }));
});
