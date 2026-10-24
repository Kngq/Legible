// Slide view models for Ballot Wrapped. Pure TypeScript: no React, no DOM, no network.
// Every visible string of a Slide is listed in `texts`, so tests can check neutrality
// and allowed numbers for every profile. See design.md, "wrapped-slides.ts".
import { FACT_DEFS, TOPIC_DEFS } from "@/lib/vocab";
import { APP_NAME, CIVIC_PERSONALITIES, WRAPPED_STRINGS, type SlideColour } from "@/lib/vocab/wrapped";
import type { Because, Card, WhySentence } from "./types";
import type { WrappedSummary } from "./wrapped";
import { SLIDE_COUNT, slideColours } from "./wrapped-layout";

export { SLIDE_COUNT };

export const SLIDE_IDS = [
  "intro",
  "reveal",
  "top_three",
  "connected",
  "spotlight",
  "personality",
  "dig_in",
  "summary",
] as const;
export type SlideId = (typeof SLIDE_IDS)[number];

/** Existing relevance labels (MeasureCard tags and the DocumentView "Probably not you" group). */
export type RelevanceLabel = "Touches you" | "On your list" | "Applies to everyone" | "Probably not you";

export interface SpotlightModel {
  number: string; // "Question 7"
  title: string; // measure.title, unchanged
  label: RelevanceLabel;
  sentence?: WhySentence; // why[0] only when its quote exists in measure.quotes
  chips: string[]; // existing chip text, in because order
}

export interface SlideModel {
  id: SlideId;
  heading: string; // announced after "Slide N of 8."
  colour: SlideColour;
  texts: string[]; // every visible string, for neutrality tests
}

/** Exact `towns.json` display name, or "Massachusetts" when there is no town or no match. */
export function townLabel(townId: string | undefined, towns: { id: string; name: string }[]): string {
  if (!townId) return WRAPPED_STRINGS.stateFallback;
  return towns.find((t) => t.id === townId)?.name ?? WRAPPED_STRINGS.stateFallback;
}

/** Same text MeasureCard renders for a "because" chip. */
export function chipText(b: Because): string {
  if (b.kind === "fact") {
    return `Because ${b.value ? FACT_DEFS[b.id].because.yes : FACT_DEFS[b.id].because.no}`;
  }
  return `You follow ${TOPIC_DEFS[b.id].label.toLowerCase()}`;
}

function relevanceLabel(card: Card): RelevanceLabel {
  if (card.relevance === "touches") return "Touches you";
  if (card.onYourList) return "On your list";
  if (card.relevance === "everyone") return "Applies to everyone";
  return "Probably not you";
}

/** Copies the Spotlight_Card; adds no sentence of its own. */
export function spotlightModel(card: Card): SpotlightModel {
  const m = card.measure;
  const first = card.why[0];
  const cited = first && m.quotes.some((q) => q.id === first.quoteId) ? first : undefined;
  return {
    number: `Question ${m.number}`,
    title: m.title,
    label: relevanceLabel(card),
    ...(cited ? { sentence: cited } : {}),
    chips: card.because.map(chipText),
  };
}

/** Live region text: "Slide 3 of 8. What your ballot is about for you". */
export function announcement(index: number, heading: string): string {
  return `Slide ${index + 1} of ${SLIDE_COUNT}. ${heading}`;
}

/** The 8 Slides in fixed order, with headings, colours, and every visible string. */
export function buildSlides(summary: WrappedSummary, town: string): SlideModel[] {
  const s = WRAPPED_STRINGS;
  const colours = slideColours(summary.topTopic);
  const topLabel = summary.topTopic ? TOPIC_DEFS[summary.topTopic].label : "";
  const personality = summary.topTopic ? CIVIC_PERSONALITIES[summary.topTopic] : undefined;
  const topicLabels = summary.topTopics.map((t) => TOPIC_DEFS[t.id].label);
  const total = summary.measureTotal;
  const connectedHeading = `${summary.connectedCount} ${s.connectedSentence(total)}`;

  const spot = summary.spotlight ? spotlightModel(summary.spotlight) : undefined;
  const spotTexts = spot
    ? [spot.number, spot.title, spot.label, ...(spot.sentence ? [spot.sentence.text] : []), ...spot.chips]
    : [];

  const personalityTexts = personality ? [personality.name, personality.description] : [];

  const slides: Omit<SlideModel, "colour">[] = [
    { id: "intro", heading: s.heading, texts: [s.heading, town, s.introLine] },
    { id: "reveal", heading: topLabel, texts: [topLabel, s.revealSentence].filter(Boolean) },
    {
      id: "top_three",
      heading: s.topThreeHeading,
      texts: [
        s.topThreeHeading,
        ...summary.topTopics.flatMap((t) => [TOPIC_DEFS[t.id].label, `${t.measureCount} of ${total} questions`]),
      ],
    },
    {
      id: "connected",
      heading: connectedHeading,
      texts: [String(summary.connectedCount), s.connectedSentence(total)],
    },
    { id: "spotlight", heading: s.spotlightHeading, texts: [s.spotlightHeading, ...spotTexts] },
    {
      id: "personality",
      heading: personality?.name ?? s.personalityHeading,
      texts: [s.personalityHeading, ...personalityTexts],
    },
    { id: "dig_in", heading: s.digInHeading, texts: [s.digInHeading, s.fullBallot, s.voterInfoText] },
    // Only the items the Share_Image may hold (Req 11.2).
    {
      id: "summary",
      heading: s.heading,
      texts: [s.heading, town, ...topicLabels, ...personalityTexts, APP_NAME],
    },
  ];

  return slides.map((slide, i) => ({ ...slide, colour: colours[i] }));
}
