"use client";

// The story player for "Your ballot, wrapped": a modal dialog that plays six
// slides at the reader's pace (W6, W7). Thin progress segments at the top; tap the
// right side or swipe left for the next slide, the left 30% or a right swipe to go
// back; Next and Back buttons and the arrow keys do the same; Escape, the close
// button, and the browser back button close it. Taps and swipes that start on a
// control are ignored. Focus is trapped inside and returned on close by the shell.
// Phones: the whole viewport, inside the safe areas. From 640 px: a centred
// portrait frame over a scrim of the page ink. Runs in the browser only.
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

export function StoryPlayer({ doc, profile, demo, onExit }: { doc: DocumentData; profile: Profile; demo: boolean; onExit: (e: StoryExit) => void }) {
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

  const [state, dispatch] = useReducer(reduceStory, initialStory);
  const [sharing, setSharing] = useState(false);
  const reduce = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const motion = storyMotion(reduce);
  const dialog = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; id: number } | null>(null);
  const slide = slides[state.index];

  const go = useCallback((a: "next" | "prev") => dispatch({ type: a }), []);
  const close = useCallback(() => onExit({ kind: "close" }), [onExit]);

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
    else if (a.kind === "measure") onExit({ kind: "measure", href: a.href });
    else onExit({ kind: a.kind });
  };

  const enter = state.dir === "next" ? "animate-slide-next" : state.dir === "prev" ? "animate-slide-back" : "animate-fade-in";
  const atEnd = state.index === SLIDE_COUNT - 1;
  const roundButton = `flex size-11 items-center justify-center rounded-full bg-surface/80 text-foreground shadow-hairline interactive press hover:bg-surface disabled:opacity-0 ${FOCUS}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--foreground)_62%,transparent)] sm:backdrop-blur-sm">
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
            <p className="flex items-center gap-2 pl-1 text-small font-semibold">
              <span className="font-display text-[1.0625rem] font-medium">Legible</span>
              {demo && <span className="rounded-sm bg-surface-muted px-2 py-0.5 text-small font-semibold text-foreground">{S.demoTag}</span>}
            </p>
            <button type="button" onClick={close} aria-label={S.close} className={roundButton}>
              <Glyph name="close" size={18} />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 touch-pan-y select-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (press.current = null)}>
          <div key={state.index} className={`h-full ${reduce ? "" : enter}`}>
            <Slide s={slide} motion={motion} onAction={onAction} share={share} />
          </div>
        </div>

        {/* Back and Next for keyboards, screen readers, and anyone who prefers buttons. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-4 pb-[max(env(safe-area-inset-bottom),1rem)]" data-story-ignore>
          <button type="button" onClick={() => go("prev")} disabled={state.index === 0} aria-label={S.back} className={`pointer-events-auto ${roundButton}`}>
            <span className="rotate-90">
              <Glyph name="chevron" size={16} />
            </span>
          </button>
          <span className="text-small font-semibold tabular-nums text-muted-foreground" aria-hidden="true">
            {state.index + 1} / {SLIDE_COUNT}
          </span>
          <button type="button" onClick={() => go("next")} disabled={atEnd} aria-label={S.next} className={`pointer-events-auto ${roundButton}`}>
            <span className="-rotate-90">
              <Glyph name="chevron" size={16} />
            </span>
          </button>
        </div>

        <p id="story-help" className="sr-only">
          {S.navHelp}
        </p>
        <p className="sr-only" aria-live="polite">
          {announcement(state.index, SLIDE_COUNT, slide.heading)}
        </p>

        {sharing && <SharePreview base={shareBase} onClose={() => setSharing(false)} />}
      </div>
    </div>,
    document.body,
  );
}
