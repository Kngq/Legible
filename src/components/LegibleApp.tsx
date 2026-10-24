"use client";

// Client shell: first run (Hello, town), then one screen per hash route (feed,
// document, measure, civic item), with the profile sheet on top. Routes carry only
// public ids; the profile never leaves this component tree.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ballot from "@/data/ballot-2026.json";
import civicData from "@/data/civic-ma.json";
import { civicCard, civicFeed, type CivicItem } from "@/lib/engine/civic";
import { buildFeed } from "@/lib/engine/feed";
import { relatedCivic, relatedMeasures } from "@/lib/engine/related";
import type { DocumentData } from "@/lib/engine/types";
import { parentRoute, parseRoute, routeHash, type Route } from "@/lib/nav/route";
import { CivicView } from "./CivicView";
import { DocumentView } from "./DocumentView";
import { FirstRun } from "./FirstRun";
import { Explore } from "./Explore";
import { Home } from "./Home";
import { MeasureView } from "./MeasureView";
import { ProfileSheet, type SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { useLegible } from "./useLegible";

// Every document the feed can show. Bundled ballot only until the catalog
// (task 17.2) is fetched whole; buildFeed filters by state and town locally.
const DOCS: DocumentData[] = [ballot as unknown as DocumentData];
// Deadlines, meetings, and bills (npm run data:civic). Filtered by town locally.
const CIVIC: CivicItem[] = civicData as unknown as CivicItem[];

// The hash is the source of truth for which screen shows. In-app taps push a
// history entry (so browser back works); popstate covers back and forward.
const NAV_EVENT = "legible:route";
function subscribeHash(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener(NAV_EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(NAV_EVENT, cb);
  };
}
const hashSnapshot = () => window.location.hash;
const serverHash = () => "";

export function LegibleApp() {
  const { loaded, today, profile, setProfile, preferences, setPreferences, canStore, forget } = useLegible();
  const [sheet, setSheet] = useState<SheetView | null>(null);
  // Where the person is, read from the URL hash.
  const hash = useSyncExternalStore(subscribeHash, hashSnapshot, serverHash);
  const route = parseRoute(hash);
  const scrolls = useRef<Record<string, number>>({});
  const restoreNext = useRef(false);
  // Session-only flags: never stored, never counted by the meter.
  const [savedBeyondTown, setSavedBeyondTown] = useState(false);
  const [rememberNotNow, setRememberNotNow] = useState(false);
  const closeSheet = useCallback(() => setSheet(null), []);
  // Clears the profile and preferences from this browser and returns to the start.
  const clearAll = () => {
    forget();
    setSavedBeyondTown(false);
    setRememberNotNow(false);
    window.history.replaceState(null, "", routeHash({ kind: "feed" }));
    window.dispatchEvent(new Event(NAV_EVENT));
  };
  const feed = useMemo(() => buildFeed(DOCS, profile, today), [profile, today]);
  const civic = useMemo(() => civicFeed(CIVIC, profile, today), [profile, today]);

  // Remember each screen's scroll as the person scrolls it.
  useEffect(() => {
    const onScroll = () => (scrolls.current[window.location.hash || "#/"] = window.scrollY);
    const onPop = () => (restoreNext.current = true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  // A new screen starts at the top; going back restores where the person was.
  useLayoutEffect(() => {
    const top = restoreNext.current ? (scrolls.current[hash || "#/"] ?? 0) : 0;
    restoreNext.current = false;
    window.scrollTo({ top });
  }, [hash]);

  if (!loaded) return <div className="min-h-dvh" aria-busy="true" />;

  if (!preferences.onboardingDone) {
    return (
      <FirstRun
        profile={profile}
        setProfile={setProfile}
        askToKeep={canStore && !preferences.remember}
        onKeep={() => setPreferences((p) => ({ ...p, remember: true }))}
        onNotNow={() => setRememberNotNow(true)}
        onDone={() => {
          setPreferences((p) => ({ ...p, onboardingDone: true }));
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const go = (next: Route) => {
    window.history.pushState({ legible: true }, "", routeHash(next));
    window.dispatchEvent(new Event(NAV_EVENT));
  };
  // In-page back: step back through history when this session pushed it; from a
  // pasted link, go up one level instead of leaving the app.
  const back = () => {
    if ((window.history.state as { legible?: boolean } | null)?.legible) window.history.back();
    else {
      restoreNext.current = true;
      window.history.replaceState(null, "", routeHash(parentRoute(route)));
      window.dispatchEvent(new Event(NAV_EVENT));
    }
  };
  const openMeasure = (docId: string, measureId: string) => go({ kind: "measure", docId, measureId });
  const openItem = (itemId: string) => go({ kind: "item", itemId });

  const town = townName(profile.townId);
  const docItem = route.kind === "doc" || route.kind === "measure" ? feed.items.find((i) => i.doc.id === route.docId) : undefined;
  const card = route.kind === "measure" ? docItem?.cards.find((c) => c.measure.id === route.measureId) : undefined;
  // Items are public: a pasted link to another town's meeting still opens.
  const rawItem = route.kind === "item" ? CIVIC.find((i) => i.id === route.itemId) : undefined;
  const itemCard = rawItem ? (civic.find((c) => c.item.id === rawItem.id) ?? civicCard(rawItem, profile, today)) : undefined;

  let page;
  if (card && docItem) {
    page = (
      <MeasureView
        key={card.measure.id}
        item={docItem}
        card={card}
        profile={profile}
        setProfile={setProfile}
        town={town}
        backLabel="Back"
        onBack={back}
        onOpenProfile={setSheet}
        related={relatedCivic(card.measure, civic)}
        onOpenItem={openItem}
      />
    );
  } else if (itemCard) {
    page = (
      <CivicView
        key={itemCard.item.id}
        card={itemCard}
        related={relatedMeasures(itemCard.item, feed.items)}
        backLabel="Back"
        onBack={back}
        onOpenMeasure={openMeasure}
        onOpenProfile={setSheet}
      />
    );
  } else if (route.kind === "doc" && docItem) {
    page = (
      <DocumentView
        item={docItem}
        today={today}
        profile={profile}
        town={town}
        onBack={back}
        onOpenMeasure={(measureId) => openMeasure(docItem.doc.id, measureId)}
      />
    );
  } else if (route.kind === "explore") {
    page = (
      <Explore
        feed={feed}
        civic={civic}
        today={today}
        profile={profile}
        onHome={() => go({ kind: "feed" })}
        onOpenDoc={(docId) => go({ kind: "doc", docId })}
        onOpenMeasure={openMeasure}
        onOpenItem={openItem}
        onOpenProfile={setSheet}
      />
    );
  } else {
    page = (
      <Home
        onExplore={() => go({ kind: "explore" })}
        feed={feed}
        civic={civic}
        today={today}
        profile={profile}
        onOpenDoc={(docId) => go({ kind: "doc", docId })}
        onOpenMeasure={openMeasure}
        onOpenItem={openItem}
        onOpenProfile={setSheet}
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
          onClear={() => {
            closeSheet();
            clearAll();
          }}
        />
      )}
    </>
  );
}
