"use client";

// The one source of the plant's growth for every view: the header avatar, the
// profile plant, and the Growth Story all read this hook, so they always show
// the same stage and animate together.
//
// The plant has two parts. As a visual companion (header avatar, For you hero,
// Civic Profile) it shows everywhere. Growth tracking (stages that change,
// totals, the Growth Story) is not real yet, so it stays development only: in
// production the plant stands still at one fixed look, with no stage name,
// totals, journey, or preview data. In development the history comes from a
// preview store (clearly labelled preview data) that the preview controls switch
// between an empty story and stages 1-5. Connecting real milestones later means
// returning a real GrowthHistory here and turning tracking on.
import { useSyncExternalStore } from "react";
import { currentStage, GROWTH_STAGES, type GrowthHistory, type GrowthStage, type GrowthTotals } from "@/lib/growth";

/** The plant as a visual companion: on everywhere. */
export const PLANT_ENABLED = true;

/** Growth tracking (changing stages, totals, the Growth Story): development only until it records real milestones. */
export const GROWTH_TRACKING_ENABLED = process.env.NODE_ENV === "development";

/** The plant's fixed look while growth is not tracked. A drawing, never shown or announced as a stage. */
export const COMPANION_STAGE: GrowthStage = 3;

export type PreviewChoice = "empty" | GrowthStage;

// Illustrative dates and totals for the preview only. Each preview stage meets
// exactly that stage's needs, so the stage logic is the same as for real data.
const PREVIEW_DAYS = ["2026-10-08", "2026-10-12", "2026-10-15", "2026-10-19", "2026-10-24"];
const PREVIEW_FOLLOWED = [0, 1, 2, 3, 5];

function previewTotals(stage: GrowthStage): GrowthTotals {
  return { ...GROWTH_STAGES[stage - 1].needs, followed: PREVIEW_FOLLOWED[stage - 1] };
}

export function previewHistory(choice: PreviewChoice): GrowthHistory | null {
  if (choice === "empty") return null;
  return {
    totals: previewTotals(choice),
    milestones: GROWTH_STAGES.slice(0, choice).map((d) => ({
      stage: d.stage,
      reachedOn: PREVIEW_DAYS[d.stage - 1],
      totals: d.stage === 1 ? undefined : previewTotals(d.stage),
    })),
  };
}

let choice: PreviewChoice = 3;
const listeners = new Set<() => void>();

export function setPreviewGrowth(next: PreviewChoice) {
  if (!GROWTH_TRACKING_ENABLED || next === choice) return;
  choice = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export type Growth = {
  /** The plant shows as a visual companion. */
  enabled: boolean;
  /** Growth tracking is on: stages, totals, the journey link, and the Growth Story. Development only for now. */
  tracking: boolean;
  stage: GrowthStage;
  /** Null when there is no genuine history yet: the Growth Story shows its welcome. */
  history: GrowthHistory | null;
  /** True while the history is development preview data. */
  preview: boolean;
  choice: PreviewChoice;
};

export function useGrowth(): Growth {
  const c = useSyncExternalStore(
    subscribe,
    () => choice,
    () => choice,
  );
  if (!PLANT_ENABLED) return { enabled: false, tracking: false, stage: 1, history: null, preview: false, choice: "empty" };
  // Companion only: one fixed look; no history, totals, or preview data to show.
  if (!GROWTH_TRACKING_ENABLED) return { enabled: true, tracking: false, stage: COMPANION_STAGE, history: null, preview: false, choice: "empty" };
  const history = previewHistory(c);
  return { enabled: true, tracking: true, stage: currentStage(history), history, preview: true, choice: c };
}
