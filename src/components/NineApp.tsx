"use client";

// Client shell: first run (Hello, town), then the feed or one document, with the
// profile sheet on top. The profile never leaves this component tree.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { WrappedPlayer } from "./wrapped/WrappedPlayer";

// Every document the feed can show. Bundled ballot only until the catalog
// (task 17.2) is fetched whole; buildFeed filters by state and town locally.
const DOCS: DocumentData[] = [ballot as unknown as DocumentData];

// `focusFirst` is set only when Ballot Wrapped's "See your full ballot" opens the document.
type View = { kind: "feed" } | { kind: "doc"; docId: string; focusFirst?: boolean } | { kind: "measure"; docId: string; measureId: string; from: "feed" | "doc" };

const viewKey = (v: View) => (v.kind === "feed" ? "feed" : v.kind === "doc" ? `doc:${v.docId}` : `m:${v.measureId}`);

export function NineApp() {
  const { loaded, today, profile, setProfile, preferences, setPreferences, canStore, forget, demo } = useNine();
  const [sheet, setSheet] = useState<SheetView | null>(null);
  // Where the person is: the feed, one document, or one measure read like an article.
  const [view, setView] = useState<View>({ kind: "feed" });
  const scrolls = useRef<Record<string, number>>({});
  // Ballot Wrapped: `key` increments on every open so the player always starts at the Intro.
  const [wrapped, setWrapped] = useState({ open: false, key: 0 });
  const wrappedButtonRef = useRef<HTMLButtonElement>(null);
  const wrappedScrollY = useRef(0);
  // Where the person asked to go on close; read once the page is no longer inert.
  const wrappedCloseTo = useRef<"home" | "ballot" | null>(null);
  const openWrapped = useCallback(() => {
    wrappedScrollY.current = window.scrollY;
    setWrapped((w) => ({ open: true, key: w.key + 1 }));
  }, []);
  const closeWrapped = useCallback((to: "home" | "ballot") => {
    wrappedCloseTo.current = to;
    if (to === "ballot") {
      // Back from the document returns to where the feed was before Wrapped opened.
      scrolls.current.feed = wrappedScrollY.current;
      setView({ kind: "doc", docId: "ballot-2026", focusFirst: true });
    }
    setWrapped((w) => ({ ...w, open: false }));
  }, []);
  // Background lock: <html> overflow hidden while open, restored to its previous value on
  // close or unmount. After close commits (page no longer inert), restore scroll and focus.
  useEffect(() => {
    const html = document.documentElement;
    if (wrapped.open) {
      const previous = html.style.overflow;
      html.style.overflow = "hidden";
      return () => {
        html.style.overflow = previous;
      };
    }
    const to = wrappedCloseTo.current;
    wrappedCloseTo.current = null;
    if (to === "home") {
      window.scrollTo({ top: wrappedScrollY.current });
      wrappedButtonRef.current?.focus({ preventScroll: true });
    } else if (to === "ballot") {
      window.scrollTo({ top: 0 });
    }
  }, [wrapped.open]);
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
        focusFirst={view.focusFirst}
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
        demo={demo}
        onOpenWrapped={openWrapped}
        wrappedButtonRef={wrappedButtonRef}
      />
    );
  }

  return (
    <>
      {/* Inert while Wrapped is open, so focus and assistive technology stay in the dialog. */}
      <div inert={wrapped.open}>{page}</div>
      {wrapped.open && <WrappedPlayer key={wrapped.key} profile={profile} onClose={closeWrapped} />}
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
