// Simulated activity for the plant's development preview only. Never imported by
// production code paths: the profile shows the plant only when NODE_ENV is
// "development", until the plant is connected to real milestones.
import type { PlantStage } from "./CivicPlant";
import type { PlantCounts } from "./PlantCompanion";

export const SIMULATED_COUNTS: Record<PlantStage, PlantCounts> = {
  1: { decisions: 0, sources: 0, followed: 0 },
  2: { decisions: 1, sources: 0, followed: 1 },
  3: { decisions: 3, sources: 2, followed: 2 },
  4: { decisions: 6, sources: 4, followed: 3 },
  5: { decisions: 9, sources: 7, followed: 5 },
};
