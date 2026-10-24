import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import { findBannedWords } from "@/lib/vocab";
import { buildCards } from "./cards";
import { excerpt, impactFor, PAGE_LINES, pageLines, quoteFor, trustSummary, yesLines } from "./measure-page";
import { answerFact, emptyProfile } from "./profile";
import type { DocumentData } from "./types";

const doc = ballot as unknown as DocumentData;
const t0 = "2026-10-24T14:00:00.000Z";

describe("PAGE_LINES", () => {
  it("covers every ballot measure", () => {
    expect(Object.keys(PAGE_LINES).sort()).toEqual(doc.measures.map((m) => m.id).sort());
  });

  for (const [id, lines] of Object.entries(PAGE_LINES)) {
    const m = doc.measures.find((x) => x.id === id)!;
    const sentences = [lines.no, ...(lines.yes ? [lines.yes] : []), ...(lines.takesEffect ? [lines.takesEffect.why] : []), ...(lines.indirect ?? []), ...(lines.uncertain ?? [])];

    it(`${id}: every line cites a real quote and passes the word lint`, () => {
      for (const s of sentences) {
        const q = quoteFor(m, s.quoteId);
        expect(q, s.quoteId).toBeDefined();
        expect(q!.status).not.toBe("failed");
        expect(findBannedWords(s.text)).toEqual([]);
        if (s.mark) expect(q!.text).toContain(s.mark);
      }
      if (lines.takesEffect) expect(findBannedWords(lines.takesEffect.label)).toEqual([]);
    });

    it(`${id}: the NO line cites the official NO statement`, () => {
      expect(lines.no.quoteId).toBe(m.outcomes.no!.id);
    });
  }
});

describe("yesLines", () => {
  it("Q9 with no answers: the referendum overview cites NO, so YES gets its own line", () => {
    const card = buildCards(doc, emptyProfile(t0)).find((c) => c.measure.number === "9")!;
    expect(yesLines(card, pageLines(card.measure.id)).map((s) => s.quoteId)).toEqual(["q9-yes"]);
  });

  it("Q4 keeps the card's own lines", () => {
    const card = buildCards(doc, emptyProfile(t0)).find((c) => c.measure.number === "4")!;
    expect(yesLines(card, pageLines(card.measure.id))).toEqual(card.why);
  });
});

describe("excerpt", () => {
  it("shows only the marked sentence of a long quote", () => {
    const m = doc.measures.find((x) => x.id === "ballot-2026-q8")!;
    const e = excerpt(m.summary, pageLines(m.id)!.takesEffect!.why.mark);
    expect(e.marked).toBe("The proposed law would take effect on January 1, 2028.");
    expect(e.before).toBe("… ");
  });

  it("falls back to the whole quote", () => {
    const m = doc.measures.find((x) => x.id === "ballot-2026-q4")!;
    expect(excerpt(m.outcomes.no!).marked).toBe(m.outcomes.no!.text);
  });
});

describe("trustSummary", () => {
  it("counts lines and distinct quotes for the BC student's Q4", () => {
    let p = emptyProfile(t0);
    p = answerFact(p, "registered_here", false, { kind: "onboarding" }, t0);
    const card = buildCards(doc, p).find((c) => c.measure.number === "4")!;
    const lines = pageLines(card.measure.id)!;
    const t = trustSummary(card.measure, doc, [...yesLines(card, lines), lines.no, lines.takesEffect!.why]);
    expect(t.lines).toBe(4);
    expect(t.quotes).toBe(3); // q4-c1, q4-c2, q4-no
    expect(t.allFound).toBe(true);
    expect(t.aiDraft).toBe(false);
  });
});

describe("impactFor", () => {
  const cardFor = (n: string, facts: Record<string, boolean> = {}) => {
    let p = emptyProfile(t0);
    for (const [k, v] of Object.entries(facts)) p = answerFact(p, k as never, v, { kind: "onboarding" }, t0);
    return buildCards(doc, p).find((c) => c.measure.number === n)!;
  };

  it("direct lines only when an answer touches the question", () => {
    expect(impactFor(cardFor("7")).direct).toEqual([]);
    const touched = cardFor("7", { rents: true });
    expect(impactFor(touched).direct).toEqual(touched.why);
  });

  it("indirect lines start with the town line, named for the person's town", () => {
    const i = impactFor(cardFor("7"), "Somerville");
    expect(i.indirect[0].text).toMatch(/^Somerville would keep/);
    expect(i.indirect.map((s) => s.quoteId)).toEqual(["q7-c3", "q7-fiscal"]);
  });

  it("uncertainty only where the official text states it", () => {
    const withDoubt = doc.measures.filter((m) => impactFor(cardFor(m.number)).uncertain.length).map((m) => m.number);
    expect(withDoubt).toEqual(["2", "5", "6", "7"]);
  });

  it("Q1 and Q3 have no indirect or uncertain lines to show", () => {
    for (const n of ["1", "3"]) {
      const i = impactFor(cardFor(n));
      expect(i.indirect).toEqual([]);
      expect(i.uncertain).toEqual([]);
    }
  });
});
