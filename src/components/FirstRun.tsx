"use client";

// First run: one welcome screen with the mission, then one question per screen
// with a progress bar and percentage: the town (the one answer Home needs) and
// three optional areas, each skippable. Uses the app's own buttons and option
// cards. Answers use the same profile functions as the sheet and stay in this browser.
import { useState, type ReactNode } from "react";
import { answerArea, declineArea, type Profile } from "@/lib/engine/profile";
import { FACT_DEFS, LIFE_AREAS, type FactId, type LifeAreaId } from "@/lib/vocab";
import { Glyph } from "./icons";
import { Option, TownStep } from "./profile-steps";
import { Button, FOCUS } from "./ui";

/** The questions, in order. The town first; the rest are optional areas. */
const QUESTIONS: ({ kind: "town"; ask: string } | { kind: "area"; id: LifeAreaId; ask: string })[] = [
  { kind: "town", ask: "Where do you live?" },
  { kind: "area", id: "home", ask: "Which of these fits your home?" },
  { kind: "area", id: "work", ask: "Do any of these fit your work?" },
  { kind: "area", id: "voting", ask: "Which of these fit how you vote?" },
];
const ONBOARDING = { kind: "onboarding" } as const;

type Screen = "welcome" | "keep" | number;

/** PLACEHOLDER LOGO until the real Legible mark exists. Swap this component; nothing else depends on its look. */
function Logo({ size = 72 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[30%] bg-accent font-bold text-accent-foreground"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      L
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
  const [screen, setScreen] = useState<Screen>("welcome");
  const [forward, setForward] = useState(true);
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState<FactId[]>([]);
  const [none, setNone] = useState(false);

  const go = (next: Screen, fwd = true) => {
    setForward(fwd);
    setPicked([]);
    setNone(false);
    setScreen(next);
  };
  const finish = () => (answered && askToKeep && onKeep ? go("keep") : onDone());
  const next = (i: number) => (i + 1 < QUESTIONS.length ? go(i + 1) : finish());
  const back = () => {
    if (screen === "keep") go(QUESTIONS.length - 1, false);
    else if (typeof screen === "number") go(screen === 0 ? "welcome" : screen - 1, false);
  };

  const q = typeof screen === "number" ? QUESTIONS[screen] : null;
  const area = q?.kind === "area" ? LIFE_AREAS.find((a) => a.id === q.id)! : null;
  const percent = typeof screen === "number" ? Math.round((screen / QUESTIONS.length) * 100) : screen === "keep" ? 100 : 0;
  const canContinue = q?.kind === "town" ? Boolean(profile.townId) : picked.length > 0 || none;

  const cont = () => {
    if (typeof screen !== "number" || !q) return;
    if (area && (picked.length || none)) {
      setProfile(answerArea(profile, area.facts, picked, ONBOARDING));
      setAnswered(true);
    }
    next(screen);
  };

  let body: ReactNode = null;
  if (screen === "welcome") {
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
          {q.kind === "area" ? " · optional" : ""}
        </p>
        <h1 className="mt-1 text-title">{q.ask}</h1>
        {area && <p className="mt-1 text-body text-muted-foreground">Pick all that apply.</p>}
        <div className="mt-6 grid gap-3">
          {q.kind === "town" ? (
            <TownStep profile={profile} setProfile={setProfile} hideHeading />
          ) : (
            area && (
              <>
                {area.facts.map((f) => (
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
                  None of these
                </Option>
              </>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-3 sm:px-6">
      <header className="flex h-12 items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className={`-ml-2 flex size-12 shrink-0 items-center justify-center rounded-md hover:bg-surface-muted ${FOCUS} ${screen === "welcome" ? "invisible" : ""}`}
        >
          <Glyph name="back" />
        </button>
        {screen !== "welcome" && (
          <>
            <div role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-accent transition-[width] duration-(--duration) ease-legible" style={{ width: `${percent}%` }} />
            </div>
            <span className="w-11 shrink-0 text-right text-small font-semibold text-muted-foreground">{percent}%</span>
          </>
        )}
      </header>

      <main key={String(screen)} className={`flex flex-1 flex-col ${screen === "welcome" ? "animate-fade-in" : forward ? "animate-slide-next" : "animate-slide-back"}`}>
        {body}
      </main>

      <footer className="sticky bottom-0 -mx-4 mt-6 space-y-1 bg-background/95 px-4 pb-2 pt-3 backdrop-blur sm:mx-0 sm:px-0">
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
              {area ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfile(declineArea(profile, area.facts, ONBOARDING));
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
  );
}
