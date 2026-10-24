"use client";

// First run: a start screen and a welcome screen, then one question per screen
// with a progress bar and percentage. The town (the one answer Home needs) is
// required and first; the rest are short, optional "pick all that apply" screens
// over life facts that drive the "Touches you" meter. Each answer maps directly
// to fact tags on ballot questions and warrant articles. Uses the app's own
// buttons and option cards. Answers use the same profile functions as the sheet
// and stay in this browser.
import { useState, type ReactNode } from "react";
import { answerArea, declineArea, type Profile } from "@/lib/engine/profile";
import { FACT_DEFS, type FactId } from "@/lib/vocab";
import { Glyph } from "./icons";
import { Option, TownStep } from "./profile-steps";
import { SiteHeader } from "./SiteHeader";
import { Button, FOCUS } from "./ui";

/**
 * The onboarding questions, in order. The town is required and first; the rest
 * are optional, each a "pick all that apply" over a small set of life facts that
 * already drive the "Touches you" meter. Each screen maps directly to fact tags
 * on ballot questions and warrant articles — nothing is collected that does not
 * surface an article.
 */
const QUESTIONS: (
  | { kind: "name"; ask: string; hint?: string }
  | { kind: "town"; ask: string }
  | { kind: "facts"; ask: string; hint?: string; facts: FactId[] }
)[] = [
  {
    kind: "name",
    ask: "What can we call you?",
    hint: "Just for a friendly hello. It stays in this browser and is never sent.",
  },
  { kind: "town", ask: "What's your address or ZIP?" },
  {
    kind: "facts",
    ask: "Which of these fits your home?",
    hint: "Decides which property tax, zoning, and housing questions touch you.",
    facts: ["rents", "owns", "lives_with_family"],
  },
  {
    kind: "facts",
    ask: "Do you have kids in the public schools?",
    hint: "Surfaces school budget and school building questions.",
    facts: ["kids_in_schools"],
  },
  {
    kind: "facts",
    ask: "How do you mostly get around?",
    hint: "Surfaces road, transit, parking, and bike-lane questions.",
    facts: ["drives", "rides_transit"],
  },
  {
    kind: "facts",
    ask: "Do you run a business in town?",
    hint: "Surfaces commercial tax, licensing, and zoning questions.",
    facts: ["runs_business_here"],
  },
  {
    kind: "facts",
    ask: "Do you work for the state?",
    hint: "Surfaces public-sector pay, labor, and hiring questions.",
    facts: ["state_employee"],
  },
  {
    kind: "facts",
    ask: "Are you registered to vote at your current address?",
    hint: "Surfaces registration deadlines and voting-access questions.",
    facts: ["registered_here"],
  },
  {
    kind: "facts",
    ask: "Do you usually vote in state primaries?",
    hint: "Surfaces primary and election-process questions.",
    facts: ["votes_in_primaries"],
  },
];
const ONBOARDING = { kind: "onboarding" } as const;

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
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState<FactId[]>([]);
  const [none, setNone] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name ?? "");

  const go = (next: Screen, fwd = true) => {
    setForward(fwd);
    setPicked([]);
    setNone(false);
    setScreen(next);
  };
  const finish = () => (answered && askToKeep && onKeep ? go("keep") : onDone());
  const next = (i: number) => (i + 1 < QUESTIONS.length ? go(i + 1) : finish());
  const back = () => {
    if (screen === "welcome") go("start", false);
    else if (screen === "keep") go(QUESTIONS.length - 1, false);
    else if (typeof screen === "number") go(screen === 0 ? "welcome" : screen - 1, false);
  };

  const q = typeof screen === "number" ? QUESTIONS[screen] : null;
  const factScreen = q?.kind === "facts" ? q : null;
  const percent = typeof screen === "number" ? Math.round((screen / QUESTIONS.length) * 100) : screen === "keep" ? 100 : 0;
  const canContinue = q?.kind === "town" ? Boolean(profile.townId) : q?.kind === "name" ? true : picked.length > 0 || none;

  const cont = () => {
    if (typeof screen !== "number" || !q) return;
    if (q.kind === "name") {
      const trimmed = nameDraft.trim().slice(0, 40);
      setProfile({ ...profile, name: trimmed || undefined });
      setAnswered(true);
    }
    if (factScreen && (picked.length || none)) {
      setProfile(answerArea(profile, factScreen.facts, picked, ONBOARDING));
      setAnswered(true);
    }
    next(screen);
  };

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
            Legible makes public decisions understandable, personal, and easy to act on. It never tells you how to vote.
          </p>
        </div>
        <ul className="space-y-2 rounded-lg bg-surface-muted p-4 text-small">
          <li className="flex items-center gap-2">
            <Glyph name="check" size={14} /> {QUESTIONS.length} quick questions, about a minute
          </li>
          <li className="flex items-center gap-2">
            <Glyph name="check" size={14} /> Only your town is needed; skip the rest
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
  } else if (q) {
    body = (
      <div className="pt-4">
        <p className="text-small font-semibold text-muted-foreground">
          Question {screen + 1} of {QUESTIONS.length}
          {q.kind === "facts" || q.kind === "name" ? " · optional" : ""}
        </p>
        <h1 className="mt-1 text-title">{q.ask}</h1>
        {q.kind === "name" && q.hint && (
          <p className="mt-1 text-body text-muted-foreground">{q.hint}</p>
        )}
        {factScreen && (
          <p className="mt-1 text-body text-muted-foreground">
            {factScreen.facts.length > 1 ? "Pick all that apply. " : ""}
            {factScreen.hint}
          </p>
        )}
        <div className="mt-6 grid gap-3">
          {q.kind === "name" ? (
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") cont();
              }}
              maxLength={40}
              autoFocus
              autoComplete="given-name"
              placeholder="Your first name or nickname"
              aria-label="Your name"
              className={`h-12 w-full rounded-md bg-surface px-4 text-body shadow-card placeholder:text-muted-foreground ${FOCUS}`}
            />
          ) : q.kind === "town" ? (
            <TownStep profile={profile} setProfile={setProfile} hideHeading />
          ) : (
            factScreen && (
              <>
                {factScreen.facts.map((f) => (
                  <Option
                    key={f}
                    icon={FACT_DEFS[f].avatarPart}
                    selected={picked.includes(f)}
                    onClick={() => {
                      setNone(false);
                      setPicked((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
                    }}
                  >
                    {FACT_DEFS[f].statement}
                  </Option>
                ))}
                <Option
                  selected={none}
                  onClick={() => {
                    setPicked([]);
                    setNone(!none);
                  }}
                >
                  {factScreen.facts.length > 1 ? "None of these" : "No"}
                </Option>
              </>
            )
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
        {screen !== "start" && screen !== "welcome" && (
          <>
            <div role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-accent transition-[width] duration-(--duration) ease-legible" style={{ width: `${percent}%` }} />
            </div>
            <span className="w-11 shrink-0 text-right text-small font-semibold text-muted-foreground">{percent}%</span>
          </>
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
        {q && typeof screen === "number" && (
          <>
            <Button className="w-full" disabled={!canContinue} onClick={cont}>
              {screen === QUESTIONS.length - 1 ? "Finish" : "Continue"}
            </Button>
            <div className="flex items-center justify-between">
              {factScreen ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfile(declineArea(profile, factScreen.facts, ONBOARDING));
                    setAnswered(true);
                    next(screen);
                  }}
                  className={`min-h-11 px-1 text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}
                >
                  Prefer not to say
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => {
                  if (q.kind === "town") setProfile({ ...profile, townId: undefined });
                  if (q.kind === "name") {
                    setNameDraft("");
                    setProfile({ ...profile, name: undefined });
                  }
                  next(screen);
                }}
                className={`min-h-11 px-1 text-small font-semibold hover:underline ${FOCUS}`}
              >
                Skip
              </button>
            </div>
            {screen > 0 && (
              <Button variant="text" className="w-full" onClick={finish}>
                Finish later
              </Button>
            )}
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
