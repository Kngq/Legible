// Fixed vocabulary for Ballot stories (first built as "Your ballot, wrapped"). Pure TypeScript: no React, no network.
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
  dialogLabel: "Ballot stories",
  close: "Close",
  closeLabel: "Close ballot stories",
  next: "Next",
  nextLabel: "Next story",
  back: "Previous",
  backLabel: "Previous story",
  done: "Done",
  doneLabel: "Finish and close ballot stories",
  progress: (i: number, n: number) => `${i} of ${n}`,
  playerTitle: "Ballot stories",
  demoTag: "Example profile",
  demoStrip: "Example profile: a Cambridge renter who rides transit. Nothing here is saved.",

  openingHeading: "Your ballot, in stories.",
  openingLine: "Big decisions. Your corner of Massachusetts.",
  openingHint: "Tap Next to begin, or swipe",
  openingHintKeys: "Press Next or the → key to begin",
  navHelp: "Use the Next and Previous buttons or the arrow keys to move between stories. Escape closes ballot stories.",

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
  radarCount: (n: number) => plural(n, "question", "questions"),
  radarMore: (n: number) => `and ${n} more`,
  radarAlso: "Also on your radar, without a question on this ballot",
  radarNoneOnBallot: "The subjects you chose to follow. None of them has a question on this ballot.",
  radarExamplesHeading: "There’s a lot to explore.",
  radarExamplesIntro: "A few subjects on this ballot. These are examples, not your interests.",
  radarExamplesAction: "Choose topics to follow",

  closerHeading: "One decision worth a closer look.",
  basisTouches: "Connected to your answers",
  basisList: "On your list",
  basisFirst: "First on the ballot",
  closerFacts: "What the official text says",
  closerOfficial: "Read the official voter guide page",
  closerSource: (locator: string, page?: number) =>
    `From ${LOCATOR_LABELS[locator] ?? "the official text"}${page ? `, page ${page}` : ""}`,
  closerNoSummary: "Its page has the official summary, in its exact words.",
  closerAction: "Explore this decision",

  closingHeading: "A little more informed about your corner of the world.",
  closingImageAlt: "The image you can save. It shows:",
  closingNote: "This is the image you can save. Your town and topics stay off unless you add them.",
  cardTitle: "My ballot, wrapped",
  cardQuestions: (n: number) => plural(n, "ballot question", "ballot questions"),
  closingLine: "Curiosity suits you.",
  shareFooter: (n: number) => `Read all ${plural(n, "question", "questions")} in plain words on Legible.`,
  shareRadar: "On my radar",
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

  // Entry points: the featured section on Explore and the quiet link on For you.
  featureKicker: "A gentle place to start",
  featureHeading: "Your ballot, in stories",
  featureIntro: "Explore six short, visual stories about the decisions shaping your community.",
  featureCount: "6 short stories",
  featurePace: "Move at your own pace",
  featureSource: "From the official voter guide",
  featureAction: "Explore ballot stories",
  homeLead: "New to these questions?",
  homeLink: "Explore ballot stories",
  backToStories: "Back to stories",
  // Water earned while the stories are open (an official link opened from a story).
  rewardShort: (n: number) => `+${n} ${n === 1 ? "drop" : "drops"}`,
  rewardLong: (n: number) => `+${n} ${n === 1 ? "drop" : "drops"} to your garden`,
  rewardSaid: (n: number) => `You earned ${n} ${n === 1 ? "drop" : "drops"} of water. It's waiting in your garden.`,
} as const;

/** "Story 3 of 6. Some decisions hit closer to home." */
export function announcement(index: number, count: number, heading: string): string {
  return `Story ${index + 1} of ${count}. ${heading}`;
}
