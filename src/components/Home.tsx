"use client";

// Home after onboarding: the For you page. A compact personal header (whose
// town, and which parts of the profile sort the page), then two sections that
// never mix: "Coming up", the time-sensitive dates as compact rows, and
// "Decisions for you", the cards ranked by how they connect to the person.
// Everything else is on Explore, one button away. Order comes from buildTimeline
// and homeSections. Runs in the browser.
import type { CivicCard } from "@/lib/engine/civic";
import type { Feed } from "@/lib/engine/feed";
import { homeSections, profileBasis } from "@/lib/engine/home-copy";
import type { Profile } from "@/lib/engine/profile";
import { buildTimeline } from "@/lib/engine/timeline";
import { BriefCard, DeadlineRow } from "./BriefCard";
import { Glyph } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { FOCUS } from "./ui";
import { SECONDARY, TopBar } from "./updates";

const H2 = "text-body font-bold";

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
  const basis = profileBasis(profile);
  const cardProps = { today, onOpenItem, onOpenDoc, onOpenMeasure, onOpenProfile };
  // Interests are "decided" once the person confirms the topics screen or picks any.
  const needsInterests = !profile.topicsConfirmedAt && Object.keys(profile.topics).length === 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <TopBar active="home" needsInterests={needsInterests} onHome={() => window.scrollTo({ top: 0 })} onExplore={onExplore} onOpenProfile={onOpenProfile} />

      <header className="pt-4 sm:pt-6">
        {profile.name && (
          <p className="text-small font-semibold text-muted-foreground">
            {greeting}, {profile.name}
          </p>
        )}
        <h1 className="text-display font-extrabold">For you</h1>
        <p className="mt-2 text-body">Public decisions that may matter to your life in {town ?? "Massachusetts"}.</p>
        <p className="mt-1 text-small text-muted-foreground">
          {basis ?? "Add a few details and Legible sorts this page by what touches your life."}{" "}
          <button
            type="button"
            onClick={() => onOpenProfile({ kind: needsInterests ? "topics" : "list" })}
            className={`inline-flex items-center gap-1 font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground ${FOCUS}`}
          >
            {basis ? "Edit profile" : "Add details"}
          </button>
        </p>
      </header>

      {/* Dates first, in their own panel, so a deadline never reads as a recommendation. */}
      {attention.length > 0 && (
        <section aria-labelledby="h-coming" className="mt-7">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="h-coming" className={H2}>
              Coming up
            </h2>
            <p className="text-small text-muted-foreground">Dates from official sources</p>
          </div>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border/60 bg-surface shadow-card">
            {attention.map((e) => (
              <DeadlineRow key={e.key} entry={e} {...cardProps} />
            ))}
          </ul>
        </section>
      )}

      {/* Only what relates to this person. Everything else is on Explore. */}
      <section aria-labelledby="h-foryou" className="mt-9">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="h-foryou" className={H2}>
            Decisions for you
          </h2>
          {affect.length > 0 && <p className="text-small text-muted-foreground">Closest to your life first</p>}
        </div>
        {affect.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {affect.map((e) => (
              <BriefCard key={e.key} entry={e} {...cardProps} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-small text-muted-foreground">
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
