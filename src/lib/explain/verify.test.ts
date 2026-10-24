import { describe, expect, it } from "vitest";
import civic from "@/data/civic-ma.json";
import type { CivicItem } from "@/lib/engine/civic";
import { answerFact, emptyProfile } from "@/lib/engine/profile";
import { normalize } from "@/lib/verify/normalize";
import { personalView } from "./personal";
import type { ExplainerDraft } from "./types";
import { allLines, sectionAt, termsPresent, verifyExplainer } from "./verify";

const TEXT = "SECTION 1. Cities shall allow duplexes on residential lots. SECTION 2. This act shall take effect one year after passage.";
const source = { kind: "bill" as const, id: "S1", title: "Test", url: "https://malegislature.gov/Bills/194/S1", file: "/official/bills/S1.json", hash: "x", savedOn: "2026-10-24" };
const draft = (over: Partial<ExplainerDraft> = {}): ExplainerDraft => ({
  author: "team",
  quotes: [
    { id: "duplex", text: "Cities shall allow duplexes on residential lots." },
    { id: "start", text: "This act shall take effect one year after passage." },
  ],
  proposes: [{ text: "Cities would have to allow duplexes.", quote: "duplex" }],
  changes: [],
  affects: [],
  personal: [],
  takesEffect: [{ label: "1 year", line: { text: "It would start a year later.", quote: "start" } }],
  ...over,
});
const run = (d: ExplainerDraft) => verifyExplainer({ draft: d, text: TEXT, source, history: [] });

describe("verifyExplainer", () => {
  it("passes a draft whose quotes are word for word and labels each with its section", () => {
    const r = run(draft());
    expect(r.errors).toEqual([]);
    expect(r.explainer.quotes.map((q) => [q.id, q.locator, q.status])).toEqual([
      ["bill-S1-duplex", "Section 1", "verified"],
      ["bill-S1-start", "Section 2", "verified"],
    ]);
    expect(r.explainer.provenance).toBe("verified");
  });

  it("fails a quote that is not in the text and drops the line that cites it", () => {
    const r = run(draft({ quotes: [{ id: "duplex", text: "Cities shall allow triplexes on residential lots." }, { id: "start", text: "This act shall take effect one year after passage." }] }));
    expect(r.errors.some((e) => e.includes("not found word for word"))).toBe(true);
    expect(r.explainer.proposes).toEqual([]);
  });

  it("requires every line to say the change is proposed", () => {
    const r = run(draft({ proposes: [{ text: "Cities must allow duplexes.", quote: "duplex" }] }));
    expect(r.errors.some((e) => e.includes("say it is proposed"))).toBe(true);
  });

  it("rejects banned words, unknown quotes, and quotes no line cites", () => {
    const r = run(draft({ proposes: [{ text: "This could be good for cities.", quote: "nope" }] }));
    expect(r.errors.some((e) => e.includes("banned words good"))).toBe(true);
    expect(r.errors.some((e) => e.includes('unknown quote "nope"'))).toBe(true);
    expect(r.errors.some((e) => e.includes("quote duplex: not cited"))).toBe(true);
  });

  it("checks a not-mentioned sentence by searching the text", () => {
    const personal = [{ fact: "rents" as const, when: true, effect: "possible" as const, lines: [{ text: "More homes could be built.", quote: "duplex" }], notStated: { text: "It does not mention duplexes.", terms: ["duplex"] } }];
    expect(run(draft({ personal })).errors.some((e) => e.includes("but it does"))).toBe(true);
    expect(termsPresent(normalize(TEXT), ["tenant", "lease"])).toEqual([]);
  });

  it("marks a model draft as an AI draft until a person reviews it", () => {
    expect(run(draft({ author: "model" })).explainer.provenance).toBe("ai_draft");
    const reviewed = run(draft({ author: "model", reviewedBy: "Rachel" })).explainer;
    expect(reviewed.provenance).toBe("reviewed");
    expect(reviewed.quotes.every((q) => q.status === "reviewed")).toBe(true);
  });

  it("finds the nearest section heading", () => {
    const n = normalize(TEXT);
    expect(sectionAt(n, n.indexOf("This act"))).toBe("Section 2");
    expect(sectionAt("no headings", 3)).toBeUndefined();
  });
});

describe("S.2836 as shipped", () => {
  const item = (civic as unknown as CivicItem[]).find((i) => i.id === "ma-194-s2836")!;
  const e = item.explainer!;

  it("has every part, and every line cites a quote found word for word", () => {
    expect(e.proposes.length).toBeGreaterThan(0);
    expect(e.changes.length).toBeGreaterThan(0);
    expect(e.affects.length).toBeGreaterThan(0);
    expect(e.history.length).toBeGreaterThan(0);
    const ids = new Set(e.quotes.filter((q) => q.status !== "failed").map((q) => q.id));
    for (const l of allLines(e)) expect(ids.has(l.quoteId)).toBe(true);
    expect(e.quotes.every((q) => /^Section \d+$/.test(q.locator))).toBe(true);
  });

  it("shows a renter a possible effect, an owner a direct one, and asks the rest", () => {
    const t = "2026-10-24T14:00:00.000Z";
    const renter = answerFact(emptyProfile(t), "rents", true, { kind: "onboarding" }, t);
    const v = personalView(e, renter);
    expect(v.matched.map((r) => [r.fact, r.effect])).toEqual([["rents", "possible"]]);
    expect(v.matched[0].notStated?.text).toMatch(/does not mention renters/);
    expect(v.open).not.toContain("rents");
    const owner = answerFact(renter, "owns", true, { kind: "onboarding" }, t);
    expect(personalView(e, owner).matched[0]).toMatchObject({ fact: "owns", effect: "direct" });
  });
});
