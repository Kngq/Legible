// Story generation tests for "Your ballot, wrapped". See .kiro/specs/ballot-wrapped.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import towns from "@/data/towns.json";
import { FACT_DEFS, findBannedWords, TOPIC_DEFS } from "@/lib/vocab";
import { IDENTITY_WORDS, SIDE_WORDS, WRAPPED_STRINGS } from "@/lib/vocab/wrapped";
import { parseRoute } from "@/lib/nav/route";
import { demoPersona } from "./demo";
import { answerFact, emptyProfile, setTopic, type Profile } from "./profile";
import type { DocumentData } from "./types";
import { computeWrapped } from "./wrapped";
import { arbAnyDocument, arbProfile, BALLOT_2026 } from "./wrapped.arbitraries";
import { buildStory, decisionStatus, placeLabel, SLIDE_COUNT, SLIDE_IDS, type SlideModel } from "./wrapped-slides";

const TOWNS = towns as { id: string; name: string }[];
const RUNS = 100;
const story = (p: Profile, doc: DocumentData = BALLOT_2026) => buildStory(doc, computeWrapped(doc, p), p, TOWNS);
const slide = <K extends SlideModel["id"]>(s: SlideModel[], id: K) => s.find((x) => x.id === id) as Extract<SlideModel, { id: K }>;
const word = (w: string) => new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "i");

/** Strings the story writes itself, with sample arguments (official-text labels excluded). */
function appCopy(): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(WRAPPED_STRINGS)) {
    if (k === "closerSource") continue; // names the official YES and NO statements
    if (typeof v === "string") out.push(v);
    else for (const n of [0, 1, 2, 3, 9]) out.push((v as (a: number, b: number) => string)(n, 9));
  }
  return out;
}

