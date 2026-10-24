"use client";
// Connected_Count Slide (Req 7.1 to 7.6). The visible number counts up on
// requestAnimationFrame and is aria-hidden; a visually hidden span holds the final
// sentence. The count restarts on every mount (the player keys Slides by index).
import { useEffect, useState } from "react";
import { COUNT_UP_MS, countUpValue } from "@/lib/engine/wrapped-layout";
import { WRAPPED_STRINGS } from "@/lib/vocab/wrapped";
import { WRAP_STYLE, type SlideProps } from "./types";

function useCountUp(target: number, enabled: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled || target === 0) return;
    let raf = 0;
    let start: number | undefined;
    const step = (now: number) => {
      start ??= now;
      const v = countUpValue(target, now - start, COUNT_UP_MS);
      setValue(v);
      if (v < target) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);
  // Reduced_Motion: final value from the first frame, no intermediate numbers.
  return enabled ? value : target;
}

export function ConnectedSlide({ summary, reducedMotion, foreground }: SlideProps) {
  const target = summary.connectedCount;
  const shown = useCountUp(target, !reducedMotion);
  const sentence = WRAPPED_STRINGS.connectedSentence(summary.measureTotal);
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ color: foreground, ...WRAP_STYLE }}
    >
      <p className="flex flex-col items-center gap-6">
        <span aria-hidden="true" className="text-display tabular-nums">
          {shown}
        </span>
        <span aria-hidden="true" className="text-title max-w-[22ch]">
          {sentence}
        </span>
        <span className="sr-only">{`${target} ${sentence}`}</span>
      </p>
    </div>
  );
}
