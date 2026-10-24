"use client";

// First run, after Duolingo's pattern: a mascot with a speech bubble, one thing
// per screen, a big Continue button, and a progress bar with a percentage.
// Hello, the mission, "Just N quick questions", then the town (the one answer
// Home needs) and three optional areas, each skippable. Answers use the same
// profile functions as the sheet and stay in this browser.
import { useState, type ReactNode } from "react";
import { answerArea, declineArea, type Profile } from "@/lib/engine/profile";
import { FACT_DEFS, LIFE_AREAS, type FactId, type LifeAreaId } from "@/lib/vocab";
import { Glyph, Part } from "./icons";
import { TownStep } from "./profile-steps";
import { FOCUS } from "./ui";

/** The questions, in order. The town first; the rest are optional areas. */
const QUESTIONS: ({ kind: "town"; ask: string } | { kind: "area"; id: LifeAreaId; ask: string })[] = [
  { kind: "town", ask: "Where do you live?" },
  { kind: "area", id: "home", ask: "Which of these fits your home?" },
  { kind: "area", id: "work", ask: "Do any of these fit your work?" },
  { kind: "area", id: "voting", ask: "Which of these fit how you vote?" },
];
const ONBOARDING = { kind: "onboarding" } as const;

type Screen = "hello" | "mission" | "count" | "keep" | number;

/**
 * PLACEHOLDER LOGO: an abstract Legible mark standing in for a mascot until the
 * real one is drawn. Swap this component; nothing else depends on its look.
 */
function Mascot({ size = 140, mood = "hi" }: { size?: number; mood?: "hi" | "ask" | "happy" }) {
  const eye = mood === "happy" ? "M-6 0q6-6 12 0" : "";
  return (
    <span aria-hidden="true" className="relative inline-flex shrink-0 flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <rect x="8" y="6" width="84" height="84" rx="28" className="fill-accent" />
        {mood === "happy" ? (
          <g fill="none" stroke="white" strokeWidth="5" strokeLinecap="round">
            <path d={eye} transform="translate(36 44)" />
            <path d={eye} transform="translate(64 44)" />
          </g>
        ) : (
          <g className="fill-accent-foreground">
            <circle cx="36" cy="44" r="9" />
            <circle cx="64" cy="44" r="9" />
            <circle cx="38" cy="42" r="3.5" className="fill-accent" />
            <circle cx="66" cy="42" r="3.5" className="fill-accent" />
          </g>
        )}
        <path d={mood === "ask" ? "M42 66h16" : "M40 63q10 9 20 0"} fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <text x="50" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" opacity="0.8">
          L
        </text>
      </svg>
      <span className="-mt-2 h-3 w-3/4 rounded-full bg-foreground/10" />
    </span>
  );
}

/** Speech bubble with a tail, pointing down at the mascot or left at it. */
function Speech({ children, tail = "down" }: { children: ReactNode; tail?: "down" | "left" }) {
  return (
    <div className="relative rounded-lg border-2 border-border bg-surface px-5 py-4 text-body">
      {children}
      <span
        aria-hidden="true"
        className={`absolute size-4 rotate-45 border-border bg-surface ${
          tail === "down" ? "-bottom-[9px] left-1/2 -translate-x-1/2 border-b-2 border-r-2" : "-left-[9px] top-1/2 -translate-y-1/2 border-b-2 border-l-2"
        }`}
      />
    </div>
  );
}

