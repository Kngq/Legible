import { describe, expect, it } from "vitest";
import civic from "@/data/civic-ma.json";
import { civicFeed, timing, type CivicItem } from "./civic";
import { answerFact, emptyProfile, setTopic, type Profile } from "./profile";

const items = civic as unknown as CivicItem[];
const t0 = "2026-10-24T14:00:00.000Z";
const ob = { kind: "onboarding" } as const;
const today = "2026-10-24";
const byId = (id: string) => items.find((i) => i.id === id)!;

describe("civic timing", () => {
  it("knows today's deadline, an open window, an upcoming meeting, and an undated bill", () => {
    expect(timing(byId("ma-2026-registration-deadline"), today)).toEqual({ timing: "today", days: 0 });
    expect(timing(byId("ma-2026-early-voting"), today)).toEqual({ timing: "open", days: 6 });
    expect(timing(byId("cam-council-2026-10-26"), today)).toEqual({ timing: "upcoming", days: 2 });
    expect(timing(byId("ma-194-s2581"), today)).toEqual({ timing: "ongoing" });
    expect(timing(byId("ma-2026-early-voting"), "2026-10-31").timing).toBe("past");
  });
});

describe("civic feed", () => {
  it("shows Cambridge meetings only to Cambridge", () => {
    const boston: Profile = { ...emptyProfile(t0), townId: "boston" };
    const cambridge: Profile = { ...emptyProfile(t0), townId: "cambridge" };
    expect(civicFeed(items, boston, today).some((c) => c.item.place.kind === "town")).toBe(false);
    expect(civicFeed(items, cambridge, today).some((c) => c.item.id === "cam-council-2026-10-26")).toBe(true);
  });

  it("puts today's registration deadline first for someone not registered at their address", () => {
    const p = answerFact({ ...emptyProfile(t0), townId: "cambridge" }, "registered_here", false, ob, t0);
    const [first] = civicFeed(items, p, today);
    expect(first.item.id).toBe("ma-2026-registration-deadline");
    expect(first.relevance).toBe("touches");
    expect(first.because).toEqual([{ fact: "registered_here", value: false }]);
  });

  it("leaves the registration deadline unranked for someone already registered", () => {
    const p = answerFact(emptyProfile(t0), "registered_here", true, ob, t0);
    const c = civicFeed(items, p, today).find((x) => x.item.id === "ma-2026-registration-deadline")!;
    expect(c.relevance).toBe("probably_not");
  });

  it("marks the cellphone bill and School Committee as touching parents, and follows topics", () => {
    let p = answerFact({ ...emptyProfile(t0), townId: "cambridge" }, "kids_in_schools", true, ob, t0);
    p = setTopic(p, "housing_costs", true, "chip", t0);
    const feed = civicFeed(items, p, today);
    expect(feed.filter((c) => c.relevance === "touches").map((c) => c.item.id)).toEqual(
      expect.arrayContaining(["ma-194-s2581", "cam-school-committee-2026-11-17"]),
    );
    expect(feed.find((c) => c.item.id === "ma-194-h4699")!.onYourList).toBe(true);
  });

  it("drops items whose date has passed", () => {
    expect(civicFeed(items, emptyProfile(t0), "2026-11-04").some((c) => c.item.kind === "deadline")).toBe(false);
  });
});
