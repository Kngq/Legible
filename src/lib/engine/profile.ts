// Life profile: everything Legible gathers about one person, and how each answer
// was gathered. Pure TypeScript. Lives only in the browser; never sent anywhere.
import { FACT_IDS, TOPIC_IDS, type FactId, type TopicId } from "@/lib/vocab";

export const PROFILE_VERSION = 1 as const;
export const PROFILE_STORAGE_KEY = "legible.profile.v1";
/** Key used before the app was renamed from Nine to Legible. Read once, then moved. */
export const LEGACY_PROFILE_STORAGE_KEY = "nine.profile.v1";

/** Where an answer was given. Lets the UI explain itself and lets tests check ask-once rules. */
export type AnswerSource =
  | { kind: "onboarding" }
  | { kind: "card"; documentId: string; measureId: string }
  | { kind: "item"; itemId: string }   // a bill or other civic item's page
  | { kind: "open_questions" }
  | { kind: "edit" }          // because chip, avatar badge, or profile page
  | { kind: "persona"; personaId: string };

export interface FactAnswer {
  value: boolean;
  source: AnswerSource;
  at: string;                 // ISO timestamp, device clock
}

export interface FactSkip {
  source: AnswerSource;
  at: string;
  /** Number of times asked and declined. 1 after onboarding, 2 after a card. Never asked at 2. */
  times: number;
}

export interface TopicChoice {
  via: "chip" | "typed";      // typed text itself is never stored
  at: string;
}

export interface Profile {
  version: typeof PROFILE_VERSION;
  /** First name or nickname for the greeting. Browser-only, like every life fact; never sent. */
  name?: string;
  townId?: string;
  facts: Partial<Record<FactId, FactAnswer>>;
  skipped: Partial<Record<FactId, FactSkip>>;
  topics: Partial<Record<TopicId, TopicChoice>>;
  /** Set when the person leaves the topics screen with Continue, even with no chips on. Skip leaves it unset. */
  topicsConfirmedAt?: string;
  source: "self" | "persona";
  createdAt: string;
  updatedAt: string;
}

/** Per-device preferences, stored next to the profile under the same consent. */
export interface Preferences {
  remember: boolean;          // default false: refresh clears the profile
  onboardingDone: boolean;
}

/** In-memory session state. Stored only when `remember` is on. Never leaves the browser. */
export interface SessionState {
  openedDocuments: Record<string, { lastOpenedAt: string; expandedMeasureIds: string[] }>;
  dismissedOpenQuestions: FactId[];
  activePersonaId?: string;   // persona view; the self profile is kept aside, untouched
}

export const MAX_SKIP_TIMES = 2;

export function emptyProfile(now = new Date().toISOString()): Profile {
  return { version: PROFILE_VERSION, facts: {}, skipped: {}, topics: {}, source: "self", createdAt: now, updatedAt: now };
}

/** Plain yes/no view the engine consumes. */
export function factValues(p: Profile): Partial<Record<FactId, boolean>> {
  const out: Partial<Record<FactId, boolean>> = {};
  for (const id of FACT_IDS) {
    const a = p.facts[id];
    if (a) out[id] = a.value;
  }
  return out;
}

export function topicIds(p: Profile): TopicId[] {
  return TOPIC_IDS.filter((id) => p.topics[id]);
}

export function answerFact(p: Profile, id: FactId, value: boolean, source: AnswerSource, now = new Date().toISOString()): Profile {
  const skipped = { ...p.skipped };
  delete skipped[id];
  return { ...p, facts: { ...p.facts, [id]: { value, source, at: now } }, skipped, updatedAt: now };
}

export function skipFact(p: Profile, id: FactId, source: AnswerSource, now = new Date().toISOString()): Profile {
  const prev = p.skipped[id];
  return { ...p, skipped: { ...p.skipped, [id]: { source, at: now, times: (prev?.times ?? 0) + 1 } }, updatedAt: now };
}

/** "Prefer not to say": settled for good. Never asked again, and counts toward the personalization meter. */
export function declineFact(p: Profile, id: FactId, source: AnswerSource, now = new Date().toISOString()): Profile {
  const facts = { ...p.facts };
  delete facts[id];
  return { ...p, facts, skipped: { ...p.skipped, [id]: { source, at: now, times: MAX_SKIP_TIMES } }, updatedAt: now };
}

