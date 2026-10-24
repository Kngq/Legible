import { describe, expect, it } from "vitest";
import { answerFact, canAskInCard, emptyProfile, factValues, parseProfile, setTopic, skipFact, topicIds } from "./profile";

const t0 = "2026-10-24T14:00:00.000Z";

describe("profile schema", () => {
  it("records where and when each fact was answered", () => {
    const p = answerFact(emptyProfile(t0), "rents", true, { kind: "onboarding" }, t0);
    expect(p.facts.rents).toEqual({ value: true, source: { kind: "onboarding" }, at: t0 });
    expect(factValues(p)).toEqual({ rents: true });
  });

  it("asks a skipped fact at most once more, inside a card", () => {
    let p = skipFact(emptyProfile(t0), "owns_firearm", { kind: "onboarding" }, t0);
    expect(canAskInCard(p, "owns_firearm")).toBe(true);
    p = skipFact(p, "owns_firearm", { kind: "card", documentId: "ballot-2026", measureId: "ballot-2026-q9" }, t0);
    expect(p.skipped.owns_firearm?.times).toBe(2);
    expect(canAskInCard(p, "owns_firearm")).toBe(false);
  });

  it("answering clears a skip; topics store how they were chosen but never the typed text", () => {
    let p = skipFact(emptyProfile(t0), "rents", { kind: "onboarding" }, t0);
    p = answerFact(p, "rents", false, { kind: "open_questions" }, t0);
    expect(p.skipped.rents).toBeUndefined();
    p = setTopic(p, "housing_costs", true, "typed", t0);
    expect(topicIds(p)).toEqual(["housing_costs"]);
    expect(JSON.stringify(p)).not.toContain("apartment");
  });

  it("drops unknown ids from storage and rejects other versions", () => {
    const raw = { version: 1, createdAt: t0, updatedAt: t0, facts: { rents: { value: true, source: { kind: "edit" }, at: t0 }, bogus: { value: true } }, topics: { taxes: { via: "chip", at: t0 }, nope: { via: "chip", at: t0 } }, skipped: {} };
    const p = parseProfile(raw)!;
    expect(Object.keys(p.facts)).toEqual(["rents"]);
    expect(topicIds(p)).toEqual(["taxes"]);
    expect(parseProfile({ ...raw, version: 2 })).toBeNull();
    expect(parseProfile("junk")).toBeNull();
  });
});
