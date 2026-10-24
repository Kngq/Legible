// Property tests for computeWrapped, from Layla's branch (f20bfe8). See .kiro/specs/ballot-wrapped/design.md, "Testing".
import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCards } from "./cards";
import { TOPIC_IDS, type TopicId } from "@/lib/vocab";
import { topicIds } from "./profile";
import { computeWrapped } from "./wrapped";
import { arbAnyDocument, arbProfile, BALLOT_2026 } from "./wrapped.arbitraries";

const NUM_RUNS = 100;

describe("computeWrapped", () => {
  // Feature: ballot-wrapped, Property 1: Summary is a view of buildCards
  describe("Property 1: Summary is a view of buildCards", () => {
    function checkView(doc: Parameters<typeof computeWrapped>[0], p: Parameters<typeof computeWrapped>[1]) {
      const s = computeWrapped(doc, p);
      const cards = buildCards(doc, p);
      expect(s.cards).toEqual(cards);
      expect(s.spotlight).toEqual(cards[0]);
      expect(s.connectedCount).toBe(cards.filter((c) => c.onYourList).length);
      expect(s.touchCount).toBe(cards.filter((c) => c.relevance === "touches").length);
      expect(Number.isInteger(s.connectedCount)).toBe(true);
      expect(s.connectedCount).toBeGreaterThanOrEqual(0);
      expect(s.connectedCount).toBeLessThanOrEqual(doc.measures.length);
      expect(s.measureTotal).toBe(doc.measures.length);
    }

    it("holds for generated documents and ballot-2026", () => {
      fc.assert(
        fc.property(arbAnyDocument, arbProfile, (doc, p) => checkView(doc, p)),
        { numRuns: NUM_RUNS },
      );
    });

    it("holds for ballot-2026 (9 measures)", () => {
      expect(BALLOT_2026.measures.length).toBe(9);
      fc.assert(
        fc.property(arbProfile, (p) => checkView(BALLOT_2026, p)),
        { numRuns: NUM_RUNS },
      );
    });
  });

  // Feature: ballot-wrapped, Property 2: Topic rank matches the reference ordering
  describe("Property 2: Topic rank matches the reference ordering", () => {
    /**
     * Reference Topic_Rank, built differently from the implementation: walk the card list
     * once, and at each card emit (in TOPIC_IDS order) the followed topics it lists that
     * have not been emitted yet. Then append the never-listed followed topics in TOPIC_IDS order.
     */
    function referenceRank(cards: ReturnType<typeof buildCards>, p: Parameters<typeof computeWrapped>[1]): TopicId[] {
      const followed = TOPIC_IDS.filter((id) => p.topics[id] !== undefined);
      const out: TopicId[] = [];
      for (const card of cards) {
        for (const id of followed) {
          if (!out.includes(id) && card.measure.topics.includes(id)) out.push(id);
        }
      }
      for (const id of followed) if (!out.includes(id)) out.push(id);
      return out;
    }

    function checkRank(doc: Parameters<typeof computeWrapped>[0], p: Parameters<typeof computeWrapped>[1]) {
      const s = computeWrapped(doc, p);
      const followed = topicIds(p);
      const expected = referenceRank(buildCards(doc, p), p);

      expect(s.topicRank).toEqual(expected);

      const topIds = s.topTopics.map((t) => t.id);
      expect(topIds).toEqual(expected.slice(0, Math.min(3, followed.length)));
      expect(new Set(topIds).size).toBe(topIds.length);
      for (const id of [...s.topicRank, ...topIds]) expect(followed).toContain(id);

      if (followed.length === 0) {
        expect(s.topicRank).toEqual([]);
        expect(s.topTopics).toEqual([]);
        expect(s.topTopic).toBeUndefined();
        expect(s.connectedCount).toBe(0);
      } else {
        expect(s.topTopic).toBe(expected[0]);
        expect(followed).toContain(s.topTopic);
      }
    }

    it("holds for generated documents and ballot-2026", () => {
      fc.assert(
        fc.property(arbAnyDocument, arbProfile, (doc, p) => checkRank(doc, p)),
        { numRuns: NUM_RUNS },
      );
    });
  });

  // Feature: ballot-wrapped, Property 3: Topic measure counts depend only on the document
  describe("Property 3: Topic measure counts depend only on the document", () => {
    type Doc = Parameters<typeof computeWrapped>[0];
    type Prof = Parameters<typeof computeWrapped>[1];

    /** Two profiles with the same town and topics; life facts come from independent draws. */
    const arbLifeFactPair: fc.Arbitrary<[Prof, Prof]> = fc
      .tuple(arbProfile, arbProfile)
      .map(([a, other]) => [a, { ...a, facts: other.facts, skipped: other.skipped }]);

    function countIn(doc: Doc, id: TopicId): number {
      let n = 0;
      for (const m of doc.measures) if (m.topics.includes(id)) n++;
      return n;
    }

    it("each returned topic's measureCount counts measures listing it", () => {
      fc.assert(
        fc.property(arbAnyDocument, arbProfile, (doc, p) => {
          const s = computeWrapped(doc, p);
          for (const t of s.topTopics) {
            expect(t.measureCount).toBe(countIn(doc, t.id));
            expect(t.measureCount).toBeGreaterThanOrEqual(0);
            expect(t.measureCount).toBeLessThanOrEqual(s.measureTotal);
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it("profiles differing only in life facts give equal counts and topic sets", () => {
      fc.assert(
        fc.property(arbAnyDocument, arbLifeFactPair, (doc, [a, b]) => {
          expect(b.townId).toBe(a.townId);
          expect(b.topics).toEqual(a.topics);
          const sa = computeWrapped(doc, a);
          const sb = computeWrapped(doc, b);
          expect(sb.connectedCount).toBe(sa.connectedCount);
          expect(new Set(sb.topicRank)).toEqual(new Set(sa.topicRank));
          const counts = (s: typeof sa) => new Map(s.topTopics.map((t) => [t.id, t.measureCount]));
          const ca = counts(sa);
          const cb = counts(sb);
          // A topic returned for either profile has the same, document-only count in both.
          for (const [id, n] of ca) if (cb.has(id)) expect(cb.get(id)).toBe(n);
          for (const [id, n] of [...ca, ...cb]) expect(n).toBe(countIn(doc, id));
        }),
        { numRuns: NUM_RUNS },
      );
    });
  });
  // Feature: ballot-wrapped, Property 4: The summary is pure and deterministic
  describe("Property 4: The summary is pure and deterministic", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });
    function storageSpy() {
      return {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        get length() {
          return 0;
        },
      };
    }
    it("same result across clock/randomness changes, inputs untouched, no I/O", () => {
      fc.assert(
        fc.property(arbAnyDocument, arbProfile, (doc, p) => {
          const fetchSpy = vi.fn();
          const local = storageSpy();
          const session = storageSpy();
          vi.stubGlobal("fetch", fetchSpy);
          vi.stubGlobal("localStorage", local);
          vi.stubGlobal("sessionStorage", session);
          const nowSpy = vi.spyOn(Date, "now");
          const randSpy = vi.spyOn(Math, "random");
          try {
            const docCopy = structuredClone(doc);
            const profCopy = structuredClone(p);
            nowSpy.mockReturnValue(1_000);
            randSpy.mockReturnValue(0.1);
            const first = computeWrapped(doc, p);
            nowSpy.mockReturnValue(9_999_999_999);
            randSpy.mockReturnValue(0.9);
            const second = computeWrapped(doc, p);
            expect(second).toEqual(first);
            expect(doc).toEqual(docCopy);
            expect(p).toEqual(profCopy);
            expect(fetchSpy).not.toHaveBeenCalled();
            for (const s of [local, session]) {
              expect(s.getItem).not.toHaveBeenCalled();
              expect(s.setItem).not.toHaveBeenCalled();
              expect(s.removeItem).not.toHaveBeenCalled();
              expect(s.clear).not.toHaveBeenCalled();
              expect(s.key).not.toHaveBeenCalled();
            }
          } finally {
            vi.unstubAllGlobals();
            vi.restoreAllMocks();
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });
  });
});
