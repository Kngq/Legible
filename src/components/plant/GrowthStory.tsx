"use client";

// "Your growth story": the plant's journey as a short illustrated timeline, one
// entry per stage reached, then a quiet look at the next stage (or a closing
// note once it blooms). Milestones and totals only: never a list of clicks.
// Reads the same useGrowth source and stage definitions as the plant itself.
import { motion, useReducedMotion } from "motion/react";
import { activityLine, milestoneDate, nextStage, stageDef, type GrowthHistory, type GrowthStage } from "@/lib/growth";
import { EASE } from "@/lib/motion";
import { FOCUS } from "../ui";
import { CivicPlant } from "./CivicPlant";
import { PreviewTag } from "./PlantCompanion";
import { setPreviewGrowth, useGrowth, type PreviewChoice } from "./useGrowth";

const MINI = 64;

export function GrowthStory() {
  const g = useGrowth();
  const reduce = useReducedMotion() ?? false;
  if (!g.enabled) return null;

  const enter = (i: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 8 } as const),
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.32, ease: EASE, delay: reduce ? 0 : 0.06 + i * 0.06 },
  });

  return (
    <div>
      <h3 className="font-display text-feature">Your growth story</h3>
      <p className="mt-1 text-body text-muted-foreground">Every little step adds up.</p>

      {g.preview && <PreviewControls choice={g.choice} />}

      {/* key: replay the entrance when the preview switches */}
      <div key={String(g.choice)} className="mt-6">
        {g.history ? <Timeline history={g.history} stage={g.stage} enter={enter} /> : <Welcome enter={enter} />}
      </div>

      <p className="mb-16 mt-8 border-t border-border pt-4 text-small text-muted-foreground sm:mb-0">
        Your growth story is private to you. It notes milestones and totals, never a list of what you clicked, and is never shared.
      </p>
    </div>
  );
}

type Enter = (i: number) => object;

function Timeline({ history, stage, enter }: { history: GrowthHistory; stage: GrowthStage; enter: Enter }) {
  const next = nextStage(stage);
  const items = history.milestones;
  return (
    <ol aria-label="Your plant's milestones">
      {items.map((m, i) => {
        const def = stageDef(m.stage);
        const date = milestoneDate(m.reachedOn);
        const activity = activityLine(m.totals);
        const last = i === items.length - 1;
        return (
          <motion.li key={m.stage} {...enter(i)} className="relative grid grid-cols-[64px_1fr] gap-4 pb-7">
            {/* Thin connector to the next entry */}
            {!(last && !next) && (
              <span aria-hidden="true" className={`absolute bottom-0 left-[31.5px] top-[84px] w-px ${last ? "border-l border-dashed border-border" : "bg-border"}`} />
            )}
            <CivicPlant stage={m.stage} size={MINI} still label={`${def.name} stage`} />
            <div className="min-w-0 pt-4">
              {date && (
                <p className="text-small font-semibold text-attention-strong">
                  <time dateTime={m.reachedOn}>{date}</time>
                </p>
              )}
              <h4 className="mt-0.5 font-display text-[1.25rem] leading-tight">{def.title}</h4>
              <p className="mt-1 text-body">{def.line}</p>
              {activity && <p className="mt-1 text-small text-muted-foreground">{activity}</p>}
            </div>
          </motion.li>
        );
      })}
      {next ? (
        <motion.li {...enter(items.length)} className="grid grid-cols-[64px_1fr] gap-4">
          <div aria-hidden="true" style={{ opacity: 0.38, filter: "grayscale(0.85)" }}>
            <CivicPlant stage={next.stage} size={MINI} still label="" />
          </div>
          <div className="min-w-0 pt-4">
            <h4 className="font-display text-[1.25rem] leading-tight text-muted-foreground">{next.toward}</h4>
            <p className="mt-1 text-small text-muted-foreground">Exploring decisions and opening official sources helps it grow, at your own pace.</p>
          </div>
        </motion.li>
      ) : (
        <motion.li {...enter(items.length)} className="mt-1 rounded-lg bg-surface px-4 py-5 text-center shadow-card">
          <p className="font-display text-[1.25rem] leading-tight">Your little plant is in full bloom.</p>
          <p className="mt-1 text-small text-muted-foreground">Thank you for staying curious about the decisions around you. Your story keeps going whenever you explore.</p>
        </motion.li>
      )}
    </ol>
  );
}

function Welcome({ enter }: { enter: Enter }) {
  return (
    <motion.div {...enter(0)} className="flex flex-col items-center px-2 pb-2 pt-2 text-center">
      <CivicPlant stage={1} size={88} still label="A seed, waiting to grow" />
      <h4 className="mt-3 font-display text-[1.25rem] leading-tight">Your story starts here</h4>
      <p className="mt-1 max-w-sm text-body text-muted-foreground">
        Explore a decision or open an official source, and your plant&rsquo;s first steps will appear here.
      </p>
    </motion.div>
  );
}

const CHOICES: { value: PreviewChoice; label: string }[] = [
  { value: "empty", label: "Empty" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];

/** Development only: switch the shared preview history. Every plant follows. */
function PreviewControls({ choice }: { choice: PreviewChoice }) {
  return (
    <div className="mt-4 rounded-md border border-dashed border-border p-3">
      <div className="flex items-center gap-2">
        <PreviewTag />
        <span className="text-small text-muted-foreground">Development only. Dates and totals are illustrative.</span>
      </div>
      <div role="radiogroup" aria-label="Preview stage" className="mt-2 flex flex-wrap gap-1.5">
        {CHOICES.map((c) => (
          <button
            key={c.label}
            type="button"
            role="radio"
            aria-checked={choice === c.value}
            onClick={() => setPreviewGrowth(c.value)}
            className={`min-h-9 min-w-9 rounded-full px-3 text-small font-semibold ${choice === c.value ? "bg-foreground text-background" : "bg-surface-muted"} ${FOCUS}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
