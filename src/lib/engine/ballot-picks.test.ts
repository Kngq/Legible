import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import { findBannedWords } from "@/lib/vocab";
import { ballotPicks, ballotReason, nextPick, REASON_LABEL, upcomingBallot } from "./ballot-picks";
import { buildFeed } from "./feed";
import { answerFact, declineFact, emptyProfile, setTopic, type Profile } from "./profile";
import type { DocumentData } from "./types";

const t0 = "2026-10-24T14:00:00.000Z";
const today = "2026-10-24";
const doc = ballot as unknown as DocumentData;
const ob = { kind: "onboarding" } as const;

function withFacts(facts: Record<string, boolean>, p: Profile = emptyProfile(t0)): Profile {
  for (const [k, v] of Object.entries(facts)) p = answerFact(p, k as never, v, ob, t0);
  return p;
}
const itemFor = (p: Profile) => upcomingBallot(buildFeed([doc], p, today).items)!;
const picks = (p: Profile) => ballotPicks(itemFor(p), p);
const nums = (list: { card: { measure: { number: string } } }[]) => list.map((x) => x.card.measure.number);

describe("ballotPicks", () => {
  it("no profile: nothing is put forward, and all nine show in ballot order", () => {
    const { recommended, others } = picks(emptyProfile(t0));
    expect(recommended).toEqual([]);
    expect(nums(others)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  });

  it("never pins a question: Q7 leads only when an answer touches it", () => {
    expect(nums(picks(withFacts({ owns_firearm: true })).recommended)).toEqual(["9"]);
    expect(nums(picks(withFacts({ rents: true })).recommended)).toEqual(["7"]);
  });

  it("answers that touch come before followed subjects", () => {
    const p = setTopic(withFacts({ buys_cannabis: true }), "elections", true, "chip", t0);
    const { recommended, others } = picks(p);
    expect(nums(recommended)).toEqual(["8", "3"]);
    expect(recommended.map((r) => r.reason.kind)).toEqual(["direct", "interest"]);
    expect(recommended.length + others.length).toBe(9);
  });

  it("a question both touching and on the list comes first among touches", () => {
    const p = setTopic(withFacts({ rents: true, buys_cannabis: true }), "cannabis_policy", true, "chip", t0);
    expect(nums(picks(p).recommended)).toEqual(["8", "7"]);
  });

  it("the BC student persona: Q4 and Q7, each with its own reason", () => {
    const { recommended } = picks(withFacts({ rents: true, owns: false, registered_here: false }));
    expect(nums(recommended)).toEqual(["4", "7"]);
    expect(recommended.map((r) => r.reason.text)).toEqual(["Because you are not registered at your address.", "Because you rent."]);
  });
});

describe("ballotReason", () => {
  const card = (p: Profile, n: string) => itemFor(p).cards.find((c) => c.measure.number === n)!;

  it("an unanswered fact that decides it reads as open", () => {
    const p = emptyProfile(t0);
    expect(ballotReason(card(p, "9"), p)).toEqual({ kind: "open", label: REASON_LABEL.open, text: "Applies if you own a firearm." });
  });

  it("an answered fact is never asked again", () => {
    const p = withFacts({ owns_firearm: false });
    expect(ballotReason(card(p, "9"), p).kind).toBe("none");
  });

  it("a fact declined twice is no longer offered", () => {
    let p = emptyProfile(t0);
    p = declineFact(p, "owns_firearm", ob, t0);
    p = declineFact(p, "owns_firearm", ob, t0);
    expect(ballotReason(card(p, "9"), p).kind).toBe("none");
  });

  it("questions for every voter say so", () => {
    const p = emptyProfile(t0);
    expect(ballotReason(card(p, "1"), p).kind).toBe("everyone");
  });

  it("labels and every reason pass the word lint", () => {
    for (const l of Object.values(REASON_LABEL)) expect(findBannedWords(l)).toEqual([]);
    const p = setTopic(withFacts({ rents: true, owns_firearm: true, state_employee: true }), "taxes", true, "chip", t0);
    for (const c of itemFor(p).cards) expect(findBannedWords(ballotReason(c, p).text)).toEqual([]);
  });
});

describe("nextPick", () => {
  it("walks put-forward questions, then the rest, and ends after the last", () => {
    const p = withFacts({ rents: true, buys_cannabis: true });
    const item = itemFor(p);
    expect(nextPick(item, p, "ballot-2026-q7")!.card.measure.number).toBe("8");
    expect(nextPick(item, p, "ballot-2026-q8")!.card.measure.number).toBe("1");
    expect(nextPick(item, p, "ballot-2026-q9")).toBeUndefined();
  });
});
