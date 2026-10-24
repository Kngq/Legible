// Pure visual helpers for the Ballot Wrapped slideshow. No React, no DOM.
import type { TopicId } from "@/lib/vocab";
import { SLIDE_COLOURS, TOPIC_VISUALS, type SlideColour } from "@/lib/vocab/wrapped";

export const SLIDE_COUNT = 8;
export const COUNT_UP_MS = 1200;
export const BAR_MIN_PX = 8;
export const BAR_STAGGER_MS = 400;
export const FRAME_BREAKPOINT_PX = 640;

/** Pick the first palette colour at or after `start` that is not in `avoid`. */
function pickColour(start: number, avoid: (SlideColour | undefined)[]): SlideColour {
  for (let step = 0; step < SLIDE_COLOURS.length; step++) {
    const c = SLIDE_COLOURS[(start + step) % SLIDE_COLOURS.length];
    if (!avoid.includes(c)) return c;
  }
  // Unreachable: five colours, at most two constraints.
  return SLIDE_COLOURS[start % SLIDE_COLOURS.length];
}

/**
 * Background colour for each of the 8 Slides. Index 1 (Reveal) uses the Top_Topic colour,
 * purple when there is none. No two neighbouring Slides share a colour.
 */
export function slideColours(top: TopicId | undefined): SlideColour[] {
  const reveal: SlideColour = top ? TOPIC_VISUALS[top].colour : "purple";
  const out: SlideColour[] = new Array(SLIDE_COUNT);
  out[1] = reveal;
  out[0] = pickColour(0, [reveal]);
  for (let i = 2; i < SLIDE_COUNT; i++) out[i] = pickColour(i, [out[i - 1]]);
  return out;
}

/** Bar length proportional to count, at least 8 px, never wider than the track. */
export function barWidthPx(count: number, total: number, trackPx: number): number {
  const track = Math.max(0, trackPx);
  if (count <= 0 || total <= 0) return Math.min(BAR_MIN_PX, track);
  const raw = (track * count) / total;
  return Math.min(track, Math.max(BAR_MIN_PX, raw));
}

/** Whole-number count-up from 0 to target over durationMs. Never decreases as t grows. */
export function countUpValue(target: number, tMs: number, durationMs: number = COUNT_UP_MS): number {
  if (target === 0 || tMs <= 0) return 0;
  if (durationMs <= 0 || tMs >= durationMs) return target;
  return Math.floor((target * tMs) / durationMs);
}

/** Full viewport below 640 px wide; otherwise a centred 9:16 frame that fits the viewport. */
export function frameRect(
  vw: number,
  vh: number,
): { mode: "full" | "framed"; x: number; y: number; w: number; h: number } {
  if (vw < FRAME_BREAKPOINT_PX) return { mode: "full", x: 0, y: 0, w: vw, h: vh };
  const h = Math.min(vh, (vw * 16) / 9);
  const w = (h * 9) / 16;
  return { mode: "framed", x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}

/** Delay before a Top_Three bar starts growing. Three 400 ms bars end by 1200 ms. */
export function barStartMs(rank: number): number {
  return Math.max(0, rank) * BAR_STAGGER_MS;
}
