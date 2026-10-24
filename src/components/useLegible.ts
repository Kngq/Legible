"use client";

// App state: the life profile and device preferences. Lives in memory; written to
// localStorage only when "Remember on this device" is on. Never sent anywhere.
// Demo mode (`?demo=true`, development only with Ballot, Wrapped) loads a fixed
// example profile and never touches storage at all.
import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { startState } from "@/lib/engine/demo";
import { localISODate } from "@/lib/engine/feed";
import { emptyProfile, LEGACY_PROFILE_STORAGE_KEY, PROFILE_STORAGE_KEY, storedProfileJSON, type Preferences, type Profile } from "@/lib/engine/profile";
import { WRAPPED_ENABLED } from "@/lib/wrapped/flag";

const PRERENDER_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_PREFS: Preferences = { remember: false, onboardingDone: false };

export function useLegible() {
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
    // Storage exists only in the browser, so it is read after the first render.
    const start = startState(window.location.search, WRAPPED_ENABLED, () => window.localStorage);
    /* eslint-disable react-hooks/set-state-in-effect */
    setDemo(start.demo);
    setProfile(start.profile ?? emptyProfile());
    if (start.preferences) setPreferencesState(start.preferences);
    setCanStore(start.canStore);
    setToday(localISODate(new Date()));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded || demo || !preferences.remember) return;
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, storedProfileJSON(profile, preferences));
    } catch {
      // Storage full or blocked: keep running in memory.
    }
  }, [loaded, demo, profile, preferences]);

  // In demo mode "Remember on this device" cannot be switched on.
  const setPreferences = useCallback(
    (action: SetStateAction<Preferences>) =>
      setPreferencesState((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        return demo && next.remember ? { ...next, remember: false } : next;
      }),
    [demo],
  );

  const forget = useCallback(() => {
    if (!demo) {
      try {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
      } catch {}
    }
    setProfile(emptyProfile());
    setPreferencesState(DEFAULT_PREFS);
  }, [demo]);

  return { loaded, today, profile, setProfile, preferences, setPreferences, canStore, forget, demo };
}
