"use client";

// Home after onboarding, kept short: a welcome, "What matters to you?" first,
// then For you: what matches the person's answers or subjects, what might apply
// if they answered a question, then the most pressing things for everyone.
// Everything else lives on Explore. Order comes from buildTimeline, and which
// areas Home asks about comes from the facts upcoming items depend on, so
// nothing here is tied to a fixed set of onboarding questions.
import type { CivicCard } from "@/lib/engine/civic";
import type { Feed } from "@/lib/engine/feed";
import { personalization } from "@/lib/engine/personalization";
import type { Profile } from "@/lib/engine/profile";
import { areasThatMatter, buildTimeline, forYouGroups } from "@/lib/engine/timeline";
import { FACT_DEFS } from "@/lib/vocab";
import { Glyph, Part } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { FOCUS } from "./ui";
import { H2, PRIMARY, SECONDARY, TopBar, UpdateCard } from "./updates";

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
  const { personal, maybe, everyone } = forYouGroups(buildTimeline(feed.items, civic, today));
  const areas = areasThatMatter(buildTimeline(feed.items, civic, today, { includeOthers: true }));
  const cardProps = { today, onOpenItem, onOpenDoc, onOpenMeasure };

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
          Tell us a little about yourself so we can highlight decisions that may affect your life. Your answers stay in this browser.
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
          More about you: household, getting around, and subjects you follow
        </button>
      </section>

      {/* Only what matches this person. Everything else is on Explore. */}
      <section aria-labelledby="h-foryou" className="mt-12">
        <h2 id="h-foryou" className={H2}>
          For you
        </h2>
        {personal.length > 0 ? (
          <>
            <p className="mt-1 text-small text-muted-foreground">Updates that match your answers, most likely to affect you first.</p>
            <ul className="mt-4 space-y-4">
              {personal.map((e) => (
                <UpdateCard key={e.key} entry={e} {...cardProps} />
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-small text-muted-foreground">
            Nothing matches your answers yet. Add details above and the updates that reach your life will show here first.
          </p>
        )}

        {/* Depends on something the person hasn't answered: one tap on the card's details settles it. */}
        {maybe.length > 0 && (
          <>
            <p className={`${personal.length > 0 ? "mt-8" : "mt-5"} text-body font-bold`}>Might apply to you</p>
            <p className="text-small text-muted-foreground">These depend on something you haven&apos;t told us yet. Each card says what.</p>
            <ul className="mt-4 space-y-4">
              {maybe.map((e) => (
                <UpdateCard key={e.key} entry={e} {...cardProps} />
              ))}
            </ul>
          </>
        )}

        {/* Never empty: the most pressing things that apply to everyone come next. */}
        {everyone.length > 0 && (
          <>
            <p className={`${personal.length + maybe.length > 0 ? "mt-8" : "mt-5"} text-body font-bold`}>For everyone</p>
            <p className="text-small text-muted-foreground">These apply to every voter or resident, not only you. Soonest first.</p>
            <ul className="mt-4 space-y-4">
              {everyone.map((e) => (
                <UpdateCard key={e.key} entry={e} {...cardProps} />
              ))}
            </ul>
          </>
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
