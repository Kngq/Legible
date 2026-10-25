"use client";

// Home after onboarding: the For you page, in the Notebook direction. A personal
// header (greeting, whose town, and one quiet line of where the page's sorting
// comes from; how much of the profile is filled in lives in the profile sheet); "Coming up" as a time ribbon, with the most urgent
// date selected; then "Decisions for you": the first as a featured decision, the
// rest as compact rows, ranked by how they connect to the person. Dates and
// decisions never mix. Everything else is on Explore, one link away. Order comes
// from buildTimeline and homeSections. Runs in the browser.
import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";
import type { CivicCard } from "@/lib/engine/civic";
import type { Feed } from "@/lib/engine/feed";
import { homeSections } from "@/lib/engine/home-copy";
import { DURATION, EASE } from "@/lib/motion";
import type { Profile } from "@/lib/engine/profile";
import { buildTimeline } from "@/lib/engine/timeline";
import { decisionsFor, DecisionRow, FeaturedDecision } from "./BriefCard";
import { ComingUp } from "./ComingUp";
import { Glyph } from "./icons";
import { HomePlant } from "./plant/HomePlant";
import { useGrowth } from "./plant/useGrowth";
import type { SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { FOCUS } from "./ui";
import { WrappedInvite } from "./wrapped/WrappedInvite";

// Plant size follows one breakpoint; re-renders only when it flips.
const WIDE = "(min-width: 640px)";
function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
}

/**
 * The home answer as a short label for the header: tenure first, since renting
 * and owning rule each other out, then living with family. Only a "yes" names
 * anything; with no yes there is no label, never a guess.
 */
