import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { hasPart } from "@/components/icons";
import { arbTopicId } from "@/lib/engine/wrapped.arbitraries";
import { findBannedWords } from "./banned";
import { TOPIC_DEFS, TOPIC_IDS } from "./index";
import {
  CIVIC_PERSONALITIES,
  foregroundFor,
  PERSONALITY_FORBIDDEN,
  SLIDE_COLOUR_HEX,
  SLIDE_COLOURS,
  TOPIC_VISUALS,
  WHITE,
} from "./wrapped";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWholeWord = (text: string, word: string) =>
  new RegExp(`\\b${escape(word)}\\b`, "i").test(text);

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("Ballot Wrapped vocabulary", () => {
  // Feature: ballot-wrapped, Property 12: Every topic has a complete, neutral vocabulary entry
  // **Validates: Requirements 5.5, 9.1, 9.4, 9.6**
  it("Property 12: every topic has a complete, neutral vocabulary entry", () => {
    fc.assert(
      fc.property(arbTopicId, (id) => {
        const v = TOPIC_VISUALS[id];
        expect(SLIDE_COLOURS).toContain(v.colour);
        expect(v.part).toBe(TOPIC_DEFS[id].avatarPart);

        const { name, description } = CIVIC_PERSONALITIES[id];
        expect(name.length).toBeGreaterThanOrEqual(3);
        expect(name.length).toBeLessThanOrEqual(32);
        expect(name.startsWith("The ")).toBe(true);
        expect(description.length).toBeGreaterThanOrEqual(20);
        expect(description.length).toBeLessThanOrEqual(90);
        // One sentence: a single terminal full stop and no other sentence breaks.
        expect(description).toMatch(/^[^.!?]+\.$/);

        for (const text of [name, description]) {
          expect(findBannedWords(text)).toEqual([]);
          for (const w of PERSONALITY_FORBIDDEN) expect(hasWholeWord(text, w)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("has 14 distinct personality names, case-insensitive", () => {
    const names = TOPIC_IDS.map((id) => CIVIC_PERSONALITIES[id].name.toLowerCase());
    expect(TOPIC_IDS).toHaveLength(14);
    expect(new Set(names).size).toBe(14);
  });

  it("every topic visual part is a drawable avatar part", () => {
    for (const id of TOPIC_IDS) expect(hasPart(TOPIC_VISUALS[id].part)).toBe(true);
  });

  it("foregroundFor returns white only for purple", () => {
    for (const c of SLIDE_COLOURS) expect(foregroundFor(c) === WHITE).toBe(c === "purple");
  });

  it("every slide foreground has contrast of at least 4.5:1", () => {
    for (const c of SLIDE_COLOURS) {
      expect(contrast(foregroundFor(c), SLIDE_COLOUR_HEX[c])).toBeGreaterThanOrEqual(4.5);
    }
  });
});
