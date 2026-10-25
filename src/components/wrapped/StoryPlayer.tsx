"use client";

// The player for Ballot stories (first built as "Your ballot, wrapped"): a modal
// dialog that plays six stories at the reader's pace, never on a timer (W6, W7).
// Navigation is written out for someone who has never used a story app: six
// progress segments and "2 of 6" at the top, a labelled Close button, and labelled
// Previous and Next buttons at the bottom (Next becomes Done on the last story).
// Arrow keys, a tap on either side, and a swipe do the same, but nothing needs them.
// Escape, Close, Done, a click on the scrim, and the browser back button close it.
// Taps and swipes that start on a control are ignored. Focus is trapped inside and
// returned on close by the shell. Phones: the whole viewport, inside the safe
// areas. From 640 px: a centred portrait frame over a scrim of the page ink.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import towns from "@/data/towns.json";
import type { DocumentData } from "@/lib/engine/types";
import type { Profile } from "@/lib/engine/profile";
import { computeWrapped } from "@/lib/engine/wrapped";
import { buildStory, SLIDE_COUNT } from "@/lib/engine/wrapped-slides";
import { initialStory, keyAction, segmentFill, STORY_IGNORE_SELECTOR, storyReducer, swipeAction, tapAction, trapFocusIndex } from "@/lib/engine/wrapped-playback";
import { storyMotion } from "@/lib/engine/wrapped-layout";
import { defaultShareChoices, shareItems, storyShareBase, withTimeout, type ShareBase } from "@/lib/engine/wrapped-share-layout";
import { announcement, WRAPPED_STRINGS as S } from "@/lib/vocab/wrapped";
import { hideChatDock } from "@/lib/ui/chat-dock";
import { Glyph } from "../icons";
import { useGarden } from "../plant/useGarden";
import { FOCUS } from "../ui";
import { SharePreview } from "./SharePreview";
import { renderShareImage } from "./share-image";
import { Slide, type SlideAction } from "./slides";
import css from "./wrapped.module.css";

const TOWNS = towns as { id: string; name: string }[];
const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])";
const reduceStory = storyReducer(SLIDE_COUNT);

export type StoryExit = { kind: "close" } | { kind: "measure"; href: string } | { kind: "explore" } | { kind: "profile" } | { kind: "topics" };

