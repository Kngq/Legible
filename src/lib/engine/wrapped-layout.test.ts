import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  BAR_MIN_PX,
  BAR_STAGGER_MS,
  COUNT_UP_MS,
  FRAME_BREAKPOINT_PX,
  SLIDE_COUNT,
  barStartMs,
  barWidthPx,
  countUpValue,
  frameRect,
  slideColours,
} from "./wrapped-layout";
import { arbTopicId } from "./wrapped.arbitraries";
import { SLIDE_COLOURS, TOPIC_VISUALS } from "@/lib/vocab/wrapped";

describe("wrapped-layout", () => {
  describe("slideColours", () => {
    // Feature: ballot-wrapped, Property 13: Slide colours never repeat on neighbours
    // **Validates: Requirements 5.3, 12.1**
    it("returns 8 palette colours, Reveal uses the Top_Topic colour, no neighbours repeat, deterministic", () => {
      fc.assert(
        fc.property(fc.option(arbTopicId, { nil: undefined }), (top) => {
          const colours = slideColours(top);
          expect(colours).toHaveLength(SLIDE_COUNT);
          expect(SLIDE_COUNT).toBe(8);
          for (const c of colours) expect(SLIDE_COLOURS).toContain(c);
          if (top !== undefined) expect(colours[1]).toBe(TOPIC_VISUALS[top].colour);
          for (let i = 1; i < colours.length; i++) expect(colours[i]).not.toBe(colours[i - 1]);
          expect(slideColours(top)).toEqual(colours);
        }),
        { numRuns: 100 },
      );
    });

    it("handles no Top_Topic", () => {
      const colours = slideColours(undefined);
      expect(colours).toHaveLength(8);
      for (let i = 1; i < colours.length; i++) expect(colours[i]).not.toBe(colours[i - 1]);
    });
  });

  describe("barWidthPx", () => {
    const arbCase = fc
      .record({ total: fc.integer({ min: 1, max: 1000 }), w: fc.integer({ min: 100, max: 2000 }) })
      .chain(({ total, w }) =>
        fc.record({
          total: fc.constant(total),
          w: fc.constant(w),
          a: fc.integer({ min: 0, max: total }),
          b: fc.integer({ min: 0, max: total }),
        }),
      );

    // Feature: ballot-wrapped, Property 14: Bar width is proportional with a visible minimum
    // **Validates: Requirements 6.3, 6.4**
    it("stays in [8, w], equals max(8, w*a/total), equal for equal counts, monotone, >= 8 at zero", () => {
      fc.assert(
        fc.property(arbCase, ({ total, w, a, b }) => {
          const wa = barWidthPx(a, total, w);
          const wb = barWidthPx(b, total, w);
          expect(wa).toBeGreaterThanOrEqual(BAR_MIN_PX);
          expect(wa).toBeLessThanOrEqual(w);
          expect(wa).toBeCloseTo(Math.max(BAR_MIN_PX, (w * a) / total), 9);
          expect(barWidthPx(a, total, w)).toBe(wa);
          if (a === b) expect(wb).toBe(wa);
          if (a <= b) expect(wa).toBeLessThanOrEqual(wb);
          else expect(wa).toBeGreaterThanOrEqual(wb);
          expect(barWidthPx(0, total, w)).toBeGreaterThanOrEqual(BAR_MIN_PX);
        }),
        { numRuns: 100 },
      );
    });

    it("gives the full track when count equals total and 8 px when count is 0", () => {
      expect(barWidthPx(10, 10, 300)).toBe(300);
      expect(barWidthPx(0, 10, 300)).toBe(8);
      expect(barWidthPx(1, 1000, 300)).toBe(8);
    });
  });

  describe("countUpValue", () => {
    const arbTimes = fc
      .tuple(fc.integer({ min: 0, max: 3000 }), fc.integer({ min: 0, max: 3000 }))
      .map(([x, y]) => (x <= y ? [x, y] : [y, x]) as [number, number]);

    // Feature: ballot-wrapped, Property 15: Count-up is whole, rising, and lands on the target
    // **Validates: Requirements 7.2, 7.4**
    it("returns whole numbers, never decreases, starts at 0, lands on target at >= 1200 ms, stays 0 for target 0", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 9 }),
          arbTimes,
          fc.integer({ min: COUNT_UP_MS, max: 10_000 }),
          (target, [t1, t2], tLate) => {
            const v1 = countUpValue(target, t1);
            const v2 = countUpValue(target, t2);
            expect(Number.isInteger(v1)).toBe(true);
            expect(Number.isInteger(v2)).toBe(true);
            expect(v1).toBeGreaterThanOrEqual(0);
            expect(v2).toBeLessThanOrEqual(target);
            expect(v1).toBeLessThanOrEqual(v2);
            expect(countUpValue(target, 0)).toBe(0);
            expect(countUpValue(target, tLate)).toBe(target);
            if (target === 0) {
              expect(v1).toBe(0);
              expect(v2).toBe(0);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it("hits the target exactly at 1200 ms and is partway at the midpoint", () => {
      expect(countUpValue(9, COUNT_UP_MS)).toBe(9);
      expect(countUpValue(8, 600)).toBe(4);
      expect(countUpValue(0, 600)).toBe(0);
    });
  });

  describe("frameRect", () => {
    // Feature: ballot-wrapped, Property 16: Frame layout covers or frames at 9:16
    // **Validates: Requirements 12.5, 12.6**
    it("fills the viewport below 640 px, otherwise a centred 9:16 frame inside the viewport", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 320, max: 4000 }),
          fc.integer({ min: 320, max: 4000 }),
          (vw, vh) => {
            const r = frameRect(vw, vh);
            if (vw < FRAME_BREAKPOINT_PX) {
              expect(r).toEqual({ mode: "full", x: 0, y: 0, w: vw, h: vh });
              return;
            }
            expect(r.mode).toBe("framed");
            expect(Math.abs(r.h - Math.min(vh, (vw * 16) / 9))).toBeLessThanOrEqual(0.5);
            expect(Math.abs(r.w - (r.h * 9) / 16)).toBeLessThanOrEqual(0.5);
            // Fully inside the viewport.
            expect(r.x).toBeGreaterThanOrEqual(-0.5);
            expect(r.y).toBeGreaterThanOrEqual(-0.5);
            expect(r.x + r.w).toBeLessThanOrEqual(vw + 0.5);
            expect(r.y + r.h).toBeLessThanOrEqual(vh + 0.5);
            // Equal margins on each axis.
            expect(Math.abs(r.x - (vw - r.x - r.w))).toBeLessThanOrEqual(0.5);
            expect(Math.abs(r.y - (vh - r.y - r.h))).toBeLessThanOrEqual(0.5);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("frames a wide desktop viewport and fills a phone viewport", () => {
      const desk = frameRect(1920, 1080);
      expect(desk.mode).toBe("framed");
      expect(desk.h).toBe(1080);
      expect(desk.w).toBeCloseTo(607.5, 9);
      expect(frameRect(390, 844)).toEqual({ mode: "full", x: 0, y: 0, w: 390, h: 844 });
    });
  });

  describe("barStartMs", () => {
    it("lets each of the three bars finish its 400 ms grow within 1500 ms (Req 6.5)", () => {
      for (let r = 0; r <= 2; r++) {
        expect(barStartMs(r) + 400).toBeLessThanOrEqual(1500);
      }
      expect(BAR_STAGGER_MS).toBe(400);
      expect(barStartMs(0)).toBe(0);
    });
  });
});
