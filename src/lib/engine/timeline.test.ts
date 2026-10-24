import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import civicData from "@/data/civic-ma.json";
import { findBannedWords } from "@/lib/vocab";
import { civicFeed, type CivicItem } from "./civic";
import { buildFeed } from "./feed";
import { answerFact, emptyProfile, type Profile } from "./profile";
import { buildTimeline, relevanceScore, urgencyScore, WEIGHTS } from "./timeline";
import type { DocumentData } from "./types";

const t0 = "2026-10-24T14:00:00.000Z";
const today = "2026-10-24";
const docs = [ballot as unknown as DocumentData];
const civic = civicData as unknown as CivicItem[];

function timelineFor(p: Profile) {
  return buildTimeline(buildFeed(docs, p, today).items, civicFeed(civic, p, today), today);
}

function withFacts(facts: Record<string, boolean>, townId?: string): Profile {
  let p: Profile = { ...emptyProfile(t0), townId };
  for (const [k, v] of Object.entries(facts)) p = answerFact(p, k as never, v, { kind: "onboarding" }, t0);
  return p;
}

describe("buildTimeline", () => {
  it("sorts by score, highest first, and folds the ballot into Election Day", () => {
    const t = timelineFor(emptyProfile(t0));
    const scores = t.map((e) => e.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(t.some((e) => e.kind === "doc" && e.item.doc.id === "ballot-2026")).toBe(false);
    const election = t.find((e) => e.kind === "civic" && e.card.item.kind === "election");
    expect(election?.kind === "civic" && election.ballot?.doc.id).toBe("ballot-2026");
  });

  it("with equal relevance, sooner ranks first", () => {
    const t = timelineFor(emptyProfile(t0)).filter((e) => !e.touches && e.days !== undefined);
    const days = t.map((e) => e.days!);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it("empty profile: no 0-of-9 count, and nothing that only matches someone else", () => {
    const t = timelineFor(emptyProfile(t0));
    for (const e of t) expect(e.forYou).not.toMatch(/\b0 of\b/);
    expect(t.some((e) => e.kind === "civic" && e.card.item.id === "ma-2026-registration-deadline")).toBe(false);
  });

  it("BC student who is not registered: the registration deadline is today and names why", () => {
    const t = timelineFor(withFacts({ rents: true, registered_here: false }));
    const reg = t.find((e) => e.kind === "civic" && e.card.item.id === "ma-2026-registration-deadline")!;
    expect(reg.days).toBe(0);
    expect(reg.forYou).toMatch(/^For you, because you .*register/);
    expect(reg.touches).toBe(true);
    const election = t.find((e) => e.kind === "civic" && e.card.item.kind === "election")!;
    expect(election.forYou).toMatch(/touch your answers: Election Day registration; Single-family homes/);
  });

  it("BC student: what touches them comes before everything that only applies to everyone", () => {
    const t = timelineFor(withFacts({ rents: true, registered_here: false }));
    const firstEveryone = t.findIndex((e) => !e.touches);
    const lastTouching = t.map((e) => e.touches).lastIndexOf(true);
    expect(lastTouching).toBeLessThan(firstEveryone);
    expect(t[0].kind === "civic" && t[0].card.item.id).toBe("ma-2026-registration-deadline");
  });

  it("weights: touching an undated bill still outranks an everyone item due today", () => {
    const touchingBill = WEIGHTS.relevance * relevanceScore("touches") + WEIGHTS.urgency * urgencyScore(undefined);
    const everyoneToday = WEIGHTS.relevance * relevanceScore("everyone") + WEIGHTS.urgency * urgencyScore(0);
    expect(touchingBill).toBeGreaterThan(everyoneToday);
    const listedSoon = WEIGHTS.relevance * relevanceScore("list") + WEIGHTS.urgency * urgencyScore(2);
    expect(listedSoon).toBeGreaterThan(everyoneToday);
  });

  it("every app-written line passes the word lint", () => {
    for (const p of [emptyProfile(t0), withFacts({ rents: true, registered_here: false, kids_in_schools: true }, "cambridge")]) {
      for (const e of timelineFor(p)) expect(findBannedWords(e.forYou), e.forYou).toEqual([]);
    }
  });
});
