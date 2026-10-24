// Fixed vocabularies. Pure TypeScript: no React, no network.
export { BANNED_WORDS, BANNED_PATTERN, findBannedWords } from "./banned";

export const DIRECTIONS = [
  "expands",
  "restricts",
  "rule_change",
  "who_decides",
  "none",
] as const;
export type Direction = (typeof DIRECTIONS)[number];

export interface DirectionDef {
  id: Direction;
  label: string;
  meaning: string;
}

export const DIRECTION_DEFS: Record<Direction, DirectionDef> = {
  expands: {
    id: "expands",
    label: "Expands what you can do",
    meaning: "Something becomes allowed or available that is not today.",
  },
  restricts: {
    id: "restricts",
    label: "Restricts what you can do",
    meaning: "Something allowed today would no longer be.",
  },
  rule_change: {
    id: "rule_change",
    label: "Changes a rule you live under",
    meaning: "A rule that applies to you changes without adding or removing a right.",
  },
  who_decides: {
    id: "who_decides",
    label: "Changes who decides",
    meaning: "Moves a decision between people, offices, or levels of government.",
  },
  none: {
    id: "none",
    label: "No direct change for you",
    meaning: "Nothing in your answers points at this measure.",
  },
};

export const LEGEND_SENTENCE =
  "Nine can only say one of these five things about a measure.";

export const FACT_IDS = [
  "rents",
  "owns",
  "lives_with_family",
  "registered_here",
  "votes_in_primaries",
  "public_defender_contact",
  "state_employee",
  "wants_single_family",
  "buys_cannabis",
  "owns_firearm",
  "kids_in_schools",
  "runs_business_here",
] as const;
export type FactId = (typeof FACT_IDS)[number];

/**
 * Everyday facts onboarding may ask. Onboarding shows only the ones some document
 * in the person's feed uses (see onboardingFacts in engine/personalization), so it
 * never asks for something nothing reads.
 */
export const ONBOARDING_FACTS: readonly FactId[] = [
  "rents",
  "owns",
  "wants_single_family",
  "registered_here",
  "votes_in_primaries",
  "state_employee",
  "kids_in_schools",
  "runs_business_here",
  "lives_with_family",
];

/** Facts never asked cold. They appear only on a card, with the reason visible. */
export const SENSITIVE_FACTS: readonly FactId[] = [
  "owns_firearm",
  "buys_cannabis",
  "public_defender_contact",
];

export interface FactDef {
  id: FactId;
  question: string;
  avatarPart: string;
  // "because" chip text for each answer, e.g. "you rent" / "you do not rent".
  because: { yes: string; no: string };
}

export const FACT_DEFS: Record<FactId, FactDef> = {
  rents: {
    id: "rents",
    question: "Do you rent your home?",
    avatarPart: "key",
    because: { yes: "you rent", no: "you do not rent" },
  },
  owns: {
    id: "owns",
    question: "Do you own your home?",
    avatarPart: "house",
    because: { yes: "you own your home", no: "you do not own your home" },
  },
  lives_with_family: {
    id: "lives_with_family",
    question: "Do you live with family?",
    avatarPart: "two_figures",
    because: { yes: "you live with family", no: "you do not live with family" },
  },
  registered_here: {
    id: "registered_here",
    question: "Are you registered to vote at your current address?",
    avatarPart: "ballot",
    because: {
      yes: "you are registered at your address",
      no: "you are not registered at your address",
    },
  },
  votes_in_primaries: {
    id: "votes_in_primaries",
    question: "Do you usually vote in state primaries?",
    avatarPart: "checkmark",
    because: { yes: "you vote in primaries", no: "you skip primaries" },
  },
  public_defender_contact: {
    id: "public_defender_contact",
    question:
      "Have you or someone close to you been represented by a public defender?",
    avatarPart: "scales",
    because: {
      yes: "you have had contact with a public defender",
      no: "you have not had contact with a public defender",
    },
  },
  state_employee: {
    id: "state_employee",
    question: "Do you work for the state?",
    avatarPart: "badge",
    because: { yes: "you work for the state", no: "you do not work for the state" },
  },
  wants_single_family: {
    id: "wants_single_family",
    question: "Are you hoping to build or buy a single-family home?",
    avatarPart: "blueprint",
    because: {
      yes: "you want a single-family home",
      no: "you are not looking for a single-family home",
    },
  },
  buys_cannabis: {
    id: "buys_cannabis",
    question: "Do you buy cannabis from a licensed store?",
    avatarPart: "leaf",
    because: {
      yes: "you buy cannabis at a store",
      no: "you do not buy cannabis at a store",
    },
  },
  owns_firearm: {
    id: "owns_firearm",
    question: "Do you own a firearm?",
    avatarPart: "target",
    because: { yes: "you own a firearm", no: "you do not own a firearm" },
  },
  kids_in_schools: {
    id: "kids_in_schools",
    question: "Do you have kids in the public schools?",
    avatarPart: "backpack",
    because: { yes: "you have kids in the public schools", no: "you have no kids in the public schools" },
  },
  runs_business_here: {
    id: "runs_business_here",
    question: "Do you run a business in town?",
    avatarPart: "storefront",
    because: { yes: "you run a business in town", no: "you do not run a business in town" },
  },
};

