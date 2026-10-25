import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { accessoryUnlocked, ACCESSORIES, earn, emptyGarden, gardenStage, introSteps, parseGarden, pour, progress, progressLine, REWARD_DROPS, storedGardenJSON, unlockedBetween, wear, WELCOME_DROPS, type RewardKind } from "./garden";
import { GROWTH_STAGES } from "./growth";

const DAY = "2026-10-24";

describe("garden rewards", () => {
  it("starts as a seed with a few welcome drops", () => {
    const g = emptyGarden(DAY);
    expect(g.water).toBe(WELCOME_DROPS);
    expect(g.poured).toBe(0);
    expect(gardenStage(g)).toBe(1);
    expect(g.milestones).toEqual([{ stage: 1, reachedOn: DAY }]);
  });

  it("pays each kind of exploration its drops", () => {
    for (const kind of Object.keys(REWARD_DROPS) as RewardKind[]) {
      const { state, drops } = earn(emptyGarden(DAY), kind, "x");
      expect(drops).toBe(REWARD_DROPS[kind]);
      expect(state.water).toBe(WELCOME_DROPS + REWARD_DROPS[kind]);
    }
  });

  it("never pays the same page twice", () => {
    const a = earn(emptyGarden(DAY), "question", "q1").state;
    const b = earn(a, "question", "q1");
    expect(b.drops).toBe(0);
    expect(b.state).toBe(a);
    // The same id under another kind is a different page.
    expect(earn(a, "item", "q1").drops).toBe(REWARD_DROPS.item);
  });

  it("pays nothing for an empty id", () => {
    expect(earn(emptyGarden(DAY), "source", "").drops).toBe(0);
  });
});

describe("watering", () => {
  it("deducts exactly what was poured", () => {
    const g = { ...emptyGarden(DAY), water: 10 };
    const r = pour(g, 4, DAY);
    expect(r.poured).toBe(4);
    expect(r.state.water).toBe(6);
    expect(r.state.poured).toBe(4);
  });

  it("never pours more than the water there is", () => {
    const r = pour(emptyGarden(DAY), 50, DAY);
    expect(r.poured).toBe(WELCOME_DROPS);
    expect(r.state.water).toBe(0);
    const again = pour(r.state, 1, DAY);
    expect(again.poured).toBe(0);
    expect(again.state).toBe(r.state);
  });

  it("ignores zero, negative, fractional, and non-numeric amounts", () => {
    const g = emptyGarden(DAY);
    expect(pour(g, 0, DAY).poured).toBe(0);
    expect(pour(g, -3, DAY).poured).toBe(0);
    expect(pour(g, 1.9, DAY).poured).toBe(1);
    expect(pour(g, Number.NaN, DAY).poured).toBe(0);
  });

  it("grows at each stage's drops and dates the milestones", () => {
    let g = { ...emptyGarden("2026-10-20"), water: 100 };
    const first = pour(g, 3, "2026-10-21");
    expect([first.from, first.to]).toEqual([1, 2]);
    g = first.state;
    // One big pour can pass two stages; both get milestones.
    const big = pour(g, 12, "2026-10-22");
    expect([big.from, big.to]).toEqual([2, 4]);
    expect(big.state.milestones).toEqual([
      { stage: 1, reachedOn: "2026-10-20" },
      { stage: 2, reachedOn: "2026-10-21" },
      { stage: 3, reachedOn: "2026-10-22" },
      { stage: 4, reachedOn: "2026-10-22" },
    ]);
  });

  it("the welcome drops alone grow the seed into a sprout", () => {
    expect(pour(emptyGarden(DAY), WELCOME_DROPS, DAY).to).toBe(2);
  });

  it("every drop counts, and the stage never goes down", () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.integer({ min: -2, max: 8 }), fc.constantFrom<RewardKind>("question", "item", "guide", "source")), { maxLength: 60 }), (steps) => {
        let g = emptyGarden(DAY);
        let stage = gardenStage(g);
        let total = WELCOME_DROPS;
        let spent = 0;
        steps.forEach((s, i) => {
          if (typeof s === "number") {
            const r = pour(g, s, DAY);
            spent += r.poured;
            g = r.state;
          } else {
            const r = earn(g, s, String(i % 7));
            total += r.drops;
            g = r.state;
          }
          expect(g.water).toBeGreaterThanOrEqual(0);
          expect(g.poured).toBe(spent);
          expect(g.water).toBe(total - spent);
          expect(gardenStage(g)).toBeGreaterThanOrEqual(stage);
          stage = gardenStage(g);
          expect(g.milestones.map((m) => m.stage)).toEqual(GROWTH_STAGES.slice(0, stage).map((d) => d.stage));
        });
      }),
    );
  });
});

