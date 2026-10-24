// Shared props for Ballot Wrapped Slide components.
import type { WrappedSummary } from "@/lib/engine/wrapped";
import type { SlideModel } from "@/lib/engine/wrapped-slides";

export interface SlideProps {
  slide: SlideModel;
  summary: WrappedSummary;
  reducedMotion: boolean;
  /** Ink or white, from foregroundFor(slide.colour). */
  foreground: string;
}

/** Long words (town names, labels) wrap instead of overflowing; text is always shown in full. */
export const WRAP_STYLE = { overflowWrap: "anywhere" } as const;

/** Spotlight: the player dispatches `quote(open)` so the timer pauses while the quote shows (Req 8.8). */
export interface SpotlightSlideProps extends SlideProps {
  onQuote: (open: boolean) => void;
}

export interface DigInSlideProps extends SlideProps {
  /** Calls onClose("ballot") in the player (Req 10.3). */
  onFullBallot: () => void;
  /** Dispatches `outbound` so the timer stays stopped (Req 10.7). */
  onOutbound: () => void;
  /** ballot.source.url from src/data/ballot-2026.json; fixed, holds no profile data (Req 13.2). */
  voterInfoUrl: string;
}

export interface SummarySlideProps extends SlideProps {
  /** towns.json display name, or "Massachusetts". */
  town: string;
}
