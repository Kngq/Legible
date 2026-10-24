import { describe, expect, it } from "vitest";
import { applyHome, confirmFirstRunTopics, firstRunGave, firstRunStart, skipStep } from "./onboarding";
import { answerFact, emptyProfile, factValues, parseStoredProfile, setTopic, skipFact, storedProfileJSON, type Profile } from "./profile";

const T0 = "2026-10-24T12:00:00.000Z";
const T1 = "2026-10-24T12:01:00.000Z";
const fresh = () => emptyProfile(T0);

/** Walk first run the way the screen does: town, home, subjects, each answered or skipped. */
function run(p: Profile, steps: { town?: string; home?: Parameters<typeof applyHome>[2]; topics?: Parameters<typeof setTopic>[1][] }) {
  const start = firstRunStart(p);
  let q = steps.town ? { ...p, townId: steps.town } : skipStep(p, start, "town");
  q = steps.home ? applyHome(q, start, steps.home, T1) : skipStep(q, start, "home");
  if (steps.topics) {
    for (const t of steps.topics) q = setTopic(q, t, true, "chip", T1);
    q = confirmFirstRunTopics(q, T1);
  } else q = skipStep(q, start, "topics");
  return { q, start };
}

describe("first run: new person", () => {
  it("records only the town, home, and subjects given", () => {
    const { q, start } = run(fresh(), { town: "cambridge", home: "rents", topics: ["schools", "housing_costs"] });
    expect(q.townId).toBe("cambridge");
    expect(factValues(q)).toEqual({ rents: true, owns: false });
    expect(Object.keys(q.topics).sort()).toEqual(["housing_costs", "schools"]);
    expect(q.topicsConfirmedAt).toBe(T1);
    expect(q.facts.rents?.source).toEqual({ kind: "onboarding" });
    expect(firstRunGave(q, start)).toBe(true);
  });

  it("skipping every step leaves the profile exactly as it was", () => {
    const p = fresh();
    const { q, start } = run(p, {});
    expect(q).toEqual(p);
    expect(firstRunGave(q, start)).toBe(false);
  });

  it("continuing past subjects with none picked does not mark them confirmed", () => {
    expect(confirmFirstRunTopics(fresh(), T1).topicsConfirmedAt).toBeUndefined();
  });
});

describe("first run: home answers", () => {
  const start = firstRunStart(fresh());

  it("renting and owning answer each other", () => {
    expect(factValues(applyHome(fresh(), start, "rents", T1))).toEqual({ rents: true, owns: false });
    expect(factValues(applyHome(fresh(), start, "owns", T1))).toEqual({ owns: true, rents: false });
  });

  it("living with family says nothing about renting or owning", () => {
    expect(factValues(applyHome(fresh(), start, "family", T1))).toEqual({ lives_with_family: true });
  });

  it("something else writes no answers, so nothing unanswered becomes a no", () => {
    const q = applyHome(fresh(), start, "else", T1);
    expect(factValues(q)).toEqual({});
    expect(firstRunGave(q, start)).toBe(false);
  });

  it("changing the choice replaces the earlier one with no leftovers", () => {
    const rent = applyHome(fresh(), start, "rents", T1);
    expect(factValues(applyHome(rent, start, "owns", T1))).toEqual({ owns: true, rents: false });
    expect(factValues(applyHome(rent, start, "family", T1))).toEqual({ lives_with_family: true });
    expect(factValues(applyHome(rent, start, "else", T1))).toEqual({});
  });

  it("skipping home after answering it undoes this run's answer", () => {
    const rent = applyHome(fresh(), start, "rents", T1);
    expect(factValues(skipStep(rent, start, "home"))).toEqual({});
  });

  it("restores earlier answers and skips rather than clearing them", () => {
    let p = answerFact(fresh(), "lives_with_family", false, { kind: "edit" }, T0);
    p = skipFact(p, "owns", { kind: "card", documentId: "d", measureId: "m" }, T0);
    const s = firstRunStart(p);
    const changed = applyHome(p, s, "family", T1);
    expect(changed.facts.lives_with_family?.value).toBe(true);
    const back = applyHome(changed, s, "else", T1);
    expect(back.facts).toEqual(p.facts);
    expect(back.skipped).toEqual(p.skipped);
    expect(skipStep(changed, s, "home").facts).toEqual(p.facts);
  });

  it("never touches facts outside home", () => {
    const p = answerFact(fresh(), "kids_in_schools", true, { kind: "edit" }, T0);
    const q = applyHome(p, firstRunStart(p), "else", T1);
    expect(q.facts.kids_in_schools).toEqual(p.facts.kids_in_schools);
  });
});

describe("first run: town and subjects skips", () => {
  it("skip restores the town and subjects held before the run", () => {
    let p: Profile = { ...fresh(), townId: "boston" };
    p = setTopic(p, "taxes", true, "chip", T0);
    const s = firstRunStart(p);
    const picked = setTopic({ ...p, townId: "cambridge" }, "schools", true, "chip", T1);
    expect(skipStep(picked, s, "town").townId).toBe("boston");
    expect(Object.keys(skipStep(picked, s, "topics").topics)).toEqual(["taxes"]);
  });

  it("an unchanged town is not counted as something given", () => {
    const p = { ...fresh(), townId: "boston" };
    expect(firstRunGave(p, firstRunStart(p))).toBe(false);
  });
});

describe("returning person and persistence", () => {
  it("a remembered profile round-trips with onboarding done, so first run is skipped", () => {
    const { q } = run(fresh(), { town: "cambridge", home: "family", topics: ["schools"] });
    const back = parseStoredProfile(storedProfileJSON(q, { remember: true, onboardingDone: true }));
    expect(back?.preferences).toEqual({ remember: true, onboardingDone: true });
    expect(back?.profile.townId).toBe("cambridge");
    expect(factValues(back!.profile)).toEqual({ lives_with_family: true });
    expect(Object.keys(back!.profile.topics)).toEqual(["schools"]);
  });

  it("reads a profile saved by the nine-question first run unchanged", () => {
    const old =
      '{"profile":{"version":1,"facts":{"rents":{"value":true,"source":{"kind":"onboarding"},"at":"2026-10-24T18:03:10.154Z"},"registered_here":{"value":false,"source":{"kind":"onboarding"},"at":"2026-10-24T18:03:10.154Z"}},"skipped":{},"topics":{},"source":"self","createdAt":"2026-10-24T18:03:10.154Z","updatedAt":"2026-10-24T20:14:00.980Z","townId":"boston"},"preferences":{"remember":true,"onboardingDone":true},"session":{}}';
    const back = parseStoredProfile(old);
    expect(back?.preferences.onboardingDone).toBe(true);
    expect(factValues(back!.profile)).toEqual({ rents: true, registered_here: false });
  });

  it("a profile saved before first run finished still shows first run", () => {
    const back = parseStoredProfile(storedProfileJSON(fresh(), { remember: true, onboardingDone: false }));
    expect(back?.preferences.onboardingDone).toBe(false);
  });

  it("unreadable storage reads as no profile", () => {
    expect(parseStoredProfile(null)).toBeNull();
    expect(parseStoredProfile("{not json")).toBeNull();
    expect(parseStoredProfile('{"profile":{"version":99}}')).toBeNull();
  });
});
