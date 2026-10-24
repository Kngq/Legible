"use client";

// Client shell: onboarding first, then home. The profile never leaves this component tree.
import { useState } from "react";
import ballot from "@/data/ballot-2026.json";
import type { DocumentData } from "@/lib/engine/types";
import { Home } from "./Home";
import { Onboarding } from "./Onboarding";
import { useNine } from "./useNine";

// Bundled until the public catalog (task 17) exists.
const BALLOT = ballot as unknown as DocumentData;

export function NineApp() {
  const { loaded, profile, setProfile, preferences, setPreferences, canStore, forget } = useNine();
  const [editing, setEditing] = useState(false);

  if (!loaded) return <div className="min-h-dvh" aria-busy="true" />;

  if (!preferences.onboardingDone || editing) {
    return (
      <Onboarding
        key={editing ? "edit" : "first"}
        profile={profile}
        setProfile={setProfile}
        mode={editing ? "edit" : "first"}
        canStore={canStore}
        onKeep={(remember) => setPreferences({ ...preferences, remember })}
        onFinish={() => {
          setEditing(false);
          setPreferences((p) => ({ ...p, onboardingDone: true }));
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <Home
      doc={BALLOT}
      profile={profile}
      setProfile={setProfile}
      remember={preferences.remember}
      canStore={canStore}
      onRemember={() => setPreferences({ ...preferences, remember: true })}
      onEdit={() => setEditing(true)}
      onForget={forget}
    />
  );
}
