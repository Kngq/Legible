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
import { MeasureView } from "./MeasureView";
import { ProfileSheet, type SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { useNine } from "./useNine";

// Every document the feed can show. Bundled ballot only until the catalog
// (task 17.2) is fetched whole; buildFeed filters by state and town locally.
const DOCS: DocumentData[] = [ballot as unknown as DocumentData];

type View = { kind: "feed" } | { kind: "doc"; docId: string } | { kind: "measure"; docId: string; measureId: string; from: "feed" | "doc" };

const viewKey = (v: View) => (v.kind === "feed" ? "feed" : v.kind === "doc" ? `doc:${v.docId}` : `m:${v.measureId}`);

export function NineApp() {
  const { loaded, today, profile, setProfile, preferences, setPreferences, canStore, forget } = useNine();
  const [sheet, setSheet] = useState<SheetView | null>(null);
  // Where the person is: the feed, one document, or one measure read like an article.
  const [view, setView] = useState<View>({ kind: "feed" });
  const scrolls = useRef<Record<string, number>>({});
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

  // Leave a page remembering its scroll; arriving at a new page starts at the top,
  // returning to an earlier one restores where the person was.
  const go = (next: View, restore = false) => {
    scrolls.current[viewKey(view)] = window.scrollY;
    flushSync(() => setView(next));
    window.scrollTo({ top: restore ? (scrolls.current[viewKey(next)] ?? 0) : 0 });
  };
  const town = townName(profile.townId);
  const docItem = view.kind !== "feed" ? feed.items.find((i) => i.doc.id === view.docId) : undefined;
  const card = view.kind === "measure" ? docItem?.cards.find((c) => c.measure.id === view.measureId) : undefined;

  let page;
  if (view.kind === "measure" && docItem && card) {
    const back: View = view.from === "doc" ? { kind: "doc", docId: view.docId } : { kind: "feed" };
    page = (
      <MeasureView
        key={view.measureId}
        item={docItem}
        card={card}
        profile={profile}
        setProfile={setProfile}
        town={town}
        backLabel={view.from === "doc" ? "Back to the document" : "Back to all decisions"}
        onBack={() => go(back, true)}
        onOpenProfile={setSheet}
      />
    );
  } else if (view.kind === "doc" && docItem) {
    page = (
      <DocumentView
        item={docItem}
        today={today}
        profile={profile}
        town={town}
        onBack={() => go({ kind: "feed" }, true)}
        onOpenMeasure={(measureId) => go({ kind: "measure", docId: docItem.doc.id, measureId, from: "doc" })}
      />
    );
  } else {
    page = (
      <Home
        feed={feed}
        today={today}
        profile={profile}
        remember={preferences.remember}
        onOpenDoc={(docId) => go({ kind: "doc", docId })}
        onOpenMeasure={(docId, measureId) => go({ kind: "measure", docId, measureId, from: "feed" })}
        onOpenProfile={setSheet}
        onForget={() => {
          forget();
          setSavedBeyondTown(false);
          setRememberNotNow(false);
          setView({ kind: "feed" });
        }}
        nudgeDismissed={nudgeDismissed}
        onDismissNudge={() => setNudgeDismissed(true)}
      />
    );
  }

  return (
    <>
      {page}
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
