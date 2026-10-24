"use client";

// Home after onboarding, kept short: a welcome, "What matters to you?" first,
// then only the updates that match the person's answers or subjects. Everything
// else lives on Explore. Order comes from buildTimeline. Runs in the browser.
import type { CivicCard } from "@/lib/engine/civic";
import type { Feed } from "@/lib/engine/feed";
import type { Profile } from "@/lib/engine/profile";
import { buildTimeline } from "@/lib/engine/timeline";
import { Glyph } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { H2, SECONDARY, TopBar, UpdateCard } from "./updates";

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
  const forYou = buildTimeline(feed.items, civic, today).filter((e) => e.touches || e.relevance >= 0.6);
  const cardProps = { today, onOpenItem, onOpenDoc, onOpenMeasure };
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

      {/* Only what matches this person. Everything else is on Explore. */}
      <section aria-labelledby="h-foryou" className="mt-10">
        <h2 id="h-foryou" className={H2}>
          For you
        </h2>
        {forYou.length > 0 ? (
          <>
            <p className="mt-1 text-small text-muted-foreground">Updates that match your answers, most likely to affect you first.</p>
            <ul className="mt-4 space-y-4">
              {forYou.map((e) => (
                <UpdateCard key={e.key} entry={e} {...cardProps} />
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-small text-muted-foreground">As you add details above, updates that may affect you will show up here.</p>
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