function housingLabel(p: Profile): string | undefined {
  if (p.facts.rents?.value) return "Renting";
  if (p.facts.owns?.value) return "Homeowner";
  if (p.facts.lives_with_family?.value) return "Living with family";
  return undefined;
}

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
  onOpenWrapped,
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
  /** Opens "Your ballot, wrapped". Passed only while Wrapped is enabled. */
  onOpenWrapped?: () => void;
}) {
  const town = townName(profile.townId);
  // A friendly greeting, stable per name so it doesn't flicker on re-render.
  const GREETINGS = ["Hello", "Hi", "Hey", "Welcome back"];
  const greeting = GREETINGS[(profile.name ?? "").length % GREETINGS.length];
  const all = buildTimeline(feed.items, civic, today, { includeOthers: true });
  const { attention, affect } = homeSections(buildTimeline(feed.items, civic, today), all);
  // The ballot behind Election Day: its questions that reach this person become
  // decision cards; the date itself stays in Coming up. A ballot shown as its own
  // card in the decisions keeps that card instead, so nothing appears twice.
  const ballotItem = attention.flatMap((e) => (e.kind === "civic" && e.ballot ? [e.ballot] : []))[0];
  const touching = ballotItem?.cards.filter((c) => c.relevance === "touches") ?? [];
  const listed = ballotItem?.cards.filter((c) => c.relevance !== "touches" && c.onYourList) ?? [];
  const cardProps = { today, onOpenItem, onOpenDoc, onOpenMeasure };
  const list = decisionsFor({ touching, affect, listed, ballot: ballotItem, ...cardProps });
  const [featured, ...rest] = list;
  const reduce = useReducedMotion() ?? false;
  const housing = housingLabel(profile);
  // The general profile link opens the overview; contextual "Add details" links open their own editor.
  const editProfile = () => onOpenProfile({ kind: "list" });
  const growth = useGrowth();
  const wide = useWide();
  // "Your corner of Boston, Rachel." only when it stays short; never an invented place.
  const place = town ?? "the world";
  const name = profile.name?.trim();
  const nameInHeadline = Boolean(name) && `Your corner of ${place}, ${name}.`.length <= 32;
  const enter = (delay: number, y = 8) =>
    reduce ? {} : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration: DURATION.slow, ease: EASE, delay } };

  // Where the page's sorting comes from, in one quiet line. A missing town is never
  // invented: the line offers to add one instead.
  const profileLine = (className: string) => (
    <p className={`flex flex-wrap items-center gap-x-3 text-small text-muted-foreground ${className}`}>
      {town ? (
        <span>{[town, housing].filter(Boolean).join(" · ")}</span>
      ) : (
        <>
          {housing && <span>{housing}</span>}
          <button
            type="button"
            onClick={() => onOpenProfile({ kind: "town" })}
            className={`inline-flex min-h-11 items-center font-semibold text-accent underline decoration-accent/30 underline-offset-4 interactive hover:decoration-accent ${FOCUS}`}
          >
            Add your location
          </button>
        </>
      )}
      <button
        type="button"
        onClick={editProfile}
        className={`group inline-flex min-h-11 items-center gap-1 font-semibold text-accent underline decoration-accent/30 underline-offset-4 interactive hover:decoration-accent ${FOCUS}`}
      >
        Edit profile
        <span aria-hidden="true" className="nudge">
          &rarr;
        </span>
      </button>
    </p>
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 sm:px-6">
      <header className="pt-6 sm:pt-10">
        {growth.enabled ? (
          // The living notebook hero: the person's corner of the map, and their plant.
          // Phones: headline beside the plant, the line under both. Wider: text left, plant right.
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:gap-x-10">
            <div className="col-start-1 row-start-1 min-w-0">
              {name && !nameInHeadline && (
                <motion.p {...enter(0)} className="font-display text-lg italic text-muted-foreground">
                  {greeting}, {name}.
                </motion.p>
              )}
              <motion.h1 {...enter(0)} className="mt-1 font-display text-[1.875rem] leading-[1.08] tracking-[-0.02em] text-balance sm:text-headline">
                Your corner of <span className="font-medium">{place}</span>
                {nameInHeadline && <>, {name}</>}.
              </motion.h1>
            </div>
            {/* The intro and, under it, the profile line share one cell. */}
            <motion.div {...enter(0.1)} className="col-span-2 row-start-2 mt-3 sm:col-span-1 sm:col-start-1 sm:-mt-6 sm:self-start">
              <p className="max-w-md text-body text-muted-foreground">Understand what&rsquo;s happening around you, one decision at a time.</p>
              {profileLine("mt-2")}
            </motion.div>
            <motion.div
              {...(reduce ? {} : { initial: { opacity: 0, y: -6, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.35, ease: EASE, delay: 0.05 } })}
              className="col-start-2 row-start-1 flex flex-col items-center sm:row-span-2"
            >
              {/* With growth tracked, the plant opens the journey; as a companion, the Civic Profile. */}
              <HomePlant size={wide ? 164 : 96} onOpen={() => onOpenProfile(growth.tracking ? { kind: "growth" } : { kind: "list" })} />
              <button
                type="button"
                onClick={() => onOpenProfile(growth.tracking ? { kind: "growth" } : { kind: "list" })}
                className={`mt-1 inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-sm text-small font-semibold text-primary underline-offset-4 hover:underline ${FOCUS}`}
              >
                {growth.tracking ? "See your journey" : "Your Civic Profile"} <span aria-hidden="true">→</span>
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            {profile.name && (
              <p className="font-display text-lg italic text-muted-foreground">
                {greeting}, {profile.name}.
              </p>
            )}
            <h1 className="mt-1 font-display text-headline text-balance">
              Public decisions that may matter to your life in <span className="font-medium">{town ?? "Massachusetts"}</span>.
            </h1>
            {profileLine("mt-4")}
          </>
        )}
      </header>

      <ComingUp entries={attention} {...cardProps} onOpenProfile={onOpenProfile} />

      {/* Only what relates to this person. Everything else is on Explore. */}
      <section aria-labelledby="h-foryou" className="mt-section">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="h-foryou" className="type-section">
            Decisions for you
          </h2>
          {featured && <p className="text-small text-muted-foreground">Closest to your life first</p>}
        </div>
        {featured ? (
          <>
            <div className="mt-3">
              <FeaturedDecision d={featured} onOpenProfile={onOpenProfile} />
            </div>
            {rest.length > 0 && (
              <ul className="mt-4 divide-y divide-border">
                {rest.map((d) => (
                  <DecisionRow key={d.key} d={d} onOpenProfile={onOpenProfile} />
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 text-small text-muted-foreground">
            Nothing matches your answers yet.{" "}
            <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`font-semibold text-accent underline decoration-accent/30 underline-offset-4 ${FOCUS}`}>
              Add details to your profile
            </button>{" "}
            and the decisions that reach your life will show here first.
          </p>
        )}
      </section>

      {onOpenWrapped && <WrappedInvite onOpen={onOpenWrapped} />}

      <button
        type="button"
        onClick={onExplore}
        className={`group mt-10 inline-flex min-h-11 items-center gap-2 text-left text-body font-semibold underline decoration-border underline-offset-4 interactive hover:decoration-foreground max-sm:mr-[4.5rem] ${FOCUS}`}
      >
        Explore everything happening near you
        <span aria-hidden="true" className="-rotate-90">
          <span className="nudge block">
            <Glyph name="chevron" size={14} />
          </span>
        </span>
      </button>
    </div>
  );
}
