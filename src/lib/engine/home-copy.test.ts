import { describe, expect, it } from "vitest";
import ballot from "@/data/ballot-2026.json";
import civicData from "@/data/civic-ma.json";
import { asksHowToVote, findBannedWords } from "@/lib/vocab";
import { civicCard, civicFeed, type CivicItem } from "./civic";
import { buildFeed } from "./feed";
import { actionsFor, billNumber, cardHeader, civicRelevance, dateLine, explanation, headline, homeSections, relevanceOf } from "./home-copy";
import { answerFact, emptyProfile, setTopic, type Profile } from "./profile";
import { buildTimeline } from "./timeline";
import type { DocumentData } from "./types";

const t0 = "2026-10-24T14:00:00.000Z";
const today = "2026-10-24";
const docs = [ballot as unknown as DocumentData];
const items = civicData as unknown as CivicItem[];
const card = (id: string, p: Profile = emptyProfile(t0)) => civicCard(items.find((i) => i.id === id)!, p, today);
const withFacts = (facts: Record<string, boolean>, townId?: string): Profile => {
  let p: Profile = { ...emptyProfile(t0), townId };
  for (const [k, v] of Object.entries(facts)) p = answerFact(p, k as never, v, { kind: "onboarding" }, t0);
  return p;
};
const sections = (p: Profile) => {
  const feed = buildFeed(docs, p, today).items;
  const civic = civicFeed(items, p, today);
  return homeSections(buildTimeline(feed, civic, today), buildTimeline(feed, civic, today, { includeOthers: true }));
};

describe("headline and explanation", () => {
  it("reads like a sentence, keeps the bill number in the date line, and never calls a bill law", () => {
    const c = card("ma-194-s2836");
    expect(headline(c)).toBe("Massachusetts is considering changes to housing rules");
    expect(billNumber(c.item.title)).toBe("S.2836");
    const e = buildTimeline([], civicFeed(items, withFacts({ rents: true }), today), today).find((x) => x.key === "c:ma-194-s2836")!;
    expect(dateLine(e, today)).toBe("S.2836 · Under consideration");
    expect(cardHeader(c)).toEqual({ meta: "Housing · S.2836", status: "Proposal under review" });
  });

  it("keeps committee history off the card", () => {
    for (const i of items.filter((x) => x.kind === "bill")) {
      const text = explanation(card(i.id));
      expect(text).not.toMatch(/committee|Ways and Means|reported/i);
      expect(text.split(/(?<=\.)\s/).length).toBeLessThanOrEqual(2);
    }
  });

  it("puts the date in the header and how soon in the status chip", () => {
    expect(cardHeader(card("ma-2026-mail-ballot-deadline"))).toEqual({ meta: "Deadline · October 27", status: "In 3 days" });
    expect(cardHeader(card("ma-2026-registration-deadline")).status).toBe("Today");
  });

  it("says registration closes today only on the day it does", () => {
    expect(explanation(card("ma-2026-registration-deadline"))).toMatch(/^Registration closes today\./);
  });

  it("names a meeting by who meets and when", () => {
    expect(headline(card("cam-council-2026-10-26"))).toBe("Cambridge City Council meets Monday, October 26");
  });
});

describe("relevance", () => {
  it("explains a deadline directly, from the one answer that matters, with the eligibility caveat", () => {
    const r = civicRelevance(card("ma-2026-registration-deadline", withFacts({ registered_here: false, rents: true, state_employee: true })))!;
    expect(r.kind).toBe("direct");
    expect(r.text).toBe("You mentioned that you aren't registered at your current address. This deadline is for people in that situation, if you're eligible to vote.");
    expect(r.text).not.toMatch(/\byou rent\b|work for the state/);
  });

  it("explains a bill as a potential, indirect connection", () => {
    const r = civicRelevance(card("ma-194-s2836", withFacts({ rents: true })))!;
    expect(r.kind).toBe("potential");
    expect(r.text).toBe("You mentioned that you rent. This proposal could influence housing options in your community over time.");
    expect(r.basis.join(" ")).toMatch(/not law/);
  });

  it("calls a followed subject an interest, not an effect", () => {
    const p = setTopic(emptyProfile(t0), "schools", true, "chip");
    expect(civicRelevance(card("ma-194-s2581", p))?.kind).toBe("interest");
  });

  it("invents nothing when there is no connection", () => {
    expect(civicRelevance(card("ma-194-h4699"))).toBeNull();
  });

  it("never assumes a renter does not own: owning stays an open question", () => {
    const r = civicRelevance(card("ma-194-h1482", withFacts({ rents: true })));
    expect(r?.kind).toBe("open");
    expect(r?.text).toBe("May be relevant if you own your home.");
  });
});

describe("actions", () => {
  it("names what the button does and only links where a destination exists", () => {
    const p = withFacts({ registered_here: false });
    const civic = civicFeed(items, p, today);
    const t = buildTimeline(buildFeed(docs, p, today).items, civic, today, { includeOthers: true });
    const by = (k: string) => actionsFor(t.find((e) => e.key === k)!);
    expect(by("c:ma-2026-registration-deadline").primary.label).toBe("Check your registration");
    expect(by("c:ma-2026-election-day").primary).toEqual({ label: "Explore your ballot", to: { open: "doc" } });
    expect(by("c:ma-194-s2836").primary).toEqual({ label: "Explore proposal", to: { open: "item" } });
    expect(by("c:ma-194-s2836").secondary?.label).toBe("Read original bill");
  });
});

describe("homeSections", () => {
  it("puts dated items that apply first, keeps every section distinct", () => {
    const s = sections(withFacts({ registered_here: false, rents: true }, "cambridge"));
    const keys = [...s.attention, ...s.affect].map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(s.attention.map((e) => e.key)).toContain("c:ma-2026-registration-deadline");
    expect(s.attention.every((e) => e.days !== undefined)).toBe(true);
    expect(s.affect.map((e) => e.key)).toContain("c:ma-194-s2836");
  });

  it("leaves out a deadline that is for people in another situation", () => {
    const s = sections(withFacts({ registered_here: true }));
    expect(s.attention.map((e) => e.key)).not.toContain("c:ma-2026-registration-deadline");
  });

  it("orders direct before potential before interests", () => {
    const p = setTopic(withFacts({ rents: true, kids_in_schools: false }, "cambridge"), "schools", true, "chip");
    const kinds = sections(p).affect.map((e) => relevanceOf(e)?.kind ?? "open");
    const order = { direct: 0, potential: 1, interest: 2, open: 3 } as const;
    expect(kinds).toEqual([...kinds].sort((a, b) => order[a] - order[b]));
  });
});

it("all Home copy passes the word lint and never asks how to vote", () => {
  const p = withFacts({ registered_here: false, rents: true, kids_in_schools: true, state_employee: true }, "cambridge");
  const s = sections(p);
  for (const e of [...s.attention, ...s.affect]) {
    const texts = [e.kind === "civic" ? headline(e.card) : "", e.kind === "civic" ? explanation(e.card) : "", relevanceOf(e)?.text ?? "", ...(relevanceOf(e)?.basis ?? []), actionsFor(e).primary.label, actionsFor(e).secondary?.label ?? ""];
    for (const t of texts) {
      expect(findBannedWords(t), t).toEqual([]);
      expect(asksHowToVote(t)).toBe(false);
    }
  }
});
