"use client";

// "Your journey": the plant's stages as a short illustrated timeline, one
// entry per stage reached with the day it got there, then a quiet look at the
// next stage (or a closing note once it blooms). Shown in the garden.
import { motion, useReducedMotion } from "motion/react";
import type { GardenMilestone } from "@/lib/garden";
import { milestoneDate, nextStage, stageDef, type GrowthStage } from "@/lib/growth";
import { EASE } from "@/lib/motion";
import { CivicPlant } from "./CivicPlant";

const MINI = 56;

export function GrowthStory({ milestones, stage }: { milestones: GardenMilestone[]; stage: GrowthStage }) {
  const reduce = useReducedMotion() ?? false;
  const enter = (i: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 8 } as const),
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.32, ease: EASE, delay: reduce ? 0 : 0.06 + i * 0.06 },
  });
  const next = nextStage(stage);
  return (
    <ol aria-label="Your plant's milestones">
      {milestones.map((m, i) => {
        const def = stageDef(m.stage);
        const date = milestoneDate(m.reachedOn);
        const last = i === milestones.length - 1;
        return (
          <motion.li key={m.stage} {...enter(i)} className="relative grid grid-cols-[56px_1fr] gap-4 pb-6">
            {/* Thin connector to the next entry */}
            {!(last && !next) && (
              <span aria-hidden="true" className={`absolute bottom-0 left-[27.5px] top-[76px] w-px ${last ? "border-l border-dashed border-border" : "bg-border"}`} />
            )}
            <CivicPlant stage={m.stage} size={MINI} still label={`${def.name} stage`} />
            <div className="min-w-0 pt-3">
              {date && (
                <p className="text-small font-semibold text-attention-strong">
                  <time dateTime={m.reachedOn}>{date}</time>
                </p>
              )}
              <h4 className="mt-0.5 type-card">{def.title}</h4>
              <p className="mt-0.5 type-secondary text-muted-foreground">{def.line}</p>
            </div>
          </motion.li>
        );
      })}
      {next ? (
        <motion.li {...enter(milestones.length)} className="grid grid-cols-[56px_1fr] gap-4">
          <div aria-hidden="true" style={{ opacity: 0.38, filter: "grayscale(0.85)" }}>
            <CivicPlant stage={next.stage} size={MINI} still label="" />
          </div>
          <div className="min-w-0 pt-3">
            <h4 className="type-card text-muted-foreground">Next: {next.name.toLowerCase()}</h4>
            <p className="mt-0.5 type-secondary text-muted-foreground">At {next.drops} drops poured in all. No rush, it waits for you.</p>
          </div>
        </motion.li>
      ) : (
        <motion.li {...enter(milestones.length)} className="mt-1 rounded-lg bg-surface px-4 py-5 text-center shadow-card">
          <p className="type-card">Your plant is in full bloom.</p>
          <p className="mt-1 type-secondary text-muted-foreground">Thank you for staying curious about the decisions around you.</p>
        </motion.li>
      )}
    </ol>
  );
}
