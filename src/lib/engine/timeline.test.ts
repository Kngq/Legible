import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import civicData from "@/data/civic-ma.json";
import { findBannedWords } from "@/lib/vocab";
import { civicFeed, type CivicItem } from "./civic";
import { buildFeed } from "./feed";
import { answerFact, emptyProfile, type Profile } from "./profile";
import { LIFE_AREAS } from "@/lib/vocab";
import { areasThatMatter, buildTimeline, entryFacts, EVERYONE_SHOWN, forYouGroups, MAYBE_SHOWN, relevanceScore, urgencyScore, WEIGHTS } from "./timeline";
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
    for (const r of new Set(t.map((e) => e.relevance))) {
      const days = t.filter((e) => e.relevance === r).map((e) => e.days!);
      expect(days).toEqual([...days].sort((a, b) => a - b));
    }
  });

  it("empty profile: no 0-of-9 count, and an item tied to an unanswered fact only ever might apply", () => {
    const t = timelineFor(emptyProfile(t0));
    for (const e of t) expect(e.forYou).not.toMatch(/\b0 of\b/);
    const reg = t.find((e) => e.kind === "civic" && e.card.item.id === "ma-2026-registration-deadline")!;
    expect(reg.level).toBe("maybe");
    expect(reg.touches).toBe(false);
    expect(reg.forYou).toMatch(/^Applies if you are not registered at your address\.$/);
  });

  it("Election Day stays for everyone when the ballot only might apply", () => {
    const election = timelineFor(emptyProfile(t0)).find((e) => e.kind === "civic" && e.card.item.kind === "election")!;
    expect(election.level).toBe("everyone");
    const renter = timelineFor(withFacts({ rents: true })).find((e) => e.kind === "civic" && e.card.item.kind === "election")!;
    expect(renter.level).toBe("touches");
  });

  it("an answer settles it: matching makes it touch, the opposite answer drops it", () => {
    const find = (p: Profile) => timelineFor(p).find((e) => e.kind === "civic" && e.card.item.id === "ma-2026-registration-deadline");
    expect(find(withFacts({ registered_here: false }))?.level).toBe("touches");
    expect(find(withFacts({ registered_here: true }))).toBeUndefined();
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

  it("includeOthers adds the remaining local and state items below what touches the person", () => {
    const p = withFacts({ rents: true, registered_here: false }, "cambridge");
    const all = buildTimeline(buildFeed(docs, p, today).items, civicFeed(civic, p, today), today, { includeOthers: true });
    expect(all.length).toBeGreaterThan(timelineFor(p).length);
    expect(all.some((e) => e.kind === "civic" && e.card.item.kind === "meeting")).toBe(true);
    // Anything that touches the person still ranks above every added item.
    const lastTouching = all.map((e) => e.touches).lastIndexOf(true);
    const firstOther = all.findIndex((e) => e.relevance === relevanceScore("other"));
    expect(lastTouching).toBeLessThan(firstOther);
  });

  it("every app-written line passes the word lint", () => {
    for (const p of [emptyProfile(t0), withFacts({ rents: true, registered_here: false, kids_in_schools: true }, "cambridge")]) {
      for (const e of timelineFor(p)) expect(findBannedWords(e.forYou), e.forYou).toEqual([]);
    }
  });
});

describe("forYouGroups", () => {
  it("is never empty for someone who skipped the questions", () => {
    const { personal, maybe, everyone } = forYouGroups(timelineFor(emptyProfile(t0)));
    expect(personal).toHaveLength(0);
    expect(maybe.length + everyone.length).toBeGreaterThan(0);
    expect(maybe.length).toBeLessThanOrEqual(MAYBE_SHOWN);
    expect(everyone.length).toBeLessThanOrEqual(EVERYONE_SHOWN);
  });

  it("groups by level with no overlap, keeping the timeline's order", () => {
    for (const p of [emptyProfile(t0), withFacts({ registered_here: false }, "cambridge"), withFacts({ rents: true, drives: true }, "cambridge")]) {
      const t = timelineFor(p);
      const { personal, maybe, everyone } = forYouGroups(t);
      expect(personal.every((e) => e.level === "touches" || e.level === "list")).toBe(true);
      expect(maybe.every((e) => e.level === "maybe")).toBe(true);
      expect(everyone.every((e) => e.level === "everyone")).toBe(true);
      for (const g of [personal, maybe, everyone]) expect(g.map((e) => e.key)).toEqual(t.filter((e) => g.includes(e)).map((e) => e.key));
    }
  });

  it("answering moves an item from might apply to personal", () => {
    const key = "c:ma-2026-registration-deadline";
    expect(forYouGroups(timelineFor(emptyProfile(t0))).maybe.map((e) => e.key)).toContain(key);
    expect(forYouGroups(timelineFor(withFacts({ registered_here: false }))).personal.map((e) => e.key)).toContain(key);
  });
});

describe("areasThatMatter", () => {
  const everything = (p: Profile) => buildTimeline(buildFeed(docs, p, today).items, civicFeed(civic, p, today), today, { includeOthers: true });

  it("ranks areas by how many upcoming entries depend on their facts, and skips unused areas", () => {
    const t = everything({ ...emptyProfile(t0), townId: "cambridge" });
    const areas = areasThatMatter(t, LIFE_AREAS.length);
    const count = (facts: readonly string[]) => t.filter((e) => facts.some((f) => entryFacts(e).has(f as never))).length;
    for (const { area, count: n } of areas) expect(n).toBe(count(area.facts));
    expect(areas.map((a) => a.count)).toEqual([...areas.map((a) => a.count)].sort((a, b) => b - a));
    for (const area of LIFE_AREAS) if (count(area.facts) === 0) expect(areas.some((a) => a.area.id === area.id)).toBe(false);
  });

  it("follows the data: an item on a new fact lifts that fact's area", () => {
    const base = { ...emptyProfile(t0), townId: "cambridge" };
    const before = areasThatMatter(everything(base), LIFE_AREAS.length);
    const transit = LIFE_AREAS.find((a) => a.facts.includes("rides_transit"))!;
    const extra = Array.from({ length: 20 }, (_, i) => ({
      ...civic[0],
      id: `test-transit-${i}`,
      touches: [{ fact: "rides_transit" as const, when: true }],
    }));
    const after = areasThatMatter(
      buildTimeline(buildFeed(docs, base, today).items, civicFeed([...civic, ...extra], base, today), today, { includeOthers: true }),
      1,
    );
    expect(after[0].area.id).toBe(transit.id);
    expect(after[0].count).toBeGreaterThan(before.find((a) => a.area.id === transit.id)?.count ?? 0);
  });
});
