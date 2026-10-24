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
  "Legible can only say one of these five things about a measure.";

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
  "drives",
  "rides_transit",
] as const;
export type FactId = (typeof FACT_IDS)[number];

/**
 * Everyday facts asked during onboarding, the same for every person and every
 * document. Facts not listed here (sensitive ones, and narrow ones such as
 * wants_single_family) are asked only inside a card that depends on them.
 */
export const ONBOARDING_FACTS: readonly FactId[] = [
  "rents",
  "owns",
  "lives_with_family",
  "kids_in_schools",
  "state_employee",
  "runs_business_here",
  "drives",
  "rides_transit",
  "registered_here",
  "votes_in_primaries",
];

export type LifeAreaId = "home" | "household" | "work" | "getting_around" | "voting";

/** One onboarding screen per life area: "Pick all that apply" over the area's facts. */
export interface LifeArea {
  id: LifeAreaId;
  heading: string;
  /** Generic reason, never tied to one document or measure. */
  why: string;
  facts: FactId[];
}

export const LIFE_AREAS: readonly LifeArea[] = [
  { id: "home", heading: "Your home", why: "Decisions about zoning, rent, and property tax depend on this.", facts: ["rents", "owns"] },
  { id: "household", heading: "Who you live with", why: "Decisions about schools and family services depend on this.", facts: ["lives_with_family", "kids_in_schools"] },
  { id: "work", heading: "Your work", why: "Decisions about public jobs and local business depend on this.", facts: ["state_employee", "runs_business_here"] },
  { id: "getting_around", heading: "Getting around", why: "Decisions about roads, parking, and transit depend on this.", facts: ["drives", "rides_transit"] },
  { id: "voting", heading: "Voting", why: "Decisions about how elections run depend on this.", facts: ["registered_here", "votes_in_primaries"] },
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
  /** First-person line for "Pick all that apply" cards, e.g. "I rent my home". */
  statement: string;
  avatarPart: string;
  // "because" chip text for each answer, e.g. "you rent" / "you do not rent".
  because: { yes: string; no: string };
}

export const FACT_DEFS: Record<FactId, FactDef> = {
  rents: {
    id: "rents",
    question: "Do you rent your home?",
    statement: "I rent my home",
    avatarPart: "key",
    because: { yes: "you rent", no: "you do not rent" },
  },
  owns: {
    id: "owns",
    question: "Do you own your home?",
    statement: "I own my home",
    avatarPart: "house",
    because: { yes: "you own your home", no: "you do not own your home" },
  },
  lives_with_family: {
    id: "lives_with_family",
    question: "Do you live with family?",
    statement: "I live with family",
    avatarPart: "two_figures",
    because: { yes: "you live with family", no: "you do not live with family" },
  },
  registered_here: {
    id: "registered_here",
    question: "Are you registered to vote at your current address?",
    statement: "I'm registered to vote at my current address",
    avatarPart: "ballot",
    because: {
      yes: "you are registered at your address",
      no: "you are not registered at your address",
    },
  },
  votes_in_primaries: {
    id: "votes_in_primaries",
    question: "Do you usually vote in state primaries?",
    statement: "I usually vote in state primaries",
    avatarPart: "checkmark",
    because: { yes: "you vote in primaries", no: "you skip primaries" },
  },
  public_defender_contact: {
    id: "public_defender_contact",
    question:
      "Have you or someone close to you been represented by a public defender?",
    statement: "I or someone close to me has had a public defender",
    avatarPart: "scales",
    because: {
      yes: "you have had contact with a public defender",
      no: "you have not had contact with a public defender",
    },
  },
  state_employee: {
    id: "state_employee",
    question: "Do you work for the state?",
    statement: "I work for the state",
    avatarPart: "badge",
    because: { yes: "you work for the state", no: "you do not work for the state" },
  },
  wants_single_family: {
    id: "wants_single_family",
    question: "Are you hoping to build or buy a single-family home?",
    statement: "I'm hoping to build or buy a single-family home",
    avatarPart: "blueprint",
    because: {
      yes: "you want a single-family home",
      no: "you are not looking for a single-family home",
    },
  },
  buys_cannabis: {
    id: "buys_cannabis",
    question: "Do you buy cannabis from a licensed store?",
    statement: "I buy cannabis from a licensed store",
    avatarPart: "leaf",
    because: {
      yes: "you buy cannabis at a store",
      no: "you do not buy cannabis at a store",
    },
  },
  owns_firearm: {
    id: "owns_firearm",
    question: "Do you own a firearm?",
    statement: "I own a firearm",
    avatarPart: "target",
    because: { yes: "you own a firearm", no: "you do not own a firearm" },
  },
  kids_in_schools: {
    id: "kids_in_schools",
    question: "Do you have kids in the public schools?",
    statement: "I have kids in the public schools",
    avatarPart: "backpack",
    because: { yes: "you have kids in the public schools", no: "you have no kids in the public schools" },
  },
  runs_business_here: {
    id: "runs_business_here",
    question: "Do you run a business in town?",
    statement: "I run a business in town",
    avatarPart: "storefront",
    because: { yes: "you run a business in town", no: "you do not run a business in town" },
  },
  drives: {
    id: "drives",
    question: "Do you drive in town?",
    statement: "I drive",
    avatarPart: "car",
    because: { yes: "you drive", no: "you do not drive" },
  },
  rides_transit: {
    id: "rides_transit",
    question: "Do you ride the bus, train, or subway?",
    statement: "I ride the bus, train, or subway",
    avatarPart: "bus",
    because: { yes: "you ride transit", no: "you do not ride transit" },
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
