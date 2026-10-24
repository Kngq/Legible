import { describe, expect, it } from "vitest";
import { ground } from "./ground";
import { checkAnswer, sanitizeHistory, sanitizePersonal, systemPrompt } from "./prompt";

const g = ground({ kind: "ballot", id: "ballot-2026-q7", title: "Q7" }, "allow cities and towns to reasonably regulate")!;

describe("sanitizePersonal", () => {
  it("keeps only Legible's own fact phrases", () => {
    expect(sanitizePersonal(["you rent", "my SSN is 123", 4, "you rent"])).toEqual(["you rent"]);
    expect(sanitizePersonal("you rent")).toEqual([]);
  });
});

describe("sanitizeHistory", () => {
  it("keeps the last four well-formed turns, trimmed", () => {
    const h = Array.from({ length: 6 }, (_, i) => ({ question: `q${i}`, answer: "a".repeat(900) }));
    const out = sanitizeHistory([...h, { question: 1 }]);
    expect(out.map((t) => t.question)).toEqual(["q2", "q3", "q4", "q5"]);
    expect(out[0].answer.length).toBe(700);
  });
});

describe("systemPrompt", () => {
  it("names the document, its status, the highlight, and holds no banned word literals", () => {
    const s = systemPrompt(g, { mode: "explain", passage: "allow cities and towns to reasonably regulate", personal: [] });
    expect(s).toMatch(/proposed law/);
    expect(s).toMatch(/highlighted these exact words/);
    expect(s).toMatch(/do not write a "you" part/);
  });

  it("only mentions shared personal context when the person turned it on", () => {
    expect(systemPrompt(g, { mode: "explain", personal: ["you rent"] })).toMatch(/chose to share: you rent/);
  });
});

describe("checkAnswer", () => {
  const q = g.passageQuoteId!;
  it("accepts cited explain sentences", () => {
    const s = [
      { text: "Cities and towns would keep some say over these homes.", quoteId: q, part: "means" as const },
      { text: "That could shape what gets built nearby.", quoteId: q, part: "matters" as const },
    ];
    expect(checkAnswer({ answered: true, sentences: s }, g.quotes, { mode: "explain", personal: [] })).toEqual(s);
  });

  it("rejects unknown quotes, banned words, and a 'you' part nobody asked for", () => {
    const base = { text: "Fine.", quoteId: q, part: "means" as const };
    expect(checkAnswer({ answered: true, sentences: [{ ...base, quoteId: "made-up" }] }, g.quotes, { mode: "explain", personal: [] })).toBeNull();
    expect(checkAnswer({ answered: true, sentences: [{ ...base, text: "This is good for you." }] }, g.quotes, { mode: "explain", personal: [] })).toBeNull();
    expect(checkAnswer({ answered: true, sentences: [{ ...base, part: "you" }] }, g.quotes, { mode: "explain", personal: [] })).toBeNull();
    expect(checkAnswer({ answered: true, sentences: [{ ...base, part: "you" }] }, g.quotes, { mode: "explain", personal: ["you rent"] })).not.toBeNull();
    expect(checkAnswer({ answered: false, sentences: [] }, g.quotes, { mode: "ask", personal: [] })).toBeNull();
  });
});
