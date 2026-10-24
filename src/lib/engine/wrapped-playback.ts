/**
 * Ballot Wrapped playback reducer. Pure, no React, no timers.
 * The component drives it with `tick` from one requestAnimationFrame loop.
 */

/** Unpaused time each Slide stays on screen before advancing. */
export const ADVANCE_MS = 5000;
/** Press-and-hold longer than this pauses playback. */
export const HOLD_MS = 500;

/** Index of the last Slide (Summary). Playback never advances past it. */
const LAST_INDEX = 7;

export interface PlaybackState {
  index: number; // 0..7
  elapsedMs: number; // unpaused time on the current Slide, 0..ADVANCE_MS
  paused: boolean; // pause and play button
  held: boolean; // press-and-hold longer than HOLD_MS
  hidden: boolean; // document.visibilityState === "hidden"
  quoteOpen: boolean; // Spotlight quote view open
  away: boolean; // Voter_Info_Link activated; cleared by play or navigation
}

export type PlaybackAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "tick"; dtMs: number }
  | { type: "toggle_pause" }
  | { type: "hold"; on: boolean }
  | { type: "visibility"; hidden: boolean }
  | { type: "quote"; open: boolean }
  | { type: "outbound" };

export const initialPlayback: PlaybackState = {
  index: 0,
  elapsedMs: 0,
  paused: false,
  held: false,
  hidden: false,
  quoteOpen: false,
  away: false,
};

/** True when time should accumulate: not on the Summary and no stop flag set. */
export function isRunning(s: PlaybackState): boolean {
  return (
    s.index < LAST_INDEX &&
    !s.paused &&
    !s.held &&
    !s.hidden &&
    !s.quoteOpen &&
    !s.away
  );
}

/** The pause button shows "Play" when paused by the button or after an outbound link. */
export function showsPlayLabel(s: PlaybackState): boolean {
  return s.paused || s.away;
}

export function playbackReducer(
  s: PlaybackState,
  a: PlaybackAction,
): PlaybackState {
  switch (a.type) {
    case "next":
      if (s.index >= LAST_INDEX) return s;
      return { ...s, index: s.index + 1, elapsedMs: 0, away: false };
    case "prev":
      if (s.index <= 0) return { ...s, index: 0, elapsedMs: 0, away: false };
      return { ...s, index: s.index - 1, elapsedMs: 0, away: false };
    case "tick": {
      if (!isRunning(s)) return s;
      const dt = Number.isFinite(a.dtMs) ? Math.max(0, a.dtMs) : 0;
      if (dt === 0) return s;
      const elapsed = s.elapsedMs + dt;
      // At most one Slide per tick, so a stalled frame never skips Slides.
      if (elapsed >= ADVANCE_MS) {
        return { ...s, index: s.index + 1, elapsedMs: 0 };
      }
      return { ...s, elapsedMs: elapsed };
    }
    case "toggle_pause":
      if (showsPlayLabel(s)) return { ...s, paused: false, away: false };
      return { ...s, paused: true };
    case "hold":
      return s.held === a.on ? s : { ...s, held: a.on };
    case "visibility":
      return s.hidden === a.hidden ? s : { ...s, hidden: a.hidden };
    case "quote":
      return s.quoteOpen === a.open ? s : { ...s, quoteOpen: a.open };
    case "outbound":
      return s.away ? s : { ...s, away: true };
    default:
      return s;
  }
}

/** Fill of progress segment `i`, 0..1. The Summary segment is full once reached. */
export function segmentFill(s: PlaybackState, i: number): number {
  if (i < s.index) return 1;
  if (i > s.index) return 0;
  if (s.index >= LAST_INDEX) return 1;
  return Math.min(1, Math.max(0, s.elapsedMs / ADVANCE_MS));
}

/** Tap on the left 30% goes back; anywhere else goes forward. */
export function tapAction(x: number, width: number): "prev" | "next" {
  return x < 0.3 * width ? "prev" : "next";
}
