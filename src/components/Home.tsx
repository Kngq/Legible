"use client";

// Home after onboarding: a welcome, "What matters to you?" first, then three
// sections from homeSections: Needs your attention (dates coming up soon),
// Decisions that could affect you (from the person's answers and interests), and
// Explore more (a few other things nearby; Explore holds the full list). Order
// comes from buildTimeline, and which areas Home asks about comes from the facts
// upcoming items depend on, so nothing is tied to fixed onboarding questions.
import type { CivicCard } from "@/lib/engine/civic";
import type { Feed } from "@/lib/engine/feed";
import { personalization } from "@/lib/engine/personalization";
import type { Profile } from "@/lib/engine/profile";
import { homeSections } from "@/lib/engine/home-copy";
import { topicIds } from "@/lib/engine/profile";
import { areasThatMatter, buildTimeline, type TimelineEntry } from "@/lib/engine/timeline";
import { FACT_DEFS, TOPIC_DEFS } from "@/lib/vocab";
import { Glyph, Part } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { FOCUS } from "./ui";
import { BriefCard } from "./BriefCard";
import { H2, PRIMARY, SECONDARY, TopBar } from "./updates";

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
  const meter = personalization(profile);
  const done = new Set(meter.items.flatMap((i) => (i.kind === "area" && i.done ? [i.id] : [])));
  const all = buildTimeline(feed.items, civic, today, { includeOthers: true });
  const { attention, affect, explore } = homeSections(buildTimeline(feed.items, civic, today), all);
  const areas = areasThatMatter(all);
  const topics = topicIds(profile).map((id) => TOPIC_DEFS[id].label);
  const cardProps = { today, onOpenItem, onOpenDoc, onOpenMeasure, onOpenProfile };
  const section = (id: string, title: string, sub: string, entries: TimelineEntry[], showTag: boolean) => (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className={H2}>
        {title}
      </h2>
      <p className="mt-1 text-small text-muted-foreground">{sub}</p>
      <ul className="mt-4 space-y-4">
        {entries.map((e) => (
          <BriefCard key={e.key} entry={e} showTag={showTag} {...cardProps} />
        ))}
      </ul>
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <TopBar active="home" profile={profile} onHome={() => window.scrollTo({ top: 0 })} onExplore={onExplore} onOpenProfile={onOpenProfile} />

      <header className="pt-6">
        <h1 className="text-display">What&apos;s happening in {town ?? "Massachusetts"}?</h1>
        <p className="mt-3 text-body text-muted-foreground">Understand local decisions, see how they could affect you, and find ways to have your say.</p>
      </header>

      {/* What matters to you comes first: it is what makes the rest personal. */}
      <section aria-labelledby="h-matters" className="mt-10">
        <h2 id="h-matters" className={H2}>
          What matters to you?
        </h2>
        <p className="mt-1 text-small text-muted-foreground">
          Tell us a little about your life and interests. We&apos;ll highlight the local decisions that may matter most to you. Your answers stay in this
          browser.
        </p>
        {!town && (
          <button type="button" onClick={() => onOpenProfile({ kind: "town" })} className={`mt-4 ${PRIMARY}`}>
            Add your city or town
          </button>
        )}
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {areas.map(({ area, count }) => {
            const isDone = done.has(area.id);
            return (
              <li key={area.id}>
                <button
                  type="button"
                  onClick={() => onOpenProfile({ kind: "area", id: area.id })}
                  className={`flex h-full w-full flex-col rounded-lg border bg-surface p-4 text-left transition-colors duration-(--duration) ease-legible hover:bg-surface-muted/60 ${FOCUS} ${
                    isDone ? "border-border" : "border-accent/30"
                  }`}
                >
                  <span aria-hidden="true" className={`flex size-11 items-center justify-center rounded-full ${isDone ? "bg-surface-muted" : "bg-accent-soft"}`}>
                    <Part name={FACT_DEFS[area.facts[0]].avatarPart} size={24} />
                  </span>
                  <span className="mt-3 block text-body font-bold">{area.heading}</span>
                  <span className="mt-1 block flex-1 text-small text-muted-foreground">
                    {area.why} {count === 1 ? "1 upcoming update depends on it." : `${count} upcoming updates depend on it.`}
                  </span>
                  {isDone ? (
                    <span className="mt-3 flex items-center justify-between gap-2 text-small font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <Glyph name="check" size={14} /> Added
                      </span>
                      <span className="underline underline-offset-4">Edit</span>
                    </span>
                  ) : (
                    <span className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground">Add details</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`mt-3 min-h-11 text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
          Your interests{topics.length ? `: ${topics.join(", ")}` : ""}
        </button>
      </section>

      {attention.length > 0 && section("h-attention", "Needs your attention", "Important dates and decisions coming up soon.", attention, false)}

      {affect.length > 0
        ? section("h-affect", "Decisions that could affect you", "Based on your profile and interests.", affect, true)
        : (
          <section aria-labelledby="h-affect" className="mt-12">
            <h2 id="h-affect" className={H2}>
              Decisions that could affect you
            </h2>
            <p className="mt-1 text-small text-muted-foreground">
              Nothing matches your answers yet. Add details above and the decisions that reach your life will show here first.
            </p>
          </section>
        )}

      {explore.length > 0 && section("h-explore", "Explore more", "Other decisions happening in your community.", explore, false)}
      <button type="button" onClick={onExplore} className={`mt-5 ${SECONDARY}`}>
        Explore everything happening near you
        <span aria-hidden="true" className="-rotate-90">
          <Glyph name="chevron" size={14} />
        </span>
      </button>
    </div>
  );
}
