// Share image tests for "Your ballot, wrapped". The fit property, the measurer, and
// the withTimeout tests are from Layla's branch (f20bfe8); content rules are new (W5).
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import towns from "@/data/towns.json";
import { FACT_DEFS, FACT_IDS, TOPIC_DEFS, TOPIC_IDS, type TopicId } from "@/lib/vocab";
import { SENSITIVE_TOPICS } from "@/lib/vocab/wrapped";
import { topicIds } from "./profile";
import { computeWrapped } from "./wrapped";
import { arbProfile, BALLOT_2026 } from "./wrapped.arbitraries";
import { defaultShareChoices, layoutShareImage, SHARE_H, SHARE_PAD, SHARE_W, shareItems, storyShareBase, turnedBounds, withTimeout, type Box, type Measure, type ShareBase, type ShareChoices } from "./wrapped-share-layout";

const RUNS = 100;
const TOWNS = towns as { id: string; name: string }[];
const BECAUSE_TEXTS = FACT_IDS.flatMap((id) => [FACT_DEFS[id].because.yes, FACT_DEFS[id].because.no]);
const BALLOT_TITLES = BALLOT_2026.measures.map((m) => m.title);

/** The share base the story builds for a profile. */
const baseFor = (p: Parameters<typeof computeWrapped>[1]): ShareBase => storyShareBase(BALLOT_2026, computeWrapped(BALLOT_2026, p), p, TOWNS);

const arbChoices = (base: ShareBase): fc.Arbitrary<ShareChoices> =>
  fc.record({ includePlace: fc.boolean(), includeTopics: fc.boolean(), picked: fc.subarray(base.followed) });

/** A measurer giving each character a width between 0.45 and 0.7 times the font size. */
const arbMeasurer: fc.Arbitrary<Measure> = fc
  .tuple(fc.double({ min: 0.45, max: 0.7, noNaN: true }), fc.double({ min: 0, max: 0.25, noNaN: true }))
  .map(([base, spread]): Measure => (text, font) => {
    let w = 0;
    for (const ch of Array.from(text)) w += Math.min(0.7, base + spread * (((ch.codePointAt(0) ?? 0) % 7) / 6)) * font.sizePx;
    return w;
  });
const noSpace = (s: string) => s.replace(/\s+/g, "");

