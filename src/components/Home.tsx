"use client";

// Home after onboarding: the For you page, in the Notebook direction. A personal
// header (greeting, whose town, how much of the profile is filled in, and the
// answers that sort the page); "Coming up" as a time ribbon, with the most urgent
// date selected; then "Decisions for you": the first as a featured decision, the
// rest as compact rows, ranked by how they connect to the person. Dates and
// decisions never mix. Everything else is on Explore, one link away. Order comes
// from buildTimeline and homeSections. Runs in the browser.
import { motion, useReducedMotion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import type { CivicCard } from "@/lib/engine/civic";
import type { Feed } from "@/lib/engine/feed";
import { homeSections, profileBasis } from "@/lib/engine/home-copy";
import { personalization } from "@/lib/engine/personalization";
import { DURATION, EASE } from "@/lib/motion";
import type { Profile } from "@/lib/engine/profile";
import { buildTimeline } from "@/lib/engine/timeline";
import { FACT_DEFS, LIFE_AREAS } from "@/lib/vocab";
import { decisionsFor, DecisionRow, FeaturedDecision } from "./BriefCard";
import { ComingUp } from "./ComingUp";
import { Glyph } from "./icons";
import { HomePlant } from "./plant/HomePlant";
import { useGrowth } from "./plant/useGrowth";
import type { SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { FOCUS } from "./ui";

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

/** The answers that sort the page, as short phrases: "You rent". Life-area facts only. */
function answeredFacts(p: Profile): string[] {
  return LIFE_AREAS.flatMap((a) => a.facts.filter((f) => p.facts[f]?.value === true)).map((f) => {
    const t = FACT_DEFS[f].because.yes;
    return t.charAt(0).toUpperCase() + t.slice(1);
  });
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
  // The ballot behind Election Day: its questions that reach this person become
  // decision cards; the date itself stays in Coming up. A ballot shown as its own
  // card in the decisions keeps that card instead, so nothing appears twice.
  const ballotItem = attention.flatMap((e) => (e.kind === "civic" && e.ballot ? [e.ballot] : []))[0];
  const touching = ballotItem?.cards.filter((c) => c.relevance === "touches") ?? [];
  const listed = ballotItem?.cards.filter((c) => c.relevance !== "touches" && c.onYourList) ?? [];
  const basis = profileBasis(profile);
  const cardProps = { today, onOpenItem, onOpenDoc, onOpenMeasure };
  const list = decisionsFor({ touching, affect, listed, ballot: ballotItem, ...cardProps });
  const [featured, ...rest] = list;
  const meter = personalization(profile);
  // A dot that fills in after a save pulses once, so the change shows on the page.
  const doneKey = meter.items.map((i) => (i.done ? 1 : 0)).join("");
  const [seen, setSeen] = useState(doneKey);
  const [pulse, setPulse] = useState<{ at: number; dots: number[] }>({ at: 0, dots: [] });
  if (seen !== doneKey) {
    setPulse({ at: pulse.at + 1, dots: meter.items.flatMap((i, n) => (i.done && seen[n] !== "1" ? [n] : [])) });
    setSeen(doneKey);
  }
  const reduce = useReducedMotion() ?? false;
  const facts = answeredFacts(profile);
  // Interests are "decided" once the person confirms the topics screen or picks any.
  const needsInterests = !profile.topicsConfirmedAt && Object.keys(profile.topics).length === 0;
  const editProfile = () => onOpenProfile({ kind: needsInterests ? "topics" : "list" });
  const growth = useGrowth();
  const wide = useWide();
  // "Your corner of Boston, Rachel." only when it stays short; never an invented place.
  const place = town ?? "the world";
  const name = profile.name?.trim();
  const nameInHeadline = Boolean(name) && `Your corner of ${place}, ${name}.`.length <= 32;
  const enter = (delay: number, y = 8) =>
    reduce ? {} : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration: DURATION.slow, ease: EASE, delay } };

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
            <motion.p {...enter(0.1)} className="col-span-2 row-start-2 mt-3 max-w-md text-body text-muted-foreground sm:col-span-1 sm:col-start-1 sm:-mt-6 sm:self-start">
              Understand what&rsquo;s happening around you, one decision at a time.
            </motion.p>
            <motion.div
              {...(reduce ? {} : { initial: { opacity: 0, y: -6, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.35, ease: EASE, delay: 0.05 } })}
              className="col-start-2 row-start-1 flex flex-col items-center sm:row-span-2"
            >
              <HomePlant size={wide ? 164 : 96} onOpen={() => onOpenProfile({ kind: "growth" })} />
              <button
                type="button"
                onClick={() => onOpenProfile({ kind: "growth" })}
                className={`mt-1 inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-sm text-small font-semibold text-primary underline-offset-4 hover:underline ${FOCUS}`}
              >
                See your journey <span aria-hidden="true">→</span>
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
          </>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-small">
          <button
            type="button"
            onClick={editProfile}
            aria-label={`Your profile: ${meter.done} of ${meter.total} steps filled in`}
            className={`group inline-flex min-h-9 items-center gap-1.5 rounded-sm ${FOCUS}`}
          >
            {meter.items.map((item, i) => (
              <motion.span
                key={pulse.dots.includes(i) ? `${i}-${pulse.at}` : i}
                aria-hidden="true"
                animate={pulse.dots.includes(i) && !reduce ? { scale: [1, 1.8, 1] } : { scale: 1 }}
                transition={{ duration: DURATION.slow * 2, ease: EASE }}
                className={`size-2.5 rounded-full ${item.done ? "bg-accent" : "shadow-[inset_0_0_0_1.5px_var(--info)]"}`}
              />
            ))}
          </button>
          {(town || facts.length > 0) && (
            <p className="font-semibold">
              {[town, ...facts.slice(0, 3)].filter(Boolean).join(" · ")}
              {facts.length > 3 && <span className="font-normal text-muted-foreground"> · +{facts.length - 3}</span>}
            </p>
          )}
          <button
            type="button"
            onClick={editProfile}
            className={`min-h-9 font-semibold text-accent underline decoration-accent/30 underline-offset-4 interactive hover:decoration-accent ${FOCUS}`}
          >
            {basis ? "Edit profile" : "Add details"}
          </button>
        </div>
        {!basis && <p className="mt-1 text-small text-muted-foreground">Add a few details and Legible sorts this page by what touches your life.</p>}
      </header>

      <ComingUp entries={attention} {...cardProps} onOpenProfile={onOpenProfile} />

      {/* Only what relates to this person. Everything else is on Explore. */}
      <section aria-labelledby="h-foryou" className="mt-section">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="h-foryou" className="text-body font-bold">
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
