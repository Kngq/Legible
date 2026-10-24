// Plant growth: one set of definitions for the plant's stage everywhere it
// appears (header avatar, profile, Growth Story). Growth reflects civic
// exploration only: decisions explored and official sources opened. It never
// reflects profile completion, private facts, beliefs, or voting.
//
// Nothing here is tracked yet. These types are the proposed shape for a
// browser-only history: aggregate totals plus the date each stage was reached.
// No per-click log, nothing sent to a server.

export type GrowthStage = 1 | 2 | 3 | 4 | 5;

/** Aggregate totals. `followed` is shown but never moves the plant: it comes from profile interests. */
export type GrowthTotals = { decisions: number; sources: number; followed: number };

export type Milestone = {
  stage: GrowthStage;
  /** ISO date (YYYY-MM-DD) the stage was reached, when known. */
  reachedOn?: string;
  /** Totals at that moment, when known. */
  totals?: GrowthTotals;
};

export type GrowthHistory = { totals: GrowthTotals; milestones: Milestone[] };

export type StageDef = {
  stage: GrowthStage;
  name: string;
  /** Timeline heading. */
  title: string;
  /** One friendly line for the timeline. */
  line: string;
  /** Shown while this is the next stage. */
  toward: string;
  /** What it takes to reach this stage. */
  needs: { decisions: number; sources: number };
};

export const GROWTH_STAGES: readonly StageDef[] = [
  { stage: 1, name: "Seed", title: "A seed is planted", line: "The first page of your story.", toward: "", needs: { decisions: 0, sources: 0 } },
  { stage: 2, name: "Sprout", title: "A little sprout", line: "You explored your first decision.", toward: "Growing toward a first sprout", needs: { decisions: 1, sources: 0 } },
  { stage: 3, name: "Growing", title: "Growing stronger", line: "You kept exploring and went to the official sources.", toward: "Growing toward a stronger stem", needs: { decisions: 3, sources: 1 } },
  { stage: 4, name: "Flourishing", title: "Flourishing", line: "You looked closely at the decisions around you.", toward: "Growing toward fuller leaves", needs: { decisions: 6, sources: 3 } },
  { stage: 5, name: "Blooming", title: "First bloom", line: "Your curiosity helped your little plant bloom.", toward: "Growing toward your first bloom", needs: { decisions: 9, sources: 5 } },
];

export const ZERO: GrowthTotals = { decisions: 0, sources: 0, followed: 0 };

export function stageDef(stage: GrowthStage): StageDef {
  return GROWTH_STAGES[stage - 1];
}

/** The highest stage whose needs the totals meet. */
export function stageFor(t: GrowthTotals): GrowthStage {
  let s: GrowthStage = 1;
  for (const d of GROWTH_STAGES) if (t.decisions >= d.needs.decisions && t.sources >= d.needs.sources) s = d.stage;
  return s;
}

export function nextStage(stage: GrowthStage): StageDef | undefined {
  return stage < 5 ? stageDef((stage + 1) as GrowthStage) : undefined;
}

/**
 * New totals in, history out: adds a milestone for every stage the totals now
 * reach that the history lacks, dated `today`. Stages never go back down.
 */
export function withTotals(h: GrowthHistory, totals: GrowthTotals, today: string): GrowthHistory {
  const have = new Set(h.milestones.map((m) => m.stage));
  const added: Milestone[] = [];
  for (let s = 1; s <= stageFor(totals); s++) {
    if (!have.has(s as GrowthStage)) added.push({ stage: s as GrowthStage, reachedOn: today, totals });
  }
  const milestones = [...h.milestones, ...added].sort((a, b) => a.stage - b.stage);
  return { totals, milestones };
}

/** The plant's stage for a history: its highest milestone. */
export function currentStage(h: GrowthHistory | null): GrowthStage {
  return h?.milestones.reduce<GrowthStage>((s, m) => (m.stage > s ? m.stage : s), 1) ?? 1;
}

/** "3 decisions explored · 2 official sources opened", or "" for none. */
export function activityLine(t: GrowthTotals | undefined): string {
  if (!t) return "";
  const parts: string[] = [];
  if (t.decisions) parts.push(`${t.decisions} ${t.decisions === 1 ? "decision" : "decisions"} explored`);
  if (t.sources) parts.push(`${t.sources} official ${t.sources === 1 ? "source" : "sources"} opened`);
  return parts.join(" · ");
}

/** "October 12" for an ISO date, read as a calendar day (no time zone shift). */
export function milestoneDate(iso: string | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}
