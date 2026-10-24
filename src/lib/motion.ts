// Motion tokens for the Motion library, mirroring the CSS tokens in
// src/app/globals.css (--dur-fast, --dur-base, --dur-slow, --stagger, --ease).
// CSS handles hover, focus, and press; Motion is for what CSS cannot do, such as
// animating an element out as it unmounts. Under reduced motion, pass
// `instant` (or a 0 duration) so changes still happen, just without movement.

/** Seconds, as Motion expects. */
export const DURATION = { fast: 0.15, base: 0.22, slow: 0.32 } as const;

export const STAGGER = 0.05;

/** Enter, hover, expand. Same curve as --ease. */
export const EASE = [0.2, 0.8, 0.2, 1] as const;

/** Exits and collapses. Same curve as --ease-in-out. */
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

export type Speed = keyof typeof DURATION;

/** A Motion transition for one of the three speeds, or instant under reduced motion. */
export function transition(speed: Speed = "base", reduce = false, exit = false) {
  return { duration: reduce ? 0 : DURATION[speed], ease: exit ? EASE_IN_OUT : EASE };
}
