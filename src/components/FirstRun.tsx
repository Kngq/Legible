"use client";

// First run: a start screen and a welcome screen, then three short, optional
// steps (town, home, subjects) and straight on to Legible. Show value first; the
// rest of the profile (name, school, getting around, work, voting) lives in the
// profile sheet and is asked in context on the decisions it would sharpen. Steps
// write to the same profile as the sheet, only what the person actually picks,
// and everything stays in this browser.
import { useEffect, useState, type ReactNode } from "react";
import { hideChatDock } from "@/lib/ui/chat-dock";
import { applyHome, confirmFirstRunTopics, firstRunGave, firstRunStart, skipStep, type HomeChoice } from "@/lib/engine/onboarding";
import type { Profile } from "@/lib/engine/profile";
import { Glyph } from "./icons";
import { Option, TopicsStep, TownStep } from "./profile-steps";
import { SiteHeader } from "./SiteHeader";
import { Button, FOCUS } from "./ui";

const STEPS = [
  { kind: "town", ask: "Where do you live?", hint: "We'll show you decisions happening in your community." },
  { kind: "home", ask: "Which best describes your home?", hint: "This helps us highlight housing decisions that may matter to you." },
  { kind: "topics", ask: "What matters to you?", hint: "Pick a few topics you'd like to follow. You can change these anytime." },
] as const;

/** The home step's choices; what each one records lives in applyHome. */
const HOME_CHOICES: { id: HomeChoice; label: string }[] = [
  { id: "rents", label: "I rent" },
  { id: "owns", label: "I own my home" },
  { id: "family", label: "I live with family" },
  { id: "else", label: "Something else" },
];

type Screen = "start" | "welcome" | "keep" | number;

