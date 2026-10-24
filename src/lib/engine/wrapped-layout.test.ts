// Motion and layout helpers for "Your ballot, wrapped". The count-up property is from Layla's branch (f20bfe8).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { constellation, CONSTELLATION_MAX, COUNT_UP_MS, countUpValue, storyMotion } from "./wrapped-layout";

describe("countUpValue", () => {
  it("returns whole numbers, never decreases, starts at 0, and lands on the target", () => {
    const arbTimes = fc.tuple(fc.integer({ min: 0, max: 3000 }), fc.integer({ min: 0, max: 3000 })).map(([x, y]) => (x <= y ? [x, y] : [y, x]) as [number, number]);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9 }), arbTimes, fc.integer({ min: COUNT_UP_MS, max: 10_000 }), (target, [t1, t2], tLate) => {
        const v1 = countUpValue(target, t1);
        const v2 = countUpValue(target, t2);
        expect(Number.isInteger(v1) && Number.isInteger(v2)).toBe(true);
        expect(v1).toBeGreaterThanOrEqual(0);
        expect(v2).toBeLessThanOrEqual(target);
        expect(v1).toBeLessThanOrEqual(v2);
        expect(countUpValue(target, 0)).toBe(0);
        expect(countUpValue(target, tLate)).toBe(target);
      }),
    );
  });

  it("shows the final number at once when the duration is 0 (reduced motion)", () => {
    expect(countUpValue(9, 1, storyMotion(true).countUp)).toBe(9);
  });
});

describe("storyMotion", () => {
  it("is instant under reduced motion and uses the Notebook tokens otherwise", () => {
    expect(storyMotion(true)).toEqual({ slide: 0, stagger: 0, countUp: 0, drift: false });
    expect(storyMotion(false)).toEqual({ slide: 0.32, stagger: 0.05, countUp: COUNT_UP_MS, drift: true });
  });
});

describe("constellation", () => {
  it("places up to eight labels inside the field, never on top of each other", () => {
    for (let n = 0; n <= CONSTELLATION_MAX + 2; n++) {
      const pts = constellation(n);
      expect(pts.length).toBe(Math.min(n, CONSTELLATION_MAX));
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(15);
        expect(p.x).toBeLessThanOrEqual(85);
        expect(p.y).toBeGreaterThanOrEqual(10);
        expect(p.y).toBeLessThanOrEqual(90);
      }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(14);
    }
  });
});
