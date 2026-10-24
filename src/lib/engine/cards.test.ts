import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import { findBannedWords } from "@/lib/vocab";
import { buildCards, touchCount } from "./cards";
import { draftMessage, DRAFT_QUESTIONS, LOCAL_REACH, localReach, nextSteps, wordCount } from "./next-steps";
import { answerFact, declineFact, emptyProfile, setTopic, type Profile } from "./profile";
import type { DocumentData } from "./types";

const t0 = "2026-10-24T14:00:00.000Z";
const doc = ballot as unknown as DocumentData;
const ob = { kind: "onboarding" } as const;
const numbers = (p: Profile) => buildCards(doc, p).map((c) => c.measure.number);

function withFacts(facts: Record<string, boolean>): Profile {
  let p = emptyProfile(t0);
  for (const [k, v] of Object.entries(facts)) p = answerFact(p, k as never, v, ob, t0);
  return p;
}

describe("buildCards", () => {
  it("empty profile: everyone measures first, in document order, nothing touches", () => {
    const cards = buildCards(doc, emptyProfile(t0));
    expect(touchCount(cards)).toBe(0);
    expect(numbers(emptyProfile(t0))).toEqual(["1", "3", "4", "5", "2", "6", "7", "8", "9"]);
    expect(cards.find((c) => c.measure.number === "7")!.direction).toBe("none");
  });

  it("BC student who rents and is not registered: Q4 and Q7 touch, Q4 expands", () => {
    const p = withFacts({ rents: true, owns: false, registered_here: false });
    const cards = buildCards(doc, p);
    expect(cards.slice(0, 2).map((c) => c.measure.number)).toEqual(["4", "7"]);
    expect(cards[0].direction).toBe("expands");
    expect(cards[0].because).toEqual([{ kind: "fact", id: "registered_here", value: false }]);
  });

  it("a registered voter is not touched by Q4", () => {
    const cards = buildCards(doc, withFacts({ registered_here: true }));
    expect(cards.find((c) => c.measure.number === "4")!.relevance).toBe("everyone");
  });

  it("contradictory facts both fire and both appear in because, why capped at two", () => {
    const q7 = buildCards(doc, withFacts({ rents: true, owns: true, wants_single_family: true })).find((c) => c.measure.number === "7")!;
    expect(q7.because.map((b) => b.kind === "fact" && b.id)).toEqual(["wants_single_family", "owns", "rents"]);
    expect(q7.why.length).toBe(2);
  });

  it("topics without facts add On your list and sort above everyone, never touches", () => {
    const p = setTopic(emptyProfile(t0), "open_space", true, "chip", t0);
    const cards = buildCards(doc, p);
    expect(cards[0].measure.number).toBe("6");
    expect(cards[0].onYourList).toBe(true);
    expect(cards[0].relevance).toBe("probably_not");
  });

  it("a declined fact stays pending but is never asked again on its card", () => {
    const p = declineFact(emptyProfile(t0), "owns_firearm", ob, t0);
    const q9 = buildCards(doc, p).find((c) => c.measure.number === "9")!;
    expect(q9.pendingQuestions).toEqual(["owns_firearm"]);
    expect(nextSteps(q9, p)[0].kind).toBe("read");
  });
});

describe("next steps and local reach", () => {
  it("every local sentence cites a quote that exists and avoids banned words", () => {
    for (const [mid, s] of Object.entries(LOCAL_REACH)) {
      const m = doc.measures.find((x) => x.id === mid)!;
      expect(m.quotes.some((q) => q.id === s.quoteId)).toBe(true);
      expect(findBannedWords(s.text)).toEqual([]);
    }
    expect(localReach("ballot-2026-q7", "Somerville")!.text).toMatch(/^Somerville would keep/);
    expect(localReach("ballot-2026-q7")!.text).toMatch(/^Your city or town/);
  });

  it("an unregistered person sees the registration lookup on Q4", () => {
    const p = withFacts({ registered_here: false });
    const q4 = buildCards(doc, p).find((c) => c.measure.number === "4")!;
    expect(nextSteps(q4, p).map((s) => s.kind)).toContain("registration");
  });

  it("drafts stay under 80 words with no banned words", () => {
    for (const m of doc.measures) {
      for (const q of DRAFT_QUESTIONS) {
        const d = draftMessage(m.number, m.title, q);
        expect(wordCount(d)).toBeLessThanOrEqual(80);
        expect(findBannedWords(d)).toEqual([]);
      }
    }
  });
});
