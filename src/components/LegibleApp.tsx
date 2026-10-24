"use client";

// Client shell: first run (Hello, town), then one screen per hash route (feed,
// document, measure, civic item), with the profile sheet on top. Routes carry only
// public ids; the profile never leaves this component tree.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ballot from "@/data/ballot-2026.json";
import civicData from "@/data/civic-ma.json";
import { civicCard, civicFeed, type CivicItem } from "@/lib/engine/civic";
import type { AskSource } from "@/lib/ask/context";
import { FACT_DEFS } from "@/lib/vocab";
import { buildFeed } from "@/lib/engine/feed";
import { relatedCivic, relatedMeasures } from "@/lib/engine/related";
import type { DocumentData } from "@/lib/engine/types";
import { parentRoute, parseRoute, routeHash, type Route } from "@/lib/nav/route";
import { hideChatDock } from "@/lib/ui/chat-dock";
import { CivicView } from "./CivicView";
import { DocumentView } from "./DocumentView";
import { FirstRun } from "./FirstRun";
import { HighlightAskProvider } from "./HighlightMenu";
import { Explore } from "./Explore";
import { Home } from "./Home";
import { MeasureView } from "./MeasureView";
import { ProfileSheet, type SheetView } from "./ProfileSheet";
import { ScreenIn } from "./ScreenIn";
import { SiteHeader } from "./SiteHeader";
import { townName } from "./profile-steps";
import { useLegible } from "./useLegible";
import { StoryPlayer, type StoryExit } from "./wrapped/StoryPlayer";
import { WRAPPED_STRINGS } from "@/lib/vocab/wrapped";
import { WRAPPED_ENABLED } from "@/lib/wrapped/flag";

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
  const { loaded, today, profile, setProfile, preferences, setPreferences, canStore, forget, demo } = useLegible();
  const [sheet, setSheet] = useState<SheetView | null>(null);
  // Where the person is, read from the URL hash.
  const hash = useSyncExternalStore(subscribeHash, hashSnapshot, serverHash);
  const route = parseRoute(hash);
  // "Your ballot, wrapped" plays over For you (or over first run, so it never needs
  // onboarding). Its route shares For you's screen key, so opening and closing it
  // never remounts or scrolls the page underneath. Development only.
  const storyOpen = WRAPPED_ENABLED && route.kind === "wrapped";
  const screenKey = route.kind === "wrapped" ? "#/" : hash || "#/";
  const storyOpener = useRef<HTMLElement | null>(null);
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
  // For Ask Kiro: only the answers that matched this item ("you rent"), and only
  // sent if the person switches sharing on in the chat.
  const personalFor = (source?: AskSource): string[] => {
    if (!source) return [];
    const because =
      source.kind === "ballot"
        ? feed.items.flatMap((i) => i.cards).find((c) => c.measure.id === source.id)?.because.flatMap((b) => (b.kind === "fact" ? [{ fact: b.id, value: b.value }] : []))
        : civic.find((c) => (source.kind === "civic" ? c.item.id === source.id : c.item.original?.file === `/official/bills/${source.id}.json`))?.because;
    return (because ?? []).map((b) => (b.value ? FACT_DEFS[b.fact].because.yes : FACT_DEFS[b.fact].because.no));
  };

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
  // The profile sheet fills a phone's width; the Ask Kiro launcher would sit on its footer.
  const sheetOpen = sheet !== null;
  useEffect(() => (sheetOpen ? hideChatDock("narrow") : undefined), [sheetOpen]);
  // A new screen starts at the top; going back restores where the person was.
  // Opening or closing the story keeps the screen, so it keeps its scroll too.
  const lastKey = useRef(screenKey);
  useLayoutEffect(() => {
    const same = lastKey.current === screenKey;
    lastKey.current = screenKey;
    if (!same) {
      const top = restoreNext.current ? (scrolls.current[hash || "#/"] ?? 0) : 0;
      window.scrollTo({ top });
    }
    restoreNext.current = false;
  }, [hash, screenKey]);
  // When the story closes, focus goes back to whatever opened it, if it is still there.
  useEffect(() => {
    if (storyOpen) return;
    const el = storyOpener.current;
    storyOpener.current = null;
    if (el?.isConnected) el.focus({ preventScroll: true });
  }, [storyOpen]);

  const replaceRoute = (h: string) => {
    window.history.replaceState(null, "", h);
    window.dispatchEvent(new Event(NAV_EVENT));
  };
  const openStory = () => {
    storyOpener.current = document.activeElement as HTMLElement | null;
    window.history.pushState({ legible: true }, "", routeHash({ kind: "wrapped" }));
    window.dispatchEvent(new Event(NAV_EVENT));
  };
  // Leaving the story: to a decision or Explore it replaces its own history entry;
  // closing steps back when this session opened it, or goes to For you from a pasted link.
  const exitStory = (e: StoryExit) => {
    if (e.kind === "measure") return replaceRoute(e.href);
    if (e.kind === "explore") return replaceRoute(routeHash({ kind: "explore" }));
    if ((window.history.state as { legible?: boolean } | null)?.legible) window.history.back();
    else replaceRoute(routeHash({ kind: "feed" }));
    if (e.kind === "profile") setSheet({ kind: "list" });
    if (e.kind === "topics") setSheet({ kind: "topics" });
  };
  const story = storyOpen && <StoryPlayer doc={DOCS[0]} profile={profile} demo={demo} onExit={exitStory} />;

  if (!loaded) return <div className="min-h-dvh" aria-busy="true" />;

  if (!preferences.onboardingDone) {
    return (
      <>
        <div inert={storyOpen} className="contents">
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
        </div>
        {story}
      </>
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
        profile={profile}
        setProfile={setProfile}
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
        {...(WRAPPED_ENABLED ? { onOpenWrapped: openStory } : {})}
      />
    );
  }

  const tab = route.kind === "explore" ? "explore" : route.kind === "feed" ? "home" : undefined;
  const toHome = () => (route.kind === "feed" ? window.scrollTo({ top: 0, behavior: "smooth" }) : go({ kind: "feed" }));
  const toExplore = () => (route.kind === "explore" ? window.scrollTo({ top: 0, behavior: "smooth" }) : go({ kind: "explore" }));

  return (
    <HighlightAskProvider personalFor={personalFor}>
      {/* Inert while the story is open, so focus and assistive technology stay in it. */}
      <div inert={storyOpen} className="contents">
        <div className="sticky top-0 z-30">
          <SiteHeader
            active={tab}
            name={profile.name}
            needsInterests={!profile.topicsConfirmedAt && Object.keys(profile.topics).length === 0}
            onHome={toHome}
            onExplore={toExplore}
            onOpenProfile={setSheet}
          />
        </div>
        {demo && <p className="bg-surface-muted px-4 py-2 text-center text-small font-semibold">{WRAPPED_STRINGS.demoStrip}</p>}
        <ScreenIn key={screenKey}>{page}</ScreenIn>
      </div>
      {story}
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
    </HighlightAskProvider>
  );
}
