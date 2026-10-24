// Demo mode tests. isDemoQuery and the persona tests are from Layla's branch (f20bfe8).
import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { TOPIC_DEFS } from "@/lib/vocab";
import { DEMO_PREFERENCES, demoPersona, isDemoQuery, startState } from "./demo";
import { emptyProfile, LEGACY_PROFILE_STORAGE_KEY, PROFILE_STORAGE_KEY, storedProfileJSON } from "./profile";
import { computeWrapped } from "./wrapped";
import { BALLOT_2026 } from "./wrapped.arbitraries";

/** A Storage stand-in that records every call. */
function spyStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  };
}

describe("demo", () => {
  describe("isDemoQuery", () => {
    it.each([
      ["?demo=true", true],
      ["demo=true", true],
      ["?demo=TRUE", false],
      ["?demo=True", false],
      ["?demo=1", false],
      ["?demo=", false],
      ["?demo", false],
      ["", false],
      ["?", false],
      ["?town=cambridge", false],
      ["?Demo=true", false],
      ["?demo=false&demo=true", false],
      ["?demo=true&demo=false", true],
      ["?town=cambridge&demo=true", true],
    ])("isDemoQuery(%j) is %s", (search, expected) => {
      expect(isDemoQuery(search)).toBe(expected);
    });

    it("is true exactly when the first demo value is the lowercase string 'true'", () => {
      const key = fc.oneof(
        fc.constantFrom("demo", "Demo", "DEMO", "town", "x", "demo_"),
        fc.string({ maxLength: 6 }),
      );
      const value = fc.oneof(
        fc.constantFrom("true", "TRUE", "True", "1", "", "false", "yes", " true", "true "),
        fc.string({ maxLength: 8 }),
      );
      const pairs = fc.array(fc.tuple(key, value), { maxLength: 6 });

      fc.assert(
        fc.property(pairs, fc.boolean(), (entries, leadingQ) => {
          const query = entries
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join("&");
          const search = (leadingQ ? "?" : "") + query;
          const first = entries.find(([k]) => k === "demo");
          const expected = first !== undefined && first[1] === "true";
          expect(isDemoQuery(search)).toBe(expected);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("demoPersona with ballot-2026", () => {
    const summary = computeWrapped(BALLOT_2026, demoPersona("2026-01-01T00:00:00.000Z"));

    it("ranks housing costs first", () => {
      expect(summary.topTopic).toBe("housing_costs");
    });

    it("spotlights Question 7", () => {
      expect(summary.spotlight?.measure.number).toBe("7");
    });

    it("lists one measure on the person's topics, and one that may affect them", () => {
      expect(summary.connectedCount).toBe(1);
      expect(summary.touchCount).toBe(1);
    });

    it("lists housing costs 1 of 9 then roads and transit 0 of 9", () => {
      expect(summary.measureTotal).toBe(9);
      expect(
        summary.topTopics.map((t) => [TOPIC_DEFS[t.id].label, t.measureCount]),
      ).toEqual([
        ["Housing costs", 1],
        ["Roads and transit", 0],
      ]);
    });
  });

  describe("startState", () => {
    const saved = storedProfileJSON({ ...emptyProfile("2026-10-01T00:00:00.000Z"), townId: "lowell" }, { remember: true, onboardingDone: true });

    it("in demo mode never reaches for storage: no read, probe, write, or remove", () => {
      const s = spyStorage({ [PROFILE_STORAGE_KEY]: saved });
      const getter = vi.fn(() => s);
      const start = startState("?demo=true", true, getter);
      expect(start.demo).toBe(true);
      expect(start.canStore).toBe(false);
      expect(start.preferences).toEqual(DEMO_PREFERENCES);
      expect(start.profile?.townId).toBe("cambridge");
      expect(getter).not.toHaveBeenCalled();
      expect(s.getItem).not.toHaveBeenCalled();
      expect(s.setItem).not.toHaveBeenCalled();
      expect(s.removeItem).not.toHaveBeenCalled();
      expect(s.data.get(PROFILE_STORAGE_KEY)).toBe(saved);
    });

    it("ignores ?demo=true where Wrapped is not enabled", () => {
      const s = spyStorage({ [PROFILE_STORAGE_KEY]: saved });
      const start = startState("?demo=true", false, () => s);
      expect(start.demo).toBe(false);
      expect(start.profile?.townId).toBe("lowell");
    });

    it("outside demo mode reads the saved profile and moves a legacy one", () => {
      const s = spyStorage({ [LEGACY_PROFILE_STORAGE_KEY]: saved });
      const start = startState("", true, () => s);
      expect(start.demo).toBe(false);
      expect(start.canStore).toBe(true);
      expect(start.profile?.townId).toBe("lowell");
      expect(s.data.get(PROFILE_STORAGE_KEY)).toBe(saved);
      expect(s.data.has(LEGACY_PROFILE_STORAGE_KEY)).toBe(false);
    });

    it("runs in memory when storage throws", () => {
      const start = startState("", true, () => {
        throw new Error("blocked");
      });
      expect(start).toEqual({ demo: false, profile: null, preferences: null, canStore: false });
    });
  });
});
