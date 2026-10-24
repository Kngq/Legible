// Property tests for wrapped-share-layout. See .kiro/specs/ballot-wrapped/design.md, "Correctness Properties".
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import towns from "@/data/towns.json";
import { APP_NAME, FACT_DEFS, FACT_IDS, TOPIC_DEFS, TOPIC_IDS, WRAPPED_STRINGS } from "@/lib/vocab";
import { CIVIC_PERSONALITIES, SLIDE_COLOURS } from "@/lib/vocab/wrapped";
import { topicIds } from "./profile";
import { computeWrapped } from "./wrapped";
import { arbAnyDocument, arbProfile, BALLOT_2026 } from "./wrapped.arbitraries";
import {
  layoutShareImage,
  SHARE_H,
  SHARE_PAD,
  SHARE_W,
  shareContent,
  type Measure,
  type ShareContent,
  withTimeout,
} from "./wrapped-share-layout";
import { townLabel } from "./wrapped-slides";

const NUM_RUNS = 100;
const TOWNS = towns as { id: string; name: string }[];
const arbFollowingProfile = arbProfile.filter((p) => topicIds(p).length > 0);

/** Every life fact "because" text, both answers. */
const BECAUSE_TEXTS = FACT_IDS.flatMap((id) => [FACT_DEFS[id].because.yes, FACT_DEFS[id].because.no]);
/** Real 2026 measure titles: long enough that a substring match means a leak. */
const BALLOT_TITLES = BALLOT_2026.measures.flatMap((m) => [m.title, m.officialTitle]).filter(Boolean);

const TOPIC_LABELS = TOPIC_IDS.map((id) => TOPIC_DEFS[id].label);
const TOWN_NAMES = TOWNS.map((t) => t.name);

/** Real content: any town (Manchester-by-the-Sea always in the pool and favoured), 1 to 3 real
 * topic labels always including "Government transparency", and any Civic_Personality. */
const arbShareContent: fc.Arbitrary<ShareContent> = fc.record({
  heading: fc.constant(WRAPPED_STRINGS.heading),
  town: fc.oneof(fc.constant("Manchester-by-the-Sea"), fc.constantFrom(...TOWN_NAMES)),
  topics: fc
    .tuple(
      fc.uniqueArray(fc.constantFrom(...TOPIC_LABELS.filter((l) => l !== "Government transparency")), {
        maxLength: 2,
      }),
      fc.nat(2),
    )
    .map(([others, at]) => {
      const out = [...others];
      out.splice(Math.min(at, out.length), 0, "Government transparency");
      return out;
    }),
  personality: fc.constantFrom(...TOPIC_IDS.map((id) => CIVIC_PERSONALITIES[id])),
  appName: fc.constant(APP_NAME),
  colour: fc.constantFrom(...SLIDE_COLOURS),
}).map(({ personality, ...rest }) => ({
  ...rest,
  personalityName: personality.name,
  personalityDescription: personality.description,
}));

/** A measurer giving each character a width between 0.45 and 0.7 times the font size. */
const arbMeasurer: fc.Arbitrary<Measure> = fc
  .tuple(fc.double({ min: 0.45, max: 0.7, noNaN: true }), fc.double({ min: 0, max: 0.25, noNaN: true }))
  .map(([base, spread]): Measure => (text, font) => {
    let w = 0;
    for (const ch of Array.from(text)) {
      // Deterministic per-character factor in [base, min(0.7, base + spread)].
      const t = ((ch.codePointAt(0) ?? 0) % 7) / 6;
      w += Math.min(0.7, base + spread * t) * font.sizePx;
    }
    return w;
  });

const noSpace = (s: string) => s.replace(/\s+/g, "");

