// Fixed vocabulary for "Your ballot, wrapped". Pure TypeScript: no React, no network.
// Every string the story writes itself lives here, so tests can check it for every profile.
import type { TopicId } from "./index";

export const APP_NAME = "Legible";

/**
 * Subjects never preselected for the share image, even after the person adds
 * their topics: following them can say more about a person than they mean to share.
 */
export const SENSITIVE_TOPICS: readonly TopicId[] = ["gun_policy", "cannabis_policy", "criminal_justice"];

/**
 * Words that would turn a subject into an identity or a side. The story never
 * uses them (W2.8, W3.2). Checked whole-word, case-insensitive, over app copy.
 */
export const IDENTITY_WORDS: readonly string[] = [
  "advocate",
  "champion",
  "activist",
  "warrior",
  "personality",
  "persona",
  "voter type",
  "progressive",
  "conservative",
  "liberal",
  "democrat",
  "republican",
];

/** Words that take a side. App copy in the story never contains them; official sentences may. */
export const SIDE_WORDS: readonly string[] = ["vote", "yes", "no", "for", "against", "pro", "anti", "approve", "reject"];

/** Where a cited sentence's quote comes from, in words. */
export const LOCATOR_LABELS: Record<string, string> = {
  "AG summary": "the Attorney General's summary",
  "YES statement": "the official YES statement",
  "NO statement": "the official NO statement",
  "Fiscal statement": "the fiscal statement",
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const WRAPPED_STRINGS = {
  dialogLabel: "Your ballot, wrapped",
  close: "Close story",
  next: "Next slide",
  back: "Previous slide",
  demoTag: "Example profile",
  demoStrip: "Example profile: a Cambridge renter who rides transit. Nothing here is saved.",

  openingHeading: "Your ballot, wrapped.",
  openingLine: "Big decisions. Your corner of Massachusetts.",
  openingHint: "Tap to begin",

  worldHeading: "Here’s what’s happening around you.",
  worldCount: (n: number) => (n === 1 ? "question on the ballot" : "questions on the ballot"),
  worldStatewide: (n: number) => `Every ballot in Massachusetts carries the same ${plural(n, "question", "questions")}.`,
  worldLine: "Let’s see which ones connect to your world.",

  connectsHeading: "Some decisions hit closer to home.",
  connectsIntro: (n: number, total: number) =>
    `Based on what you told Legible, ${n} of ${total} questions may reach your life.${n > 3 ? " Here are the first three." : ""}`,
  connectsGeneralHeading: "Decisions worth knowing about",
  connectsGeneralIntro: "Nothing you’ve shared points to a question yet. Here are the first three, in ballot order.",
  connectsGeneralAction: "Add details to your profile",

  radarHeading: "Here’s what’s on your radar.",
  radarIntro: "The subjects you chose to follow, and how many questions list each.",
  radarNote: "Following a subject says nothing about where you stand.",
  radarCount: (n: number) => (n === 0 ? "Not on this ballot" : plural(n, "question", "questions")),
  radarMore: (n: number) => `and ${n} more`,
  radarExamplesHeading: "There’s a lot to explore.",
  radarExamplesIntro: "A few subjects on this ballot. These are examples, not your interests.",
  radarExamplesAction: "Choose topics to follow",

  closerHeading: "One decision worth a closer look.",
  basisTouches: "Connected to your answers",
  basisList: "On your list",
  basisFirst: "First on the ballot",
  closerSource: (locator: string, page?: number) =>
    `From ${LOCATOR_LABELS[locator] ?? "the official text"}${page ? `, page ${page}` : ""}`,
  closerNoSummary: "Its page has the official summary, in its exact words.",
  closerAction: "Explore this decision",

  closingHeading: "A little more informed about your corner of the world.",
  cardTitle: "My ballot, wrapped",
  cardQuestions: (n: number) => plural(n, "ballot question", "ballot questions"),
  cardTopics: (n: number) => plural(n, "topic on my radar", "topics on my radar"),
  closingLine: "Curiosity suits you.",
  save: "Save my story",
  explore: "Explore decisions",

  shareHeading: "Save your story",
  shareIntro: "This is the exact image that will be saved. It is made on this device, and nothing is uploaded.",
  shareTown: "Show my town",
  shareTopics: "Add topics I follow",
  shareSensitive: "Some subjects stay unchecked until you pick them.",
  shareContains: "This image shows",
  shareSave: "Save image",
  shareMaking: "Making your image…",
  shareSaved: "Saved to this device’s downloads.",
  shareError: "The image could not be made on this device.",
  shareDone: "Back to the story",

  inviteKicker: "A different way to explore your ballot",
  inviteLine: "Six little stories about the decisions shaping your community.",
  inviteLink: "See your ballot, wrapped",
} as const;

/** "Slide 3 of 6. Some decisions hit closer to home." */
export function announcement(index: number, count: number, heading: string): string {
  return `Slide ${index + 1} of ${count}. ${heading}`;
}
