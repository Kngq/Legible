"use client";

// Client shell: first run (Hello, town), then the feed or one document, with the
// profile sheet on top. The profile never leaves this component tree.
import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import ballot from "@/data/ballot-2026.json";
import { buildFeed } from "@/lib/engine/feed";
import type { DocumentData } from "@/lib/engine/types";
import { DocumentView } from "./DocumentView";
import { FirstRun } from "./FirstRun";
import { Home } from "./Home";
import { ProfileSheet, type SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { useNine } from "./useNine";

// Every document the feed can show. Bundled ballot only until the catalog
// (task 17.2) is fetched whole; buildFeed filters by state and town locally.
const DOCS: DocumentData[] = [ballot as unknown as DocumentData];

export function NineApp() {
  const { loaded, today, profile, setProfile, preferences, setPreferences, canStore, forget } = useNine();
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const feedScroll = useRef(0);
  // Session-only flags: never stored, never counted by the meter.
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [savedBeyondTown, setSavedBeyondTown] = useState(false);
  const [rememberNotNow, setRememberNotNow] = useState(false);
  const closeSheet = useCallback(() => setSheet(null), []);
  const feed = useMemo(() => buildFeed(DOCS, profile, today), [profile, today]);

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

  const openItem = openDocId ? feed.items.find((i) => i.doc.id === openDocId) : undefined;

  return (
    <>
      {openItem ? (
        <DocumentView
          item={openItem}
          today={today}
          profile={profile}
          setProfile={setProfile}
          town={townName(profile.townId)}
          onOpenProfile={setSheet}
          onBack={() => {
            // Render the feed first, then return to where the person was in it.
            flushSync(() => setOpenDocId(null));
            window.scrollTo({ top: feedScroll.current });
          }}
        />
      ) : (
        <Home
          feed={feed}
          today={today}
          profile={profile}
          remember={preferences.remember}
          onOpenDoc={(id) => {
            feedScroll.current = window.scrollY;
            setOpenDocId(id);
            window.scrollTo({ top: 0 });
          }}
          onOpenProfile={setSheet}
          onForget={() => {
            forget();
            setSavedBeyondTown(false);
            setRememberNotNow(false);
            setOpenDocId(null);
          }}
          nudgeDismissed={nudgeDismissed}
          onDismissNudge={() => setNudgeDismissed(true)}
        />
      )}
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