/** Legible mark: magnifying glass with a check. Swap this component; nothing else depends on its look. */
function Logo({ size = 72 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/legible-mark.svg"
        alt=""
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export function FirstRun({
  profile,
  setProfile,
  onDone,
  askToKeep = false,
  onKeep,
  onNotNow,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  onDone: () => void;
  /** Storage works and remember is off: offer to keep answers given here. */
  askToKeep?: boolean;
  onKeep?: () => void;
  onNotNow?: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("start");
  const [forward, setForward] = useState(true);
  // What the profile held before this run, so Skip and changed answers only undo this run's picks.
  const [start] = useState(() => firstRunStart(profile));
  const [home, setHome] = useState<HomeChoice | null>(null);
  // Ask Kiro is not part of getting started; its launcher would sit over the footer links.
  useEffect(() => hideChatDock(), []);

  const provided = firstRunGave(profile, start);
  const go = (next: Screen, fwd = true) => {
    setForward(fwd);
    setScreen(next);
  };
  const finish = () => (provided && askToKeep && onKeep ? go("keep") : onDone());
  const next = (i: number) => (i + 1 < STEPS.length ? go(i + 1) : finish());
  const back = () => {
    if (screen === "welcome") go("start", false);
    else if (screen === "keep") go(STEPS.length - 1, false);
    else if (typeof screen === "number") go(screen === 0 ? "welcome" : screen - 1, false);
  };

  const step = typeof screen === "number" ? STEPS[screen] : null;
  const last = typeof screen === "number" && screen === STEPS.length - 1;
  const canContinue = step?.kind === "town" ? Boolean(profile.townId) : step?.kind === "home" ? home !== null : true;

  const cont = () => {
    if (typeof screen !== "number" || !step) return;
    if (step.kind === "home" && home) setProfile(applyHome(profile, start, home));
    if (step.kind === "topics") setProfile(confirmFirstRunTopics(profile));
    next(screen);
  };
  const skip = () => {
    if (typeof screen !== "number" || !step) return;
    if (step.kind === "home") setHome(null);
    setProfile(skipStep(profile, start, step.kind));
    next(screen);
  };

  // The last step's button names where it goes: personal only if something was given.
  const lastLabel = provided ? "Show my Legible →" : "Explore Legible →";

  let body: ReactNode = null;
  if (screen === "start") {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Logo size={96} />
        <div>
          <h1 className="font-wordmark text-display">Legible</h1>
          <p className="mt-3 text-body text-muted-foreground">
            Local decisions, made legible to the people they are about.
          </p>
        </div>
      </div>
    );
  } else if (screen === "welcome") {
    body = (
      <div className="flex flex-1 flex-col justify-center gap-6">
        <Logo />
        <div>
          <h1 className="text-title">See what&rsquo;s being decided near you</h1>
          <p className="mt-3 text-body text-muted-foreground">
            Tell us a little about what matters to you, and we&rsquo;ll help you understand what&rsquo;s happening around you. Legible never tells you how to vote.
          </p>
        </div>
        <ul className="space-y-2 rounded-lg bg-surface-muted p-4 text-small">
          <li className="flex items-center gap-2">
            <Glyph name="check" size={14} /> {STEPS.length} short steps, under a minute
          </li>
          <li className="flex items-center gap-2">
            <Glyph name="check" size={14} /> Every step is optional
          </li>
          <li className="flex items-center gap-2">
            <Glyph name="check" size={14} /> Your answers stay in this browser
          </li>
        </ul>
      </div>
    );
  } else if (screen === "keep") {
    body = (
      <div className="flex flex-1 flex-col justify-center gap-6">
        <Logo size={56} />
        <div>
          <h1 className="text-title">Keep your answers on this device?</h1>
          <p className="mt-3 text-body text-muted-foreground">
            So Legible stays personal next time. They stay in this browser only, and Clear my information erases them any time.
          </p>
        </div>
      </div>
    );
  } else if (step) {
    body = (
      <div className="pt-6">
        <h1 id="step-h" className="text-title">{step.ask}</h1>
        <p className="mt-2 text-body text-muted-foreground">{step.hint}</p>
        <div className="mt-8">
          {step.kind === "town" ? (
            <>
              <TownStep profile={profile} setProfile={setProfile} hideHeading />
              {!profile.townId && (
                <p className="mt-4 text-small text-muted-foreground">
                  Rather not say? Skip it and you&rsquo;ll see statewide decisions. A town adds what&rsquo;s happening locally.
                </p>
              )}
            </>
          ) : step.kind === "home" ? (
            <div role="group" aria-labelledby="step-h" className="grid gap-3">
              {HOME_CHOICES.map((h) => (
                <Option key={h.id} selected={home === h.id} onClick={() => setHome(home === h.id ? null : h.id)}>
                  {h.label}
                </Option>
              ))}
            </div>
          ) : (
            <TopicsStep profile={profile} setProfile={setProfile} compact />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-col">
      {screen === "start" && <SiteHeader />}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-3 sm:px-6">
      <header className={`flex h-12 items-center gap-3 ${screen === "start" ? "hidden" : ""}`}>
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className={`-ml-2 flex size-12 shrink-0 items-center justify-center rounded-md hover:bg-surface-muted ${FOCUS}`}
        >
          <Glyph name="back" />
        </button>
        {typeof screen === "number" && (
          <div className="ml-auto flex items-center gap-3" role="group" aria-label={`Step ${screen + 1} of ${STEPS.length}`}>
            <span aria-hidden="true" className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-(--duration) ease-legible ${i === screen ? "w-5 bg-primary" : i < screen ? "w-1.5 bg-primary" : "w-1.5 bg-border"}`}
                />
              ))}
            </span>
            <span aria-hidden="true" className="text-small text-muted-foreground">
              {screen + 1} of {STEPS.length}
            </span>
          </div>
        )}
      </header>

      <main key={String(screen)} className={`flex flex-1 flex-col ${screen === "start" || screen === "welcome" ? "animate-fade-in" : forward ? "animate-slide-next" : "animate-slide-back"}`}>
        {body}
      </main>

      <footer className="sticky bottom-0 -mx-4 mt-6 space-y-1 bg-background/95 px-4 pb-2 pt-3 backdrop-blur sm:mx-0 sm:px-0">
        {screen === "start" && (
          <Button className="w-full" onClick={() => go("welcome")}>
            Get started
          </Button>
        )}
        {screen === "welcome" && (
          <>
            <Button className="w-full" onClick={() => go(0)}>
              Get started
            </Button>
            <Button variant="text" className="w-full" onClick={onDone}>
              Just show me everything
            </Button>
          </>
        )}
        {step && (
          <>
            <Button className="w-full" disabled={!canContinue} onClick={cont}>
              {last ? lastLabel : "Continue"}
            </Button>
            <Button variant="text" className="w-full" onClick={skip}>
              Skip
            </Button>
          </>
        )}
        {screen === "keep" && (
          <>
            <Button
              className="w-full"
              onClick={() => {
                onKeep?.();
                onDone();
              }}
            >
              Keep on this device
            </Button>
            <Button
              variant="text"
              className="w-full"
              onClick={() => {
                onNotNow?.();
                onDone();
              }}
            >
              Not now
            </Button>
          </>
        )}
      </footer>
      </div>
    </div>
  );
}
