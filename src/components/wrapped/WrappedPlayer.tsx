"use client";
// Ballot Wrapped player (Req 1.2, 2, 12.5 to 12.11, 13). A modal dialog portalled into
// document.body. Playback is the pure playbackReducer, advanced by one requestAnimationFrame
// loop. Everything is computed in the browser from the bundled ballot: no network, no storage.
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import ballot from "@/data/ballot-2026.json";
import towns from "@/data/towns.json";
import { Glyph } from "@/components/icons";
import type { Profile } from "@/lib/engine/profile";
import type { DocumentData } from "@/lib/engine/types";
import { computeWrapped, type WrappedSummary } from "@/lib/engine/wrapped";
import { frameRect } from "@/lib/engine/wrapped-layout";
import {
  HOLD_MS,
  initialPlayback,
  isRunning,
  playbackReducer,
  showsPlayLabel,
  tapAction,
  type PlaybackAction,
  type PlaybackState,
} from "@/lib/engine/wrapped-playback";
import { announcement, buildSlides, townLabel, type SlideModel } from "@/lib/engine/wrapped-slides";
import { SLIDE_COLOUR_HEX, WHITE, WRAPPED_STRINGS, foregroundFor } from "@/lib/vocab/wrapped";
import { Decor } from "./Decor";
import { ProgressBars } from "./ProgressBars";
import { ConnectedSlide } from "./slides/ConnectedSlide";
import { DigInSlide } from "./slides/DigInSlide";
import { IntroSlide } from "./slides/IntroSlide";
import { PersonalitySlide } from "./slides/PersonalitySlide";
import { RevealSlide } from "./slides/RevealSlide";
import { SpotlightSlide } from "./slides/SpotlightSlide";
import { SummarySlide } from "./slides/SummarySlide";
import { TopThreeSlide } from "./slides/TopThreeSlide";

const DOC = ballot as unknown as DocumentData;
/** Fixed official URL; identical for every profile (Req 13.2). */
const VOTER_INFO_URL: string = ballot.source.url;
const BACKDROP = "rgba(17, 17, 17, 0.85)"; // existing ink at partial opacity
const ERROR_COLOUR = SLIDE_COLOUR_HEX.purple;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CONTROL = "button, a";

type CloseTo = "home" | "ballot";

interface Computed {
  summary: WrappedSummary;
  slides: SlideModel[];
  town: string;
}

/** Leaving a Slide also leaves the Spotlight quote view, so its stop flag must not linger. */
function reducer(s: PlaybackState, a: PlaybackAction): PlaybackState {
  const n = playbackReducer(s, a);
  return n.index !== s.index && n.quoteOpen ? { ...n, quoteOpen: false } : n;
}

function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(REDUCED_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const reducedSnapshot = () => window.matchMedia(REDUCED_QUERY).matches;
const reducedServer = () => false;

function viewportFrame() {
  if (typeof window === "undefined") return frameRect(0, 0);
  return frameRect(window.innerWidth, window.innerHeight);
}

function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CONTROL) !== null;
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M9 6v12M15 6v12" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
      <path d="M8 5.5v13l10.5-6.5z" />
    </svg>
  );
}

/** 44 px round control in the Slide foreground, with a 1.5 px boundary (Req 12.10, 12.11). */
const CONTROL_CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";

function controlStyle(fg: string) {
  return { color: fg, boxShadow: `inset 0 0 0 1.5px ${fg}` };
}

