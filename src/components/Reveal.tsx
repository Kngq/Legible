"use client";

// A section that opens and closes smoothly: height and opacity at the standard
// speed, closing on the exit curve, instant under reduced motion. Motion does
// this because CSS cannot animate an element out as it unmounts. Content clips
// only while moving, so focus rings inside stay visible once it is open.
// The trigger keeps its own aria-expanded; this only renders the panel.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { transition } from "@/lib/motion";

export function Reveal({ open, children, className, id }: { open: boolean; children: ReactNode; className?: string; id?: string }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="reveal"
          id={id}
          initial={{ height: 0, opacity: 0, overflow: "hidden" }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: { height: transition("base", reduce), opacity: transition("fast", reduce) },
            transitionEnd: { overflow: "visible" },
          }}
          exit={{
            height: 0,
            opacity: 0,
            overflow: "hidden",
            transition: { height: transition("base", reduce, true), opacity: transition("fast", reduce, true) },
          }}
        >
          <div className={className}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
