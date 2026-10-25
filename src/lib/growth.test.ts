import { describe, expect, it } from "vitest";
import { GROWTH_STAGES, milestoneDate, nextStage, stageFor, VARIETIES } from "./growth";

describe("growth", () => {
  it("defines five stages in order, each needing more drops", () => {
    expect(GROWTH_STAGES.map((s) => s.stage)).toEqual([1, 2, 3, 4, 5]);
    expect(GROWTH_STAGES.map((s) => s.name)).toEqual(["Seed", "Sprout", "Growing", "Budding", "Blooming"]);
    for (let i = 1; i < GROWTH_STAGES.length; i++) expect(GROWTH_STAGES[i].drops).toBeGreaterThan(GROWTH_STAGES[i - 1].drops);
  });

  it("reaches each stage exactly at its drops", () => {
    for (const d of GROWTH_STAGES) {
      expect(stageFor(d.drops)).toBe(d.stage);
      if (d.drops > 0) expect(stageFor(d.drops - 1)).toBe(d.stage - 1);
    }
    expect(stageFor(999)).toBe(5);
  });

  it("keys every variety by its own id", () => {
    for (const [id, v] of Object.entries(VARIETIES)) {
      expect(v.id).toBe(id);
      expect(v.stages).toHaveLength(5);
    }
  });

  it("has no next stage after blooming", () => {
    expect(nextStage(4)?.stage).toBe(5);
    expect(nextStage(5)).toBeUndefined();
  });

  it("formats dates as calendar days", () => {
    expect(milestoneDate("2026-10-12")).toBe("October 12");
    expect(milestoneDate(undefined)).toBe("");
    expect(milestoneDate("nope")).toBe("");
  });
});
