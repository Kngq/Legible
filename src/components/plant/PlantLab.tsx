"use client";

// Dev preview for the plant: switch stages, replay tap, growth, and the
// milestone, and see the companion card with simulated counts. Simulated numbers
// exist only here.
import { useState } from "react";
import { Button } from "../ui";
import { CivicPlant, STAGES, type PlantStage } from "./CivicPlant";
import { PlantCompanion } from "./PlantCompanion";
import { SIMULATED_COUNTS } from "./simulated";

export function PlantLab() {
  const [stage, setStage] = useState<PlantStage>(2);
  const [signal, setSignal] = useState({ tap: 0, milestone: 0 });

  const grow = () => setStage((s) => (s === 5 ? 1 : ((s + 1) as PlantStage)));
  const replayGrowth = () => {
    if (stage === 1) return setStage(2);
    const target = stage;
    setStage((target - 1) as PlantStage);
    setTimeout(() => setStage(target), 60);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-small font-semibold uppercase tracking-wide text-muted-foreground">Development preview</p>
      <h1 className="mt-1 font-display text-headline">Your little plant</h1>
      <p className="mt-2 max-w-prose text-body text-muted-foreground">
        Hover to lean, click to tap. Counts here are simulated and never shown in production.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <section aria-label="Stage controls" className="rounded-lg bg-surface p-5 shadow-card">
          <div className="flex justify-center py-4">
            <CivicPlant stage={stage} size={180} signal={signal} className="cursor-pointer select-none" />
          </div>
          <div role="radiogroup" aria-label="Stage" className="mt-2 flex flex-wrap justify-center gap-2">
            {STAGES.map((s) => (
              <button
                key={s.stage}
                type="button"
                role="radio"
                aria-checked={stage === s.stage}
                onClick={() => setStage(s.stage)}
                className={`min-h-10 rounded-full px-4 text-small font-semibold ${stage === s.stage ? "bg-foreground text-background" : "bg-surface-muted"}`}
              >
                {s.stage}. {s.name}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" className="min-h-10! px-4" onClick={() => setSignal((v) => ({ ...v, tap: v.tap + 1 }))}>
              Tap
            </Button>
            <Button variant="secondary" className="min-h-10! px-4" onClick={grow}>
              {stage === 5 ? "Reset to seed" : "Grow one stage"}
            </Button>
            <Button variant="secondary" className="min-h-10! px-4" onClick={replayGrowth}>
              Replay growth
            </Button>
            <Button
              variant="secondary"
              className="min-h-10! px-4"
              onClick={() => (stage === 5 ? setSignal((v) => ({ ...v, milestone: v.milestone + 1 })) : setStage(5))}
            >
              Milestone
            </Button>
          </div>
        </section>

        <div className="space-y-4">
          <PlantCompanion stage={stage} counts={SIMULATED_COUNTS[stage]} simulated signal={signal} />
          <section aria-label="Sizes" className="rounded-lg bg-surface p-5 shadow-card">
            <h2 className="text-body font-semibold">Sizes</h2>
            <div className="mt-3 flex items-end justify-around">
              {[120, 80, 48].map((w) => (
                <div key={w} className="flex flex-col items-center gap-2">
                  <CivicPlant stage={stage} size={w} />
                  <span className="text-small text-muted-foreground">{w}px</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section aria-label="All stages" className="mt-6 rounded-lg bg-surface p-5 shadow-card">
        <h2 className="text-body font-semibold">All five stages</h2>
        <ol className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {STAGES.map((s) => (
            <li key={s.stage} className="flex flex-col items-center gap-2">
              <CivicPlant stage={s.stage} size={120} />
              <span className="text-small font-semibold">
                {s.stage}. {s.name}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