export function StoryPlayer({
  doc,
  profile,
  demo,
  initialSlide = 0,
  onExit,
}: {
  doc: DocumentData;
  profile: Profile;
  demo: boolean;
  /** Where to open: 0, or the story the person left for a question page. */
  initialSlide?: number;
  /** How the person left, and from which story. */
  onExit: (e: StoryExit, slide: number) => void;
}) {
  const summary = useMemo(() => computeWrapped(doc, profile), [doc, profile]);
  const slides = useMemo(() => buildStory(doc, summary, profile, TOWNS), [doc, summary, profile]);
  const shareBase = useMemo<ShareBase>(() => storyShareBase(doc, summary, profile, TOWNS), [doc, summary, profile]);
  // The closing slide shows the default share image, drawn by the same code that saves it.
  const defaultItems = useMemo(() => shareItems(shareBase, defaultShareChoices(shareBase)), [shareBase]);
  const [shareUrl, setShareUrl] = useState<string | undefined>();
  useEffect(() => {
    let alive = true;
    let url: string | undefined;
    withTimeout(renderShareImage(defaultItems), 4000).then(
      (blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setShareUrl(url);
      },
      () => undefined,
    );
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [defaultItems]);
  const share = { url: shareUrl, alt: `${S.closingImageAlt} ${defaultItems.map((i) => i.text).join(". ")}` };

  const [state, dispatch] = useReducer(reduceStory, initialSlide, (i) => reduceStory(initialStory, { type: "goto", index: i }));
  const [sharing, setSharing] = useState(false);
  // Water earned while the stories are open (an official link opened from a story).
  // The header's own note is behind the dialog, so the story shows it, on the story
  // where it was earned, until the person moves to another story.
  const garden = useGarden();
  const [rewardSeen, setRewardSeen] = useState(garden.earned.n);
  const [reward, setReward] = useState<{ n: number; drops: number; on: number } | null>(null);
  const reduce = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const motion = storyMotion(reduce);
  const dialog = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; id: number } | null>(null);
  const slide = slides[state.index];
  if (garden.earned.n !== rewardSeen) {
    setRewardSeen(garden.earned.n);
    if (garden.earned.n > rewardSeen && garden.earned.drops) setReward({ n: garden.earned.n, drops: garden.earned.drops, on: state.index });
  }
  const shownReward = reward?.on === state.index ? reward : null;

  const go = useCallback((a: "next" | "prev") => {
    setReward(null);
    dispatch({ type: a });
  }, []);
  const close = useCallback(() => onExit({ kind: "close" }, state.index), [onExit, state.index]);

  // While open: the page cannot scroll, Ask Kiro is hidden, focus starts in the dialog.
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    const release = hideChatDock("always");
    dialog.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = previous;
      release();
    };
  }, []);

  // Keys: arrows (not inside a field), Escape (the share preview first), Tab kept inside.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "Tab" && dialog.current) {
        const all = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);
        const scope = sharing ? all.filter((n) => n.closest("[data-story-ignore][role='dialog']")) : all;
        const i = trapFocusIndex(scope.indexOf(document.activeElement as HTMLElement), scope.length, e.shiftKey);
        if (i >= 0) {
          e.preventDefault();
          scope[i].focus();
        }
        return;
      }
      const inField = Boolean(el?.closest("input, textarea, select, [role='switch']"));
      const a = keyAction(e.key, inField);
      if (!a) return;
      e.preventDefault();
      if (a === "close") return sharing ? setSharing(false) : close();
      if (!sharing) go(a);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, go, sharing]);

  // Taps and swipes on the slide, never starting on a control.
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(STORY_IGNORE_SELECTOR) || e.button !== 0) return;
    press.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p || p.id !== e.pointerId || sharing) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    const swipe = swipeAction(dx, dy);
    if (swipe) return go(swipe);
    if (Math.hypot(dx, dy) > 10) return; // a drag or a scroll, not a tap
    if (window.getSelection()?.toString()) return;
    const r = e.currentTarget.getBoundingClientRect();
    go(tapAction(e.clientX - r.left, r.width));
  };

  const onAction = (a: SlideAction) => {
    if (a.kind === "save") setSharing(true);
    else if (a.kind === "measure") onExit({ kind: "measure", href: a.href }, state.index);
    else onExit({ kind: a.kind }, state.index);
  };

  const enter = state.dir === "next" ? "animate-slide-next" : state.dir === "prev" ? "animate-slide-back" : "animate-fade-in";
  const atEnd = state.index === SLIDE_COUNT - 1;
  // Labelled pills, so nobody has to guess what an icon does.
  const pill = `pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-small font-semibold interactive press ${FOCUS}`;
  const quiet = `${pill} bg-surface/90 text-foreground shadow-hairline hover:bg-surface disabled:pointer-events-none disabled:opacity-40`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--foreground)_62%,transparent)] sm:backdrop-blur-sm"
      // On wide screens the scrim shows around the frame; a click on it closes, like Close.
      onClick={(e) => {
        if (e.target === e.currentTarget && !sharing) close();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={S.dialogLabel}
        aria-describedby="story-help"
        tabIndex={-1}
        className={`relative flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground outline-none sm:aspect-[9/16] sm:h-[min(880px,calc(100dvh-48px))] sm:w-auto sm:rounded-xl sm:shadow-card ${css.safe}`}
      >
        {/* Progress and controls sit over every slide. */}
        <div className="absolute inset-x-0 top-0 z-10 px-3 pt-[max(env(safe-area-inset-top),0.75rem)]" data-story-ignore>
          <ol className="flex gap-1" aria-hidden="true">
            {slides.map((s, i) => (
              <li key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-foreground/15">
                {segmentFill(state.index, i) === 1 && <span key={i === state.index ? `on-${state.index}` : "done"} className={`block h-full rounded-full bg-foreground ${i === state.index ? css.fill : ""}`} />}
              </li>
            ))}
          </ol>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 pl-1 text-small font-semibold">
              <span>{S.playerTitle}</span>
              <span className="tabular-nums text-muted-foreground">{S.progress(state.index + 1, SLIDE_COUNT)}</span>
              {demo && <span className="rounded-sm bg-surface-muted px-2 py-0.5 text-small font-semibold text-foreground">{S.demoTag}</span>}
            </p>
            <button type="button" onClick={close} aria-label={S.closeLabel} className={`${quiet} shrink-0 pl-3`}>
              <Glyph name="close" size={16} />
              {S.close}
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 touch-pan-y select-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (press.current = null)}>
          <div key={state.index} className={`h-full ${reduce ? "" : enter}`}>
            <Slide s={slide} motion={motion} onAction={onAction} share={share} />
          </div>
        </div>

        {/* Previous and Next, always visible: the way to move for everyone, not a fallback. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]" data-story-ignore>
          <button type="button" onClick={() => go("prev")} disabled={state.index === 0} aria-label={S.backLabel} className={`${quiet} pl-3`}>
            <span className="rotate-90">
              <Glyph name="chevron" size={14} />
            </span>
            {S.back}
          </button>
          {shownReward && (
            <span key={shownReward.n} aria-hidden="true" className="inline-flex min-w-0 animate-fade-in items-center rounded-full bg-surface px-3 py-1.5 text-small font-semibold shadow-hairline">
              <span className="sm:hidden">{S.rewardShort(shownReward.drops)}</span>
              <span className="hidden sm:inline">{S.rewardLong(shownReward.drops)}</span>
            </span>
          )}
          {atEnd ? (
            <button type="button" onClick={close} aria-label={S.doneLabel} className={`${quiet} px-5`}>
              {S.done}
            </button>
          ) : (
            <button type="button" onClick={() => go("next")} aria-label={S.nextLabel} className={`${quiet} pr-3`}>
              {S.next}
              <span className="-rotate-90">
                <Glyph name="chevron" size={14} />
              </span>
            </button>
          )}
        </div>

        <p id="story-help" className="sr-only">
          {S.navHelp}
        </p>
        <p className="sr-only" aria-live="polite">
          {announcement(state.index, SLIDE_COUNT, slide.heading)}
        </p>
        <p className="sr-only" role="status">
          {shownReward ? S.rewardSaid(shownReward.drops) : ""}
        </p>

        {sharing && <SharePreview base={shareBase} onClose={() => setSharing(false)} />}
      </div>
    </div>,
    document.body,
  );
}