/** Answered either way, or declined for good. A plain "Skip for now" is not settled. */
export function isFactSettled(p: Profile, id: FactId): boolean {
  return Boolean(p.facts[id]) || (p.skipped[id]?.times ?? 0) >= MAX_SKIP_TIMES;
}

/**
 * Record one "Pick all that apply" screen: picked facts are yes, the rest of the
 * screen's facts are no. Only called once the person picks something or "None of these".
 */
export function answerArea(p: Profile, facts: readonly FactId[], picked: readonly FactId[], source: AnswerSource, now = new Date().toISOString()): Profile {
  return facts.reduce((acc, id) => answerFact(acc, id, picked.includes(id), source, now), p);
}

export function declineArea(p: Profile, facts: readonly FactId[], source: AnswerSource, now = new Date().toISOString()): Profile {
  return facts.reduce((acc, id) => declineFact(acc, id, source, now), p);
}

export function confirmTopics(p: Profile, now = new Date().toISOString()): Profile {
  return { ...p, topicsConfirmedAt: now, updatedAt: now };
}

export function clearFact(p: Profile, id: FactId, now = new Date().toISOString()): Profile {
  const facts = { ...p.facts };
  delete facts[id];
  const skipped = { ...p.skipped };
  delete skipped[id];
  return { ...p, facts, skipped, updatedAt: now };
}

export function setTopic(p: Profile, id: TopicId, on: boolean, via: "chip" | "typed" = "chip", now = new Date().toISOString()): Profile {
  const topics = { ...p.topics };
  if (on) topics[id] = { via, at: now };
  else delete topics[id];
  return { ...p, topics, updatedAt: now };
}

/** May this fact be asked inside a card right now? Unanswered, and declined fewer than MAX_SKIP_TIMES times. */
export function canAskInCard(p: Profile, id: FactId): boolean {
  if (p.facts[id]) return false;
  return (p.skipped[id]?.times ?? 0) < MAX_SKIP_TIMES;
}

/** What "Remember on this device" writes: the profile and its preferences. */
export interface StoredProfile {
  profile: Profile;
  preferences: Preferences;
}

export function storedProfileJSON(profile: Profile, preferences: Preferences): string {
  return JSON.stringify({ profile, preferences, session: {} });
}

/**
 * Read what storedProfileJSON wrote. A stored profile exists only because
 * remember was on, so remember reads back as on; onboardingDone is kept as saved,
 * which is what lets a returning person skip first run. Null for anything unreadable.
 */
export function parseStoredProfile(raw: string | null): StoredProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { profile?: unknown; preferences?: Partial<Preferences> };
    const profile = parseProfile(parsed.profile);
    if (!profile) return null;
    return { profile, preferences: { remember: true, onboardingDone: Boolean(parsed.preferences?.onboardingDone) } };
  } catch {
    return null;
  }
}

/**
 * Validate a value read from storage. Unknown fact or topic ids are dropped so a
 * vocab change never breaks an old profile. Returns null when the shape is wrong.
 */
export function parseProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== PROFILE_VERSION) return null;
  const now = new Date().toISOString();
  const out = emptyProfile(typeof r.createdAt === "string" ? r.createdAt : now);
  if (typeof r.townId === "string") out.townId = r.townId;
  if (typeof r.name === "string" && r.name.trim()) out.name = r.name.trim().slice(0, 40);
  if (typeof r.topicsConfirmedAt === "string") out.topicsConfirmedAt = r.topicsConfirmedAt;
  if (r.source === "persona") out.source = "persona";
  if (typeof r.updatedAt === "string") out.updatedAt = r.updatedAt;
  const facts = (r.facts ?? {}) as Record<string, Partial<FactAnswer>>;
  for (const id of FACT_IDS) {
    const a = facts[id];
    if (a && typeof a.value === "boolean" && a.source && typeof a.at === "string") out.facts[id] = a as FactAnswer;
  }
  const skipped = (r.skipped ?? {}) as Record<string, Partial<FactSkip>>;
  for (const id of FACT_IDS) {
    const s = skipped[id];
    if (s && s.source && typeof s.at === "string" && typeof s.times === "number") out.skipped[id] = s as FactSkip;
  }
  const topics = (r.topics ?? {}) as Record<string, Partial<TopicChoice>>;
  for (const id of TOPIC_IDS) {
    const t = topics[id];
    if (t && (t.via === "chip" || t.via === "typed") && typeof t.at === "string") out.topics[id] = t as TopicChoice;
  }
  return out;
}
