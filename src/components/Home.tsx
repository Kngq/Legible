"use client";

// Home after onboarding. It answers three questions in order: what is happening
// near me, how could it affect me, and what can I do. Sections: welcome, coming
// up (ranked by buildTimeline: relevance, then time), what matters to you
// (profile categories), happening near you, and how Legible works.
// Everything runs in the browser; buttons appear only for real destinations.
import { useState, type ReactNode } from "react";
import { avatarParts } from "@/lib/engine/avatar";
import { decidedLine, decideByLine, decideByRelative, DOC_TYPE_LABEL, shortDate } from "@/lib/engine/decide-by";
import type { CivicCard } from "@/lib/engine/civic";
import { timingTag } from "@/lib/engine/civic-copy";
import type { Feed, FeedItem } from "@/lib/engine/feed";
import { personalization } from "@/lib/engine/personalization";
import type { Profile } from "@/lib/engine/profile";
import { buildTimeline, docWhat, type TimelineEntry } from "@/lib/engine/timeline";
import type { Provenance } from "@/lib/engine/types";
import { friendlyWhen, KIND_LABEL, whyLine } from "@/lib/engine/update-copy";
import type { LifeAreaId } from "@/lib/vocab";
import { AvatarRing } from "./AvatarRing";
import { DocTile } from "./covers";
import { Glyph, Part } from "./icons";
import { viewForPart, type SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { FOCUS, Tag } from "./ui";

const TOP = 3;
const MORE_SHOWN = 4;
const H2 = "text-title font-bold tracking-tight";
const PRIMARY = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-small font-semibold text-primary-foreground hover:opacity-90 ${FOCUS}`;
const SECONDARY = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-5 text-small font-semibold hover:bg-border ${FOCUS}`;

const TRUST: Record<Provenance, { label: string; pop: "positive" | "attention" }> = {
  reviewed: { label: "Reviewed", pop: "positive" },
  verified: { label: "Verified", pop: "positive" },
  ai_draft: { label: "AI draft", pop: "attention" },
};

/** The three profile categories Home asks about. Other areas live in the profile. */
const CATEGORIES: { id: LifeAreaId; title: string; why: string; add: string; art: string }[] = [
  { id: "home", title: "Your home", why: "Find out about changes that could affect where you live.", add: "Add housing details", art: "key" },
  { id: "work", title: "Your work", why: "See decisions that could affect your job or local businesses.", add: "Add work details", art: "storefront" },
  { id: "voting", title: "Elections", why: "Stay informed about elections and voting in your area.", add: "Add voting details", art: "ballot" },
];

export function Home({
  feed,
  today,
  profile,
  onOpenDoc,
  onOpenMeasure,
  onOpenProfile,
  civic,
  onOpenItem,
}: {
  /** Deadlines, meetings, and bills for this person's state and town, in feed order. */
  civic: CivicCard[];
  onOpenItem: (id: string) => void;
  feed: Feed;
  today: string;
  profile: Profile;
  remember: boolean;
  onOpenDoc: (id: string) => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
  onOpenProfile: (v: SheetView) => void;
  /** Kept for the call site; clearing now lives in the profile sheet as "Clear my information". */
  onForget: () => void;
  nudgeDismissed: boolean;
  onDismissNudge: () => void;
  /** Opens the upload panel. Not offered on Home. */
  onUpload?: () => void;
}) {
  const town = townName(profile.townId);
  const place = town ?? "Massachusetts";
  const meter = personalization(profile);
  const done = new Set(meter.items.filter((i) => i.kind === "area" && i.done).map((i) => (i.kind === "area" ? i.id : "")));
  const decided = feed.items.filter((i) => i.status === "decided");
  const timeline = buildTimeline(feed.items, civic, today, { includeOthers: true });
  const top = timeline.slice(0, TOP);
  const more = timeline.slice(TOP);
  const personal = top.some((e) => e.touches);
  const noTownDocs = town !== undefined && !feed.items.some((i) => i.scope === "town");
  const cardProps = { today, onOpenItem, onOpenDoc, onOpenMeasure };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      {/* Top bar: name and the way into the profile. Home is the only page here for now. */}
      <nav aria-label="Main" className="flex h-16 items-center justify-between">
        <span className="text-body font-bold tracking-tight">Legible</span>
        <span className="flex items-center gap-2">
          <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={SECONDARY}>
            Your profile
          </button>
          <AvatarRing parts={avatarParts(profile)} percent={meter.percent} size={44} showLabel={false} onFigure={() => onOpenProfile({ kind: "list" })} onPart={(p) => onOpenProfile(viewForPart(p))} />
        </span>
      </nav>

      {/* 1. Welcome */}
      <header className="pt-6">
        <h1 className="text-display">What&apos;s happening in {place}?</h1>
        <p className="mt-3 text-body text-muted-foreground">Understand local decisions, see how they could affect you, and find ways to have your say.</p>
        <ul className="mt-5 grid grid-cols-3 gap-2">
          {[
            ["ballot_box", "What’s coming up"],
            ["key", "How it could affect you"],
            ["town_hall", "What you can do"],
          ].map(([art, label]) => (
            <li key={label} className="flex flex-col items-center gap-1.5 rounded-md bg-surface px-2 py-3 text-center text-small font-semibold leading-tight shadow-card sm:flex-row sm:px-3 sm:text-left">
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                <Part name={art} size={18} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </header>

      {/* 2. The most useful updates right now */}
      {top.length > 0 && (
        <section aria-labelledby="h-next" className="mt-10">
          <h2 id="h-next" className={H2}>
            {personal ? "Coming up for you" : "Coming up"}
          </h2>
          <p className="mt-1 text-small text-muted-foreground">
            {personal
              ? "Ranked by how much each could affect you, then by date."
              : "The soonest dates near you. Add a few details below and anything that may affect you moves to the top."}
          </p>
          <ul className="mt-4 space-y-4">
            {top.map((e) => (
              <UpdateCard key={e.key} entry={e} {...cardProps} />
            ))}
          </ul>
        </section>
      )}

      {/* 3. Personalize */}
      <section aria-labelledby="h-matters" className="mt-12">
        <h2 id="h-matters" className={H2}>
          What matters to you?
        </h2>
        <p className="mt-1 text-small text-muted-foreground">Tell us a little about yourself so we can highlight decisions that may affect your life.</p>
        {!town && (
          <button type="button" onClick={() => onOpenProfile({ kind: "town" })} className={`mt-4 ${PRIMARY}`}>
            Add your city or town
          </button>
        )}
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const isDone = done.has(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpenProfile({ kind: "area", id: c.id })}
                  className={`flex h-full w-full flex-col rounded-lg border p-4 text-left transition-colors duration-(--duration) ease-legible hover:bg-surface-muted/60 ${FOCUS} ${
                    isDone ? "border-border bg-surface" : "border-accent/30 bg-surface"
                  }`}
                >
                  <span aria-hidden="true" className={`flex size-11 items-center justify-center rounded-full ${isDone ? "bg-surface-muted" : "bg-accent-soft"}`}>
                    <Part name={c.art} size={24} />
                  </span>
                  <span className="mt-3 block text-body font-bold">{c.title}</span>
                  <span className="mt-1 block flex-1 text-small text-muted-foreground">{c.why}</span>
                  {isDone ? (
                    <span className="mt-3 flex items-center justify-between gap-2 text-small font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <Glyph name="check" size={14} /> Added
                      </span>
                      <span className="underline underline-offset-4">Edit</span>
                    </span>
                  ) : (
                    <span className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground">{c.add}</span>
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

      {/* 4. Everything else, near you and statewide */}
      {more.length > 0 && <More entries={more} cardProps={cardProps} />}

      {noTownDocs && (
        <p className="mt-6 text-small text-muted-foreground">
          <span className="font-semibold text-foreground">More {town} updates are coming.</span> We&apos;re still adding local decisions. For now, you can explore
          important updates across Massachusetts.
        </p>
      )}

      {decided.length > 0 && (
        <details className="group mt-10">
          <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between rounded-md border border-border px-5 ${FOCUS}`}>
            <span className="text-body font-semibold">
              Already decided <span className="text-muted-foreground">{decided.length}</span>
            </span>
            <span className="transition-transform duration-(--duration) ease-legible group-open:rotate-180">
              <Glyph name="chevron" />
            </span>
          </summary>
          <ul className="mt-2 divide-y divide-border">
            {decided.map((i) => (
              <li key={i.doc.id}>
                <FeedRow item={i} today={today} onOpen={() => onOpenDoc(i.doc.id)} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* 5. Privacy and transparency, said once */}
      <section aria-labelledby="h-how" className="mt-14 rounded-lg bg-surface-muted p-5">
        <h2 id="h-how" className="text-body font-bold">
          How Legible works
        </h2>
        <dl className="mt-3 space-y-3 text-small">
          <div>
            <dt className="font-semibold">Your details stay with you</dt>
            <dd className="text-muted-foreground">
              Your town and answers stay in this browser and are used only to sort this page.{" "}
              <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`font-semibold text-foreground underline underline-offset-4 ${FOCUS}`}>
                Manage or clear them
              </button>
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Official sources</dt>
            <dd className="text-muted-foreground">Dates and summaries come from state and city sources, linked on each update.</dd>
          </div>
          <div>
            <dt className="font-semibold">You decide</dt>
            <dd className="text-muted-foreground">Legible explains what is being decided and how it could affect you. It never tells you how to vote.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

type CardProps = {
  today: string;
  onOpenItem: (id: string) => void;
  onOpenDoc: (id: string) => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
};

function More({ entries, cardProps }: { entries: TimelineEntry[]; cardProps: CardProps }) {
  const [all, setAll] = useState(false);
  return (
    <section aria-labelledby="h-near" className="mt-12">
      <h2 id="h-near" className={H2}>
        Happening near you
      </h2>
      <p className="mt-1 text-small text-muted-foreground">Important updates and upcoming dates in your area.</p>
      <ul className="mt-4 space-y-4">
        {(all ? entries : entries.slice(0, MORE_SHOWN)).map((e) => (
          <UpdateCard key={e.key} entry={e} {...cardProps} />
        ))}
      </ul>
      {entries.length > MORE_SHOWN && (
        <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className={`mt-4 ${SECONDARY}`}>
          {all ? "Show fewer" : `Show all ${entries.length} updates`}
        </button>
      )}
    </section>
  );
}

function ExternalAction({ label, url, primary }: { label: string; url: string; primary: boolean }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className={primary ? PRIMARY : SECONDARY}>
      {label}
      <Glyph name="external" size={14} />
      <span className="sr-only">(opens the official site)</span>
    </a>
  );
}

/**
 * One update: what kind and when, a clear title, a plain explanation, why it is
 * shown to this person, how it could affect them (ballots), and one obvious action.
 */
function UpdateCard({ entry: e, today, onOpenItem, onOpenDoc, onOpenMeasure }: { entry: TimelineEntry } & CardProps) {
  let kind: string;
  let when: string;
  let title: string;
  let explain: string;
  let why: string | null;
  let actions: ReactNode;
  const ballot = e.kind === "doc" ? e.item : e.ballot;

  if (e.kind === "civic") {
    const c = e.card;
    const i = c.item;
    kind = i.kind === "bill" && i.status ? `${KIND_LABEL.bill} · ${i.status}` : KIND_LABEL[i.kind];
    when = i.at ? `${friendlyWhen(c)} · ${timingTag(c)}` : friendlyWhen(c);
    title = i.title;
    explain = i.summary;
    why = whyLine(c);
    const links = i.actions.filter((a) => a.url);
    actions = (
      <>
        {ballot ? (
          <button type="button" onClick={() => onOpenDoc(ballot.doc.id)} className={PRIMARY}>
            Explore what&apos;s on the ballot
          </button>
        ) : (
          links[0] && <ExternalAction label={links[0].label} url={links[0].url!} primary />
        )}
        {ballot && links[0] && <ExternalAction label={links[0].label} url={links[0].url!} primary={false} />}
        <button type="button" onClick={() => onOpenItem(i.id)} className={`min-h-11 px-2 text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
          Details and source
        </button>
      </>
    );
  } else {
    const d = e.item.doc.decideBy;
    kind = `${e.item.scope === "state" ? "Massachusetts" : e.item.doc.place.name} ${DOC_TYPE_LABEL[e.item.doc.docType].toLowerCase()}`;
    when = d ? `${decideByRelative(d, today)} · ${shortDate(d.date)}` : "";
    title = e.item.doc.title;
    explain = docWhat(e.item);
    why = null;
    actions = (
      <button type="button" onClick={() => onOpenDoc(e.item.doc.id)} className={PRIMARY}>
        See all {e.item.total} {e.item.doc.docType === "ballot" ? "questions" : "items"}
      </button>
    );
  }

  const touching = ballot ? ballot.cards.filter((c) => c.relevance === "touches") : [];

  return (
    <li className="rounded-lg bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-small font-semibold uppercase tracking-wider text-muted-foreground">{kind}</p>
        {e.touches ? <Tag pop="accent">May affect you</Tag> : e.relevance >= 0.6 ? <Tag pop="info">You follow this</Tag> : null}
      </div>
      <h3 className="mt-2 text-title">{title}</h3>
      {when && <p className="mt-1 text-body font-semibold">{when}</p>}
      <p className="mt-2 text-body text-muted-foreground">{explain}</p>

      {why && (
        <p className="mt-3 rounded-md bg-accent-soft px-3 py-2 text-small">
          <span className="font-semibold">Why you&apos;re seeing this: </span>
          {why}
        </p>
      )}

      {touching.length > 0 && ballot && (
        <div className="mt-4 rounded-md border border-border p-4">
          <p className="text-body font-bold">How could this affect you?</p>
          <p className="text-small text-muted-foreground">Possible effects of questions that match your answers, in plain words. Voters decide.</p>
          <ul className="mt-2 divide-y divide-border">
            {touching.map((c) => (
              <li key={c.measure.id}>
                <button type="button" onClick={() => onOpenMeasure(ballot.doc.id, c.measure.id)} className={`flex w-full items-start gap-3 py-3 text-left ${FOCUS}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-small font-semibold">
                      Question {c.measure.number}: {c.measure.title}
                    </span>
                    {c.why[0] && <span className="mt-0.5 block text-small text-muted-foreground">{c.why[0].text}</span>}
                  </span>
                  <span aria-hidden="true" className="mt-0.5 -rotate-90">
                    <Glyph name="chevron" size={16} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
    </li>
  );
}

/** A document as a reading-list row: tile, title, decide-by meta, touches, preview. */
function FeedRow({ item, today, onOpen }: { item: FeedItem; today: string; onOpen: () => void }) {
  const { doc } = item;
  const d = doc.decideBy;
  const trust = TRUST[doc.provenance];
  const meta = [item.scope === "state" ? "State" : doc.place.name, DOC_TYPE_LABEL[doc.docType]];
  if (d) meta.push(item.status === "decided" ? decidedLine(d) : decideByLine(d) + (d.date === today ? ", today" : ""));
  return (
    <button type="button" onClick={onOpen} className={`flex w-full gap-4 rounded-md py-4 text-left hover:bg-surface-muted/60 ${FOCUS}`}>
      <DocTile docType={doc.docType} />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="line-clamp-2 block text-body font-semibold">{doc.title}</span>
        <span className="block text-small text-muted-foreground">{meta.join(" · ")}</span>
        {item.topTouching && <span className="line-clamp-1 block font-[family-name:var(--font-serif)] text-small text-muted-foreground">Including: {item.topTouching}</span>}
        <span className="flex flex-wrap items-center gap-2 pt-1">
          {item.touches > 0 ? (
            <Tag pop="accent">
              {item.touches} of {item.total} touch you
            </Tag>
          ) : (
            <span className="text-small text-muted-foreground">Nothing in your answers points here yet</span>
          )}
          <Tag pop={trust.pop}>{trust.label}</Tag>
        </span>
      </span>
    </button>
  );
}

