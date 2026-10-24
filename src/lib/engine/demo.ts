// Demo mode for "Your ballot, wrapped" (from Layla's branch, f20bfe8). `?demo=true`
// loads a fixed, labelled example profile and never touches storage: no read, no
// probe, no write, no remove, so a saved profile on this device stays exactly as it was.
import { answerFact, emptyProfile, LEGACY_PROFILE_STORAGE_KEY, parseStoredProfile, PROFILE_STORAGE_KEY, setTopic, type AnswerSource, type Preferences, type Profile } from "./profile";

const DEMO_SOURCE: AnswerSource = { kind: "persona", personaId: "wrapped-demo" };

export const DEMO_PREFERENCES: Preferences = { remember: false, onboardingDone: true };

/** True only when the query string's first `demo` value is exactly `true`. */
export function isDemoQuery(search: string): boolean {
  return new URLSearchParams(search).get("demo") === "true";
}

/** A fixed Cambridge renter who rides transit and follows housing costs and roads and transit. */
export function demoPersona(now: string = new Date().toISOString()): Profile {
  let p: Profile = { ...emptyProfile(now), townId: "cambridge", source: "persona" };
  p = answerFact(p, "rents", true, DEMO_SOURCE, now);
  p = answerFact(p, "owns", false, DEMO_SOURCE, now);
  p = answerFact(p, "rides_transit", true, DEMO_SOURCE, now);
  p = setTopic(p, "housing_costs", true, "chip", now);
  p = setTopic(p, "roads_transit", true, "chip", now);
  return p;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type StartState =
  | { demo: true; profile: Profile; preferences: Preferences; canStore: false }
  | { demo: false; profile: Profile | null; preferences: Preferences | null; canStore: boolean };

/**
 * What the app starts with after mount. `storage` is a getter so demo mode never
 * even reaches for `localStorage`. Outside demo mode: the saved profile (moving
 * one saved under the old app name to the new key) and whether storage works.
 */
export function startState(search: string, demoAllowed: boolean, storage: () => StorageLike): StartState {
  if (demoAllowed && isDemoQuery(search)) {
    return { demo: true, profile: demoPersona(), preferences: DEMO_PREFERENCES, canStore: false };
  }
  let stored = null;
  let canStore = false;
  try {
    const s = storage();
    let raw = s.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      raw = s.getItem(LEGACY_PROFILE_STORAGE_KEY);
      if (raw) {
        s.setItem(PROFILE_STORAGE_KEY, raw);
        s.removeItem(LEGACY_PROFILE_STORAGE_KEY);
      }
    }
    stored = parseStoredProfile(raw);
  } catch {
    stored = null;
  }
  try {
    const s = storage();
    const k = `${PROFILE_STORAGE_KEY}.probe`;
    s.setItem(k, "1");
    s.removeItem(k);
    canStore = true;
  } catch {
    canStore = false;
  }
  return { demo: false, profile: stored?.profile ?? null, preferences: stored?.preferences ?? null, canStore };
}
