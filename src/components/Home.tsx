"use client";

// Home after onboarding, kept short: a greeting, then For you: one list from
// homeSections, dates coming up soon first, then decisions that could affect
// the person (from their answers and interests). Interests live in the profile,
// with a badge on the profile icon until they are chosen. Everything else is on
// Explore, one button away. Order comes from buildTimeline. Runs in the browser.
import type { CivicCard } from "@/lib/engine/civic";
import type { Feed } from "@/lib/engine/feed";
import { homeSections } from "@/lib/engine/home-copy";
import type { Profile } from "@/lib/engine/profile";
import { buildTimeline, type TimelineEntry } from "@/lib/engine/timeline";
import { BriefCard } from "./BriefCard";
import { Glyph } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { FOCUS } from "./ui";
import { H2, SECONDARY, TopBar } from "./updates";

export function Home({
  feed,
  civic,
  today,
  profile,
  onOpenDoc,
  onOpenMeasure,
  onOpenItem,
  onOpenProfile,
  onExplore,
}: {
  feed: Feed;
  /** Deadlines, meetings, and bills for this person's state and town, in feed order. */
  civic: CivicCard[];
  today: string;
  profile: Profile;
  onOpenDoc: (id: string) => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
  onOpenItem: (id: string) => void;
  onOpenProfile: (v: SheetView) => void;
  onExplore: () => void;
}) {
  const town = townName(profile.townId);
  // A friendly greeting, stable per name so it doesn't flicker on re-render.
  const GREETINGS = ["Hello", "Hi", "Hey", "Welcome back"];
  const greeting = GREETINGS[(profile.name ?? "").length % GREETINGS.length];
  const all = buildTimeline(feed.items, civic, today, { includeOthers: true });
  const { attention, affect } = homeSections(buildTimeline(feed.items, civic, today), all);
  const forYou: TimelineEntry[] = [...attention, ...affect];
  const cardProps = { today, onOpenItem, onOpenDoc, onOpenMeasure, onOpenProfile };
  // Interests are "decided" once the person confirms the topics screen or picks any.
  const needsInterests = !profile.topicsConfirmedAt && Object.keys(profile.topics).length === 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <TopBar active="home" needsInterests={needsInterests} onHome={() => window.scrollTo({ top: 0 })} onExplore={onExplore} onOpenProfile={onOpenProfile} />

      <header className="pt-6">
        {profile.name ? (
          <>
            <h1 className="text-display">
              {greeting}, {profile.name}
            </h1>
            <p className="mt-3 text-body text-muted-foreground">
              Here&apos;s what&apos;s happening in {town ?? "Massachusetts"}: local decisions, how they could affect you, and ways to have your say.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-display">What&apos;s happening in {town ?? "Massachusetts"}?</h1>
            <p className="mt-3 text-body text-muted-foreground">Understand local decisions, see how they could affect you, and find ways to have your say.</p>
          </>
        )}
      </header>

      {/* Only what relates to this person. Everything else is on Explore. */}
      <section aria-labelledby="h-foryou" className="mt-10">
        <h2 id="h-foryou" className={H2}>
          For you
        </h2>
        {forYou.length > 0 ? (
          <>
            <p className="mt-1 text-small text-muted-foreground">Dates coming up soon first, then decisions based on your profile and interests.</p>
            <ul className="mt-4 space-y-4">
              {forYou.map((e) => (
                <BriefCard key={e.key} entry={e} {...cardProps} />
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-small text-muted-foreground">
            Nothing matches your answers yet.{" "}
            <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`font-semibold text-foreground underline underline-offset-4 ${FOCUS}`}>
              Add details to your profile
            </button>{" "}
            and the decisions that reach your life will show here first.
          </p>
        )}
        <button type="button" onClick={onExplore} className={`mt-5 ${SECONDARY}`}>
          Explore everything happening near you
          <span aria-hidden="true" className="-rotate-90">
            <Glyph name="chevron" size={14} />
          </span>
        </button>
      </section>
    </div>
  );
}
