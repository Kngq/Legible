import { describe, expect, it } from "vitest";
import { LIFE_AREAS, ONBOARDING_FACTS, SENSITIVE_FACTS } from "@/lib/vocab";
import { personalization } from "./personalization";
import { answerArea, answerFact, confirmTopics, declineArea, emptyProfile, skipFact, type Profile } from "./profile";

const t0 = "2026-10-24T14:00:00.000Z";
const ob = { kind: "onboarding" } as const;

describe("life areas", () => {
  it("cover every onboarding fact exactly once and no sensitive fact", () => {
    const inAreas = LIFE_AREAS.flatMap((a) => a.facts);
    expect([...inAreas].sort()).toEqual([...ONBOARDING_FACTS].sort());
    expect(inAreas.some((f) => SENSITIVE_FACTS.includes(f))).toBe(false);
  });

  it("records picked facts as yes and the rest of the screen as no", () => {
    const p = answerArea(emptyProfile(t0), ["rents", "owns"], ["rents"], ob, t0);
    expect(p.facts.rents?.value).toBe(true);
    expect(p.facts.owns?.value).toBe(false);
  });
});

describe("personalization meter", () => {
  it("has the same seven items for everyone: town, five life areas, topics", () => {
    const m = personalization(emptyProfile(t0));
    expect(m.total).toBe(7);
    expect(m.percent).toBe(0);
  });

  it("reaches 100% inside onboarding, with no card questions needed", () => {
    let p: Profile = { ...confirmTopics(emptyProfile(t0), t0), townId: "somerville" };
    for (const a of LIFE_AREAS) p = answerArea(p, a.facts, [], ob, t0);
    expect(personalization(p).percent).toBe(100);
  });

  it("counts Prefer not to say as done, but not Skip for now or a half-answered area", () => {
    expect(personalization(declineArea(emptyProfile(t0), ["rents", "owns"], ob, t0)).done).toBe(1);
    expect(personalization(skipFact(emptyProfile(t0), "rents", ob, t0)).done).toBe(0);
    expect(personalization(answerFact(emptyProfile(t0), "rents", true, ob, t0)).done).toBe(0);
  });
});
