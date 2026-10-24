"use client";

// "Your little plant": a small companion card for the profile sheet. Counts show
// only when real numbers are passed in; nothing here invents activity. Until the
// plant is connected to real milestones it renders in development only, with
// simulated numbers marked as such.
import type { ReactNode } from "react";
import { CivicPlant, type PlantStage } from "./CivicPlant";

export type PlantCounts = { decisions: number; sources: number; followed: number };

const ICON: Record<keyof PlantCounts, ReactNode> = {
  decisions: <path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v14c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-14c-3.8 0-6.3.5-8 2ZM12 6.5v14" />,
  sources: <path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8ZM14 3.5V8h4.5M9 12h6M9 15.5h6" />,
  followed: <path d="M5 19c0-8 5-13.5 14.5-14-.3 9.5-6 14.5-14.5 14Zm0 0 7.5-7.5" />,
};

const LABEL: Record<keyof PlantCounts, [string, string]> = {
  decisions: ["decision explored", "decisions explored"],
  sources: ["source opened", "sources opened"],
  followed: ["issue followed", "issues followed"],
};

export function PlantCompanion({
  stage,
  counts,
  simulated = false,
  signal,
  plantSize = 88,
}: {
  stage: PlantStage;
  counts?: PlantCounts;
  /** Marks the counts as preview data. */
  simulated?: boolean;
  signal?: { tap: number; milestone: number };
  plantSize?: number;
}) {
  return (
    <section aria-labelledby="plant-h" className="rounded-lg bg-surface p-4 shadow-card">
      <div className="flex items-center gap-4">
        <CivicPlant stage={stage} size={plantSize} signal={signal} className="shrink-0 cursor-pointer select-none" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 id="plant-h" className="font-display text-title font-normal">
              Your little plant
            </h3>
            {simulated && (
              <span className="rounded-full bg-info-soft px-2 py-0.5 text-small text-muted-foreground">Preview data</span>
            )}
          </div>
          <p className="mt-0.5 text-small text-muted-foreground">Growing with everything you explore.</p>
          {counts && (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {(Object.keys(LABEL) as (keyof PlantCounts)[]).map((k) => (
                <li key={k} className="flex min-w-0 items-start gap-1.5">
                  <svg
                    viewBox="0 0 24 24"
                    width={18}
                    height={18}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-muted-foreground"
                  >
                    {ICON[k]}
                  </svg>
                  <span className="min-w-0">
                    <span className="block font-display text-title leading-none">{counts[k]}</span>
                    <span className="mt-0.5 block text-small leading-tight text-muted-foreground">{LABEL[k][counts[k] === 1 ? 0 : 1]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
