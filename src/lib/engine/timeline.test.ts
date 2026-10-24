import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import civicData from "@/data/civic-ma.json";
import { findBannedWords } from "@/lib/vocab";
import { civicFeed, type CivicItem } from "./civic";
import { buildFeed } from "./feed";
import { answerFact, emptyProfile, type Profile } from "./profile";
import { buildTimeline } from "./timeline";
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
  it("orders by group then date, and folds the ballot into Election Day", () => {
    const t = timelineFor(emptyProfile(t0));
    const groups = t.map((e) => e.group);
    expect(groups).toEqual([...groups].sort((a, b) => ["today", "week", "later", "undated"].indexOf(a) - ["today", "week", "later", "undated"].indexOf(b)));
    const dated = t.filter((e) => e.date).map((e) => e.date!);
    expect(dated).toEqual([...dated].sort());
    expect(t.some((e) => e.kind === "doc" && e.item.doc.id === "ballot-2026")).toBe(false);
    const election = t.find((e) => e.kind === "civic" && e.card.item.kind === "election");
    expect(election?.kind === "civic" && election.ballot?.doc.id).toBe("ballot-2026");
  });

  it("empty profile: no 0-of-9 count, and nothing that only matches someone else", () => {
    const t = timelineFor(emptyProfile(t0));
    for (const e of t) expect(e.forYou).not.toMatch(/\b0 of\b/);
    expect(t.some((e) => e.kind === "civic" && e.card.item.id === "ma-2026-registration-deadline")).toBe(false);
  });

  it("BC student who is not registered: the registration deadline is today and names why", () => {
    const t = timelineFor(withFacts({ rents: true, registered_here: false }));
    const reg = t.find((e) => e.kind === "civic" && e.card.item.id === "ma-2026-registration-deadline")!;
    expect(reg.group).toBe("today");
    expect(reg.forYou).toMatch(/^For you, because you .*register/);
    expect(reg.touches).toBe(true);
    const election = t.find((e) => e.kind === "civic" && e.card.item.kind === "election")!;
    expect(election.forYou).toMatch(/touch your answers: Election Day registration; Single-family homes/);
  });

  it("every app-written line passes the word lint", () => {
    for (const p of [emptyProfile(t0), withFacts({ rents: true, registered_here: false, kids_in_schools: true }, "cambridge")]) {
      for (const e of timelineFor(p)) expect(findBannedWords(e.forYou), e.forYou).toEqual([]);
    }
  });
});
