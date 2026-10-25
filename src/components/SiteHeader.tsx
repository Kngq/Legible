"use client";

// The one header, on every screen after onboarding: the Legible mark and
// wordmark, the For you and Explore tabs, the garden button (the plant and its
// water), and the profile button. It replaces
// the second in-page bar (TopBar) that Home and Explore used to draw under it.
// Sticky; a hairline appears once the page scrolls under it.
//
// The Legible mark opens a small menu with the links added with the site
// header: Who we are and Our mission. They are placeholders for now and do not
// navigate. The Login and Sign up buttons stay in the code but are hidden
// (SHOW_ACCOUNT_BUTTONS): Legible keeps the profile in the browser and has no
// accounts (docs/accounts-review.md). The For you tab is the way home.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { transition } from "@/lib/motion";
import { Glyph } from "./icons";
import { CivicPlant } from "./plant/CivicPlant";
import { GardenButton } from "./plant/GardenButton";
import { useGrowth } from "./plant/useGrowth";
import type { SheetView } from "./ProfileSheet";
import { FOCUS } from "./ui";

const NAV_LINKS = [
  { label: "Who we are", href: "#" },
  { label: "Our mission", href: "#" },
];

/** Login and Sign up do nothing until accounts have a purpose; kept, not shown. */
const SHOW_ACCOUNT_BUTTONS = false;

export type HeaderTab = "home" | "explore";

/** The Legible mark as a menu button: the about links and account actions. */
function BrandMenu() {
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Close on Escape (focus back on the mark) or on a click outside the menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const item = `flex min-h-11 w-full items-center rounded-md px-3 text-left text-body font-semibold interactive hover:bg-surface-muted ${FOCUS}`;

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="brand-menu"
        aria-label="Legible menu"
        className={`group flex min-h-11 items-center gap-2 rounded-md pr-1.5 interactive ${FOCUS}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/legible-mark.svg" alt="" className="size-7" />
        <span aria-hidden="true" className="hidden font-wordmark text-[1.375rem] font-medium tracking-tight min-[25rem]:inline">
          Legible
        </span>
        <span aria-hidden="true" className={`text-muted-foreground transition-transform duration-(--dur-base) ease-legible group-hover:text-foreground ${open ? "rotate-180" : ""}`}>
          <Glyph name="chevron" size={14} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="brand-menu"
            initial={reduce ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: transition("fast", reduce) }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: transition("fast", reduce, true) }}
            className="absolute left-0 top-full z-40 mt-2 w-60 origin-top-left rounded-lg bg-surface p-1.5 shadow-card"
          >
            <nav aria-label="About Legible">
              {NAV_LINKS.map((link) => (
                <a key={link.label} href={link.href} onClick={() => setOpen(false)} className={item}>
                  {link.label}
                </a>
              ))}
            </nav>
            {SHOW_ACCOUNT_BUTTONS && (
              <>
                <div className="mx-3 my-1.5 border-t border-border" />
                <button type="button" onClick={() => setOpen(false)} className={item}>
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={`mt-1 flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-3 text-body font-semibold text-primary-foreground interactive press hover:bg-primary-hover ${FOCUS}`}
                >
                  Sign up
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SiteHeader({
  active,
  name,
  needsInterests = false,
  onHome,
  onExplore,
  onOpenProfile,
  onOpenGarden,
  gardenActive,
}: {
  /** The tab for this screen; detail pages have none. */
  active?: HeaderTab;
  /** The person's first name, for the profile button's initial. */
  name?: string;
  /** Show an attention badge on the profile button until interests are chosen. */
  needsInterests?: boolean;
  /** Without handlers (onboarding's first screen) the header shows the brand menu only. */
  onHome?: () => void;
  onExplore?: () => void;
  onOpenProfile?: (v: SheetView) => void;
  /** Opens the garden. With it, the plant lives in the garden button and the avatar shows the person. */
  onOpenGarden?: () => void;
  /** The garden is the page on screen. */
  gardenActive?: boolean;
}) {
  // Without a garden button, the avatar is the same plant and stage as in Civic Profile.
  const growth = useGrowth();
  const plantAvatar = growth.enabled && !onOpenGarden;
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tab = (id: HeaderTab, label: string, onClick?: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-current={active === id ? "page" : undefined}
      className={`relative min-h-11 px-3 text-small font-semibold interactive sm:text-body ${active === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"} ${FOCUS}`}
    >
      {label}
      <span
        aria-hidden="true"
        className={`absolute inset-x-3 bottom-1.5 h-0.5 origin-center rounded-full bg-accent transition-transform duration-(--dur-base) ease-legible ${active === id ? "scale-x-100" : "scale-x-0"}`}
      />
    </button>
  );
  const initial = name?.trim().charAt(0).toUpperCase();

  return (
    <header className={`w-full bg-background/90 backdrop-blur transition-shadow duration-(--dur-base) ease-legible ${scrolled ? "shadow-[0_1px_0_var(--border)]" : ""}`}>
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <BrandMenu />

        {onHome && onExplore ? (
          <nav aria-label="Main" className="mx-auto flex items-center">
            {tab("home", "For you", onHome)}
            {tab("explore", "Explore", onExplore)}
          </nav>
        ) : (
          <span className="mx-auto" />
        )}

        {onOpenGarden && <GardenButton onOpen={onOpenGarden} active={gardenActive} />}
        {onOpenProfile ? (
          <button
            type="button"
            // Always the overview: the avatar is the way home, never straight into a question.
            onClick={() => onOpenProfile({ kind: "list" })}
            aria-label="Your profile"
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-full ${plantAvatar ? "bg-surface ring-1 ring-border" : "bg-accent-soft text-accent"} interactive press hover:scale-105 ${FOCUS}`}
          >
            {plantAvatar ? (
              <span className="flex size-11 items-end justify-center overflow-hidden rounded-full">
                <CivicPlant stage={growth.stage} size={34} label="" />
              </span>
            ) : initial ? (
              <span className="text-body font-bold">{initial}</span>
            ) : (
              <Glyph name="person" size={22} />
            )}
            {needsInterests && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[11px] font-bold leading-none text-accent-foreground ring-2 ring-background"
              >
                !
              </span>
            )}
          </button>
        ) : (
          <span className="size-11 shrink-0" />
        )}
      </div>
    </header>
  );
}
