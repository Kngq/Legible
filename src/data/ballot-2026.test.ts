import { describe, expect, it } from "vitest";
import ballot from "./ballot-2026.json";
import type { DocumentData } from "@/lib/engine/types";
import { DIRECTIONS, FACT_IDS, TOPIC_IDS, findBannedWords } from "@/lib/vocab";

const doc = ballot as unknown as DocumentData;

describe("ballot-2026 data", () => {
  it("has nine measures in ballot order", () => {
    expect(doc.measures.map((m) => m.number)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  });

  it("locates every quote on a page", () => {
    for (const m of doc.measures) {
      for (const q of m.quotes) {
        expect(q.status, `${q.id}`).not.toBe("failed");
        expect(q.page, `${q.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("cites an existing quote from every why and overview sentence", () => {
    for (const m of doc.measures) {
      const ids = new Set(m.quotes.map((q) => q.id));
      const sentences = [...m.overview, ...m.rules.flatMap((r) => r.why)];
      expect(sentences.length, m.id).toBeGreaterThan(0);
      for (const s of sentences) expect(ids.has(s.quoteId), `${m.id}: ${s.quoteId}`).toBe(true);
      expect(m.overview.length).toBeLessThanOrEqual(2);
      for (const r of m.rules) expect(r.why.length).toBeLessThanOrEqual(2);
    }
  });

  it("uses only the fixed vocabularies", () => {
    for (const m of doc.measures) {
      if (m.everyoneDirection) expect(DIRECTIONS).toContain(m.everyoneDirection);
      for (const r of m.rules) {
        expect(DIRECTIONS).toContain(r.direction);
        expect(FACT_IDS).toContain(r.fact);
      }
      for (const f of m.askFacts) expect(FACT_IDS).toContain(f);
      for (const t of m.topics) expect(TOPIC_IDS).toContain(t);
      // every rule's fact is asked inline
      for (const r of m.rules) expect(m.askFacts, m.id).toContain(r.fact);
    }
  });

  it("keeps banned words out of authored text", () => {
    for (const m of doc.measures) {
      expect(findBannedWords(m.title), m.id).toEqual([]);
      for (const s of [...m.overview, ...m.rules.flatMap((r) => r.why)]) {
        expect(findBannedWords(s.text), `${m.id}: ${s.text}`).toEqual([]);
      }
    }
  });

  it("renders Question 9 as a referendum where YES keeps the law", () => {
    const q9 = doc.measures.find((m) => m.number === "9")!;
    expect(q9.kind).toBe("referendum");
    expect(q9.outcomes.yes?.text).toMatch(/^A YES VOTE would keep in place the law/);
    expect(q9.outcomes.no?.text).toBe("A NO VOTE would repeal this law.");
  });

  it("has verbatim YES and NO text starting with the official phrasing", () => {
    for (const m of doc.measures) {
      expect(m.outcomes.yes?.text).toMatch(/^A YES VOTE would /);
      expect(m.outcomes.no?.text).toMatch(/^A NO VOTE would /);
      expect(m.sourceUrl).toMatch(/sec\.state\.ma\.us/);
    }
  });

  it("labels the document reviewed only when every measure was checked by a person", () => {
    const allReviewed = doc.measures.every((m) => m.quotes.every((q) => q.status === "reviewed"));
    expect(doc.provenance === "reviewed").toBe(allReviewed);
  });
});
