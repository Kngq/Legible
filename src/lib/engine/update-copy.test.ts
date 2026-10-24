import { describe, expect, it } from "vitest";
import civicData from "@/data/civic-ma.json";
import { findBannedWords } from "@/lib/vocab";
import { civicCard, type CivicItem } from "./civic";
import { answerFact, emptyProfile } from "./profile";
import ballot from "@/data/ballot-2026.json";
import { buildCards } from "./cards";
import type { DocumentData } from "./types";
import { ballotWhyLine, firstSentence, friendlyWhen, joinAnd, KIND_LABEL, questionBecause, whoLine, whyLine } from "./update-copy";

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

describe("ballot wording", () => {
  const doc = ballot as unknown as DocumentData;
  const withFacts = (facts: Record<string, boolean>) => {
    let p = emptyProfile(t0);
    for (const [k, v] of Object.entries(facts)) p = answerFact(p, k as never, v, { kind: "onboarding" }, t0);
    return buildCards(doc, p);
  };

  it("joins in plain English", () => {
    expect(joinAnd([])).toBe("");
    expect(joinAnd(["a"])).toBe("a");
    expect(joinAnd(["a", "b"])).toBe("a and b");
    expect(joinAnd(["a", "b", "c"])).toBe("a, b and c");
  });

  it("names the answer behind each touching question", () => {
    const q2 = withFacts({ state_employee: true }).find((c) => String(c.measure.number) === "2")!;
    expect(q2.relevance).toBe("touches");
    expect(questionBecause(q2)).toBe("Because you work for the state");
  });

  it("says why the ballot card is shown, once per answer", () => {
    const cards = withFacts({ state_employee: true, rents: true });
    const line = ballotWhyLine(cards)!;
    expect(line).toMatch(/^You told us .*you work for the state/);
    expect(line).toMatch(/you rent/);
    expect(line.match(/you rent/g)).toHaveLength(1);
    expect(findBannedWords(line)).toEqual([]);
  });

  it("says nothing when no question touches the person", () => {
    expect(ballotWhyLine(withFacts({}))).toBeNull();
  });
});

describe("brief card wording", () => {
  it("takes the first sentence without breaking at a.m. or p.m.", () => {
    expect(firstSentence("Registration closes today. Online registration stays open until 11:59 p.m.")).toBe("Registration closes today.");
    expect(firstSentence("Polls are open from 7 a.m. to 8 p.m. The ballot has nine statewide questions.")).toBe(
      "Polls are open from 7 a.m. to 8 p.m. The ballot has nine statewide questions.",
    );
    expect(firstSentence("One sentence only.")).toBe("One sentence only.");
  });

  it("says who each shipped item applies to, from its own data", () => {
    expect(whoLine(card("ma-2026-election-day"))).toBe("Every voter in Massachusetts");
    expect(whoLine(card("ma-2026-registration-deadline"))).toBe("People in Massachusetts who are not registered at their address");
    for (const i of items) {
      const line = whoLine(card(i.id));
      expect(line).not.toMatch(/\byou\b|\byour\b/);
      expect(findBannedWords(line)).toEqual([]);
    }
  });

  it("joins several facts with or", () => {
    const zoning = items.find((i) => i.touches.length > 1)!;
    expect(whoLine(card(zoning.id))).toMatch(/ who .+ or .+/);
  });
});
