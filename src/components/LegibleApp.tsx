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
import { ballotReason, nextPick } from "@/lib/engine/ballot-picks";
import { buildFeed } from "@/lib/engine/feed";
import { relatedCivic, relatedMeasures } from "@/lib/engine/related";
import type { DocumentData } from "@/lib/engine/types";
import { parentRoute, parseRoute, routeHash, screenRoute, type Route, type StoriesOver } from "@/lib/nav/route";
import { hideChatDock } from "@/lib/ui/chat-dock";
import { CivicView } from "./CivicView";
import { DocumentView } from "./DocumentView";
import { FirstRun } from "./FirstRun";
import { HighlightAskProvider } from "./HighlightMenu";
import { Explore } from "./Explore";
import { Home } from "./Home";
import { MeasureView } from "./MeasureView";
import { Garden } from "./plant/Garden";
import { resetGarden, rewardGarden, startGarden } from "./plant/useGarden";
import { ProfileSheet, type SheetView } from "./ProfileSheet";
import { ScreenIn } from "./ScreenIn";
import { SiteHeader } from "./SiteHeader";
import { townName } from "./profile-steps";
import { useLegible } from "./useLegible";
import { StoryPlayer, type StoryExit } from "./wrapped/StoryPlayer";
import { WRAPPED_STRINGS, WRAPPED_STRINGS as S } from "@/lib/vocab/wrapped";
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

// What this app keeps on its own history entries. `legible` marks an entry this
// session pushed; `storySlide` is where Ballot stories were left for a question
// page; `fromStories` marks that question page, so its back button can say so.
type HistoryState = { legible?: boolean; storySlide?: number; fromStories?: boolean } | null;
const historyState = () => window.history.state as HistoryState;
/** The screen a hash shows, for scroll memory: Ballot stories keep the page beneath. */
const screenHash = (h: string) => routeHash(screenRoute(parseRoute(h)));

