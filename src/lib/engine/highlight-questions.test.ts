import { describe, expect, it } from "vitest";
import { asksHowToVote, findBannedWords } from "@/lib/vocab";
import { highlightQuestions } from "./highlight-questions";

describe("highlightQuestions", () => {
  it("follows what was highlighted", () => {
    expect(highlightQuestions("punishable by not more than 5 years imprisonment or a fine of not more than $10,000")).toEqual([
      "Who would pay, and how much?",
      "What is the penalty, and for whom?",
      "What does “punishable by not more than 5…” mean in plain words?",
    ]);
    expect(highlightQuestions("SECTION 18. This act shall take effect on January 1, 2028.")).toEqual([
      "When would this start?",
      "Who would have to do this?",
      "What does Section 18 change?",
    ]);
    expect(highlightQuestions("the term “proof of residence” shall mean one of the following")[0]).toBe("What counts as “proof of residence” here?");
  });

  it("gives different questions for different highlights", () => {
    const a = highlightQuestions("Section 40 of chapter 69 is hereby repealed.");
    const b = highlightQuestions("allow cities and towns to reasonably regulate parking");
    expect(a).not.toEqual(b);
  });

  it("always offers at least one, never more than three, and stays neutral", () => {
    for (const t of ["x y z", "A NO VOTE would make no change", "The proposed law would take effect on July 1, 2027, and fund parks in each town."]) {
      const qs = highlightQuestions(t);
      expect(qs.length).toBeGreaterThan(0);
      expect(qs.length).toBeLessThanOrEqual(3);
      for (const q of qs) {
        expect(findBannedWords(q)).toEqual([]);
        expect(asksHowToVote(q)).toBe(false);
      }
    }
  });
});
