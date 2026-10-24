"use client";

// Each screen arrives with a short fade and an 8px rise at the slow speed, keyed
// by route, so moving between For you, Explore, and a decision reads as one
// motion instead of a swap. Enter only: leaving never waits on an animation.
// Instant under reduced motion. The transform is cleared when it settles so
// fixed-position sheets inside a screen stay fixed to the viewport.
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { transition } from "@/lib/motion";

export function ScreenIn({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: transition("slow", reduce), transitionEnd: { transform: "none" } }}
      className="flex w-full flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
