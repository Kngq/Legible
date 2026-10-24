import { describe, expect, it } from "vitest";
import civic from "./civic-ma.json";
import seed from "../../data/legible_ma_seed.json";
import type { CivicItem } from "@/lib/engine/civic";
import { FACT_IDS, TOPIC_IDS, findBannedWords } from "@/lib/vocab";

const items = civic as unknown as CivicItem[];

describe("civic-ma data", () => {
  it("verifies every election date word for word in the official booklet", () => {
    const quoted = items.filter((i) => i.check.kind === "quote");
    expect(quoted.map((i) => i.id).sort()).toEqual(["ma-2026-early-voting", "ma-2026-election-day", "ma-2026-mail-ballot-deadline", "ma-2026-registration-deadline"]);
    for (const i of quoted) if (i.check.kind === "quote") expect(i.check.quote.status, i.id).toBe("verified");
  });

  it("cites only official sources", () => {
    for (const i of items) expect(new URL(i.source.url).host, i.id).toMatch(/(sec\.state\.ma\.us|malegislature\.gov|cambridgema\.gov|cpsd\.us)$/);
  });

  it("carries no ballot questions and no illustrative agenda items", () => {
    expect(items.some((i) => /^ma-2026-q\d$/.test(i.id))).toBe(false);
    expect(JSON.stringify(items)).not.toMatch(/illustrative|agenda_highlights/i);
  });

  it("marks meetings without a posted date as schedule-based", () => {
    for (const i of items.filter((x) => x.body === "Cambridge School Committee")) expect(i.check.kind).toBe("schedule");
  });

  it("uses only Nine's vocabularies and no banned words", () => {
    for (const i of items) {
      for (const t of i.topics) expect(TOPIC_IDS).toContain(t);
      for (const r of i.touches) expect(FACT_IDS).toContain(r.fact);
      expect(findBannedWords(`${i.title} ${i.summary}`), i.id).toEqual([]);
    }
  });

  it("accounts for every seed item", () => {
    expect(seed.civic_items.length).toBe(26);
  });
});
