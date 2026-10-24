import { describe, expect, it } from "vitest";
import { activityLine, currentStage, GROWTH_STAGES, milestoneDate, nextStage, stageFor, withTotals, ZERO } from "./growth";

describe("growth", () => {
  it("defines five stages in order", () => {
    expect(GROWTH_STAGES.map((s) => s.stage)).toEqual([1, 2, 3, 4, 5]);
    expect(GROWTH_STAGES.map((s) => s.name)).toEqual(["Seed", "Sprout", "Growing", "Flourishing", "Blooming"]);
  });

  it("reaches each stage exactly at its needs", () => {
    for (const d of GROWTH_STAGES) expect(stageFor({ ...d.needs, followed: 0 })).toBe(d.stage);
  });

  it("does not grow from followed interests alone", () => {
    expect(stageFor({ decisions: 0, sources: 0, followed: 20 })).toBe(1);
  });

  it("needs sources as well as decisions past the sprout", () => {
    expect(stageFor({ decisions: 20, sources: 0, followed: 0 })).toBe(2);
  });

  it("adds dated milestones for newly reached stages and keeps old dates", () => {
    const a = withTotals({ totals: ZERO, milestones: [] }, { decisions: 1, sources: 0, followed: 0 }, "2026-10-12");
    expect(a.milestones.map((m) => [m.stage, m.reachedOn])).toEqual([
      [1, "2026-10-12"],
      [2, "2026-10-12"],
    ]);
    const b = withTotals(a, { decisions: 3, sources: 2, followed: 0 }, "2026-10-15");
    expect(b.milestones.map((m) => [m.stage, m.reachedOn])).toEqual([
      [1, "2026-10-12"],
      [2, "2026-10-12"],
      [3, "2026-10-15"],
    ]);
    expect(currentStage(b)).toBe(3);
  });

  it("never moves backward", () => {
    const a = withTotals({ totals: ZERO, milestones: [] }, { decisions: 9, sources: 5, followed: 0 }, "2026-10-24");
    expect(currentStage(withTotals(a, ZERO, "2026-10-25"))).toBe(5);
  });

  it("has no next stage after blooming", () => {
    expect(nextStage(4)?.stage).toBe(5);
    expect(nextStage(5)).toBeUndefined();
  });

  it("formats activity and dates", () => {
    expect(activityLine({ decisions: 3, sources: 2, followed: 1 })).toBe("3 decisions explored · 2 official sources opened");
    expect(activityLine({ decisions: 1, sources: 1, followed: 0 })).toBe("1 decision explored · 1 official source opened");
    expect(activityLine(ZERO)).toBe("");
    expect(milestoneDate("2026-10-12")).toBe("October 12");
    expect(milestoneDate(undefined)).toBe("");
  });
});
