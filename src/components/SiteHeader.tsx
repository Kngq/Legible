// Top header bar: the Legible wordmark, a few informational links, and account
// actions. The links and account buttons are placeholders for now — Legible keeps
// the profile in the browser and has no accounts yet, so these do not navigate or
// authenticate. They mark where that navigation would live.
import { FOCUS } from "./ui";

const NAV_LINKS = [
  { label: "Who we are", href: "#" },
  { label: "Our mission", href: "#" },
];

export function SiteHeader() {
  return (
    <header className="w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
        <a href="#" className={`flex items-center gap-2 font-semibold ${FOCUS}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/legible-mark.svg" alt="" className="size-7" />
          <span className="font-wordmark text-body">Legible</span>
        </a>

        <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`rounded-md px-3 py-2 text-small font-semibold text-muted-foreground hover:bg-surface-muted hover:text-foreground ${FOCUS}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            className={`min-h-10 rounded-md px-3 text-small font-semibold text-foreground underline-offset-4 hover:underline ${FOCUS}`}
          >
            Login
          </button>
          <button
            type="button"
            className={`min-h-10 rounded-md bg-primary px-4 text-small font-semibold text-primary-foreground transition-colors duration-(--duration) ease-legible ${FOCUS}`}
          >
            Sign up
          </button>
        </div>
      </div>
    </header>
  );
}