export const TOPIC_IDS = [
  "housing_costs",
  "open_space",
  "voting_access",
  "elections",
  "government_transparency",
  "taxes",
  "labor",
  "criminal_justice",
  "cannabis_policy",
  "gun_policy",
  "public_safety",
  "local_control",
  "schools",
  "roads_transit",
] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

export interface TopicDef {
  id: TopicId;
  label: string; // a subject, never a side
  avatarPart: string;
  words: string[]; // lowercase words and phrases for typed matching in the browser
}

export const TOPIC_DEFS: Record<TopicId, TopicDef> = {
  housing_costs: {
    id: "housing_costs",
    label: "Housing costs",
    avatarPart: "roof",
    words: ["housing", "rent", "rents", "mortgage", "home prices", "affordable", "apartment", "zoning", "lot size", "single-family", "homes", "landlord", "tenant"],
  },
  open_space: {
    id: "open_space",
    label: "Open space",
    avatarPart: "tree",
    words: ["open space", "parks", "park", "trails", "conservation", "nature", "land", "forest", "wetlands", "farms", "rivers", "clean water", "environment"],
  },
  voting_access: {
    id: "voting_access",
    label: "Voting access",
    avatarPart: "ballot_box",
    words: ["registration", "register", "voter registration", "polls", "voting", "same-day", "election day", "turnout"],
  },
  elections: {
    id: "elections",
    label: "Elections",
    avatarPart: "podium",
    words: ["primary", "primaries", "candidates", "parties", "ranked", "top two", "campaign", "elections"],
  },
  government_transparency: {
    id: "government_transparency",
    label: "Government transparency",
    avatarPart: "magnifier",
    words: ["transparency", "public records", "records", "open government", "accountability", "legislature", "governor", "disclosure"],
  },
  taxes: {
    id: "taxes",
    label: "Taxes",
    avatarPart: "coin",
    words: ["tax", "taxes", "revenue", "budget", "rebate", "refund", "surtax", "spending", "state budget", "local aid"],
  },
  labor: {
    id: "labor",
    label: "Labor",
    avatarPart: "hardhat",
    words: ["union", "unions", "bargaining", "collective bargaining", "workers", "wages", "employees", "jobs", "strike"],
  },
  criminal_justice: {
    id: "criminal_justice",
    label: "Criminal justice",
    avatarPart: "gavel",
    words: ["courts", "court", "public defender", "defense", "prosecutor", "jail", "prison", "sentencing", "legal aid", "justice"],
  },
  cannabis_policy: {
    id: "cannabis_policy",
    label: "Cannabis policy",
    avatarPart: "leaf_badge",
    words: ["cannabis", "marijuana", "weed", "dispensary", "dispensaries", "pot", "thc", "edibles"],
  },
  gun_policy: {
    id: "gun_policy",
    label: "Gun policy",
    avatarPart: "target_badge",
    words: ["gun", "guns", "firearm", "firearms", "ghost gun", "license to carry", "second amendment", "rifle", "shotgun"],
  },
  public_safety: {
    id: "public_safety",
    label: "Public safety",
    avatarPart: "shield",
    words: ["safety", "police", "crime", "violence", "emergency", "protection order", "schools"],
  },
  local_control: {
    id: "local_control",
    label: "Local control",
    avatarPart: "town_hall",
    words: ["local control", "town meeting", "home rule", "city council", "select board", "zoning board", "my town", "municipal"],
  },
  schools: {
    id: "schools",
    label: "Schools",
    avatarPart: "book",
    words: ["school", "schools", "school budget", "teachers", "students", "school building", "education", "classroom"],
  },
  roads_transit: {
    id: "roads_transit",
    label: "Roads and transit",
    avatarPart: "road",
    words: ["roads", "road", "transit", "bus", "train", "mbta", "commute", "traffic", "sidewalks", "bike lanes", "parking", "potholes"],
  },
};

/** Match typed text to fixed topics using the word lists. Runs in the browser only. */
export function matchTopics(typed: string): TopicId[] {
  const t = typed.toLowerCase().trim();
  if (!t) return [];
  const out: TopicId[] = [];
  for (const id of TOPIC_IDS) {
    const def = TOPIC_DEFS[id];
    if (def.words.some((w) => t.includes(w)) || def.label.toLowerCase().includes(t)) {
      out.push(id);
    }
  }
  return out;
}