describe("progress", () => {
  it("counts drops toward the next stage", () => {
    const p = progress({ ...emptyGarden(DAY), poured: 5 });
    expect(p.stage).toBe(2);
    expect([p.into, p.span, p.toNext]).toEqual([2, 5, 3]);
    expect(progressLine(p)).toBe("3 more drops until growing.");
    expect(progressLine(progress({ ...emptyGarden(DAY), poured: 7 }))).toBe("1 more drop until growing.");
  });

  it("has nothing left to reach once blooming", () => {
    const p = progress({ ...emptyGarden(DAY), poured: 40 });
    expect(p.next).toBeUndefined();
    expect(p.toNext).toBe(0);
    expect(progressLine(p)).toMatch(/bloomed/i);
  });

  it("checks off the first-visit steps by doing them", () => {
    let g = emptyGarden(DAY);
    expect(introSteps(g).map((s) => s.done)).toEqual([false, false, false]);
    g = pour(g, 1, DAY).state;
    expect(introSteps(g).map((s) => s.done)).toEqual([true, false, false]);
    g = earn(g, "question", "q1").state;
    g = pour(g, 2, DAY).state;
    expect(introSteps(g).map((s) => s.done)).toEqual([true, true, true]);
  });
});

describe("storage", () => {
  it("round-trips through JSON", () => {
    let g = emptyGarden(DAY);
    g = earn(g, "question", "q1").state;
    g = { ...pour(g, 4, DAY).state, introDone: true };
    expect(parseGarden(storedGardenJSON(g))).toEqual(g);
  });


  it("rejects anything that is not a garden", () => {
    for (const raw of [null, "", "nope", "{}", "[]", '{"v":2,"water":1,"poured":0}', '{"v":1,"water":-1,"poured":0}', '{"v":1,"water":1.5,"poured":0}'])
      expect(parseGarden(raw)).toBeNull();
  });

  it("drops malformed parts and keeps the rest", () => {
    const g = parseGarden(JSON.stringify({ v: 1, variety: "orchid", water: 2, poured: 9, earned: ["a", 3], milestones: [{ stage: 9, reachedOn: DAY }, { stage: 2, reachedOn: DAY }] }));
    expect(g).toEqual({ v: 1, variety: "sprout", water: 2, poured: 9, earned: ["a"], milestones: [{ stage: 2, reachedOn: DAY }], introDone: false, accessory: "none" });
  });
});

describe("accessories", () => {
  it("offers none and four accessories, unlocking with the stage", () => {
    expect(ACCESSORIES.map((a) => [a.id, a.unlocksAt])).toEqual([
      ["none", 1],
      ["glasses", 1],
      ["bow", 2],
      ["hat", 3],
      ["scarf", 5],
    ]);
    expect(accessoryUnlocked("glasses", 1)).toBe(true);
    expect(accessoryUnlocked("bow", 1)).toBe(false);
    expect(accessoryUnlocked("bow", 2)).toBe(true);
    expect(accessoryUnlocked("hat", 2)).toBe(false);
    expect(accessoryUnlocked("hat", 3)).toBe(true);
    expect(accessoryUnlocked("scarf", 4)).toBe(false);
    expect(accessoryUnlocked("scarf", 5)).toBe(true);
    for (const a of ACCESSORIES) if (a.unlocksAt > 1) expect(a.locked).toMatch(/^Unlocks when/);
  });

  it("wears an unlocked accessory and refuses a locked one", () => {
    const seed = emptyGarden(DAY);
    expect(seed.accessory).toBe("none");
    expect(wear(seed, "glasses").accessory).toBe("glasses");
    expect(wear(seed, "scarf")).toBe(seed);
    const sprout = { ...seed, poured: 3 };
    expect(wear(sprout, "bow").accessory).toBe("bow");
    expect(wear(wear(sprout, "bow"), "none").accessory).toBe("none");
  });

  it("names what unlocks on the way between stages", () => {
    expect(unlockedBetween(1, 2).map((a) => a.id)).toEqual(["bow"]);
    expect(unlockedBetween(2, 5).map((a) => a.id)).toEqual(["hat", "scarf"]);
    expect(unlockedBetween(3, 4)).toEqual([]);
  });

  it("keeps the accessory through storage, and takes off one not yet unlocked", () => {
    const g = wear({ ...emptyGarden(DAY), poured: 8 }, "hat");
    expect(parseGarden(storedGardenJSON(g))?.accessory).toBe("hat");
    expect(parseGarden(JSON.stringify({ ...emptyGarden(DAY), accessory: "scarf" }))?.accessory).toBe("none");
    expect(parseGarden(JSON.stringify({ ...emptyGarden(DAY), accessory: "crown" }))?.accessory).toBe("none");
  });
});
