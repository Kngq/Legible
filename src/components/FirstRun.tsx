"use client";

// First run: Hello, the town (the one required answer), then a few optional
// questions, one per screen, Duolingo-style: a progress bar, Skip top right, and
// "Finish later" to go straight to Home. Answers use the same "Pick all that
// apply" screens as the profile sheet and stay in this browser.
import { useState } from "react";
import { answerArea, declineArea, type Profile } from "@/lib/engine/profile";
import { avatarParts } from "@/lib/engine/avatar";
import { LIFE_AREAS, type LifeAreaId } from "@/lib/vocab";
import { Avatar } from "./Avatar";
import { Glyph } from "./icons";
import { AreaStep, Bubble, TownStep } from "./profile-steps";
import { Button, FOCUS } from "./ui";

/** Optional questions after the town, in order. The rest live in the profile. */
const OPTIONAL: LifeAreaId[] = ["home", "work", "voting"];
const ONBOARDING = { kind: "onboarding" } as const;

type Screen = "hello" | "town" | "intro" | "keep" | number;

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
  // Ends first run; if the person answered anything, first ask whether to keep it.
  const finish = () => (answered && askToKeep && onKeep ? go("keep") : onDone());
  const go = (next: Screen, fwd = true) => {
    setForward(fwd);
    setScreen(next);
  };
  const nextAfter = (i: number) => (i + 1 < OPTIONAL.length ? go(i + 1) : finish());
  const back = () => {
    if (screen === "keep") go(OPTIONAL.length - 1, false);
    else if (typeof screen === "number") go(screen === 0 ? "intro" : screen - 1, false);
    else if (screen === "intro") go("town", false);
    else go("hello", false);
  };
  const area = typeof screen === "number" ? LIFE_AREAS.find((a) => a.id === OPTIONAL[screen])! : null;
  const step = typeof screen === "number" ? screen + 1 : 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-3 sm:px-6">
      <header className="flex h-12 items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className={`-ml-2 flex size-12 shrink-0 items-center justify-center rounded-md hover:bg-surface-muted ${FOCUS} ${screen === "hello" ? "invisible" : ""}`}
        >
          <Glyph name="back" />
        </button>
        {typeof screen === "number" ? (
          <div
            role="progressbar"
            aria-label="Optional questions"
            aria-valuemin={0}
            aria-valuemax={OPTIONAL.length}
            aria-valuenow={step}
            className="h-3 flex-1 overflow-hidden rounded-full bg-surface-muted"
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-(--duration) ease-legible" style={{ width: `${(step / OPTIONAL.length) * 100}%` }} />
          </div>
        ) : (
          <span className="flex-1" />
        )}
        {screen === "town" && (
          <button
            type="button"
            onClick={() => {
              setProfile({ ...profile, townId: undefined });
              onDone();
            }}
            className={`min-h-12 rounded-md px-3 text-body font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}
          >
            Skip
          </button>
        )}
        {typeof screen === "number" && (
          <button type="button" onClick={() => nextAfter(screen)} className={`min-h-12 rounded-md px-3 text-body font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
            Skip
          </button>
        )}
      </header>

      <div key={String(screen)} className={`flex-1 pt-6 ${screen === "hello" ? "animate-fade-in" : forward ? "animate-slide-next" : "animate-slide-back"}`}>
        {screen === "hello" && (
          <div className="flex flex-col items-center gap-8 pt-6">
            <Avatar parts={[]} size={200} />
            <Bubble>Your town and state decide things every year that reach your daily life. Let&rsquo;s find the ones that touch you.</Bubble>
          </div>
        )}
        {screen === "town" && <TownStep profile={profile} setProfile={setProfile} />}
        {screen === "intro" && (
          <div className="flex flex-col items-center gap-8 pt-6">
            <Avatar parts={avatarParts(profile)} size={180} />
            <Bubble>
              Want it more personal? Answer up to {OPTIONAL.length} quick questions and Legible can point out what may affect you. Skip any of them. Your answers stay in this
              browser.
            </Bubble>
          </div>
        )}
        {screen === "keep" && (
          <div className="flex flex-col items-center gap-8 pt-6">
            <Avatar parts={avatarParts(profile)} size={180} />
            <Bubble>
              Keep your answers on this device? They stay in this browser only, so Legible stays personal next time. Clear my information erases them any time.
            </Bubble>
          </div>
        )}
        {area && typeof screen === "number" && (
          <div className="space-y-4">
            <p className="text-small font-semibold text-muted-foreground">
              Optional · {step} of {OPTIONAL.length}
            </p>
            <AreaStep
              key={area.id}
              area={area}
              profile={profile}
              saveLabel={step === OPTIONAL.length ? "Finish" : "Continue"}
              onNext={(picked) => {
                setProfile(answerArea(profile, area.facts, picked, ONBOARDING));
                setAnswered(true);
                nextAfter(screen);
              }}
              onDecline={() => {
                setProfile(declineArea(profile, area.facts, ONBOARDING));
                setAnswered(true);
                nextAfter(screen);
              }}
            />
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 -mx-4 mt-6 space-y-1 bg-background/95 px-4 pb-2 pt-3 backdrop-blur sm:mx-0 sm:px-0">
        {screen === "hello" && (
          <>
            <Button className="w-full" onClick={() => go("town")}>
              Get started
            </Button>
            <Button variant="text" className="w-full" onClick={onDone}>
              Just show me everything
            </Button>
          </>
        )}
        {screen === "town" && (
          <Button className="w-full" disabled={!profile.townId} onClick={() => go("intro")}>
            Continue
          </Button>
        )}
        {screen === "intro" && (
          <>
            <Button className="w-full" onClick={() => go(0)}>
              Answer a few questions
            </Button>
            <Button variant="text" className="w-full" onClick={onDone}>
              Skip for now
            </Button>
          </>
        )}
        {typeof screen === "number" && (
          <Button variant="text" className="w-full" onClick={finish}>
            Finish later
          </Button>
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
