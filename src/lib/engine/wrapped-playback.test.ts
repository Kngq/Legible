import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  ADVANCE_MS,
  initialPlayback,
  playbackReducer,
  segmentFill,
  showsPlayLabel,
  tapAction,
  type PlaybackAction,
  type PlaybackState,
} from "./wrapped-playback";
import { arbNavActions, arbPlaybackActions, arbPlaybackState } from "./wrapped.arbitraries";

describe("wrapped playback properties", () => {
  describe("navigation", () => {
    // Feature: ballot-wrapped, Property 5: Navigation stays in bounds and restarts the timer
    // **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.17**
    it("Property 5: Navigation stays in bounds and restarts the timer", () => {
      // Tap positions: width > 0, x in [0, width).
      const arbTap = fc
        .record({
          width: fc.integer({ min: 1, max: 4000 }),
          frac: fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }),
        })
        .map(({ width, frac }) => ({ width, x: Math.min(frac * width, width - 1e-9) }));
      // Navigation steps: explicit next/prev or a tap that maps to one.
      const arbStep = fc.oneof(
        arbNavActions.map((as) => as.map((a) => ({ action: a }))),
        fc.array(arbTap, { maxLength: 30 }).map((taps) => taps.map((tap) => ({ tap }))),
      );

      fc.assert(
        fc.property(
          arbPlaybackState,
          fc.array(arbStep, { maxLength: 3 }).map((xs) => xs.flat()),
          (start, steps) => {
            let s: PlaybackState = start;
            for (const step of steps) {
              let action: PlaybackAction;
              if ("tap" in step) {
                const { x, width } = step.tap;
                const t = tapAction(x, width);
                expect(t).toBe(x < 0.3 * width ? "prev" : "next");
                action = { type: t };
              } else {
                action = step.action;
              }
              const next = playbackReducer(s, action);

              expect(Number.isInteger(next.index)).toBe(true);
              expect(next.index).toBeGreaterThanOrEqual(0);
              expect(next.index).toBeLessThanOrEqual(7);
              expect(next.paused).toBe(s.paused);

              if (action.type === "next") {
                if (s.index === 7) {
                  expect(next).toEqual(s);
                } else {
                  expect(next.index).toBe(s.index + 1);
                }
              } else if (action.type === "prev") {
                if (s.index === 0) {
                  expect(next.index).toBe(0);
                  expect(next.elapsedMs).toBe(0);
                } else {
                  expect(next.index).toBe(s.index - 1);
                }
              }
              if (next.index !== s.index) expect(next.elapsedMs).toBe(0);
              s = next;
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("timer", () => {
    // Feature: ballot-wrapped, Property 6: The timer advances only on unpaused time
    // **Validates: Requirements 2.6, 2.11, 2.12, 2.13, 8.8, 10.7**
    it("Property 6: The timer advances only on unpaused time", () => {
      // Independent model of the timer rules, written from the spec rather than the reducer.
      type Model = PlaybackState;
      const stopped = (m: Model) => m.paused || m.held || m.hidden || m.quoteOpen || m.away;
      const step = (m: Model, a: PlaybackAction): Model => {
        switch (a.type) {
          case "next":
            return m.index === 7 ? m : { ...m, index: m.index + 1, elapsedMs: 0, away: false };
          case "prev":
            return { ...m, index: Math.max(0, m.index - 1), elapsedMs: 0, away: false };
          case "tick": {
            if (m.index === 7 || stopped(m)) return m;
            const t = m.elapsedMs + Math.max(0, a.dtMs);
            return t >= ADVANCE_MS ? { ...m, index: m.index + 1, elapsedMs: 0 } : { ...m, elapsedMs: t };
          }
          case "toggle_pause":
            return m.paused || m.away ? { ...m, paused: false, away: false } : { ...m, paused: true };
          case "hold":
            return { ...m, held: a.on };
          case "visibility":
            return { ...m, hidden: a.hidden };
          case "quote":
            return { ...m, quoteOpen: a.open };
          case "outbound":
            return { ...m, away: true };
        }
      };
      const stopResume = new Set(["toggle_pause", "hold", "visibility", "quote", "outbound"]);

      fc.assert(
        fc.property(arbPlaybackState, arbPlaybackActions, (start, actions) => {
          let s: PlaybackState = start;
          let m: Model = start;
          for (const a of actions) {
            const next = playbackReducer(s, a);
            m = step(m, a);
            expect(next).toEqual(m);

            // Stop and resume actions never change the index or the elapsed time.
            if (stopResume.has(a.type)) {
              expect(next.index).toBe(s.index);
              expect(next.elapsedMs).toBe(s.elapsedMs);
            }
            // Releasing a hold or showing the tab does not clear `paused`.
            if ((a.type === "hold" && !a.on) || (a.type === "visibility" && !a.hidden)) {
              expect(next.paused).toBe(s.paused);
            }
            // While away, ticks do nothing; only toggle_pause, next, or prev clear it.
            if (s.away) {
              if (a.type === "tick") expect(next).toEqual(s);
              if (a.type !== "toggle_pause" && a.type !== "next" && a.type !== "prev") {
                expect(next.away).toBe(true);
              }
            }
            // The Summary never accumulates time.
            if (next.index === 7 && a.type === "tick") expect(next.elapsedMs).toBe(0);

            expect(showsPlayLabel(next)).toBe(next.paused || next.away);
            s = next;
          }
        }),
        { numRuns: 100 },
      );
    });
  });
  describe("progress", () => {
    it("initialPlayback starts on Slide 0 with no time and no stop flags", () => {
      expect(initialPlayback).toEqual({
        index: 0,
        elapsedMs: 0,
        paused: false,
        held: false,
        hidden: false,
        quoteOpen: false,
        away: false,
      });
    });

    // Feature: ballot-wrapped, Property 7: Progress segments reflect position and elapsed time
    // **Validates: Requirements 2.1**
    it("Property 7: Progress segments reflect position and elapsed time", () => {
      const check = (s: PlaybackState) => {
        for (let i = 0; i <= 7; i++) {
          const f = segmentFill(s, i);
          expect(f).toBeGreaterThanOrEqual(0);
          expect(f).toBeLessThanOrEqual(1);
          if (i < s.index) expect(f).toBe(1);
          else if (i > s.index) expect(f).toBe(0);
          else if (s.index === 7) expect(f).toBe(1);
          else expect(f).toBeCloseTo(s.elapsedMs / ADVANCE_MS, 12);
        }
      };
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(initialPlayback), arbPlaybackState),
          arbPlaybackActions,
          (start, actions) => {
            // Every state reached by the reducer from a valid start is checked.
            let s: PlaybackState = start;
            check(s);
            for (const a of actions) {
              s = playbackReducer(s, a);
              check(s);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