describe("wrapped-share-layout", () => {
  // Feature: ballot-wrapped, Property 17: Share content holds only the allowed items, in order
  // **Validates: Requirements 11.1, 11.2**
  it("Property 17: Share content holds only the allowed items, in order", () => {
    fc.assert(
      fc.property(arbAnyDocument, arbFollowingProfile, (doc, p) => {
        const summary = computeWrapped(doc, p);
        const town = townLabel(p.townId, TOWNS);
        const c = shareContent(summary, town);
        const top = summary.topTopic!;
        expect(top).toBeDefined();

        // Exactly the allowed items, in order.
        const strings = [
          c.heading,
          c.town,
          ...c.topics,
          c.personalityName,
          c.personalityDescription,
          c.appName,
        ];
        expect(strings).toEqual([
          "Your 2026 Ballot, Wrapped",
          town,
          ...summary.topTopics.map((t) => TOPIC_DEFS[t.id].label),
          CIVIC_PERSONALITIES[top].name,
          CIVIC_PERSONALITIES[top].description,
          APP_NAME,
        ]);
        expect(c.topics.length).toBeGreaterThanOrEqual(1);
        expect(c.topics.length).toBeLessThanOrEqual(3);
        expect(Object.keys(c).sort()).toEqual(
          ["appName", "colour", "heading", "personalityDescription", "personalityName", "topics", "town"].sort(),
        );

        // No leaks: no digit except the "2026" in the heading (so no counts or measure numbers).
        const withoutYear = [c.heading.replace("2026", ""), ...strings.slice(1)];
        for (const s of withoutYear) expect(s).not.toMatch(/\d/);

        // No life fact text, no measure titles, no Spotlight_Card content.
        const generatedTitles = doc === BALLOT_2026 ? [] : doc.measures.map((m) => m.title);
        const allowed = new Set(strings);
        for (const s of strings) {
          for (const b of BECAUSE_TEXTS) expect(s).not.toContain(b);
          for (const t of BALLOT_TITLES) expect(s).not.toContain(t);
          // Generated titles are arbitrary short strings, so only an exact copy counts as a leak,
          // unless the title happens to equal an allowed item.
          for (const t of generatedTitles) if (!allowed.has(t)) expect(s).not.toBe(t);
        }
        const spotlight = summary.spotlight;
        if (spotlight) {
          const spotTexts = [spotlight.measure.summary.text, ...spotlight.why.map((w) => w.text)].filter(
            (t) => t.length >= 12,
          );
          for (const s of strings) for (const t of spotTexts) expect(s).not.toContain(t);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: ballot-wrapped, Property 18: Share image layout fits without clipping or overlap
  // **Validates: Requirements 11.4, 11.8**
  it("Property 18: Share image layout fits without clipping or overlap", () => {
    fc.assert(
      fc.property(arbShareContent, arbMeasurer, (c, measure) => {
        const { lines } = layoutShareImage(c, measure);
        const maxWidth = SHARE_W - 2 * SHARE_PAD;
        const items = [
          c.heading,
          c.town,
          ...c.topics,
          c.personalityName,
          c.personalityDescription,
          c.appName,
        ];
        expect(lines.length).toBeGreaterThan(0);
        let prevBottom = -Infinity;
        let prevItem = -1;
        for (const line of lines) {
          // Width and horizontal bounds.
          expect(line.x).toBeGreaterThanOrEqual(SHARE_PAD);
          expect(measure(line.text, line.font)).toBeLessThanOrEqual(maxWidth);
          expect(line.x + measure(line.text, line.font)).toBeLessThanOrEqual(SHARE_W - SHARE_PAD);
          // Vertical bounds and no overlap.
          expect(line.y).toBeGreaterThanOrEqual(SHARE_PAD);
          expect(line.y + line.lineHeightPx).toBeLessThanOrEqual(SHARE_H - SHARE_PAD);
          expect(line.y).toBeGreaterThanOrEqual(prevBottom);
          prevBottom = line.y + line.lineHeightPx;
          // Item order.
          expect(line.item).toBeGreaterThanOrEqual(prevItem);
          prevItem = line.item;
        }
        // Every item appears in full, in order (character breaks drop spaces, so compare without them).
        items.forEach((text, i) => {
          const joined = lines
            .filter((l) => l.item === i)
            .map((l) => l.text)
            .join("");
          expect(noSpace(joined)).toBe(noSpace(text));
        });
        expect(new Set(lines.map((l) => l.item)).size).toBe(items.filter((t) => t.trim() !== "").length);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // Requirement 11.6: share-image generation gives up after a time limit.
  describe("withTimeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const after = <T>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

    it("resolves with the inner value when it settles before the limit", async () => {
      const result = withTimeout(after(100, "done"), 500);
      await vi.advanceTimersByTimeAsync(100);
      await expect(result).resolves.toBe("done");
    });

    it("rejects once the limit passes if the inner promise has not settled", async () => {
      const result = withTimeout(after(1000, "late"), 500);
      const settled = result.then(
        () => "resolved",
        (e: unknown) => e,
      );
      await vi.advanceTimersByTimeAsync(499);
      let done = false;
      void settled.then(() => {
        done = true;
      });
      await Promise.resolve();
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const err = await settled;
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toMatch(/500/);
    });

    it("passes an inner rejection through before the limit", async () => {
      const boom = new Error("boom");
      const inner = new Promise<never>((_, reject) => setTimeout(() => reject(boom), 100));
      const result = withTimeout(inner, 500);
      const caught = result.catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(100);
      expect(await caught).toBe(boom);
      // The limit timer was cleared, so nothing else fires.
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
