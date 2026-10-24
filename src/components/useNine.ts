"use client";

// App state: the life profile and device preferences. Lives in memory; written to
// localStorage only when "Remember on this device" is on. Never sent anywhere.
// Demo mode (`?demo=true`) loads a fixed persona and never touches storage.
import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { demoPersona, isDemoQuery } from "@/lib/engine/demo";
import { localISODate } from "@/lib/engine/feed";
import { emptyProfile, parseProfile, PROFILE_STORAGE_KEY, type Preferences, type Profile } from "@/lib/engine/profile";

interface Stored {
  profile: Profile;
  preferences: Preferences;
}

const PRERENDER_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_PREFS: Preferences = { remember: false, onboardingDone: false };
const DEMO_PREFS: Preferences = { remember: false, onboardingDone: true };

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
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

export function useNine() {
  const [loaded, setLoaded] = useState(false);
  // Fixed timestamp for the prerender; the real one is set on mount.
  const [profile, setProfile] = useState<Profile>(() => emptyProfile(PRERENDER_AT));
  const [preferences, setPreferencesState] = useState<Preferences>(DEFAULT_PREFS);
  const [canStore, setCanStore] = useState(true);
  // Decided once after mount from the URL; storage is never touched while true.
  const [demo, setDemo] = useState(false);
  // Device date, read after mount so the prerender never depends on the clock.
  const [today, setToday] = useState(PRERENDER_AT.slice(0, 10));

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isDemoQuery(window.location.search)) {
      // Demo: no storage read, no probe write.
      setDemo(true);
      setProfile(demoPersona());
      setPreferencesState(DEMO_PREFS);
      setCanStore(false);
    } else {
      // Storage exists only in the browser, so it is read after the first render.
      const stored = readStored();
      if (stored) {
        setProfile(stored.profile);
        setPreferencesState(stored.preferences);
      } else setProfile(emptyProfile());
      setCanStore(storageWorks());
    }
    setToday(localISODate(new Date()));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded || demo || !preferences.remember) return;
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ profile, preferences, session: {} }));
    } catch {
      // Storage full or blocked: keep running in memory.
    }
  }, [loaded, demo, profile, preferences]);

  // In demo mode "Remember on this device" is ignored, so nothing is ever persisted.
  const setPreferences = useCallback(
    (action: SetStateAction<Preferences>) => {
      setPreferencesState((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        return demo && next.remember ? { ...next, remember: false } : next;
      });
    },
    [demo],
  );

  const forget = useCallback(() => {
    if (!demo) {
      try {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      } catch {}
    }
    setProfile(emptyProfile());
    setPreferencesState(DEFAULT_PREFS);
  }, [demo]);

  return { loaded, today, profile, setProfile, preferences, setPreferences, canStore, forget, demo };
}
