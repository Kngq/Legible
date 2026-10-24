import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import { onboardingFacts, personalization } from "./personalization";
import { answerFact, confirmTopics, declineFact, emptyProfile, skipFact, type Profile } from "./profile";
import type { DocumentData } from "./types";

const t0 = "2026-10-24T14:00:00.000Z";
const docs = [ballot as unknown as DocumentData];
const ob = { kind: "onboarding" } as const;

describe("personalization meter", () => {
  it("counts town, topics, and the nine facts the 2026 ballot reads", () => {
    const m = personalization(emptyProfile(t0), docs);
    expect(m.total).toBe(11);
    expect(m.percent).toBe(0);
  });

  it("onboarding asks six everyday facts the ballot uses and none it does not", () => {
    expect(onboardingFacts(docs)).toEqual(["rents", "owns", "wants_single_family", "registered_here", "votes_in_primaries", "state_employee"]);
  });

  it("reaches 72% from onboarding alone, and 100% only after the three card questions", () => {
    let p: Profile = { ...confirmTopics(emptyProfile(t0), t0), townId: "boston" };
    for (const f of onboardingFacts(docs)) p = answerFact(p, f, false, ob, t0);
    expect(personalization(p, docs).percent).toBe(72);
    const card = { kind: "card", documentId: "ballot-2026", measureId: "x" } as const;
    p = answerFact(p, "buys_cannabis", false, card, t0);
    p = answerFact(p, "public_defender_contact", false, card, t0);
    p = declineFact(p, "owns_firearm", card, t0);
    expect(personalization(p, docs).percent).toBe(100);
  });

  it("counts Prefer not to say as done but not Skip for now", () => {
    const skipped = personalization(skipFact(emptyProfile(t0), "rents", ob, t0), docs);
    const declined = personalization(declineFact(emptyProfile(t0), "rents", ob, t0), docs);
    expect(skipped.done).toBe(0);
    expect(declined.done).toBe(1);
  });
});
