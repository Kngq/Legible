"use client";

// Feedback after a profile save: a check that draws in, "Saved", and what it
// changed, announced politely to screen readers. It settles in at the base speed
// and fades out after a few seconds. Instant under reduced motion.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { transition } from "@/lib/motion";

const SHOWN_MS = 3200;

export function SavedNote({ text = "Saved. For you and Explore are sorted by your new answers." }: { text?: string }) {
  const reduce = useReducedMotion() ?? false;
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(false), SHOWN_MS);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <p role="status" aria-live="polite" className="min-h-6 text-small">
      <AnimatePresence>
        {shown && (
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: transition("base", reduce) }}
            exit={{ opacity: 0, transition: transition("slow", reduce, true) }}
            className="inline-flex items-center gap-1.5 font-semibold text-accent"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="m5 12.5 4.5 4.5L19 7.5"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1, transition: { ...transition("slow", reduce), delay: reduce ? 0 : 0.08 } }}
              />
            </svg>
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </p>
  );
}
