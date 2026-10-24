// The share image for "Your ballot, wrapped": what it may contain, and where each
// line and mark goes on a 1080 by 1920 canvas. Pure apart from withTimeout; no DOM
// (text width comes from an injected Measure). The preview lists `shareItems`, and
// both the closing slide and the preview show the PNG drawn from
// `layoutShareImage(shareItems(...))`, so what is seen is exactly what is saved
// (W5.1). wrapText, the step-down fit, and withTimeout are from Layla's branch (f20bfe8).
import { TOPIC_DEFS, type TopicId } from "@/lib/vocab";
import { APP_NAME, SENSITIVE_TOPICS, WRAPPED_STRINGS as S } from "@/lib/vocab/wrapped";
import type { Profile } from "./profile";
import type { DocumentData } from "./types";
import type { WrappedSummary } from "./wrapped";
import { decidedLabel, placeLabel, type Town } from "./wrapped-slides";

export const SHARE_W = 1080;
export const SHARE_H = 1920;
export const SHARE_PAD = 96;

/** Facts about the ballot and the person's own choices; nothing else may reach the image. */
export interface ShareBase {
  year: string;
  place?: string; // "Cambridge, MA" when the town is known; drawn only after the person opts in
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

/** What the image may hold for this story: the ballot's facts, plus the town and topics the person could opt in to. Never the name or a life fact. */
export function storyShareBase(doc: DocumentData, summary: WrappedSummary, profile: Profile, towns: readonly Town[]): ShareBase {
  const { place, known } = placeLabel(profile.townId, towns);
  const date = doc.decideBy ? decidedLabel(doc.decideBy.date) : undefined;
  return {
    year: (doc.decideBy?.date ?? doc.date ?? "").slice(0, 4),
    ...(known ? { place } : {}),
    questionCount: summary.measureTotal,
    ...(date ? { dateLabel: date } : {}),
    followed: summary.topicRank,
  };
}

/** Town off and topics off until the person switches them on; sensitive topics unchecked even once topics are on. */
export function defaultShareChoices(base: ShareBase): ShareChoices {
  return { includePlace: false, includeTopics: false, picked: base.followed.filter((t) => !SENSITIVE_TOPICS.includes(t)) };
}

export type ShareItemKind = "brand" | "title" | "place" | "count" | "countLabel" | "date" | "topicsHeading" | "topic" | "line" | "footer";

export interface ShareItem {
  kind: ShareItemKind;
  text: string;
}

/** The ordered items the image holds for these choices. Never a life fact, a decision, or a label about the person. */
export function shareItems(base: ShareBase, choices: ShareChoices): ShareItem[] {
  const topics = choices.includeTopics ? base.followed.filter((t) => choices.picked.includes(t)) : [];
  return [
    { kind: "brand", text: base.year ? `${APP_NAME} · ${base.year}` : APP_NAME },
    { kind: "title", text: S.cardTitle },
    ...(choices.includePlace && base.place ? [{ kind: "place" as const, text: base.place }] : []),
    { kind: "count", text: String(base.questionCount) },
    { kind: "countLabel", text: base.questionCount === 1 ? "ballot question" : "ballot questions" },
    ...(base.dateLabel ? [{ kind: "date" as const, text: base.dateLabel }] : []),
    ...(topics.length ? [{ kind: "topicsHeading" as const, text: S.shareRadar }, ...topics.map((t) => ({ kind: "topic" as const, text: TOPIC_DEFS[t].label }))] : []),
    { kind: "line", text: S.closingLine },
    { kind: "footer", text: S.shareFooter(base.questionCount) },
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
  w: number;
  font: ShareFont;
  lineHeightPx: number;
  item: number;
  tone: "ink" | "muted";
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShareLayout {
  lines: ShareLine[];
  /** A pill behind each opted-in topic. */
  chips: (Box & { item: number })[];
  /** The ballot sketch: nine numbered boxes on a card, turned by `angle` degrees about its centre. */
  ballot: Box & { angle: number; cell: number; gap: number; inset: number };
  /** The short Legible-plum rule under the title (the brand mark, not a relevance mark). */
  rule: Box;
  /** Small marks: plum by the opted-in town, apricot (time) by the date. */
  dots: { x: number; y: number; r: number; tone: "plum" | "apricot" }[];
  scale: number;
  /** True when everything fits inside the margins. */
  fits: boolean;
}

/** The axis-aligned box a turned rectangle covers. */
export function turnedBounds(b: Box & { angle: number }): Box {
  const a = (Math.abs(b.angle) * Math.PI) / 180;
  const w = b.w * Math.cos(a) + b.h * Math.sin(a);
  const h = b.w * Math.sin(a) + b.h * Math.cos(a);
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
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

const font = (face: ShareFace, sizePx: number, weight: ShareFont["weight"], italic = false): ShareFont => ({ face, sizePx, weight, ...(italic ? { italic } : {}) });
const STEP = 0.92;
const MAX_STEPS = 8;
const BALLOT_ANGLE = 3;

/**
 * A poster in three bands. Top: the brand, "My ballot, wrapped." with the plum rule,
 * and the town if added. Middle: the question count beside a ballot sketch of nine
 * numbered boxes, then the date and any added topics as pills. Bottom, resting on
 * the margin: the closing line and an invitation to read the questions on Legible.
 */
function layoutAt(items: ShareItem[], measure: Measure, s: number): ShareLayout {
  const P = SHARE_PAD;
  const W = SHARE_W - 2 * P;
  const lines: ShareLine[] = [];
  const chips: ShareLayout["chips"] = [];
  const dots: ShareLayout["dots"] = [];
  const idx = (k: ShareItemKind) => items.findIndex((i) => i.kind === k);
  const put = (item: number, x: number, y: number, maxW: number, f: ShareFont, lh: number, tone: ShareLine["tone"]): number => {
    const lineH = f.sizePx * lh;
    for (const text of wrapText(items[item].text, maxW, f, measure)) {
      lines.push({ text, x, y, w: measure(text, f), font: f, lineHeightPx: lineH, item, tone });
      y += lineH;
    }
    return y;
  };

  let y = P;
  y = put(idx("brand"), P, y, W, font("sans", 34 * s, 600), 1.3, "muted");
  y = put(idx("title"), P, y + 56 * s, W, font("display", 168 * s, 400), 0.96, "ink");
  const rule = { x: P, y: y + 36 * s, w: 132 * s, h: 10 * s };
  y = rule.y + rule.h;
  const place = idx("place");
  if (place >= 0) {
    const f = font("sans", 52 * s, 600);
    const top = y + 72 * s;
    dots.push({ x: P + 11 * s, y: top + (f.sizePx * 1.25) / 2, r: 11 * s, tone: "plum" });
    y = put(place, P + 38 * s, top, W - 38 * s, f, 1.25, "ink");
  }

  // Middle band: the count on the left, the ballot on the right.
  const mid = y + 88 * s;
  const leftW = 360 * s;
  let ly = put(idx("count"), P, mid, leftW, font("display", 340 * s, 400), 0.86, "ink");
  ly = put(idx("countLabel"), P, ly + 16 * s, leftW, font("sans", 50 * s, 600), 1.15, "ink");
  const inset = 52 * s;
  const gap = 26 * s;
  // Sized so the card, once turned, still sits inside the right margin.
  const room = SHARE_W - P - (P + leftW + 72 * s);
  const bw = room / 1.09;
  const bx = SHARE_W - P - room + (room - bw) / 2;
  const cell = (bw - 2 * inset - 2 * gap) / 3;
  const bh = 2 * inset + 3 * cell + 2 * gap + 96 * s;
  const ballot = { x: bx, y: mid, w: bw, h: bh, angle: BALLOT_ANGLE, cell, gap, inset };
  y = Math.max(ly, turnedBounds(ballot).y + turnedBounds(ballot).h);

  const date = idx("date");
  if (date >= 0) {
    const f = font("sans", 44 * s, 500);
    const top = y + 72 * s;
    dots.push({ x: P + 12 * s, y: top + (f.sizePx * 1.3) / 2, r: 12 * s, tone: "apricot" });
    y = put(date, P + 40 * s, top, W - 40 * s, f, 1.3, "ink");
  }

  const heading = idx("topicsHeading");
  if (heading >= 0) {
    y = put(heading, P, y + 64 * s, W, font("sans", 34 * s, 600), 1.3, "muted");
    const f = font("sans", 40 * s, 600);
    const padX = 26 * s;
    const chipH = f.sizePx * 1.25 + 26 * s;
    const between = 14 * s;
    let cx = P;
    let cy = y + 18 * s;
    items.forEach((it, i) => {
      if (it.kind !== "topic") return;
      const tw = Math.min(measure(it.text, f), W - 2 * padX);
      const cw = tw + 2 * padX;
      if (cx > P && cx + cw > P + W) {
        cx = P;
        cy += chipH + between;
      }
      chips.push({ x: cx, y: cy, w: cw, h: chipH, item: i });
      put(i, cx + padX, cy + 13 * s, W - 2 * padX, f, 1.25, "ink");
      cx += cw + between;
    });
    y = cy + chipH;
  }

  // Bottom band rests on the margin.
  const lineF = font("display", 96 * s, 400, true);
  const footF = font("sans", 34 * s, 500);
  const lineRows = wrapText(items[idx("line")].text, W, lineF, measure).length;
  const footRows = wrapText(items[idx("footer")].text, W, footF, measure).length;
  const bottomH = lineRows * lineF.sizePx * 1.05 + 28 * s + footRows * footF.sizePx * 1.3;
  const bottomTop = SHARE_H - P - bottomH;
  put(idx("footer"), P, put(idx("line"), P, bottomTop, W, lineF, 1.05, "ink") + 28 * s, W, footF, 1.3, "muted");

  return { lines, chips, ballot, rule, dots, scale: s, fits: y + 64 * s <= bottomTop };
}

/** Lays the poster out; steps every size down by 8% while the bands would meet, at most 8 times. */
export function layoutShareImage(items: ShareItem[], measure: Measure): ShareLayout {
  let scale = 1;
  let result = layoutAt(items, measure, scale);
  for (let i = 0; i < MAX_STEPS && !result.fits; i++) {
    scale *= STEP;
    result = layoutAt(items, measure, scale);
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
