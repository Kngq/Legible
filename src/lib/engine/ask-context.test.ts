import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import { officialExcerpt, publicExcerpt } from "./ask-context";
import type { DocumentData } from "./types";

const doc = ballot as unknown as DocumentData;
const q7 = doc.measures.find((m) => m.id === "ballot-2026-q7")!;

describe("publicExcerpt", () => {
  it("passes official wording through, with its measure", () => {
    const words = q7.quotes.find((q) => q.id === "q7-c3")!.text.slice(0, 60);
    expect(publicExcerpt(`  ${words}\n`, doc)).toEqual({ text: words.trim(), measureId: "ballot-2026-q7" });
  });

  it("never sends a line that exists because of the person's answers", () => {
    const personal = q7.rules.find((r) => r.fact === "rents")!.why[0].text;
    expect(publicExcerpt(personal, doc)).toBeNull();
    expect(publicExcerpt("IF YOU RENT", doc)).toBeNull();
  });

  it("ignores tiny selections and caps long ones", () => {
    expect(publicExcerpt("the", doc)).toBeNull();
    const long = publicExcerpt(doc.measures[3].summary.text, doc)!;
    expect(long.text.length).toBeLessThanOrEqual(241);
  });

  it("finds wording from another question even when scoped", () => {
    const words = doc.measures[0].quotes.find((q) => q.id === "q1-c1")!.text.slice(0, 50);
    expect(publicExcerpt(words, doc, "ballot-2026-q7")?.measureId).toBe(doc.measures[0].id);
  });
});

describe("officialExcerpt", () => {
  it("normalizes, ignores tiny selections, and caps long ones", () => {
    expect(officialExcerpt("  SECTION 1.\n Chapter 69  ")).toBe("SECTION 1. Chapter 69");
    expect(officialExcerpt("the")).toBeNull();
    expect(officialExcerpt("word ".repeat(100))!.length).toBeLessThanOrEqual(241);
  });
});
