// Story navigation for "Your ballot, wrapped". Pure: no React, no DOM, no timers.
// Reader-paced: the story moves only when the person asks, so nothing civic
// disappears before it is read (W6.3). Replaces the 5-second auto-advance of
// Layla's branch (f20bfe8); her tap split (left 30% goes back) is kept.

export interface StoryState {
  index: number;
  /** Direction of the last move, for the slide's entrance. */
  dir: "next" | "prev" | "none";
}

export type StoryAction = { type: "next" } | { type: "prev" } | { type: "goto"; index: number };

export const initialStory: StoryState = { index: 0, dir: "none" };

export function storyReducer(count: number) {
  const last = Math.max(0, count - 1);
  return (s: StoryState, a: StoryAction): StoryState => {
    switch (a.type) {
      case "next":
        return s.index >= last ? s : { index: s.index + 1, dir: "next" };
      case "prev":
        return s.index <= 0 ? s : { index: s.index - 1, dir: "prev" };
      case "goto": {
        const i = Number.isFinite(a.index) ? Math.min(last, Math.max(0, Math.trunc(a.index))) : s.index;
        return i === s.index ? s : { index: i, dir: i > s.index ? "next" : "prev" };
      }
    }
  };
}

/** Fill of progress segment `i`: earlier slides full, the current one full (it fills on arrival), later ones empty. */
export function segmentFill(index: number, i: number): 0 | 1 {
  return i <= index ? 1 : 0;
}

/** A tap on the left 30% goes back; anywhere else goes forward. */
export function tapAction(x: number, width: number): "prev" | "next" {
  return x < 0.3 * width ? "prev" : "next";
}

/** Horizontal swipes past 48 px: left goes forward, right goes back. Mostly-vertical drags are not swipes. */
export const SWIPE_MIN_PX = 48;
export function swipeAction(dx: number, dy: number): "prev" | "next" | null {
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? "next" : "prev";
}

/** Keys the story handles. Arrows are left to a form control that has focus. */
export function keyAction(key: string, inField: boolean): "prev" | "next" | "close" | null {
  if (key === "Escape") return "close";
  if (inField) return null;
  if (key === "ArrowRight") return "next";
  if (key === "ArrowLeft") return "prev";
  return null;
}

/**
 * Where Tab goes inside the dialog: `current` is the focused element's index among
 * `count` focusable elements (-1 when focus is outside them). Wraps at both ends.
 */
export function trapFocusIndex(current: number, count: number, shift: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return shift ? count - 1 : 0;
  return shift ? (current - 1 + count) % count : (current + 1) % count;
}

/** Elements a tap or swipe never starts on: controls keep their own behaviour. */
export const STORY_IGNORE_SELECTOR = "a, button, input, select, textarea, label, [role='switch'], [data-story-ignore]";
