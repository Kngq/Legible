import { describe, expect, it } from "vitest";
import { BANNED_WORDS } from "@/lib/vocab";
import { DRAFT_SYSTEM, draftPrompt } from "./prompt";

describe("draft prompt", () => {
  const input = {
    bill: "S1",
    title: "An Act about duplexes",
    text: "SECTION 1. Cities shall allow duplexes.",
    history: [{ date: "2026-01-02", branch: "Senate", action: "Reported  from the committee\n" }],
    today: "2026-10-24",
  };

  it("carries the bill text, its history, today, and the fixed fact ids, and nothing about a person", () => {
    const p = draftPrompt(input);
    expect(p).toContain("<bill>\nSECTION 1. Cities shall allow duplexes.\n</bill>");
    expect(p).toContain("- 2026-01-02 · Senate: Reported from the committee");
    expect(p).toContain("Today is 2026-10-24.");
    expect(p).toContain("- rents: ");
    expect(p).not.toMatch(/townId|"facts"|"value":/);
  });

  it("names every banned word in the rules", () => {
    for (const w of BANNED_WORDS) expect(DRAFT_SYSTEM).toContain(w);
  });

  it("strips author and reviewer from the example", () => {
    const p = draftPrompt({ ...input, example: { bill: "H2", draft: { author: "team", reviewedBy: "Rachel", quotes: [], proposes: [], changes: [], affects: [], personal: [], takesEffect: [] } } });
    expect(p).not.toContain("Rachel");
    expect(p).toContain("A finished draft for a different bill (H2)");
  });
});
