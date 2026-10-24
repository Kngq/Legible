import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import { asksHowToVote, findBannedWords } from "@/lib/vocab";
import { ASK_SUGGESTIONS, BALLOT_SUGGESTIONS } from "./ask-suggestions";
import { quoteFor } from "./measure-page";
import type { DocumentData } from "./types";

const doc = ballot as unknown as DocumentData;
const all = [
  ...Object.entries(ASK_SUGGESTIONS).flatMap(([measureId, list]) => list.map((s) => ({ ...s, measureId }))),
  ...BALLOT_SUGGESTIONS,
];

describe("ask suggestions", () => {
  it("covers every ballot question with three", () => {
    for (const m of doc.measures) expect(ASK_SUGGESTIONS[m.id]?.length, m.id).toBe(3);
  });

  it("each names a quote that exists on its measure", () => {
    for (const s of all) {
      const m = doc.measures.find((x) => x.id === s.measureId)!;
      expect(quoteFor(m, s.quoteId), `${s.measureId} ${s.quoteId}`).toBeDefined();
    }
  });

  it("is neutral and never about the person", () => {
    for (const s of all) {
      expect(findBannedWords(s.q), s.q).toEqual([]);
      expect(asksHowToVote(s.q), s.q).toBe(false);
      expect(s.q, s.q).not.toMatch(/\b(I|me|my|mine)\b/i);
    }
  });
});
