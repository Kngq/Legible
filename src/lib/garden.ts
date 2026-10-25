// The garden: water earned by exploring, and water poured to grow the plant.
//
// Water comes only from reading civic information: opening a ballot question,
// a civic item, the full voter guide, or an official source. Each of those pays
// once (its key is remembered), so going back to the same page earns nothing
// new. Nothing a person answers, follows, or decides ever earns water.
//
// Growth is deterministic: every drop poured counts toward the next stage, and
// stages never go back. There is no decay and nothing happens from time away.
//
// Pure functions over a plain state object. The browser store (useGarden)
// keeps it in memory and writes it to localStorage only when "Remember on this
// device" is on. Never sent anywhere.
import { DEFAULT_VARIETY, nextStage, stageDef, stageFor, VARIETIES, type GrowthStage, type StageDef, type VarietyId } from "./growth";

export const GARDEN_STORAGE_KEY = "legible.garden.v1";

export type RewardKind = "question" | "item" | "guide" | "source";

/** Drops each kind of exploration earns, once per page. */
export const REWARD_DROPS: Record<RewardKind, number> = { question: 3, item: 2, guide: 2, source: 1 };

/** Drops every new garden starts with, so the first visit can water right away. */
export const WELCOME_DROPS = 3;
const WELCOME_KEY = "welcome";

/** Enough for every page in the app many times over; oldest keys drop off past it. */
const MAX_KEYS = 600;

export type GardenMilestone = { stage: GrowthStage; reachedOn: string };

/** What the plant can wear. One at a time; "none" for nothing. */
export type AccessoryId = "none" | "glasses" | "bow" | "hat" | "scarf";

export type AccessoryDef = { id: AccessoryId; name: string; unlocksAt: GrowthStage; locked: string };

/** In the order they are offered. Unlocking follows the plant's stage only. */
export const ACCESSORIES: readonly AccessoryDef[] = [
  { id: "none", name: "None", unlocksAt: 1, locked: "" },
  { id: "glasses", name: "Glasses", unlocksAt: 1, locked: "" },
  { id: "bow", name: "Bow", unlocksAt: 2, locked: "Unlocks when your plant sprouts." },
  { id: "hat", name: "Hat", unlocksAt: 3, locked: "Unlocks when your plant reaches Growing." },
  { id: "scarf", name: "Scarf", unlocksAt: 5, locked: "Unlocks when your plant starts blooming." },
];

export function accessoryDef(id: AccessoryId): AccessoryDef {
  return ACCESSORIES.find((a) => a.id === id) ?? ACCESSORIES[0];
}

export function accessoryUnlocked(id: AccessoryId, stage: GrowthStage): boolean {
  return stage >= accessoryDef(id).unlocksAt;
}

/** Accessories that unlock on the way from one stage to another. */
export function unlockedBetween(from: GrowthStage, to: GrowthStage): AccessoryDef[] {
  return ACCESSORIES.filter((a) => a.unlocksAt > from && a.unlocksAt <= to);
}

export type GardenState = {
  v: 1;
  variety: VarietyId;
  /** Drops ready to pour. */
  water: number;
  /** Drops poured in all. The plant's stage follows from this alone. */
  poured: number;
  /** Rewards already paid, as "kind:id". */
  earned: string[];
  /** The day each stage was first reached. */
  milestones: GardenMilestone[];
  /** The first-visit steps were finished or put away. */
  introDone: boolean;
  /** What the plant is wearing. */
  accessory: AccessoryId;
};

export function emptyGarden(today: string): GardenState {
  return {
    v: 1,
    variety: DEFAULT_VARIETY,
    water: WELCOME_DROPS,
    poured: 0,
    earned: [WELCOME_KEY],
    milestones: [{ stage: 1, reachedOn: today }],
    introDone: false,
    accessory: "none",
  };
}

export function rewardKey(kind: RewardKind, id: string): string {
  return `${kind}:${id}`;
}

/** Pays a reward once. Returns the same state and 0 drops when it was paid before. */
export function earn(s: GardenState, kind: RewardKind, id: string): { state: GardenState; drops: number } {
  const key = rewardKey(kind, id);
  if (!id || s.earned.includes(key)) return { state: s, drops: 0 };
  const drops = REWARD_DROPS[kind];
  return { state: { ...s, water: s.water + drops, earned: [...s.earned, key].slice(-MAX_KEYS) }, drops };
}

