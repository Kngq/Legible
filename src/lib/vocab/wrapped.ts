// Fixed vocabulary for Ballot Wrapped. Pure TypeScript: no React, no network.
import { BANNED_WORDS } from "./banned";
import { TOPIC_DEFS, type TopicId } from "./index";

export const SLIDE_COLOURS = ["purple", "lilac", "terracotta", "sand", "cream"] as const;
export type SlideColour = (typeof SLIDE_COLOURS)[number];

/** Raw palette values from src/app/globals.css. Same in light and dark themes. */
export const SLIDE_COLOUR_HEX: Record<SlideColour, string> = {
  purple: "#5b1a74", // --purple-700
  lilac: "#e5cce6", // --lilac-300
  terracotta: "#cf8d69", // --terracotta-400
  sand: "#e9be77", // --sand-300
  cream: "#f5e6d3", // --cream-200
};
export const INK = "#111111";
export const WHITE = "#ffffff";
/** White only on deep purple; ink on every light fill. */
export const foregroundFor = (c: SlideColour): string => (c === "purple" ? WHITE : INK);

/** part is always TOPIC_DEFS[id].avatarPart. */
export interface TopicVisual {
  part: string;
  colour: SlideColour;
}

// Fixed lookup spreading the 14 topics over the 5 colours. No meaning attached.
const TOPIC_COLOURS: Record<TopicId, SlideColour> = {
  housing_costs: "terracotta",
  open_space: "sand",
  voting_access: "lilac",
  elections: "cream",
  government_transparency: "lilac",
  taxes: "sand",
  labor: "terracotta",
  criminal_justice: "purple",
  cannabis_policy: "sand",
  gun_policy: "cream",
  public_safety: "purple",
  local_control: "lilac",
  schools: "cream",
  roads_transit: "purple",
};

// `part` is read lazily: index.ts re-exports this module, so TOPIC_DEFS may
// not be initialised yet when this module is evaluated.
function visual(id: TopicId): TopicVisual {
  return {
    get part() {
      return TOPIC_DEFS[id].avatarPart;
    },
    colour: TOPIC_COLOURS[id],
  };
}

export const TOPIC_VISUALS: Record<TopicId, TopicVisual> = {
  housing_costs: visual("housing_costs"),
  open_space: visual("open_space"),
  voting_access: visual("voting_access"),
  elections: visual("elections"),
  government_transparency: visual("government_transparency"),
  taxes: visual("taxes"),
  labor: visual("labor"),
  criminal_justice: visual("criminal_justice"),
  cannabis_policy: visual("cannabis_policy"),
  gun_policy: visual("gun_policy"),
  public_safety: visual("public_safety"),
  local_control: visual("local_control"),
  schools: visual("schools"),
  roads_transit: visual("roads_transit"),
};

export interface CivicPersonality {
  name: string;
  description: string;
}

export const CIVIC_PERSONALITIES: Record<TopicId, CivicPersonality> = {
  housing_costs: {
    name: "The Neighborhood Builder",
    description: "Keeps an eye on what homes cost and where they get built.",
  },
  open_space: {
    name: "The Open Space Scout",
    description: "Notices parks, trails, and the land between them.",
  },
  voting_access: {
    name: "The Polling Place Guide",
    description: "Watches how people sign up and get to the polls.",
  },
  elections: {
    name: "The Election Watcher",
    description: "Tracks how primaries and races are run in the state.",
  },
  government_transparency: {
    name: "The Records Reader",
    description: "Reads the fine print on how public offices work.",
  },
  taxes: {
    name: "The Budget Tracker",
    description: "Follows where public money comes from and where it goes.",
  },
  labor: {
    name: "The Workplace Watcher",
    description: "Keeps up with jobs, wages, and how work gets organized.",
  },
  criminal_justice: {
    name: "The Courtroom Observer",
    description: "Pays attention to how courts and legal help work.",
  },
  cannabis_policy: {
    name: "The Cannabis Rule Reader",
    description: "Follows the rules on how cannabis is sold in the state.",
  },
  gun_policy: {
    name: "The Firearm Law Follower",
    description: "Keeps up with the rules on firearms in Massachusetts.",
  },
  public_safety: {
    name: "The Safety Watcher",
    description: "Notices how the state keeps people safe day to day.",
  },
  local_control: {
    name: "The Town Hall Regular",
    description: "Cares about who decides things close to home.",
  },
  schools: {
    name: "The School Steward",
    description: "Follows what happens in classrooms and school budgets.",
  },
  roads_transit: {
    name: "The Commuter Champion",
    description: "Follows how people get around, from potholes to the bus.",
  },
};

/**
 * Words a personality never contains (Req 9.4), checked whole-word,
 * case-insensitive. The two side-taking verbs that are also banned app-wide
 * come from BANNED_WORDS so this file passes lint:words; the rest of the
 * banned list is included too, which only makes the check stricter.
 */
export const PERSONALITY_FORBIDDEN: readonly string[] = [
  "vote",
  "voter",
  "yes",
  "no",
  "for",
  "against",
  "approve",
  "reject",
  "pro",
  "anti",
  ...BANNED_WORDS,
];

export const APP_NAME = "Nine";

export const WRAPPED_STRINGS = {
  heading: "Your 2026 Ballot, Wrapped",
  introLine: "A quick look at where this ballot meets the subjects you follow.",
  stateFallback: "Massachusetts",
  revealSentence:
    "This comes first because of the topics you picked and the order of the questions on the ballot.",
  topThreeHeading: "What your ballot is about for you",
  connectedSentence: (total: number) => `of ${total} questions list a topic you follow`,
  spotlightHeading: "Start here",
  personalityHeading: "Your civic personality",
  digInHeading: "Ready to dig in?",
  fullBallot: "See your full ballot",
  voterInfoText: "Official voter information from the Secretary of the Commonwealth",
  voterInfoAria:
    "Official voter information from the Secretary of the Commonwealth (opens in a new tab)",
  download: "Download image",
  downloadError: "The image could not be made on this device.",
  unlockPrompt: "Follow a topic to unlock your Ballot Wrapped",
  openButton: "See your Ballot Wrapped",
  demoTag: "Demo profile",
  computeError: "This recap could not be made on this device.",
} as const;
