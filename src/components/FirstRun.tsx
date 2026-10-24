"use client";

// First run: Hello, then the town. That is all; the rest of the life profile is
// filled in later from the profile sheet behind the avatar ring.
// The town screen becomes a ZIP field once the ZIP table (task 16.6) exists.
import { useState } from "react";
import type { Profile } from "@/lib/engine/profile";
import { Avatar } from "./Avatar";
import { Glyph } from "./icons";
import { Bubble, TownStep } from "./profile-steps";
import { Button, FOCUS } from "./ui";

export function FirstRun({ profile, setProfile, onDone }: { profile: Profile; setProfile: (p: Profile) => void; onDone: () => void }) {
  const [screen, setScreen] = useState<"hello" | "town">("hello");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-3 sm:px-6">
      <header className="flex h-12 items-center justify-between">
        <button
          type="button"
          onClick={() => setScreen("hello")}
          aria-label="Back"
          className={`-ml-2 flex size-12 items-center justify-center rounded-md hover:bg-surface-muted ${FOCUS} ${screen === "hello" ? "invisible" : ""}`}
        >
          <Glyph name="back" />
        </button>
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
      </header>

      <div key={screen} className={`flex-1 pt-6 ${screen === "town" ? "animate-slide-next" : "animate-fade-in"}`}>
        {screen === "hello" ? (
          <div className="flex flex-col items-center gap-8 pt-6">
            <Avatar parts={[]} size={200} />
            <Bubble>Your town and state decide things every year that reach your daily life. Let&rsquo;s find the ones that touch you.</Bubble>
          </div>
        ) : (
          <TownStep profile={profile} setProfile={setProfile} />
        )}
      </div>

      <footer className="sticky bottom-0 -mx-4 mt-6 space-y-1 bg-background/95 px-4 pb-2 pt-3 backdrop-blur sm:mx-0 sm:px-0">
        {screen === "hello" ? (
          <>
            <Button className="w-full" onClick={() => setScreen("town")}>
              Get started
            </Button>
            <Button variant="text" className="w-full" onClick={onDone}>
              Just show me everything
            </Button>
          </>
        ) : (
          <Button className="w-full" disabled={!profile.townId} onClick={onDone}>
            Show my decisions
          </Button>
        )}
      </footer>
    </div>
  );
}
