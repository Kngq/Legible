import { describe, expect, it } from "vitest";
import civicData from "@/data/civic-ma.json";
import { findBannedWords } from "@/lib/vocab";
import { civicCard, type CivicItem } from "./civic";
import { answerFact, emptyProfile } from "./profile";
import { friendlyWhen, KIND_LABEL, whyLine } from "./update-copy";

const t0 = "2026-10-24T14:00:00.000Z";
const today = "2026-10-24";
const items = civicData as unknown as CivicItem[];
const card = (id: string, p = emptyProfile(t0)) => civicCard(items.find((i) => i.id === id)!, p, today);

describe("friendlyWhen", () => {
  it("states dates in Boston time, dropping :00", () => {
    expect(friendlyWhen(card("ma-2026-mail-ballot-deadline"))).toBe("October 27 · 5 PM");
    expect(friendlyWhen(card("ma-2026-registration-deadline"))).toBe("October 24 · 11:59 PM");
    expect(friendlyWhen(card("ma-2026-election-day"))).toBe("November 3 · 7 AM");
  });

  it("states a voting window as a range", () => {
    expect(friendlyWhen(card("ma-2026-early-voting"))).toBe("October 17–30");
  });

  it("says plainly when a bill has no vote scheduled", () => {
    expect(friendlyWhen(card("ma-194-s2836"))).toBe("No vote scheduled yet");
  });
});

describe("whyLine", () => {
  it("names the answer that matched", () => {
    const p = answerFact(emptyProfile(t0), "registered_here", false, { kind: "onboarding" }, t0);
    expect(whyLine(card("ma-2026-registration-deadline", p))).toBe("You told us you are not registered at your address.");
  });

  it("is null for items shown to everyone", () => {
    expect(whyLine(card("ma-2026-election-day"))).toBeNull();
  });
});

it("labels and lines pass the word lint", () => {
  for (const l of Object.values(KIND_LABEL)) expect(findBannedWords(l)).toEqual([]);
});
