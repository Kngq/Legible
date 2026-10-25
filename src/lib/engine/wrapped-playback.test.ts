// Story navigation tests for "Your ballot, wrapped" (W6, W7.3).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { initialStory, keyAction, segmentFill, storyReducer, swipeAction, tapAction, trapFocusIndex, type StoryAction } from "./wrapped-playback";
import { SLIDE_COUNT } from "./wrapped-slides";

const reduce = storyReducer(SLIDE_COUNT);
const arbAction: fc.Arbitrary<StoryAction> = fc.oneof(
  fc.constant<StoryAction>({ type: "next" }),
  fc.constant<StoryAction>({ type: "prev" }),
  fc.oneof(fc.integer({ min: -5, max: 12 }), fc.constant(Number.NaN), fc.double({ min: -3, max: 9, noNaN: true })).map((index): StoryAction => ({ type: "goto", index })),
);

describe("storyReducer", () => {
  it("starts on the opening and stays in bounds for any sequence", () => {
    expect(initialStory).toEqual({ index: 0, dir: "none" });
    fc.assert(
      fc.property(fc.array(arbAction, { maxLength: 60 }), (actions) => {
        let s = initialStory;
        for (const a of actions) {
          const next = reduce(s, a);
          expect(Number.isInteger(next.index)).toBe(true);
          expect(next.index).toBeGreaterThanOrEqual(0);
          expect(next.index).toBeLessThan(SLIDE_COUNT);
          // One step per next or prev; nothing moves on its own.
          if (a.type !== "goto") expect(Math.abs(next.index - s.index)).toBeLessThanOrEqual(1);
          if (next.index > s.index) expect(next.dir).toBe("next");
          if (next.index < s.index) expect(next.dir).toBe("prev");
          if (next.index === s.index) expect(next).toBe(s);
          s = next;
        }
      }),
      { numRuns: 200 },
    );
  });

  it("keeps the last slide on a forward tap and the first on a back tap", () => {
    const last = { index: SLIDE_COUNT - 1, dir: "next" as const };
    expect(reduce(last, { type: "next" })).toBe(last);
    expect(reduce(initialStory, { type: "prev" })).toBe(initialStory);
  });

  it("fills segments up to and including the current slide", () => {
    for (let index = 0; index < SLIDE_COUNT; index++) {
      expect(Array.from({ length: SLIDE_COUNT }, (_, i) => segmentFill(index, i))).toEqual(Array.from({ length: SLIDE_COUNT }, (_, i) => (i <= index ? 1 : 0)));
    }
  });
});

describe("gestures and keys", () => {
  it("taps: left 30% back, the rest forward, at any width", () => {
    fc.assert(
      fc.property(fc.integer({ min: 200, max: 2000 }), fc.double({ min: 0, max: 1, noNaN: true }), (w, f) => {
        expect(tapAction(f * w, w)).toBe(f < 0.3 ? "prev" : "next");
      }),
    );
    expect(tapAction(95, 320)).toBe("prev");
    expect(tapAction(97, 320)).toBe("next");
  });

  it("swipes: horizontal past 48 px only; left forward, right back", () => {
    expect(swipeAction(-60, 10)).toBe("next");
    expect(swipeAction(60, -10)).toBe("prev");
    expect(swipeAction(-47, 0)).toBeNull();
    expect(swipeAction(-80, 120)).toBeNull(); // a scroll, not a swipe
    fc.assert(
      fc.property(fc.integer({ min: -400, max: 400 }), fc.integer({ min: -400, max: 400 }), (dx, dy) => {
        const a = swipeAction(dx, dy);
        if (a) {
          expect(Math.abs(dx)).toBeGreaterThanOrEqual(48);
          expect(Math.abs(dx)).toBeGreaterThan(Math.abs(dy));
          expect(a).toBe(dx < 0 ? "next" : "prev");
        }
      }),
    );
  });

  it("keys: arrows navigate except in a field; Escape always closes", () => {
    expect(keyAction("ArrowRight", false)).toBe("next");
    expect(keyAction("ArrowLeft", false)).toBe("prev");
    expect(keyAction("ArrowRight", true)).toBeNull();
    expect(keyAction("Escape", true)).toBe("close");
    expect(keyAction("Escape", false)).toBe("close");
    for (const k of [" ", "Enter", "Tab", "a", "ArrowUp"]) expect(keyAction(k, false)).toBeNull();
  });

  it("Tab cycles inside the dialog in both directions", () => {
    expect(trapFocusIndex(-1, 4, false)).toBe(0);
    expect(trapFocusIndex(-1, 4, true)).toBe(3);
    expect(trapFocusIndex(3, 4, false)).toBe(0);
    expect(trapFocusIndex(0, 4, true)).toBe(3);
    expect(trapFocusIndex(0, 0, false)).toBe(-1);
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }).chain((n) => fc.tuple(fc.constant(n), fc.integer({ min: -1, max: n - 1 }), fc.boolean())), ([n, i, shift]) => {
        const j = trapFocusIndex(i, n, shift);
        expect(j).toBeGreaterThanOrEqual(0);
        expect(j).toBeLessThan(n);
        if (i >= 0) expect(trapFocusIndex(j, n, !shift)).toBe(i);
      }),
    );
  });
});

describe("the story route", () => {
  it("names only the page underneath, never the town or a slide", async () => {
    const { parseRoute, routeHash } = await import("@/lib/nav/route");
    expect(routeHash({ kind: "stories", over: "feed" })).toBe("#/stories");
    expect(routeHash({ kind: "stories", over: "explore" })).toBe("#/explore/stories");
    expect(parseRoute("#/stories/cambridge")).toEqual({ kind: "stories", over: "feed" });
    expect(parseRoute("#/explore/stories/3")).toEqual({ kind: "stories", over: "explore" });
    // The first address still opens the stories.
    expect(parseRoute("#/wrapped")).toEqual({ kind: "stories", over: "feed" });
    expect(parseRoute("#/wrapped/cambridge")).toEqual({ kind: "stories", over: "feed" });
  });
});
