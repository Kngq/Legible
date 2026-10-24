"use client";

// The one header, on every screen after onboarding: the Legible mark and
// wordmark, the For you and Explore tabs, and the profile button. It replaces
// the second in-page bar (TopBar) that Home and Explore used to draw under it.
// Sticky; a hairline appears once the page scrolls under it.
//
// The informational links and account buttons added with the site header are
// kept below, switched off by SHOW_PLACEHOLDERS: Legible keeps the profile in the
// browser and has no accounts yet, so they would not navigate or authenticate.
// Turn the flag on once those pages and accounts exist.
import { useEffect, useState } from "react";
import { Glyph } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { FOCUS } from "./ui";

const SHOW_PLACEHOLDERS = false;

const NAV_LINKS = [
  { label: "Who we are", href: "#" },
  { label: "Our mission", href: "#" },
];

export type HeaderTab = "home" | "explore";

export function SiteHeader({
  active,
  name,
  needsInterests = false,
  onHome,
  onExplore,
  onOpenProfile,
}: {
  /** The tab for this screen; detail pages have none. */
  active?: HeaderTab;
  /** The person's first name, for the profile button's initial. */
  name?: string;
  /** Show an attention badge on the profile button until interests are chosen. */
  needsInterests?: boolean;
  /** Without handlers (onboarding's first screen) the header shows the brand only. */
  onHome?: () => void;
  onExplore?: () => void;
  onOpenProfile?: (v: SheetView) => void;
}) {
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
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        {(() => {
          const brand = (
            <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/legible-mark.svg" alt="" className="size-7" />
          <span aria-hidden="true" className="hidden font-wordmark text-[1.375rem] font-medium tracking-tight min-[25rem]:inline">
            Legible
          </span>
            </>
          );
          return onHome ? (
            <button type="button" onClick={onHome} aria-label="Legible, For you" className={`flex shrink-0 items-center gap-2 rounded-sm ${FOCUS}`}>
              {brand}
            </button>
          ) : (
            <span aria-label="Legible" role="img" className="flex shrink-0 items-center gap-2">
              {brand}
            </span>
          );
        })()}

        {SHOW_PLACEHOLDERS && (
          <nav aria-label="About" className="ml-2 hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className={`rounded-md px-3 py-2 text-small font-semibold text-muted-foreground hover:bg-surface-muted hover:text-foreground ${FOCUS}`}>
                {link.label}
              </a>
            ))}
          </nav>
        )}

        {onHome && onExplore ? (
          <nav aria-label="Main" className="mx-auto flex items-center">
            {tab("home", "For you", onHome)}
            {tab("explore", "Explore", onExplore)}
          </nav>
        ) : (
          <span className="mx-auto" />
        )}

        <div className="flex shrink-0 items-center gap-2">
          {SHOW_PLACEHOLDERS && (
            <>
              <button type="button" className={`min-h-10 rounded-md px-3 text-small font-semibold text-foreground underline-offset-4 hover:underline ${FOCUS}`}>
                Login
              </button>
              <button type="button" className={`min-h-10 rounded-md bg-primary px-4 text-small font-semibold text-primary-foreground ${FOCUS}`}>
                Sign up
              </button>
            </>
          )}
          {onOpenProfile && (
          <button
            type="button"
            onClick={() => onOpenProfile({ kind: needsInterests ? "topics" : "list" })}
            aria-label={needsInterests ? "Your profile — pick the subjects you follow" : "Your profile"}
            className={`relative flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent interactive press hover:scale-105 ${FOCUS}`}
          >
            {initial ? <span className="text-body font-bold">{initial}</span> : <Glyph name="person" size={22} />}
            {needsInterests && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-attention text-[11px] font-bold leading-none text-attention-foreground ring-2 ring-background"
              >
                !
              </span>
            )}
          </button>
          )}
        </div>
      </div>
    </header>
  );
}