describe("buildStory", () => {
  it("has six slides in the fixed order for any document and profile", () => {
    fc.assert(
      fc.property(arbAnyDocument, arbProfile, (doc, p) => {
        const s = story(p, doc);
        expect(s.map((x) => x.id)).toEqual([...SLIDE_IDS]);
        expect(SLIDE_COUNT).toBe(6);
        for (const x of s) {
          expect(x.texts.length).toBeGreaterThan(0);
          for (const t of x.texts) expect(t.trim()).not.toBe("");
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("never uses a banned word in any visible string, for any profile", () => {
    fc.assert(
      fc.property(arbProfile, (p) => {
        for (const x of story(p)) for (const t of x.texts) expect(findBannedWords(t), t).toEqual([]);
      }),
      { numRuns: RUNS },
    );
  });

  it("never names the person with an identity or a side", () => {
    fc.assert(
      fc.property(arbProfile, (p) => {
        for (const x of story(p)) for (const t of x.texts) for (const w of IDENTITY_WORDS) expect(word(w).test(t), `${w} in ${t}`).toBe(false);
      }),
      { numRuns: RUNS },
    );
    for (const t of appCopy()) {
      expect(findBannedWords(t), t).toEqual([]);
      for (const w of [...IDENTITY_WORDS, ...SIDE_WORDS]) expect(word(w).test(t), `${w} in ${t}`).toBe(false);
    }
  });

  it("never claims what the person explored or read (category C)", () => {
    fc.assert(
      fc.property(arbProfile, (p) => {
        for (const x of story(p)) for (const t of x.texts) expect(t).not.toMatch(/\byou (read|explored|opened|viewed|visited)\b|\byour year\b|\bstreak\b/i);
      }),
      { numRuns: RUNS },
    );
  });

  it("shows only counts taken from the ballot", () => {
    fc.assert(
      fc.property(arbProfile, (p) => {
        const s = story(p);
        const sum = computeWrapped(BALLOT_2026, p);
        const world = slide(s, "world");
        expect(world.questionCount).toBe(BALLOT_2026.measures.length);
        expect(world.texts).toContain("9");
        for (const t of slide(s, "radar").topics) {
          const n = BALLOT_2026.measures.filter((m) => m.topics.includes(t.id)).length;
          if (t.count) expect(t.count).toBe(WRAPPED_STRINGS.radarCount(n));
        }
        const connects = slide(s, "connects");
        if (connects.mode === "personal") expect(connects.intro).toContain(`${sum.touchCount} of 9`);
        const card = slide(s, "closing").card;
        expect(card.questions).toBe("9 ballot questions");
        if (card.topics) expect(card.topics.startsWith(`${Object.keys(p.topics).length} `)).toBe(true);
        // Slide 2's only numbers: the question count, and the day in the date.
        const nums = (t: string) => [...t.matchAll(/\d+/g)].map((m) => Number(m[0]));
        for (const t of world.texts) for (const n of nums(t)) expect(t === world.dateLabel ? n === 3 : n === 9, t).toBe(true);
        if (connects.mode === "general") expect(nums(connects.intro)).toEqual([]);
      }),
      { numRuns: RUNS },
    );
  });

  it("keeps life facts and topics apart (A never uses topics; B never uses facts)", () => {
    fc.assert(
      fc.property(arbAnyDocument, arbProfile, (doc, p) => {
        const s = story(p, doc);
        const connects = slide(s, "connects");
        const factChips = new Set(Object.values(FACT_DEFS).flatMap((d) => [`Because ${d.because.yes}`, `Because ${d.because.no}`]));
        for (const i of connects.items) for (const r of i.reasons) expect(factChips.has(r), r).toBe(true);
        for (const t of connects.texts) expect(t).not.toMatch(/^You follow /);
        if (connects.mode === "personal") {
          const touching = computeWrapped(doc, p).cards.filter((c) => c.relevance === "touches");
          expect(connects.items.map((i) => i.measureId)).toEqual(touching.slice(0, 3).map((c) => c.measure.id));
          for (const i of connects.items) expect(i.reasons.length).toBeGreaterThan(0);
        }
        const radar = slide(s, "radar");
        for (const t of radar.texts) expect(t).not.toMatch(/^Because /);
        if (radar.mode === "followed") for (const t of radar.topics) expect(p.topics[t.id]).toBeDefined();
      }),
      { numRuns: RUNS },
    );
  });

  it("topics alone never make slide 3 personal; facts alone never fill slide 4", () => {
    fc.assert(
      fc.property(arbProfile, (p) => {
        const topicsOnly: Profile = { ...p, facts: {}, skipped: {} };
        expect(slide(story(topicsOnly), "connects").mode).toBe("general");
        const factsOnly: Profile = { ...p, topics: {} };
        expect(slide(story(factsOnly), "radar").mode).toBe("examples");
      }),
      { numRuns: RUNS },
    );
  });

  it("shows only verified sentences, each with its source, at most two", () => {
    fc.assert(
      fc.property(arbAnyDocument, arbProfile, (doc, p) => {
        const s = story(p, doc);
        const sentences = [...slide(s, "connects").items.flatMap((i) => (i.sentence ? [{ i: i.measureId, s: i.sentence }] : []))];
        const d = slide(s, "closer").decision;
        if (d) {
          expect(d.sentences.length).toBeLessThanOrEqual(2);
          sentences.push(...d.sentences.map((x) => ({ i: d.measureId, s: x })));
          if (d.sentences.length === 0) expect(d.noSummary).toBe(WRAPPED_STRINGS.closerNoSummary);
        }
        for (const { i, s: sentence } of sentences) {
          const m = doc.measures.find((x) => x.id === i)!;
          const q = m.quotes.find((x) => x.id === sentence.quoteId);
          expect(q).toBeDefined();
          expect(q!.status).not.toBe("failed");
          expect(sentence.source).toMatch(/^From /);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("links every decision to its measure page", () => {
    fc.assert(
      fc.property(arbAnyDocument, arbProfile, (doc, p) => {
        const s = story(p, doc);
        const links = [...slide(s, "connects").items.map((i) => [i.measureId, i.href]), ...(slide(s, "closer").decision ? [[slide(s, "closer").decision!.measureId, slide(s, "closer").decision!.href]] : [])];
        for (const [id, href] of links) expect(parseRoute(href)).toEqual({ kind: "measure", docId: doc.id, measureId: id });
      }),
      { numRuns: RUNS },
    );
  });

  it("chooses the closer decision by engine order and says why", () => {
    fc.assert(
      fc.property(arbProfile, (p) => {
        const d = slide(story(p), "closer").decision!;
        const first = computeWrapped(BALLOT_2026, p).cards[0];
        expect(d.measureId).toBe(first.measure.id);
        expect(d.basis).toBe(first.relevance === "touches" ? "Connected to your answers" : first.onYourList ? "On your list" : "First on the ballot");
        expect(d.basisPersonal).toBe(first.relevance === "touches");
      }),
      { numRuns: RUNS },
    );
  });
});

describe("decisionStatus", () => {
  it("calls initiatives proposals and Question 9 a law in effect", () => {
    const q7 = BALLOT_2026.measures.find((m) => m.number === "7")!;
    const q9 = BALLOT_2026.measures.find((m) => m.number === "9")!;
    expect(decisionStatus(q7, BALLOT_2026)).toEqual({ label: "Proposed law", detail: "Not law today. Voters decide on November 3, 2026." });
    expect(decisionStatus(q9, BALLOT_2026)).toEqual({ label: "Law in effect", detail: "Already law. Voters decide on November 3, 2026 whether to keep it." });
    for (const m of BALLOT_2026.measures) expect(decisionStatus(m, BALLOT_2026).label).toBe(m.kind === "referendum" ? "Law in effect" : "Proposed law");
  });
});

describe("profiles", () => {
  it("empty profile: Massachusetts, ballot order, examples, first question", () => {
    const s = story(emptyProfile());
    expect(slide(s, "world")).toMatchObject({ place: "Massachusetts", placeKnown: false, questionCount: 9, dateLabel: "Decided Tuesday, November 3" });
    const c = slide(s, "connects");
    expect(c.mode).toBe("general");
    expect(c.heading).toBe("Decisions worth knowing about");
    expect(c.items.map((i) => i.number)).toEqual(["Question 1", "Question 2", "Question 3"]);
    for (const i of c.items) expect(i.reasons).toEqual([]);
    const r = slide(s, "radar");
    expect(r.mode).toBe("examples");
    expect(r.heading).toBe("There’s a lot to explore.");
    expect(r.intro).toContain("not your interests");
    expect(r.topics.length).toBeGreaterThan(0);
    for (const t of r.topics) expect(t.count).toBe("");
    const d = slide(s, "closer").decision!;
    expect(d).toMatchObject({ number: "Question 1", basis: "First on the ballot", basisPersonal: false });
    expect(d.sentences.length).toBeGreaterThan(0);
    const card = slide(s, "closing").card;
    expect(card).toEqual({ title: "My ballot, wrapped", year: "2026", place: "Massachusetts", questions: "9 ballot questions", line: "Curiosity suits you." });
  });

  it("town only: shows the town, claims nothing local", () => {
    const p = { ...emptyProfile(), townId: "cambridge" };
    const s = story(p);
    expect(slide(s, "world")).toMatchObject({ place: "Cambridge, MA", placeKnown: true });
    expect(slide(s, "connects").mode).toBe("general");
    expect(slide(s, "closing").card.place).toBe("Cambridge, MA");
    for (const x of s) for (const t of x.texts) expect(t).not.toMatch(/in Cambridge|Cambridge (voters|residents)/);
  });

  it("unknown town id falls back to Massachusetts", () => {
    expect(placeLabel("atlantis", TOWNS)).toEqual({ place: "Massachusetts", known: false });
    expect(placeLabel(undefined, TOWNS)).toEqual({ place: "Massachusetts", known: false });
  });

  it("topics only: the radar is theirs, slide 3 stays in ballot order", () => {
    let p = setTopic(emptyProfile(), "open_space", true);
    p = setTopic(p, "gun_policy", true);
    const s = story(p);
    const r = slide(s, "radar");
    expect(r.mode).toBe("followed");
    expect(r.topics.map((t) => [t.label, t.count])).toEqual([
      ["Open space", "1 question"],
      ["Gun policy", "1 question"],
    ]);
    expect(r.note).toBe("Following a subject says nothing about where you stand.");
    expect(slide(s, "connects").mode).toBe("general");
    expect(slide(s, "closer").decision!.basis).toBe("On your list");
  });

  it("housing facts: renting brings Question 7 forward with its fact chip", () => {
    const p = answerFact(emptyProfile(), "rents", true, { kind: "edit" });
    const s = story(p);
    const c = slide(s, "connects");
    expect(c.mode).toBe("personal");
    expect(c.items.map((i) => i.number)).toEqual(["Question 7"]);
    expect(c.items[0].reasons).toEqual(["Because you rent"]);
    expect(c.items[0].sentence?.text).toMatch(/rent/);
    expect(slide(s, "closer").decision).toMatchObject({ number: "Question 7", basis: "Connected to your answers", basisPersonal: true });
  });

  it("demo persona tells the Cambridge renter's story", () => {
    const s = story(demoPersona("2026-10-24T00:00:00.000Z"));
    expect(slide(s, "world").place).toBe("Cambridge, MA");
    expect(slide(s, "connects").items.map((i) => i.number)).toEqual(["Question 7"]);
    expect(slide(s, "radar").topics.map((t) => [t.label, t.count])).toEqual([
      ["Housing costs", "1 question"],
      ["Roads and transit", "Not on this ballot"],
    ]);
    expect(slide(s, "closing").card.topics).toBe("2 topics on my radar");
    expect(TOPIC_DEFS.roads_transit.label).toBe("Roads and transit");
  });

  it("is pure: the same input gives the same story", () => {
    fc.assert(
      fc.property(arbProfile, (p) => {
        const copy = structuredClone(p);
        expect(story(p)).toEqual(story(p));
        expect(p).toEqual(copy);
      }),
      { numRuns: 30 },
    );
  });
});
