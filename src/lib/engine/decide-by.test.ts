import { describe, expect, it } from "vitest";
import { findBannedWords } from "@/lib/vocab";
import { decidedLine, decideByLine, decideByRelative } from "./decide-by";

describe("decide-by copy", () => {
  it("states the deadline as a fact", () => {
    expect(decideByLine({ date: "2026-11-03", who: "Voters", how: "vote" })).toBe("Voters decide Nov 3");
    expect(decideByLine({ date: "2027-05-04", who: "Town Meeting", how: "meeting" })).toBe("Town Meeting votes May 4");
    expect(decideByLine({ date: "2027-02-10", who: "Planning Board", how: "comment" })).toBe("Comments close Feb 10");
    expect(decidedLine({ date: "2026-05-04", who: "Town Meeting", how: "meeting" })).toBe("Decided May 4");
  });

  it("counts days without urgency words", () => {
    const d = { date: "2026-11-03", who: "Voters", how: "vote" } as const;
    expect(decideByRelative(d, "2026-10-24")).toBe("Voters decide in 10 days");
    expect(decideByRelative(d, "2026-11-02")).toBe("Voters decide tomorrow");
    expect(decideByRelative(d, "2026-11-03")).toBe("Voters decide today");
    for (const s of [decideByRelative(d, "2026-10-24"), decideByLine(d)]) {
      expect(findBannedWords(s)).toEqual([]);
      expect(s).not.toMatch(/now|hurry|last chance|act/i);
    }
  });
});