export function gardenStage(s: GardenState): GrowthStage {
  return stageFor(s.poured, s.variety);
}

export type PourResult = { state: GardenState; poured: number; from: GrowthStage; to: GrowthStage };

/**
 * Pours up to `want` drops, never more than the water there is. Every drop
 * poured counts. Adds a dated milestone for each stage newly reached.
 */
export function pour(s: GardenState, want: number, today: string): PourResult {
  const from = gardenStage(s);
  const n = Math.max(0, Math.min(Math.floor(Number.isFinite(want) ? want : 0), s.water));
  if (n === 0) return { state: s, poured: 0, from, to: from };
  const poured = s.poured + n;
  const to = stageFor(poured, s.variety);
  const have = new Set(s.milestones.map((m) => m.stage));
  const added: GardenMilestone[] = [];
  for (let st = 1; st <= to; st++) if (!have.has(st as GrowthStage)) added.push({ stage: st as GrowthStage, reachedOn: today });
  const milestones = [...s.milestones, ...added].sort((a, b) => a.stage - b.stage);
  return { state: { ...s, water: s.water - n, poured, milestones }, poured: n, from, to };
}

/** Puts on an accessory, or takes it off with "none". A locked one changes nothing. */
export function wear(s: GardenState, id: AccessoryId): GardenState {
  if (!accessoryUnlocked(id, gardenStage(s)) || s.accessory === id) return s;
  return { ...s, accessory: id };
}

export type Progress = {
  stage: GrowthStage;
  def: StageDef;
  next?: StageDef;
  /** Drops poured since this stage began. */
  into: number;
  /** Drops this stage needs in all, before the next. 0 once blooming. */
  span: number;
  /** Drops still to pour for the next stage. 0 once blooming. */
  toNext: number;
};

export function progress(s: GardenState): Progress {
  const stage = gardenStage(s);
  const def = stageDef(stage, s.variety);
  const next = nextStage(stage, s.variety);
  if (!next) return { stage, def, into: s.poured - def.drops, span: 0, toNext: 0 };
  return { stage, def, next, into: s.poured - def.drops, span: next.drops - def.drops, toNext: next.drops - s.poured };
}

/** One line of progress, in words, so nothing depends on seeing the bar. */
export function progressLine(p: Progress): string {
  if (!p.next) return "Fully bloomed! Every drop now makes it sparkle.";
  return `${p.toNext} more ${p.toNext === 1 ? "drop" : "drops"} until ${p.next.name.toLowerCase()}.`;
}

export function dropsLabel(n: number): string {
  return `${n} ${n === 1 ? "drop" : "drops"}`;
}

export type IntroStep = { id: "water" | "explore" | "grow"; done: boolean };

/** The first-visit steps, checked off by doing them. */
export function introSteps(s: GardenState): IntroStep[] {
  return [
    { id: "water", done: s.poured > 0 },
    { id: "explore", done: s.earned.some((k) => k !== WELCOME_KEY) },
    { id: "grow", done: gardenStage(s) >= 2 },
  ];
}

const count = (n: unknown) => (typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null);

/** Reads a stored garden back, or null when it is missing or not a garden. */
export function parseGarden(raw: string | null): GardenState | null {
  if (!raw) return null;
  let o: Partial<Record<keyof GardenState, unknown>>;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object" || o.v !== 1) return null;
  const water = count(o.water);
  const poured = count(o.poured);
  if (water === null || poured === null) return null;
  const variety = typeof o.variety === "string" && o.variety in VARIETIES ? (o.variety as VarietyId) : DEFAULT_VARIETY;
  const earned = Array.isArray(o.earned) ? o.earned.filter((k): k is string => typeof k === "string").slice(-MAX_KEYS) : [];
  const milestones = Array.isArray(o.milestones)
    ? o.milestones.filter(
        (m): m is GardenMilestone =>
          !!m && typeof m === "object" && [1, 2, 3, 4, 5].includes(m.stage) && typeof m.reachedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(m.reachedOn),
      )
    : [];
  const wearing = ACCESSORIES.find((a) => a.id === o.accessory);
  // A stored accessory the plant has not unlocked yet (an edited store) is taken off.
  const accessory = wearing && stageFor(poured, variety) >= wearing.unlocksAt ? wearing.id : "none";
  return { v: 1, variety, water, poured, earned, milestones, introDone: o.introDone === true, accessory };
}

export function storedGardenJSON(s: GardenState): string {
  return JSON.stringify(s);
}
