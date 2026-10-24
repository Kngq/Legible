import { describe, expect, it } from "vitest";
import { around, ground } from "./ground";

describe("around", () => {
  it("returns the passage with text on both sides, on word boundaries", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta";
    expect(around(text, "delta", 12)).toBe("… beta gamma delta epsilon …");
    expect(around(text, "not here")).toBeNull();
  });
});

describe("ground", () => {
  it("finds a highlight in the official summary first", () => {
    const g = ground({ kind: "ballot", id: "ballot-2026-q4", title: "Question 4" }, "a fine of not more than $10,000")!;
    expect(g.passageFound).toBe(true);
    expect(g.passageQuoteId).toBe("q4-summary");
    expect(g.status).toMatch(/proposed law/);
  });

  it("finds a highlight in a question's full law and adds the text around it", () => {
    const g = ground({ kind: "ballot", id: "ballot-2026-q4", title: "Question 4" }, "Section 1 of chapter 51 of the General Laws")!;
    expect(g.passageFound).toBe(true);
    const q = g.quotes.find((x) => x.id === g.passageQuoteId)!;
    expect(q.id).toMatch(/^ballot-2026-q4-law-p\d+$/);
    expect(q.locator).toBe("Full Text of Proposed Law");
    expect(q.text.length).toBeGreaterThan(200);
  });

  it("marks a referendum as a law already in effect", () => {
    expect(ground({ kind: "ballot", id: "ballot-2026-q9", title: "Q9" })!.status).toMatch(/already in effect/);
  });

  it("never treats text that is not in the official source as official", () => {
    const g = ground({ kind: "ballot", id: "ballot-2026-q7", title: "Q7" }, "Where you rent, residential lots could get new homes")!;
    expect(g.passageFound).toBe(false);
    expect(g.passageQuoteId).toBeUndefined();
  });

  it("grounds a bill in its saved text and says it is not law", () => {
    const g = ground({ kind: "bill", id: "S2581", title: "Bill S2581" }, "personal electronic device")!;
    expect(g.passageFound).toBe(true);
    expect(g.status).toMatch(/not law/);
    expect(ground({ kind: "bill", id: "../../etc", title: "x" })).toBeNull();
  });

  it("grounds an election date in its booklet quote", () => {
    const g = ground({ kind: "civic", id: "ma-2026-mail-ballot-deadline", title: "Vote by Mail" }, "by 5 p.m. on Tuesday, October 27, 2026")!;
    expect(g.passageFound).toBe(true);
    expect(g.quotes[0].locator).toMatch(/page 4/);
  });
});