/** The big pressable button: solid fill with a darker lip underneath. */
function BigButton({ children, onClick, disabled, quiet = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; quiet?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-14 w-full rounded-lg text-body font-bold uppercase tracking-wider transition-transform duration-(--duration) ease-legible active:translate-y-1 disabled:cursor-not-allowed ${FOCUS} ${
        quiet
          ? "border-2 border-border bg-surface text-foreground shadow-[0_4px_0_var(--border)]"
          : "bg-accent text-accent-foreground shadow-[0_4px_0_rgb(0_0_0/0.28)] disabled:bg-surface-muted disabled:text-muted-foreground disabled:shadow-[0_4px_0_var(--border)]"
      }`}
    >
      {children}
    </button>
  );
}

/** A pick-all-that-apply card: bordered, with a lip, tinted when selected. */
function Choice({ selected, onClick, icon, children }: { selected: boolean; onClick: () => void; icon?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-4 rounded-lg border-2 px-4 text-left text-body font-bold transition-colors duration-(--duration) ease-legible ${FOCUS} ${
        selected ? "border-accent bg-accent-soft shadow-[0_3px_0_var(--accent)]" : "border-border bg-surface shadow-[0_3px_0_var(--border)] hover:bg-surface-muted"
      }`}
    >
      {icon && (
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-muted">
          <Part name={icon} size={22} />
        </span>
      )}
      <span className="flex-1">{children}</span>
    </button>
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
  const [screen, setScreen] = useState<Screen>("hello");
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
    else if (typeof screen === "number") go(screen === 0 ? "count" : screen - 1, false);
    else if (screen === "count") go("mission", false);
    else go("hello", false);
  };

  const q = typeof screen === "number" ? QUESTIONS[screen] : null;
  const area = q?.kind === "area" ? LIFE_AREAS.find((a) => a.id === q.id)! : null;
  const percent = typeof screen === "number" ? Math.round((screen / QUESTIONS.length) * 100) : screen === "keep" ? 100 : 0;

  const cont = () => {
    if (typeof screen !== "number" || !q) return;
    if (q.kind === "town") return next(screen);
    if (area && (picked.length || none)) {
      setProfile(answerArea(profile, area.facts, picked, ONBOARDING));
      setAnswered(true);
    }
    next(screen);
  };
  const canContinue = q?.kind === "town" ? Boolean(profile.townId) : picked.length > 0 || none;

  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-3 sm:px-6">
        <header className="flex h-12 items-center gap-3">
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className={`-ml-2 flex size-12 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted ${FOCUS} ${screen === "hello" ? "invisible" : ""}`}
          >
            <Glyph name="back" />
          </button>
          {(typeof screen === "number" || screen === "keep") && (
            <>
              <div role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-4 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div className="relative h-full rounded-full bg-accent transition-[width] duration-(--duration) ease-legible" style={{ width: `${Math.max(percent, 6)}%` }}>
                  <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-accent-foreground/30" />
                </div>
              </div>
              <span className="w-11 shrink-0 text-right text-small font-bold text-accent">{percent}%</span>
            </>
          )}
        </header>

        <main key={String(screen)} className={`flex flex-1 flex-col ${screen === "hello" ? "animate-fade-in" : forward ? "animate-slide-next" : "animate-slide-back"}`}>
          {screen === "hello" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <Speech>Hi there! I&rsquo;m Legi, your guide to what&rsquo;s being decided near you.</Speech>
              <Mascot mood="hi" />
            </div>
          )}

          {screen === "mission" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <Speech>
                <span className="block text-small font-bold uppercase tracking-wider text-accent">Our mission</span>
                <span className="mt-1 block">
                  Make public decisions <strong>understandable</strong>, <strong>personal</strong>, and <strong>easy to act on</strong>, without ever telling you how
                  to vote.
                </span>
              </Speech>
              <Mascot mood="happy" />
            </div>
          )}

          {screen === "count" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <Speech>
                Just <strong>{QUESTIONS.length} quick questions</strong> before we show what&rsquo;s happening near you! Only your town is needed. Your answers stay in
                this browser.
              </Speech>
              <Mascot mood="happy" />
            </div>
          )}

          {q && typeof screen === "number" && (
            <div className="pt-6">
              <div className="flex items-center gap-4">
                <Mascot size={88} mood="ask" />
                <div className="flex-1">
                  <Speech tail="left">
                    {q.ask}
                    {area && <span className="mt-1 block text-small text-muted-foreground">Pick all that apply.</span>}
                  </Speech>
                </div>
              </div>
              <div className="mt-8 space-y-3">
                {q.kind === "town" ? (
                  <TownStep profile={profile} setProfile={setProfile} hideHeading />
                ) : (
                  area && (
                    <>
                      {area.facts.map((f) => (
                        <Choice
                          key={f}
                          icon={FACT_DEFS[f].avatarPart}
                          selected={picked.includes(f)}
                          onClick={() => {
                            setNone(false);
                            setPicked((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
                          }}
                        >
                          {FACT_DEFS[f].statement}
                        </Choice>
                      ))}
                      <Choice
                        selected={none}
                        onClick={() => {
                          setPicked([]);
                          setNone(!none);
                        }}
                      >
                        None of these
                      </Choice>
                    </>
                  )
                )}
              </div>
            </div>
          )}

          {screen === "keep" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <Speech>Nice work! Keep your answers on this device so Legible stays personal next time? Clear my information erases them any time.</Speech>
              <Mascot mood="happy" />
            </div>
          )}
        </main>

        <footer className="mt-6 space-y-3">
          {screen === "hello" && (
            <>
              <BigButton onClick={() => go("mission")}>Get started</BigButton>
              <button type="button" onClick={onDone} className={`min-h-11 w-full text-small font-bold uppercase tracking-wider text-accent ${FOCUS}`}>
                Just show me everything
              </button>
            </>
          )}
          {screen === "mission" && <BigButton onClick={() => go("count")}>Continue</BigButton>}
          {screen === "count" && <BigButton onClick={() => go(0)}>Continue</BigButton>}
          {q && typeof screen === "number" && (
            <>
              <BigButton onClick={cont} disabled={!canContinue}>
                {screen === QUESTIONS.length - 1 ? "Finish" : "Continue"}
              </BigButton>
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
                  className={`min-h-11 px-1 text-small font-bold uppercase tracking-wider text-accent ${FOCUS}`}
                >
                  Skip
                </button>
              </div>
              {screen > 0 && (
                <button type="button" onClick={finish} className={`min-h-11 w-full text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
                  Finish later
                </button>
              )}
            </>
          )}
          {screen === "keep" && (
            <>
              <BigButton
                onClick={() => {
                  onKeep?.();
                  onDone();
                }}
              >
                Keep on this device
              </BigButton>
              <BigButton
                quiet
                onClick={() => {
                  onNotNow?.();
                  onDone();
                }}
              >
                Not now
              </BigButton>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
