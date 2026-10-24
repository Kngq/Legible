import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import civic from "@/data/civic-ma.json";
import { findBannedWords } from "@/lib/vocab";
import { civicFeed, type CivicItem } from "./civic";
import { civicMeta, timingTag } from "./civic-copy";
import { buildFeed } from "./feed";
import { answerFact, emptyProfile } from "./profile";
import { civicUpNext, relatedCivic, relatedMeasures } from "./related";
import type { DocumentData } from "./types";

const t0 = "2026-10-24T14:00:00.000Z";
const TODAY = "2026-10-24";
const BALLOT = ballot as unknown as DocumentData;
const ITEMS = civic as unknown as CivicItem[];
const ob = { kind: "onboarding" } as const;
const q = (n: string) => BALLOT.measures.find((m) => m.number === n)!;

describe("related content", () => {
  const p = { ...answerFact(emptyProfile(t0), "registered_here", false, ob, t0), townId: "cambridge" };
  const cards = civicFeed(ITEMS, p, TODAY);
  const feed = buildFeed([BALLOT], p, TODAY);

  it("Q4 links to the registration deadline first (shared fact), and back", () => {
    expect(relatedCivic(q("4"), cards)[0].item.id).toBe("ma-2026-registration-deadline");
    const reg = ITEMS.find((i) => i.id === "ma-2026-registration-deadline")!;
    expect(relatedMeasures(reg, feed.items)[0].card.measure.number).toBe("4");
  });

  it("Q7 links to housing bills, not to unrelated items", () => {
    const ids = relatedCivic(q("7"), cards).map((c) => c.item.id);
    expect(ids).toContain("ma-194-s2836");
    expect(ids).not.toContain("ma-2026-registration-deadline");
  });

  it("a deadline today that touches the person takes Up next from a vote in 10 days", () => {
    expect(civicUpNext(feed.upNext, cards, TODAY)?.item.id).toBe("ma-2026-registration-deadline");
    const registered = { ...answerFact(emptyProfile(t0), "registered_here", true, ob, t0) };
    expect(civicUpNext(buildFeed([BALLOT], registered, TODAY).upNext, civicFeed(ITEMS, registered, TODAY), TODAY)).toBeNull();
  });

  it("civic wording is plain and neutral", () => {
    for (const c of cards) {
      expect(findBannedWords(timingTag(c) + " " + civicMeta(c))).toEqual([]);
      expect(timingTag(c)).not.toMatch(/hurry|now|last chance/i);
    }
    expect(timingTag(cards.find((c) => c.item.id === "ma-2026-registration-deadline")!)).toBe("Today");
  });
});
