"use client";

// The plant's stage for views that only need to show it (header, profile).
// Comes from the garden store, so every plant shows the same stage.
import { useGarden } from "./useGarden";

/** The plant shows as a companion. */
export const PLANT_ENABLED = true;

export function useGrowth() {
  const g = useGarden();
  return { enabled: PLANT_ENABLED, stage: g.stage };
}
