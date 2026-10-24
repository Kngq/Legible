// The share image for "Your ballot, wrapped": what it may contain, and where each
// line goes on a 1080 by 1920 canvas. Pure apart from withTimeout; no DOM (text
// width comes from an injected Measure). The preview lists `shareItems` and shows
// the PNG drawn from `layoutShareImage(shareItems(...))`, so what is reviewed is
// exactly what is saved (W5.1). wrapText, the step-down fit, and withTimeout are
// from Layla's branch (f20bfe8).
import { TOPIC_DEFS, type TopicId } from "@/lib/vocab";
import { APP_NAME, SENSITIVE_TOPICS, WRAPPED_STRINGS as S } from "@/lib/vocab/wrapped";

export const SHARE_W = 1080;
export const SHARE_H = 1920;
export const SHARE_PAD = 112;

/** Facts about the ballot and the person's own choices; nothing else may reach the image. */
export interface ShareBase {
  year: string;
  place?: string; // "Cambridge, MA" when the town is known
  questionCount: number;
  dateLabel?: string; // "Decided Tuesday, November 3"
  followed: TopicId[]; // followed topics, in story order
}

export interface ShareChoices {
  includePlace: boolean;
  includeTopics: boolean;
  /** Topics checked while includeTopics is on. */
  picked: TopicId[];
}

/** Town on when known (general context); topics off; sensitive topics unchecked even once topics are on. */
export function defaultShareChoices(base: ShareBase): ShareChoices {
  return { includePlace: Boolean(base.place), includeTopics: false, picked: base.followed.filter((t) => !SENSITIVE_TOPICS.includes(t)) };
}

export type ShareItemKind = "brand" | "title" | "place" | "count" | "countLabel" | "date" | "topicsHeading" | "topic" | "line";

export interface ShareItem {
  kind: ShareItemKind;
  text: string;
}

/** The ordered items the image holds for these choices. Never a life fact, a decision, or a label about the person. */
export function shareItems(base: ShareBase, choices: ShareChoices): ShareItem[] {
  const topics = choices.includeTopics ? base.followed.filter((t) => choices.picked.includes(t)) : [];
  return [
    { kind: "brand", text: `${APP_NAME} · ${base.year}` },
    { kind: "title", text: S.cardTitle },
    ...(choices.includePlace && base.place ? [{ kind: "place" as const, text: base.place }] : []),
    { kind: "count", text: String(base.questionCount) },
    { kind: "countLabel", text: base.questionCount === 1 ? "ballot question" : "ballot questions" },
    ...(base.dateLabel ? [{ kind: "date" as const, text: base.dateLabel }] : []),
    ...(topics.length ? [{ kind: "topicsHeading" as const, text: "On my radar" }, ...topics.map((t) => ({ kind: "topic" as const, text: TOPIC_DEFS[t].label }))] : []),
    { kind: "line", text: S.closingLine },
  ];
}

export type ShareFace = "display" | "sans";

export interface ShareFont {
  face: ShareFace;
  sizePx: number;
  weight: 400 | 500 | 600 | 700;
  italic?: boolean;
}

/** Width in px of `text` drawn in `font`. */
export type Measure = (text: string, font: ShareFont) => number;

/** One drawn line: `x` left edge, `y` top of the line box; `item` indexes shareItems. */
export interface ShareLine {
  text: string;
  x: number;
  y: number;
  font: ShareFont;
  lineHeightPx: number;
  item: number;
  tone: "ink" | "muted";
}

export interface ShareLayout {
  lines: ShareLine[];
  /** The short Legible-plum rule under the title, in canvas px (the brand mark, not a relevance mark). */
  rule: { x: number; y: number; w: number };
  bottom: number;
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
    } else current = next;
  }
  if (current !== "") parts.push(current);
  return parts;
}

/** Greedy wrap on spaces; a single word wider than maxWidth is broken at characters. */
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
    if (measure(word, font) <= maxWidth) current = word;
    else {
      const pieces = breakWord(word, maxWidth, font, measure);
      lines.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1] ?? "";
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

// Type and gaps on the 1080 px canvas, before any step-down.
const STYLE: Record<ShareItemKind, { font: ShareFont; gap: number; lh: number; tone: ShareLine["tone"] }> = {
  brand: { font: { face: "sans", sizePx: 36, weight: 600 }, gap: 0, lh: 1.3, tone: "muted" },
  title: { font: { face: "display", sizePx: 150, weight: 400 }, gap: 140, lh: 1.0, tone: "ink" },
  place: { font: { face: "sans", sizePx: 52, weight: 600 }, gap: 120, lh: 1.25, tone: "ink" },
  count: { font: { face: "display", sizePx: 300, weight: 400 }, gap: 96, lh: 1.0, tone: "ink" },
  countLabel: { font: { face: "sans", sizePx: 52, weight: 600 }, gap: 8, lh: 1.25, tone: "ink" },
  date: { font: { face: "sans", sizePx: 40, weight: 500 }, gap: 24, lh: 1.3, tone: "muted" },
  topicsHeading: { font: { face: "sans", sizePx: 36, weight: 600 }, gap: 96, lh: 1.3, tone: "muted" },
  topic: { font: { face: "display", sizePx: 64, weight: 400 }, gap: 12, lh: 1.15, tone: "ink" },
  line: { font: { face: "display", sizePx: 72, weight: 400, italic: true }, gap: 120, lh: 1.15, tone: "ink" },
};
const STEP = 0.9;
const MAX_STEPS = 6;

function layoutAt(items: ShareItem[], measure: Measure, scale: number): ShareLayout {
  const maxWidth = SHARE_W - 2 * SHARE_PAD;
  const lines: ShareLine[] = [];
  let y = SHARE_PAD;
  let rule = { x: SHARE_PAD, y: 0, w: 120 * scale };
  items.forEach((it, item) => {
    const st = STYLE[it.kind];
    const font = { ...st.font, sizePx: st.font.sizePx * scale };
    const lineHeightPx = font.sizePx * st.lh;
    y += st.gap * scale;
    for (const text of wrapText(it.text, maxWidth, font, measure)) {
      lines.push({ text, x: SHARE_PAD, y, font, lineHeightPx, item, tone: st.tone });
      y += lineHeightPx;
    }
    if (it.kind === "title") rule = { x: SHARE_PAD, y: y + 48 * scale, w: 120 * scale };
  });
  return { lines, rule, bottom: y };
}

/**
 * Stacks the items from the top; steps every size down by 10% while it overflows,
 * at most 6 times. Then the closing line moves down to rest on the bottom margin,
 * so the card reads top and bottom like a poster.
 */
export function layoutShareImage(items: ShareItem[], measure: Measure): ShareLayout {
  let scale = 1;
  let result = layoutAt(items, measure, scale);
  for (let i = 0; i < MAX_STEPS && result.bottom > SHARE_H - SHARE_PAD; i++) {
    scale *= STEP;
    result = layoutAt(items, measure, scale);
  }
  const last = items.length - 1;
  const room = SHARE_H - SHARE_PAD - result.bottom;
  if (items[last]?.kind === "line" && room > 0) {
    result = { ...result, lines: result.lines.map((l) => (l.item === last ? { ...l, y: l.y + room } : l)), bottom: result.bottom + room };
  }
  return result;
}

/** Resolves with `promise`, or rejects once `ms` passes first. */
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