export function LegibleApp() {
  const { loaded, today, profile, setProfile, preferences, setPreferences, canStore, forget, demo } = useLegible();
  const [sheet, setSheet] = useState<SheetView | null>(null);
  // Where the person is, read from the URL hash.
  const hash = useSyncExternalStore(subscribeHash, hashSnapshot, serverHash);
  const route = parseRoute(hash);
  // Ballot stories play over the page that opened them, For you or Explore (or over
  // first run, so they never need onboarding). Their route shares that page's screen
  // key, so opening and closing them never remounts or scrolls the page underneath.
  const storyOpen = WRAPPED_ENABLED && route.kind === "stories";
  const screen = storyOpen ? screenRoute(route) : route;
  const screenKey = storyOpen ? routeHash(screen) : hash || "#/";
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
    resetGarden();
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

  // The garden starts once the profile is read, and is kept between visits only
  // while "Remember on this device" is on.
  useEffect(() => {
    if (loaded) startGarden({ today, persist: preferences.remember, demo });
  }, [loaded, today, preferences.remember, demo]);
  // Water for exploring: opening a ballot question, a civic item, or the full
  // voter guide pays once per page. Pages that do not exist pay nothing.
  const explored = loaded && preferences.onboardingDone;
  useEffect(() => {
    if (!explored) return;
    const r = parseRoute(hash);
    if (r.kind === "measure" && feed.items.some((i) => i.doc.id === r.docId && i.cards.some((c) => c.measure.id === r.measureId))) rewardGarden("question", r.measureId);
    else if (r.kind === "item" && CIVIC.some((i) => i.id === r.itemId)) rewardGarden("item", r.itemId);
    else if (r.kind === "doc" && feed.items.some((i) => i.doc.id === r.docId)) rewardGarden("guide", r.docId);
  }, [explored, hash, feed]);
  // And opening an official source: every link that opens in a new tab is one
  // (official pages and bundled official PDFs). Once per address, page anchors aside.
  useEffect(() => {
    if (!explored) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[target=_blank]") as HTMLAnchorElement | null;
      if (a?.href) rewardGarden("source", a.href.split("#")[0]);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [explored]);

  // Remember each screen's scroll as the person scrolls it.
  useEffect(() => {
    const onScroll = () => (scrolls.current[screenHash(window.location.hash)] = window.scrollY);
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
      const top = restoreNext.current ? (scrolls.current[screenKey] ?? 0) : 0;
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
  const openStory = (over: StoriesOver) => {
    storyOpener.current = document.activeElement as HTMLElement | null;
    window.history.pushState({ legible: true }, "", routeHash({ kind: "stories", over }));
    window.dispatchEvent(new Event(NAV_EVENT));
  };
  // Closing steps back to the page underneath when this session opened the stories,
  // or replaces a pasted link with that page.
  const closeStory = () => {
    if (historyState()?.legible) window.history.back();
    else replaceRoute(routeHash(screen));
  };
  // Leaving the stories. To a question page: remember the story on its own entry and
  // push the question, so the browser's back (and the page's "Back to stories")
  // returns to the same story. To Explore: replace the stories with it.
  const exitStory = (e: StoryExit, slide: number) => {
    if (e.kind === "measure") {
      window.history.replaceState({ ...historyState(), storySlide: slide }, "", window.location.hash);
      window.history.pushState({ legible: true, fromStories: true }, "", e.href);
      window.dispatchEvent(new Event(NAV_EVENT));
      return;
    }
    if (e.kind === "explore") return screen.kind === "explore" ? closeStory() : replaceRoute(routeHash({ kind: "explore" }));
    closeStory();
    if (e.kind === "profile") setSheet({ kind: "list" });
    if (e.kind === "topics") setSheet({ kind: "topics" });
  };
  const story = storyOpen && (
    <StoryPlayer key={hash} doc={DOCS[0]} profile={profile} demo={demo} initialSlide={historyState()?.storySlide ?? 0} onExit={exitStory} />
  );

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
  const openGarden = () => (route.kind === "garden" ? window.scrollTo({ top: 0, behavior: "smooth" }) : go({ kind: "garden" }));

  const town = townName(profile.townId);
  const docItem = route.kind === "doc" || route.kind === "measure" ? feed.items.find((i) => i.doc.id === route.docId) : undefined;
  const card = route.kind === "measure" ? docItem?.cards.find((c) => c.measure.id === route.measureId) : undefined;
  // Items are public: a pasted link to another town's meeting still opens.
  const rawItem = route.kind === "item" ? CIVIC.find((i) => i.id === route.itemId) : undefined;
  const itemCard = rawItem ? (civic.find((c) => c.item.id === rawItem.id) ?? civicCard(rawItem, profile, today)) : undefined;

  // A question page opened from Ballot stories says where its back button goes.
  const fromStories = Boolean(historyState()?.fromStories);

  let page;
  if (card && docItem) {
    page = (
      <MeasureView
        key={card.measure.id}
        item={docItem}
        card={card}
        reason={ballotReason(card, profile)}
        next={nextPick(docItem, profile, card.measure.id)}
        profile={profile}
        setProfile={setProfile}
        town={town}
        backLabel={fromStories ? S.backToStories : "Back"}
        showBackLabel={fromStories}
        onBack={back}
        onForYou={() => go({ kind: "feed" })}
        onOpenMeasure={(measureId) => openMeasure(docItem.doc.id, measureId)}
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
  } else if (route.kind === "garden") {
    page = (
      <Garden
        onBack={back}
        onExplore={() => go({ kind: "explore" })}
        remember={preferences.remember}
        canStore={canStore}
        {...(demo ? {} : { onRemember: () => setPreferences((p) => ({ ...p, remember: true })) })}
      />
    );
  } else if (screen.kind === "explore") {
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
        {...(WRAPPED_ENABLED ? { onOpenStories: () => openStory("explore") } : {})}
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
        onOpenGarden={openGarden}
        {...(WRAPPED_ENABLED ? { onOpenStories: () => openStory("feed") } : {})}
      />
    );
  }

  const tab = screen.kind === "explore" ? "explore" : screen.kind === "feed" ? "home" : undefined;
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
            onOpenGarden={openGarden}
            gardenActive={route.kind === "garden"}
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
          onOpenGarden={() => {
            closeSheet();
            openGarden();
          }}
        />
      )}
    </HighlightAskProvider>
  );
}
