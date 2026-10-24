"use client";

// Client shell: first run (Hello, town), then Home with the profile sheet on top.
// The profile never leaves this component tree.
import { useCallback, useState } from "react";
import ballot from "@/data/ballot-2026.json";
import type { DocumentData } from "@/lib/engine/types";
import { FirstRun } from "./FirstRun";
import { Home } from "./Home";
import { ProfileSheet, type SheetView } from "./ProfileSheet";
import { useNine } from "./useNine";

// Bundled until the public catalog (task 17) exists.
const BALLOT = ballot as unknown as DocumentData;

export function NineApp() {
  const { loaded, profile, setProfile, preferences, setPreferences, canStore, forget } = useNine();
  const [sheet, setSheet] = useState<SheetView | null>(null);
  // Session-only flags: never stored, never counted by the meter.
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [savedBeyondTown, setSavedBeyondTown] = useState(false);
  const [rememberNotNow, setRememberNotNow] = useState(false);
  const closeSheet = useCallback(() => setSheet(null), []);

  if (!loaded) return <div className="min-h-dvh" aria-busy="true" />;

  if (!preferences.onboardingDone) {
    return (
      <FirstRun
        profile={profile}
        setProfile={setProfile}
        onDone={() => {
          setPreferences((p) => ({ ...p, onboardingDone: true }));
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <>
      <Home
        doc={BALLOT}
        profile={profile}
        setProfile={setProfile}
        remember={preferences.remember}
        onOpenProfile={setSheet}
        onForget={() => {
          forget();
          setSavedBeyondTown(false);
          setRememberNotNow(false);
        }}
        nudgeDismissed={nudgeDismissed}
        onDismissNudge={() => setNudgeDismissed(true)}
      />
      {sheet && (
        <ProfileSheet
          key={JSON.stringify(sheet)}
          profile={profile}
          setProfile={setProfile}
          initial={sheet}
          onClose={closeSheet}
          rememberPrompt={canStore && !preferences.remember && savedBeyondTown && !rememberNotNow}
          onKeep={() => setPreferences((p) => ({ ...p, remember: true }))}
          onNotNow={() => setRememberNotNow(true)}
          onSavedBeyondTown={() => setSavedBeyondTown(true)}
        />
      )}
    </>
  );
}
