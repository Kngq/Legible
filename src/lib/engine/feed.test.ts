import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import { buildFeed, daysBetween, inFeed } from "./feed";
import { answerFact, declineArea, emptyProfile, type Profile } from "./profile";
import type { DecideBy, DocumentData } from "./types";

const t0 = "2026-10-24T14:00:00.000Z";
const TODAY = "2026-10-24";
const BALLOT = ballot as unknown as DocumentData;
const ob = { kind: "onboarding" } as const;

/** A town document built from ballot measures, so rules and quotes are real. */
function townDoc(id: string, townId: string, measures: string[], decideBy?: DecideBy, date?: string): DocumentData {
  return {
    ...BALLOT,
    id,
    title: id,
    place: { kind: "town", name: townId, townId },
    docType: "warrant",
    decideBy,
    date,
    measures: BALLOT.measures.filter((m) => measures.includes(m.number)),
  };
}

const at = (date: string): DecideBy => ({ date, who: "Town Meeting", how: "meeting" });
const ids = (docs: DocumentData[], p: Profile) => buildFeed(docs, p, TODAY).items.map((i) => i.doc.id);

describe("buildFeed", () => {
  it("keeps state documents and the profile's town only", () => {
    const docs = [BALLOT, townDoc("som", "somerville", ["7"]), townDoc("bos", "boston", ["7"])];
    expect(ids(docs, emptyProfile(t0))).toEqual(["ballot-2026"]);
    expect(ids(docs, { ...emptyProfile(t0), townId: "somerville" }).sort()).toEqual(["ballot-2026", "som"]);
    expect(inFeed(docs[2], "somerville")).toBe(false);
  });

  it("the 2026 ballot alone: one upcoming item, Up next, touches and preview from buildCards", () => {
    const p = answerFact(answerFact(emptyProfile(t0), "registered_here", false, ob, t0), "rents", true, ob, t0);
    const f = buildFeed([BALLOT], p, TODAY);
    expect(f.items).toHaveLength(1);
    expect(f.upNext?.doc.id).toBe("ballot-2026");
    expect(f.items[0]).toMatchObject({ status: "upcoming", touches: 2, total: 9, topTouching: "Election Day registration", scope: "state" });
  });

  it("decided after decideBy has passed, and decided items sort last", () => {
    const p = { ...emptyProfile(t0), townId: "somerville" };
    const past = townDoc("past", "somerville", ["7"], at("2026-05-04"));
    const f = buildFeed([past, BALLOT], p, TODAY);
    expect(f.items.map((i) => [i.doc.id, i.status])).toEqual([
      ["ballot-2026", "upcoming"],
      ["past", "decided"],
    ]);
    expect(buildFeed([BALLOT], p, "2026-11-04").items[0].status).toBe("decided");
    expect(buildFeed([BALLOT], p, "2026-11-03").items[0].status).toBe("upcoming");
  });

  it("orders upcoming by touches, then soonest decide-by, then undated by newest date", () => {
    let p: Profile = { ...emptyProfile(t0), townId: "somerville" };
    p = answerFact(p, "rents", true, ob, t0); // Q7 touches
    const docs = [
      townDoc("undated-old", "somerville", ["1"], undefined, "2026-01-01"),
      townDoc("undated-new", "somerville", ["1"], undefined, "2026-09-01"),
      townDoc("soon-no-touch", "somerville", ["1"], at("2026-10-30")),
      townDoc("late-touch", "somerville", ["7"], at("2026-12-01")),
      townDoc("early-touch", "somerville", ["7"], at("2026-11-10")),
    ];
    expect(ids(docs, p)).toEqual(["early-touch", "late-touch", "soon-no-touch", "undated-new", "undated-old"]);
  });

  it("Up next is the soonest item with touches, else the soonest upcoming", () => {
    const base: Profile = { ...emptyProfile(t0), townId: "somerville" };
    const docs = [townDoc("soon", "somerville", ["1"], at("2026-10-30")), townDoc("touch", "somerville", ["7"], at("2026-12-01"))];
    expect(buildFeed(docs, base, TODAY).upNext?.doc.id).toBe("soon");
    expect(buildFeed(docs, answerFact(base, "owns", true, ob, t0), TODAY).upNext?.doc.id).toBe("touch");
    expect(buildFeed([townDoc("x", "somerville", ["7"], at("2026-01-01"))], base, TODAY).upNext).toBeNull();
  });

  it("open questions are unsettled askFacts, grouped into life areas", () => {
    const f = buildFeed([BALLOT], emptyProfile(t0), TODAY);
    expect(f.openQuestions).toContain("owns_firearm");
    expect(f.openAreas).toEqual(["home", "work", "voting"]);
    const settled = declineArea(emptyProfile(t0), ["rents", "owns"], ob, t0);
    expect(buildFeed([BALLOT], settled, TODAY).openAreas).toEqual(["work", "voting"]);
  });

  it("daysBetween counts calendar days", () => {
    expect(daysBetween("2026-10-24", "2026-11-03")).toBe(10);
    expect(daysBetween("2026-11-03", "2026-11-03")).toBe(0);
  });
});