describe("share content", () => {
  it("defaults: town off, topics off, sensitive topics unchecked", () => {
    fc.assert(
      fc.property(arbProfile, (p) => {
        const base = baseFor(p);
        const c = defaultShareChoices(base);
        expect(c.includePlace).toBe(false);
        expect(c.includeTopics).toBe(false);
        for (const t of SENSITIVE_TOPICS) expect(c.picked).not.toContain(t);
        expect(c.picked).toEqual(base.followed.filter((t) => !SENSITIVE_TOPICS.includes(t)));
        // By default the image holds no topic at all.
        const items = shareItems(base, c);
        expect(items.some((i) => i.kind === "topic" || i.kind === "topicsHeading")).toBe(false);
        expect(items.map((i) => i.kind)).toEqual(["brand", "title", "count", "countLabel", "date", "line", "footer"]);
        if (base.place) for (const { text } of items) expect(text).not.toContain(base.place);
      }),
      { numRuns: RUNS },
    );
  });

  it("topics appear only when switched on, and only the checked ones", () => {
    fc.assert(
      fc.property(arbProfile.chain((p) => fc.tuple(fc.constant(baseFor(p)), arbChoices(baseFor(p)))), ([base, choices]) => {
        const topics = shareItems(base, choices).filter((i) => i.kind === "topic").map((i) => i.text);
        const expected = choices.includeTopics ? base.followed.filter((t) => choices.picked.includes(t)).map((t) => TOPIC_DEFS[t].label) : [];
        expect(topics).toEqual(expected);
      }),
      { numRuns: RUNS },
    );
  });

  it("never holds a life fact, a decision, or the town when switched off", () => {
    fc.assert(
      fc.property(arbProfile.chain((p) => fc.tuple(fc.constant(baseFor(p)), arbChoices(baseFor(p)))), ([base, choices]) => {
        const items = shareItems(base, choices);
        for (const { text } of items) {
          for (const b of BECAUSE_TEXTS) expect(text).not.toContain(b);
          for (const t of BALLOT_TITLES) expect(text).not.toContain(t);
          expect(text).not.toMatch(/\b(vote[sd]?|yes|no|support|oppose|party)\b/i);
        }
        if (!choices.includePlace) expect(items.some((i) => i.kind === "place")).toBe(false);
        // Digits: only the year, the question count, and the date.
        const digits = items.filter((i) => !["brand", "count", "date", "footer"].includes(i.kind)).map((i) => i.text);
        for (const t of digits) expect(t).not.toMatch(/\d/);
      }),
      { numRuns: RUNS },
    );
  });

  it("the town reaches the image only after the person switches it on", () => {
    const base: ShareBase = { year: "2026", place: "Cambridge, MA", questionCount: 9, followed: [] };
    const off = defaultShareChoices(base);
    expect(shareItems(base, off).some((i) => i.text.includes("Cambridge"))).toBe(false);
    expect(shareItems(base, { ...off, includePlace: true }).filter((i) => i.kind === "place").map((i) => i.text)).toEqual(["Cambridge, MA"]);
  });

  it("never holds the person's name, whatever is switched on", () => {
    fc.assert(
      fc.property(arbProfile, fc.constantFrom("Rachel", "Layla", "Sam Lee"), (p, name) => {
        const named = { ...p, name };
        const base = baseFor(named);
        expect(JSON.stringify(base)).not.toContain(name);
        for (const { text } of shareItems(base, { includePlace: true, includeTopics: true, picked: base.followed })) expect(text).not.toContain(name);
      }),
      { numRuns: RUNS },
    );
  });

  it("a sensitive topic reaches the image only after it is checked by hand", () => {
    const base: ShareBase = { year: "2026", questionCount: 9, followed: ["housing_costs", "gun_policy", "cannabis_policy"] as TopicId[] };
    const on = { ...defaultShareChoices(base), includeTopics: true };
    expect(shareItems(base, on).filter((i) => i.kind === "topic").map((i) => i.text)).toEqual(["Housing costs"]);
    const picked = { ...on, picked: [...on.picked, "gun_policy" as TopicId] };
    expect(shareItems(base, picked).filter((i) => i.kind === "topic").map((i) => i.text)).toEqual(["Housing costs", "Gun policy"]);
  });

  it("the layout draws every item in full, inside the margins, with nothing overlapping", () => {
    const arbItems = fc
      .record({
        place: fc.option(fc.constantFrom("Manchester-by-the-Sea, MA", ...TOWNS.map((t) => `${t.name}, MA`)), { nil: undefined }),
        topics: fc.subarray([...TOPIC_IDS]),
        count: fc.constantFrom(1, 9, 12),
      })
      .map(({ place, topics, count }) => {
        const base: ShareBase = { year: "2026", ...(place ? { place } : {}), questionCount: count, dateLabel: "Decided Tuesday, November 3", followed: topics };
        return shareItems(base, { includePlace: true, includeTopics: true, picked: topics });
      });
    const overlaps = (a: Box, b: Box) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
    fc.assert(
      fc.property(arbItems, arbMeasurer, (items, measure) => {
        const L = layoutShareImage(items, measure);
        expect(L.fits).toBe(true);
        const inside = (b: Box) => {
          expect(b.x).toBeGreaterThanOrEqual(SHARE_PAD - 0.5);
          expect(b.y).toBeGreaterThanOrEqual(SHARE_PAD - 0.5);
          expect(b.x + b.w).toBeLessThanOrEqual(SHARE_W - SHARE_PAD + 0.5);
          expect(b.y + b.h).toBeLessThanOrEqual(SHARE_H - SHARE_PAD + 0.5);
        };
        const lineBoxes = L.lines.map((l) => ({ x: l.x, y: l.y, w: l.w, h: l.lineHeightPx, item: l.item }));
        const ballot = turnedBounds(L.ballot);
        [...lineBoxes, ...L.chips, ballot].forEach(inside);
        // No two lines touch; no line runs into the ballot; chips never overlap, and only hold their own text.
        for (let i = 0; i < lineBoxes.length; i++) {
          expect(overlaps(lineBoxes[i], ballot)).toBe(false);
          for (let j = i + 1; j < lineBoxes.length; j++) expect(overlaps(lineBoxes[i], lineBoxes[j])).toBe(false);
          for (const c of L.chips) if (c.item !== lineBoxes[i].item) expect(overlaps(lineBoxes[i], c)).toBe(false);
        }
        for (let i = 0; i < L.chips.length; i++) {
          expect(overlaps(L.chips[i], ballot)).toBe(false);
          for (let j = i + 1; j < L.chips.length; j++) expect(overlaps(L.chips[i], L.chips[j])).toBe(false);
        }
        // The preview lists `items`; the image draws exactly those items and nothing else.
        items.forEach((it, i) => expect(noSpace(L.lines.filter((l) => l.item === i).map((l) => l.text).join(""))).toBe(noSpace(it.text)));
        expect(new Set(L.lines.map((l) => l.item)).size).toBe(items.length);
        expect(L.chips.map((c) => items[c.item].kind).every((k) => k === "topic")).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it("the default image leaves no large empty band", () => {
    const base: ShareBase = { year: "2026", questionCount: 9, dateLabel: "Decided Tuesday, November 3", followed: [] };
    const measure: Measure = (t, f) => t.length * f.sizePx * 0.5;
    const L = layoutShareImage(shareItems(base, defaultShareChoices(base)), measure);
    const marks = [...L.lines.map((l) => [l.y, l.y + l.lineHeightPx]), [turnedBounds(L.ballot).y, turnedBounds(L.ballot).y + turnedBounds(L.ballot).h]].sort((a, b) => a[0] - b[0]);
    let gap = 0;
    for (let i = 1; i < marks.length; i++) gap = Math.max(gap, marks[i][0] - Math.max(...marks.slice(0, i).map((m) => m[1])));
    expect(gap).toBeLessThan(SHARE_H * 0.2);
  });

  it("follows the person's topic order", () => {
    fc.assert(
      fc.property(arbProfile, (p) => {
        expect(new Set(baseFor(p).followed)).toEqual(new Set(topicIds(p)));
      }),
      { numRuns: 30 },
    );
  });
});

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const after = <T,>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

  it("resolves with the inner value when it settles before the limit", async () => {
    const result = withTimeout(after(100, "done"), 500);
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe("done");
  });

  it("rejects once the limit passes", async () => {
    const settled = withTimeout(after(1000, "late"), 500).then(() => "resolved", (e: unknown) => e);
    await vi.advanceTimersByTimeAsync(500);
    const err = await settled;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/500/);
  });

  it("passes an inner rejection through and clears the limit timer", async () => {
    const boom = new Error("boom");
    const caught = withTimeout(new Promise<never>((_, reject) => setTimeout(() => reject(boom), 100)), 500).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(100);
    expect(await caught).toBe(boom);
    expect(vi.getTimerCount()).toBe(0);
  });
});
