// Plant growth: one set of definitions for the plant's stages everywhere it
// appears (header, For you, the garden). A plant grows only from water the
// person pours, and water comes only from exploring civic information (see
// garden.ts). Growth never reflects profile answers, beliefs, or voting.
//
// Stages are defined per variety so other plants (a cactus, a tulip) can be
// added later as one more entry in VARIETIES, with their own stage names and
// drop totals. For now there is one: the little sprout.

export type GrowthStage = 1 | 2 | 3 | 4 | 5;

export type StageDef = {
  stage: GrowthStage;
  name: string;
  /** Timeline heading. */
  title: string;
  /** One friendly line for the timeline. */
  line: string;
  /** What the plant says when it reaches this stage. */
  cheer: string;
  /** Total drops poured that reach this stage. */
  drops: number;
};

export type VarietyId = "sprout";

export type PlantVariety = { id: VarietyId; name: string; stages: readonly StageDef[] };

export const VARIETIES: Record<VarietyId, PlantVariety> = {
  sprout: {
    id: "sprout",
    name: "Little sprout",
    stages: [
      { stage: 1, name: "Seed", title: "A seed is planted", line: "The first page of your story.", cheer: "Hello! I'm a tiny seedling.", drops: 0 },
      { stage: 2, name: "Sprout", title: "A little sprout", line: "Your first drops woke it up.", cheer: "Look, I sprouted!", drops: 3 },
      { stage: 3, name: "Growing", title: "Growing stronger", line: "Side stems branch out with new leaves.", cheer: "Look, new leaves!", drops: 8 },
      { stage: 4, name: "Budding", title: "First blossoms", line: "A full crown of leaves, and tiny white blossoms.", cheer: "Ooh, tiny blossoms!", drops: 15 },
      { stage: 5, name: "Blooming", title: "First bloom", line: "Your curiosity helped your little plant bloom.", cheer: "I bloomed! We're growing together.", drops: 24 },
    ],
  },
};

export const DEFAULT_VARIETY: VarietyId = "sprout";

/** The default variety's stages. */
export const GROWTH_STAGES = VARIETIES[DEFAULT_VARIETY].stages;

export function stageDef(stage: GrowthStage, variety: VarietyId = DEFAULT_VARIETY): StageDef {
  return VARIETIES[variety].stages[stage - 1];
}

/** The highest stage the drops poured reach. */
export function stageFor(poured: number, variety: VarietyId = DEFAULT_VARIETY): GrowthStage {
  let s: GrowthStage = 1;
  for (const d of VARIETIES[variety].stages) if (poured >= d.drops) s = d.stage;
  return s;
}

export function nextStage(stage: GrowthStage, variety: VarietyId = DEFAULT_VARIETY): StageDef | undefined {
  return stage < 5 ? stageDef((stage + 1) as GrowthStage, variety) : undefined;
}

/** "October 12" for an ISO date, read as a calendar day (no time zone shift). */
export function milestoneDate(iso: string | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}
