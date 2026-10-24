"use client";

// App state: the life profile and device preferences. Lives in memory; written to
// localStorage only when "Remember on this device" is on. Never sent anywhere.
import { useCallback, useEffect, useState } from "react";
import { localISODate } from "@/lib/engine/feed";
import { emptyProfile, LEGACY_PROFILE_STORAGE_KEY, parseProfile, PROFILE_STORAGE_KEY, type Preferences, type Profile } from "@/lib/engine/profile";

interface Stored {
  profile: Profile;
  preferences: Preferences;
}

const PRERENDER_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_PREFS: Preferences = { remember: false, onboardingDone: false };

function readStored(): Stored | null {
  try {
    let raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      // Move a profile saved under the old app name to the new key.
      raw = window.localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);
      if (raw) {
        window.localStorage.setItem(PROFILE_STORAGE_KEY, raw);
        window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { profile?: unknown; preferences?: Partial<Preferences> };
    const profile = parseProfile(parsed.profile);
    if (!profile) return null;
    return { profile, preferences: { remember: true, onboardingDone: Boolean(parsed.preferences?.onboardingDone) } };
  } catch {
    return null;
  }
}

function storageWorks(): boolean {
  try {
    const k = `${PROFILE_STORAGE_KEY}.probe`;
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function useLegible() {
  const [loaded, setLoaded] = useState(false);
  // Fixed timestamp for the prerender; the real one is set on mount.
  const [profile, setProfile] = useState<Profile>(() => emptyProfile(PRERENDER_AT));
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFS);
  const [canStore, setCanStore] = useState(true);
  // Device date, read after mount so the prerender never depends on the clock.
  const [today, setToday] = useState(PRERENDER_AT.slice(0, 10));

  useEffect(() => {
    // Storage exists only in the browser, so it is read after the first render.
    const stored = readStored();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (stored) {
      setProfile(stored.profile);
      setPreferences(stored.preferences);
    } else setProfile(emptyProfile());
    setCanStore(storageWorks());
    setToday(localISODate(new Date()));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded || !preferences.remember) return;
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ profile, preferences, session: {} }));
    } catch {
      // Storage full or blocked: keep running in memory.
    }
  }, [loaded, profile, preferences]);

  const forget = useCallback(() => {
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
    } catch {}
    setProfile(emptyProfile());
    setPreferences(DEFAULT_PREFS);
  }, []);

  return { loaded, today, profile, setProfile, preferences, setPreferences, canStore, forget };
}
