"use client";
// Top_Three Slide: ordered list of 1 to 3 topics with "N of M questions" and a decorative
// bar per topic (Req 6.1 to 6.8). Bars grow by scaleX over 400 ms with a staggered delay;
// under Reduced_Motion they start at full width and the list only fades in.
import { useEffect, useRef, useState } from "react";
import { barStartMs, barWidthPx } from "@/lib/engine/wrapped-layout";
import { TOPIC_DEFS } from "@/lib/vocab";
import { WRAP_STYLE, type SlideProps } from "./types";

const GROW_MS = 400;
const FADE_MS = 300;
const EASE = "var(--ease)";

/** True after the first painted frame, so CSS transitions run from their initial values. */
function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  return entered;
}

/** Current pixel width of an element, kept up to date with ResizeObserver. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function Bar({
  count,
  total,
  rank,
  grown,
  reducedMotion,
  foreground,
}: {
  count: number;
  total: number;
  rank: number;
  grown: boolean;
  reducedMotion: boolean;
  foreground: string;
}) {
  const [trackRef, trackPx] = useWidth<HTMLDivElement>();
  const width = barWidthPx(count, total, trackPx);
  const scale = reducedMotion || grown ? 1 : 0;
  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      className="h-4 w-full overflow-hidden rounded-full"
      // D8: the empty track is a 1.5 px outline in the foreground colour.
      style={{ boxShadow: `inset 0 0 0 1.5px ${foreground}` }}
    >
      <div
        className="h-full origin-left rounded-full"
        style={{
          width,
          backgroundColor: foreground,
          transform: `scaleX(${scale})`,
          transition: reducedMotion
            ? "none"
            : `transform ${GROW_MS}ms ${EASE} ${barStartMs(rank)}ms`,
        }}
      />
    </div>
  );
}

export function TopThreeSlide({ slide, summary, reducedMotion, foreground }: SlideProps) {
  const entered = useEntered();
  const total = summary.measureTotal;
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-10 px-6 text-center"
      style={{ color: foreground, ...WRAP_STYLE }}
    >
      <h2 className="text-title max-w-full">{slide.heading}</h2>
      <ol
        className="flex w-full max-w-md flex-col gap-8 text-left"
        style={
          reducedMotion
            ? { opacity: entered ? 1 : 0, transition: `opacity ${FADE_MS}ms ${EASE}` }
            : undefined
        }
      >
        {summary.topTopics.map((t, rank) => (
          <li key={t.id} className="flex flex-col gap-2">
            <span className="text-title">{TOPIC_DEFS[t.id].label}</span>
            <Bar
              count={t.measureCount}
              total={total}
              rank={rank}
              grown={entered}
              reducedMotion={reducedMotion}
              foreground={foreground}
            />
            <span className="text-body">{`${t.measureCount} of ${total} questions`}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
