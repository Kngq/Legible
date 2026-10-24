// Pure visual helpers for "Your ballot, wrapped". No React, no DOM.
// countUpValue is from Layla's branch (f20bfe8); the slide colours and bar
// widths there are gone (the story uses Notebook tokens and no charts).

export const COUNT_UP_MS = 900;

/** Whole-number count-up from 0 to target over durationMs. Never decreases as t grows. */
export function countUpValue(target: number, tMs: number, durationMs: number = COUNT_UP_MS): number {
  if (target === 0 || tMs <= 0) return 0;
  if (durationMs <= 0 || tMs >= durationMs) return target;
  return Math.floor((target * tMs) / durationMs);
}

export interface StoryMotion {
  /** Slide entrance, seconds (the --dur-slow token). */
  slide: number;
  /** Delay between items inside a slide, seconds (the --stagger token). */
  stagger: number;
  /** Count-up length, ms. 0 shows the final number at once. */
  countUp: number;
  /** Slow drift of the topic constellation and the paper layers. */
  drift: boolean;
}

/** All motion values for one preference. Under reduced motion every change is instant. */
export function storyMotion(reduce: boolean): StoryMotion {
  return reduce ? { slide: 0, stagger: 0, countUp: 0, drift: false } : { slide: 0.32, stagger: 0.05, countUp: COUNT_UP_MS, drift: true };
}

export interface ConstellationPoint {
  /** Centre of the label, in percent of the field. */
  x: number;
  y: number;
  /** Type size step: 0 largest, 2 smallest. A fixed pattern, never a measure of the topic. */
  size: 0 | 1 | 2;
  /** Drift phase in seconds, so labels never move in step. */
  delay: number;
}

// Hand-placed slots, read in order: a loose ring around the centre that stays
// clear of the edges at 320 px. Sizes alternate so no label reads as "most".
const SLOTS: ConstellationPoint[] = [
  { x: 50, y: 20, size: 0, delay: 0 },
  { x: 26, y: 40, size: 1, delay: 1.2 },
  { x: 72, y: 44, size: 1, delay: 2.1 },
  { x: 40, y: 64, size: 2, delay: 0.6 },
  { x: 70, y: 76, size: 2, delay: 1.7 },
  { x: 26, y: 84, size: 1, delay: 2.6 },
  { x: 76, y: 14, size: 2, delay: 0.9 },
  { x: 22, y: 12, size: 2, delay: 3.1 },
];

/** Positions for `n` labels (at most the slot count). */
export function constellation(n: number): ConstellationPoint[] {
  const k = Math.max(0, Math.min(n, SLOTS.length));
  if (k === 1) return [{ x: 50, y: 46, size: 0, delay: 0 }];
  if (k === 2) return [{ x: 36, y: 26, size: 0, delay: 0 }, { x: 64, y: 72, size: 0, delay: 1.2 }];
  // Few labels spread over the whole field rather than bunching at the top.
  if (k === 3) return [{ x: 50, y: 16, size: 0, delay: 0 }, { x: 27, y: 54, size: 1, delay: 1.2 }, { x: 72, y: 82, size: 1, delay: 2.1 }];
  if (k === 4) return [{ x: 50, y: 14, size: 0, delay: 0 }, { x: 26, y: 42, size: 1, delay: 1.2 }, { x: 74, y: 58, size: 1, delay: 2.1 }, { x: 38, y: 86, size: 2, delay: 0.6 }];
  return SLOTS.slice(0, k);
}

export const CONSTELLATION_MAX = SLOTS.length;

/** How many labels fit a constellation field this many px tall without crowding (about 90 px each). */
export function constellationCapacity(heightPx: number): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) return 2;
  return Math.max(2, Math.min(CONSTELLATION_MAX, Math.floor(heightPx / 90)));
}
