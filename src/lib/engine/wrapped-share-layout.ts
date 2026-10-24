// Share image layout for the Ballot Wrapped Summary card (1080 by 1920 PNG).
// Pure and synchronous apart from withTimeout. No DOM: text width comes from an injected Measure.
// See design.md, "src/lib/engine/wrapped-share-layout.ts" and Properties 17-18.
import {
  APP_NAME,
  CIVIC_PERSONALITIES,
  SLIDE_COLOUR_HEX,
  TOPIC_DEFS,
  WRAPPED_STRINGS,
  foregroundFor,
  type SlideColour,
} from "@/lib/vocab";
import type { WrappedSummary } from "./wrapped";
import { slideColours } from "./wrapped-layout";

export const SHARE_W = 1080;
export const SHARE_H = 1920;
export const SHARE_PAD = 96;

/** The only items allowed on the Summary Slide and the Share_Image (Req 11.1, 11.2). */
export interface ShareContent {
  heading: string;
  town: string;
  topics: string[];
  personalityName: string;
  personalityDescription: string;
  appName: string;
  colour: SlideColour;
}

export interface ShareFont {
  sizePx: number;
  weight: 400 | 600 | 700;
}

/** Width in px of `text` drawn in `font`. */
export type Measure = (text: string, font: ShareFont) => number;

/**
 * One drawn line. `x` is the left edge and `y` the top of the line box
 * (draw with textAlign "left" and textBaseline "top"). `item` is the index of the
 * content item the line belongs to: heading 0, town 1, topics 2.., then personality
 * name, description, and app name.
 */
export interface ShareLine {
  text: string;
  x: number;
  y: number;
  font: ShareFont;
  lineHeightPx: number;
  item: number;
}

export interface ShareLayout {
  lines: ShareLine[];
  background: string;
  foreground: string;
}

/** Index of the Summary Slide in the fixed 8-Slide order. */
const SUMMARY_INDEX = 7;

/** Reads only the fields Req 11.2 allows: no life facts, counts, or measure content. */
export function shareContent(summary: WrappedSummary, town: string): ShareContent {
  const top = summary.topTopic;
  const personality = top ? CIVIC_PERSONALITIES[top] : undefined;
  return {
    heading: WRAPPED_STRINGS.heading,
    town,
    topics: summary.topTopics.map((t) => TOPIC_DEFS[t.id].label),
    personalityName: personality?.name ?? "",
    personalityDescription: personality?.description ?? "",
    appName: APP_NAME,
    colour: slideColours(top)[SUMMARY_INDEX],
  };
}

/** Breaks a word wider than maxWidth at characters. A lone character always forms a line. */
function breakWord(word: string, maxWidth: number, font: ShareFont, measure: Measure): string[] {
  const parts: string[] = [];
  let current = "";
  for (const ch of Array.from(word)) {
    const next = current + ch;
    if (current !== "" && measure(next, font) > maxWidth) {
      parts.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current !== "") parts.push(current);
  return parts;
}

/**
 * Greedy wrap on spaces. A single word wider than maxWidth is broken at characters,
 * so no returned line is wider than maxWidth (unless one character alone is).
 */
export function wrapText(text: string, maxWidth: number, font: ShareFont, measure: Measure): string[] {
  const words = text.split(/\s+/).filter((w) => w !== "");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (measure(candidate, font) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current !== "") lines.push(current);
    current = "";
    if (measure(word, font) <= maxWidth) {
      current = word;
    } else {
      const pieces = breakWord(word, maxWidth, font, measure);
      lines.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1] ?? "";
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

// Type scale scaled to a 1080 px canvas.
const DISPLAY = 144;
const TITLE = 72;
const BODY = 48;
const SMALL = 36;
const LINE_HEIGHT = 1.2;
const ITEM_GAP = 64; // between item groups
const TOPIC_GAP = 16; // between consecutive topic labels
const STEP = 0.9;
const MAX_STEPS = 5;

interface Item {
  text: string;
  font: ShareFont;
  gapBefore: number;
}

function itemsFor(c: ShareContent, scale: number): Item[] {
  const f = (sizePx: number, weight: ShareFont["weight"]): ShareFont => ({ sizePx: sizePx * scale, weight });
  const gap = (px: number) => px * scale;
  return [
    { text: c.heading, font: f(DISPLAY, 700), gapBefore: 0 },
    { text: c.town, font: f(TITLE, 600), gapBefore: gap(ITEM_GAP) },
    ...c.topics.map((t, i) => ({
      text: t,
      font: f(BODY, 600),
      gapBefore: gap(i === 0 ? ITEM_GAP : TOPIC_GAP),
    })),
    { text: c.personalityName, font: f(TITLE, 700), gapBefore: gap(ITEM_GAP) },
    { text: c.personalityDescription, font: f(BODY, 400), gapBefore: gap(TOPIC_GAP) },
    { text: c.appName, font: f(SMALL, 600), gapBefore: gap(ITEM_GAP) },
  ];
}

function layoutAt(c: ShareContent, measure: Measure, scale: number): { lines: ShareLine[]; bottom: number } {
  const maxWidth = SHARE_W - 2 * SHARE_PAD;
  const lines: ShareLine[] = [];
  let y = SHARE_PAD;
  itemsFor(c, scale).forEach((it, item) => {
    const lineHeightPx = it.font.sizePx * LINE_HEIGHT;
    y += it.gapBefore;
    for (const text of wrapText(it.text, maxWidth, it.font, measure)) {
      lines.push({ text, x: SHARE_PAD, y, font: it.font, lineHeightPx, item });
      y += lineHeightPx;
    }
  });
  return { lines, bottom: y };
}

/**
 * Stacks the items top to bottom from SHARE_PAD. If the stack passes SHARE_H - SHARE_PAD,
 * every size and gap steps down by 10% and the layout is redone, at most 5 times.
 */
export function layoutShareImage(c: ShareContent, measure: Measure): ShareLayout {
  let scale = 1;
  let result = layoutAt(c, measure, scale);
  for (let i = 0; i < MAX_STEPS && result.bottom > SHARE_H - SHARE_PAD; i++) {
    scale *= STEP;
    result = layoutAt(c, measure, scale);
  }
  return {
    lines: result.lines,
    background: SLIDE_COLOUR_HEX[c.colour],
    foreground: foregroundFor(c.colour),
  };
}

/** Resolves with `promise`, or rejects once `ms` passes first (Req 11.6). */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
