"use client";

// "Your little plant": the plant at the top of Civic Profile, with its totals and
// the way into the Growth Story. Stage and totals come from useGrowth, the same
// source as the header avatar. Counts show only when a history exists; nothing
// here invents activity.
import type { ReactNode } from "react";
import type { GrowthTotals } from "@/lib/growth";
import { FOCUS } from "../ui";
import { CivicPlant } from "./CivicPlant";
import { useGrowth } from "./useGrowth";

const ICON: Record<keyof GrowthTotals, ReactNode> = {
  decisions: <path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v14c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-14c-3.8 0-6.3.5-8 2ZM12 6.5v14" />,
  sources: <path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8ZM14 3.5V8h4.5M9 12h6M9 15.5h6" />,
  followed: <path d="M5 19c0-8 5-13.5 14.5-14-.3 9.5-6 14.5-14.5 14Zm0 0 7.5-7.5" />,
};

const LABEL: Record<keyof GrowthTotals, [string, string]> = {
  decisions: ["decision explored", "decisions explored"],
  sources: ["source opened", "sources opened"],
  followed: ["issue followed", "issues followed"],
};

export function PreviewTag() {
  return <span className="shrink-0 whitespace-nowrap rounded-full bg-info-soft px-2 py-0.5 text-small text-muted-foreground">Preview data</span>;
}

export function PlantCompanion({
  onSeeGrowth,
  signal,
  plantSize = 140,
}: {
  /** Opens the Growth Story. Absent hides the link. */
  onSeeGrowth?: () => void;
  signal?: { tap: number; milestone: number };
  /** Width in px; the plant stands about 1.3 times as tall. */
  plantSize?: number;
}) {
  const g = useGrowth();
  if (!g.enabled) return null;
  const totals = g.history?.totals;
  // No card: the plant sits on the page background as the profile's centrepiece.
  return (
    <section aria-labelledby="plant-h" className="-mt-3 flex flex-col items-center text-center">
      <CivicPlant stage={g.stage} size={plantSize} signal={signal} className="cursor-pointer select-none" />
      <h3 id="plant-h" className="mt-1 font-display text-title font-normal">
        Your little plant
      </h3>
      <p className="mt-0.5 text-small text-muted-foreground">Growing with everything you explore.</p>
      {onSeeGrowth && (
        <button
          type="button"
          onClick={onSeeGrowth}
          className={`mt-1 inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-small font-semibold text-primary underline-offset-4 hover:underline ${FOCUS}`}
        >
          See your growth <span aria-hidden="true">→</span>
        </button>
      )}
      {totals && (
        <ul aria-label="Your totals" className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-small text-muted-foreground">
          {(Object.keys(LABEL) as (keyof GrowthTotals)[]).map((k) => (
            <li key={k} className="inline-flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                width={14}
                height={14}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0"
              >
                {ICON[k]}
              </svg>
              <span>
                <span className="font-semibold text-foreground">{totals[k]}</span> {LABEL[k][totals[k] === 1 ? 0 : 1]}
              </span>
            </li>
          ))}
          {g.preview && (
            <li>
              <PreviewTag />
            </li>
          )}
        </ul>
      )}
      {!totals && g.preview && (
        <p className="mt-1">
          <PreviewTag />
        </p>
      )}
    </section>
  );
}