export function WrappedPlayer({ profile, onClose }: { profile: Profile; onClose: (to: CloseTo) => void }) {
  const computed = useMemo<Computed | null>(() => {
    try {
      const summary = computeWrapped(DOC, profile);
      if (!summary.topTopic) return null;
      const town = townLabel(profile.townId, towns);
      return { summary, town, slides: buildSlides(summary, town) };
    } catch {
      return null;
    }
  }, [profile]);

  const [state, dispatch] = useReducer(reducer, initialPlayback);
  const [frame, setFrame] = useState(viewportFrame);
  const reducedMotion = useSyncExternalStore(subscribeReduced, reducedSnapshot, reducedServer);

  // Direction of the last Slide change, derived during render from the previous index.
  const [seen, setSeen] = useState<{ index: number; dir: "next" | "back" }>({ index: 0, dir: "next" });
  if (seen.index !== state.index) {
    setSeen({ index: state.index, dir: state.index > seen.index ? "next" : "back" });
  }

  const dialogRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const lastTs = useRef<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const downId = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const running = isRunning(state);

  // One rAF loop for the whole session. Ticks while stopped are no-ops in the reducer.
  useEffect(() => {
    if (!computed) return;
    let id = 0;
    const loop = (t: number) => {
      if (lastTs.current !== null) dispatch({ type: "tick", dtMs: t - lastTs.current });
      lastTs.current = t;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(id);
      lastTs.current = null;
    };
  }, [computed]);

  // Resuming never counts time spent stopped.
  useEffect(() => {
    lastTs.current = null;
  }, [running]);

  useEffect(() => {
    const onVisibility = () => {
      lastTs.current = null;
      dispatch({ type: "visibility", hidden: document.visibilityState === "hidden" });
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Layout switches on resize without touching playback (Req 12.7).
  useEffect(() => {
    const onResize = () => setFrame(viewportFrame());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Focus Close on open (Req 2.15).
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Polite announcement on every Slide, including the Intro on open (Req 2.16).
  const heading = computed?.slides[state.index]?.heading;
  useEffect(() => {
    if (liveRef.current && heading !== undefined) {
      liveRef.current.textContent = announcement(state.index, heading);
    }
  }, [state.index, heading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current("home");
        return;
      }
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.getClientRects().length > 0,
        );
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        const inside = active instanceof Node && root.contains(active);
        if (e.shiftKey && (!inside || active === first)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (!inside || active === last)) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (!computed) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        dispatch({ type: "next" });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        dispatch({ type: "prev" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [computed]);

  const clearHoldTimer = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };
  useEffect(() => clearHoldTimer, []);

  const endHold = () => {
    clearHoldTimer();
    downId.current = null;
    if (heldRef.current) {
      heldRef.current = false;
      dispatch({ type: "hold", on: false });
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0 || isControl(e.target)) return;
    clearHoldTimer();
    downId.current = e.pointerId;
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      heldRef.current = true;
      dispatch({ type: "hold", on: true });
    }, HOLD_MS);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (downId.current !== e.pointerId) return;
    if (heldRef.current) {
      endHold();
      return;
    }
    clearHoldTimer();
    downId.current = null;
    if (isControl(e.target) || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    dispatch({ type: tapAction(e.clientX - rect.left, rect.width) });
  };

  const onQuote = useCallback((open: boolean) => dispatch({ type: "quote", open }), []);
  const onOutbound = useCallback(() => dispatch({ type: "outbound" }), []);
  const onFullBallot = useCallback(() => onCloseRef.current("ballot"), []);

  if (typeof document === "undefined") return null;

  const slide = computed?.slides[state.index];
  const background = slide ? SLIDE_COLOUR_HEX[slide.colour] : ERROR_COLOUR;
  const fg = slide ? foregroundFor(slide.colour) : WHITE;
  const framed = frame.mode === "framed";
  const playLabel = showsPlayLabel(state);

  const closeButton = (
    <button
      ref={closeRef}
      type="button"
      aria-label="Close"
      onClick={() => onClose("home")}
      className={CONTROL_CLASS}
      style={controlStyle(fg)}
    >
      <Glyph name="close" size={22} />
    </button>
  );

  let body: ReactNode;
  if (!computed || !slide) {
    // Req 13.7: nothing derived from the profile, only the message and Close.
    body = (
      <div className="flex h-full flex-col">
        <div className="flex justify-end p-4">{closeButton}</div>
        <div className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="text-title">{WRAPPED_STRINGS.computeError}</p>
        </div>
      </div>
    );
  } else {
    const common = { slide, summary: computed.summary, reducedMotion, foreground: fg };
    let content: ReactNode;
    switch (slide.id) {
      case "intro":
        content = <IntroSlide {...common} />;
        break;
      case "reveal":
        content = <RevealSlide {...common} />;
        break;
      case "top_three":
        content = <TopThreeSlide {...common} />;
        break;
      case "connected":
        content = <ConnectedSlide {...common} />;
        break;
      case "spotlight":
        content = <SpotlightSlide {...common} onQuote={onQuote} />;
        break;
      case "personality":
        content = <PersonalitySlide {...common} />;
        break;
      case "dig_in":
        content = (
          <DigInSlide
            {...common}
            onFullBallot={onFullBallot}
            onOutbound={onOutbound}
            voterInfoUrl={VOTER_INFO_URL}
          />
        );
        break;
      case "summary":
        content = <SummarySlide {...common} town={computed.town} />;
        break;
    }
    body = (
      <>
        {/* Controls come first in DOM order so Close is the first Tab stop. */}
        <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-3 px-4 pt-4">
          <ProgressBars state={state} foreground={fg} count={computed.slides.length} />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              aria-label={playLabel ? "Play" : "Pause"}
              onClick={() => dispatch({ type: "toggle_pause" })}
              className={CONTROL_CLASS}
              style={controlStyle(fg)}
            >
              {playLabel ? <PlayIcon /> : <PauseIcon />}
            </button>
            {closeButton}
          </div>
        </div>
        <div
          key={state.index}
          className={`wrapped-anim absolute inset-0 ${
            seen.dir === "next" ? "animate-slide-next" : "animate-slide-back"
          }`}
        >
          <Decor index={state.index} colour={slide.colour} />
          <div className="wrapped-content relative h-full">{content}</div>
        </div>
      </>
    );
  }

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={WRAPPED_STRINGS.heading}
      className={`fixed inset-0 z-50 font-sans ${reducedMotion ? "wrapped-reduced-motion" : ""}`}
      style={{ backgroundColor: framed ? BACKDROP : background }}
    >
      <div
        ref={frameRef}
        className={`absolute overflow-hidden select-none ${framed ? "rounded-xl" : ""}`}
        style={{
          // Full mode uses inset 0 so mobile browser bars never leave a gap.
          ...(framed ? { left: frame.x, top: frame.y, width: frame.w, height: frame.h } : { inset: 0 }),
          backgroundColor: background,
          color: fg,
          WebkitTouchCallout: "none",
        }}
        onPointerDown={computed ? onPointerDown : undefined}
        onPointerUp={computed ? onPointerUp : undefined}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
      >
        {body}
      </div>
      <p ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>,
    document.body,
  );
}
