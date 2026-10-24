import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import { findBannedWords } from "@/lib/vocab";
import { buildGuide, firstSentence, guideTopics } from "./ballot-guide";
import { buildCards } from "./cards";
import { quoteFor } from "./measure-page";
import { answerFact, emptyProfile } from "./profile";
import type { DocumentData } from "./types";

const t0 = "2026-10-24T14:00:00.000Z";
const doc = ballot as unknown as DocumentData;
const student = () => {
  let p = emptyProfile(t0);
  p = answerFact(p, "rents", true, { kind: "onboarding" }, t0);
  return answerFact(p, "registered_here", false, { kind: "onboarding" }, t0);
};

describe("buildGuide", () => {
  it("ranks what touches the person first and numbers ranks 1..9", () => {
    const g = buildGuide(buildCards(doc, student()), "relevance", { kind: "all" });
    expect(g.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(g.slice(0, 2).map((e) => e.card.measure.number).sort()).toEqual(["4", "7"]);
    expect(g[0].ifYou).toMatch(/^If you/);
  });

  it("ballot order sorts by question number and keeps each rank", () => {
    const g = buildGuide(buildCards(doc, student()), "ballot", { kind: "all" });
    expect(g.map((e) => e.card.measure.number)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(g.find((e) => e.card.measure.number === "4")!.rank).toBeLessThanOrEqual(2);
  });

  it("filters to what affects the person, or one topic", () => {
    const cards = buildCards(doc, student());
    expect(buildGuide(cards, "relevance", { kind: "touches" }).length).toBe(2);
    const topic = guideTopics(cards)[0];
    expect(buildGuide(cards, "relevance", { kind: "topic", id: topic }).every((e) => e.card.measure.topics.includes(topic))).toBe(true);
  });

  it("with no answers, nothing claims to reach the person", () => {
    for (const e of buildGuide(buildCards(doc, emptyProfile(t0)), "relevance", { kind: "all" })) expect(e.ifYou).toBeNull();
  });

  it("every line it shows cites a real quote, and the cost is verbatim official text", () => {
    for (const e of buildGuide(buildCards(doc, student()), "relevance", { kind: "all" })) {
      const m = e.card.measure;
      for (const s of [e.plain, e.passes, e.fails].filter(Boolean)) {
        expect(quoteFor(m, s!.quoteId), `${m.id} ${s!.quoteId}`).toBeDefined();
        if (s !== e.passes && s !== e.fails) expect(findBannedWords(s!.text)).toEqual([]);
      }
      if (e.cost) expect(m.fiscal!.text.startsWith(e.cost)).toBe(true);
      expect(e.passes?.text).toBe(m.outcomes.yes?.text);
      expect(e.fails?.text).toBe(m.outcomes.no?.text);
    }
  });
});

it("firstSentence stops at the first sentence end", () => {
  expect(firstSentence("A b. C d.")).toBe("A b.");
  expect(firstSentence("No end")).toBe("No end");
});
