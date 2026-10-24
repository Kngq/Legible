import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { CIVIC_PERSONALITIES, TOPIC_DEFS } from "@/lib/vocab";
import { demoPersona, isDemoQuery } from "./demo";
import { computeWrapped, wrappedEntry } from "./wrapped";
import { BALLOT_2026 } from "./wrapped.arbitraries";

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

    // Feature: ballot-wrapped, Property 19: Demo mode only for demo=true
    // **Validates: Requirements 14.1, 14.5**
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

  // Requirements 14.2, 14.7
  describe("demoPersona with ballot-2026", () => {
    const summary = computeWrapped(BALLOT_2026, demoPersona("2026-01-01T00:00:00.000Z"));

    it("has Top_Topic housing_costs and personality The Neighborhood Builder", () => {
      expect(summary.topTopic).toBe("housing_costs");
      expect(CIVIC_PERSONALITIES[summary.topTopic!].name).toBe("The Neighborhood Builder");
    });

    it("spotlights Question 7", () => {
      expect(summary.spotlight?.measure.number).toBe("7");
    });

    it("connects exactly one measure", () => {
      expect(summary.connectedCount).toBe(1);
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

    it("shows the Wrapped button on Home", () => {
      expect(wrappedEntry(demoPersona())).toBe("button");
    });
  });
});
