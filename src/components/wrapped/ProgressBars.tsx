"use client";
// Ballot Wrapped progress segments. Decorative: the live region announces position.
// Each segment is a 1.5 px outline in the Slide foreground with a solid fill scaled
// by transform. No transition, so pausing freezes the fill exactly (D8, Req 2.1, 12.10).
import { segmentFill, type PlaybackState } from "@/lib/engine/wrapped-playback";

export function ProgressBars({
  state,
  foreground,
  count = 8,
}: {
  state: PlaybackState;
  foreground: string;
  count?: number;
}) {
  return (
    <div aria-hidden="true" className="flex w-full gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 overflow-hidden rounded-full"
          style={{ boxShadow: `inset 0 0 0 1.5px ${foreground}` }}
        >
          <div
            className="h-full w-full origin-left"
            style={{ backgroundColor: foreground, transform: `scaleX(${segmentFill(state, i)})` }}
          />
        </div>
      ))}
    </div>
  );
}
