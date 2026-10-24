// Property tests for wrapped-slides. See .kiro/specs/ballot-wrapped/design.md, "Correctness Properties".
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import towns from "@/data/towns.json";
import { TOPIC_DEFS } from "@/lib/vocab";
import { findBannedWords } from "@/lib/vocab/banned";
import { CIVIC_PERSONALITIES, WRAPPED_STRINGS } from "@/lib/vocab/wrapped";
import { topicIds } from "./profile";
import { computeWrapped } from "./wrapped";
import { arbAnyDocument, arbCard, arbProfile, arbTownId, BALLOT_2026 } from "./wrapped.arbitraries";
import { announcement, buildSlides, chipText, SLIDE_IDS, spotlightModel, townLabel } from "./wrapped-slides";

const NUM_RUNS = 100;
const TOWNS = towns as { id: string; name: string }[];
const arbFollowingProfile = arbProfile.filter((p) => topicIds(p).length > 0);

describe("wrapped-slides", () => {
  // Feature: ballot-wrapped, Property 8: Slide headings and announcements follow the summary
  // **Validates: Requirements 2.16, 5.1, 5.6, 6.1, 6.2, 7.1, 9.3**
  it("Property 8: Slide headings and announcements follow the summary", () => {
    fc.assert(
      fc.property(arbAnyDocument, arbFollowingProfile, (doc, p) => {
        const summary = computeWrapped(doc, p);
        const slides = buildSlides(summary, townLabel(p.townId, TOWNS));
        const top = summary.topTopic!;
        expect(top).toBeDefined();
        const T = summary.measureTotal;

        expect(slides.map((s) => s.id)).toEqual([...SLIDE_IDS]);
        expect(slides.map((s) => s.heading)).toEqual([
          "Your 2026 Ballot, Wrapped",
          TOPIC_DEFS[top].label,
          "What your ballot is about for you",
          `${summary.connectedCount} of ${T} questions list a topic you follow`,
          "Start here",
          CIVIC_PERSONALITIES[top].name,
          "Ready to dig in?",
          "Your 2026 Ballot, Wrapped",
        ]);

        // Top_Three texts: each label then "N of T questions", in Topic_Rank order.
        const texts = slides[2].texts;
        let pos = 0;
        for (const t of summary.topTopics) {
          const li = texts.indexOf(TOPIC_DEFS[t.id].label, pos);
          expect(li).toBeGreaterThanOrEqual(pos);
          expect(texts[li + 1]).toBe(`${t.measureCount} of ${T} questions`);
          pos = li + 2;
        }

        slides.forEach((s, i) => {
          expect(announcement(i, s.heading)).toBe(`Slide ${i + 1} of 8. ${s.heading}`);
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ballot-wrapped, Property 9: Slide copy is neutral and its numbers come from the allowed set
  // **Validates: Requirements 4.5, 13.2, 13.5, 13.6**
  it("Property 9: Slide copy is neutral and its numbers come from the allowed set", () => {
    const HEADING = "Your 2026 Ballot, Wrapped";
    const PARTIES = /\b(democrat\w*|republican\w*|libertarian\w*|green-rainbow|unenrolled)\b/i;
    const url = BALLOT_2026.source.url;
    // Req 13.2: one fixed voter info URL, no profile-derived query string or fragment.
    expect(url).toMatch(/^https:\/\/www\.sec\.state\.ma\.us\//);
    expect(url).not.toMatch(/[?#]/);
    fc.assert(
      fc.property(arbAnyDocument, arbProfile, (doc, p) => {
        const summary = computeWrapped(doc, p);
        const town = townLabel(p.townId, TOWNS);
        const slides = buildSlides(summary, town);
        // Verbatim official strings (Spotlight title and why sentence) are exempt sources.
        const spot = summary.spotlight ? spotlightModel(summary.spotlight) : undefined;
        const official = new Set<string>(spot ? [spot.title, ...(spot.sentence ? [spot.sentence.text] : [])] : []);
        const allowed = new Set<string>([
          String(summary.connectedCount),
          String(summary.measureTotal),
          ...summary.topTopics.map((t) => String(t.measureCount)),
          ...doc.measures.map((m) => m.number).flatMap((n) => n.match(/\d+/g) ?? []),
        ]);
        for (const slide of slides) {
          const app = [slide.heading, ...slide.texts].filter((t) => !(slide.id === "spotlight" && official.has(t)));
          for (const text of app) {
            expect(findBannedWords(text)).toEqual([]);
            expect(text).not.toMatch(/\b(YES|NO)\b/);
            expect(text).not.toMatch(/\bvote for\b/i);
            expect(text).not.toMatch(PARTIES);
            // Req 13.2: no outbound URL appears in slide text.
            expect(text).not.toMatch(/https?:\/\//);
            // 2026 only inside the fixed heading; every other numeral is from the allowed set.
            for (const n of text.split(HEADING).join(" ").match(/\d+/g) ?? []) {
              expect(allowed.has(n)).toBe(true);
            }
          }
        }
        // Req 4.5: Intro has no digits (outside the heading), topic labels, or fact text.
        const intro = slides[0];
        const labels = Object.values(TOPIC_DEFS).map((d) => d.label);
        for (const text of intro.texts) {
          expect(text.split(HEADING).join(" ")).not.toMatch(/\d/);
          expect(labels).not.toContain(text);
          expect(text).not.toMatch(/^Because |^You follow /);
        }
        expect(intro.texts).toEqual([HEADING, town, intro.texts[2]]);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ballot-wrapped, Property 10: Town label is exact or falls back
  // **Validates: Requirements 4.2, 4.3**
  it("Property 10: Town label is exact or falls back", () => {
    // Fixed examples.
    expect(townLabel("cambridge", TOWNS)).toBe("Cambridge");
    expect(townLabel("manchester-by-the-sea", TOWNS)).toBe("Manchester-by-the-Sea");
    expect(townLabel(undefined, TOWNS)).toBe("Massachusetts");
    expect(townLabel("not-a-town", TOWNS)).toBe("Massachusetts");

    // Every towns.json entry maps to its exact name.
    fc.assert(
      fc.property(fc.constantFrom(...TOWNS), (entry) => {
        expect(townLabel(entry.id, TOWNS)).toBe(entry.name);
      }),
      { numRuns: NUM_RUNS },
    );

    // Any town id, unknown string, or undefined: exact name when known, else the state fallback.
    fc.assert(
      fc.property(arbTownId, (id) => {
        const entry = TOWNS.find((t) => t.id === id);
        expect(townLabel(id, TOWNS)).toBe(entry ? entry.name : "Massachusetts");
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ballot-wrapped, Property 11: Spotlight model copies the card without inventing text
  // **Validates: Requirements 8.1, 8.2, 8.3, 8.5, 8.6, 8.7**
  it("Property 11: Spotlight model copies the card without inventing text", () => {
    fc.assert(
      fc.property(arbCard, (card) => {
        const m = card.measure;
        const model = spotlightModel(card);

        // Req 8.1: number prefixed with "Question", title unchanged.
        expect(model.number).toBe(`Question ${m.number}`);
        expect(model.title).toBe(m.title);

        // Req 8.2: one label by the fixed rule order.
        const label =
          card.relevance === "touches"
            ? "Touches you"
            : card.onYourList
              ? "On your list"
              : card.relevance === "everyone"
                ? "Applies to everyone"
                : "Probably not you";
        expect(model.label).toBe(label);

        // Req 8.3, 8.6, 8.7: why[0] unchanged only when its quote exists; otherwise no sentence.
        const first = card.why[0];
        const cited = first !== undefined && m.quotes.some((q) => q.id === first.quoteId);
        if (cited) {
          expect(model.sentence).toEqual(first);
        } else {
          expect(model.sentence).toBeUndefined();
          expect("sentence" in model).toBe(false);
        }

        // Req 8.5: one chip per because entry, in order, with existing chip text.
        expect(model.chips).toEqual(card.because.map(chipText));
        expect(model.chips).toHaveLength(card.because.length);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  describe("fixed strings and links", () => {
    // Req 4.1, 5.4, 10.1
    it("uses the fixed Intro and Dig_In headings", () => {
      expect(WRAPPED_STRINGS.heading).toBe("Your 2026 Ballot, Wrapped");
      expect(WRAPPED_STRINGS.digInHeading).toBe("Ready to dig in?");
    });

    it("revealSentence has no digits, banned words, YES, or NO", () => {
      const s = WRAPPED_STRINGS.revealSentence;
      expect(s).not.toMatch(/\d/);
      expect(findBannedWords(s)).toEqual([]);
      expect(s).not.toMatch(/\b(yes|no)\b/i);
    });

    // Req 8.5
    it("chipText matches existing MeasureCard chip text", () => {
      expect(chipText({ kind: "fact", id: "rents", value: true })).toBe("Because you rent");
      expect(chipText({ kind: "topic", id: "housing_costs" })).toBe("You follow housing costs");
    });

    // Req 10.5, 10.6
    it("Voter_Info_Link is ballot.source.url with no query string", () => {
      const url = BALLOT_2026.source.url;
      expect(url).toBeDefined();
      expect(typeof url).toBe("string");
      expect(url!.length).toBeGreaterThan(0);
      expect(new URL(url!).search).toBe("");
      expect(url).not.toContain("?");
    });
  });
});
