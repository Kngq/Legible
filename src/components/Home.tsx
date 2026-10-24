"use client";

// Home, laid out like a news reader: For you first (its top item as a hero card),
// then You follow and Everyone in Massachusetts, as rows with a thumbnail, a serif
// headline, and a date line. Order comes from buildTimeline: relevance, then time.
// All filtering runs in the browser.
import { useState, type ReactNode } from "react";
import { avatarParts } from "@/lib/engine/avatar";
import { decidedLine, decideByLine, decideByRelative, DOC_TYPE_LABEL, shortDate } from "@/lib/engine/decide-by";
import type { CivicCard } from "@/lib/engine/civic";
import { dateTime, timingTag } from "@/lib/engine/civic-copy";
import type { Feed, FeedItem } from "@/lib/engine/feed";
import { personalization } from "@/lib/engine/personalization";
import type { Profile } from "@/lib/engine/profile";
import { buildTimeline, docWhat, type TimelineEntry } from "@/lib/engine/timeline";
import type { Card, Provenance } from "@/lib/engine/types";
import { LIFE_AREAS } from "@/lib/vocab";
import { AvatarRing } from "./AvatarRing";
import { Cover, DocTile } from "./covers";
import { Glyph, Part } from "./icons";
import { viewForPart, type SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { FOCUS, Tag } from "./ui";

const SERIF = "font-[family-name:var(--font-serif)]";
const PILL = `inline-flex min-h-9 shrink-0 items-center rounded-full bg-surface-muted px-4 text-small font-semibold hover:bg-border ${FOCUS}`;
const ROWS_SHOWN = 3;

const TRUST: Record<Provenance, { label: string; pop: "positive" | "attention" }> = {
  reviewed: { label: "Reviewed", pop: "positive" },
  verified: { label: "Verified", pop: "positive" },
  ai_draft: { label: "AI draft", pop: "attention" },
};

type Tier = "touches" | "list" | "everyone";
const TIERS: { id: Tier; title: string; sub: string }[] = [
  { id: "touches", title: "For you", sub: "These match your answers." },
  { id: "list", title: "You follow", sub: "Subjects you picked in your profile." },
  { id: "everyone", title: "Everyone in Massachusetts", sub: "These apply to everyone, whatever your answers." },
];
const tierOf = (e: TimelineEntry): Tier => (e.touches ? "touches" : e.relevance >= 0.6 ? "list" : "everyone");

export function Home({
  feed,
  today,
  profile,
  remember,
  onOpenDoc,
  onOpenMeasure,
  onOpenProfile,
  onForget,
  nudgeDismissed,
  onDismissNudge,
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
  onForget: () => void;
  nudgeDismissed: boolean;
  onDismissNudge: () => void;
  /** Opens the upload panel. Absent until the panel exists (task 9.4). */
  onUpload?: () => void;
}) {
  const town = townName(profile.townId);
  const meter = personalization(profile);
  const parts = avatarParts(profile);
  // Profile prompts live inside For you: the town first if missing, then life areas with open questions.
  const prompts: Prompt[] = [
    ...(town ? [] : [{ key: "town", title: "Your town", why: "Town meetings, budgets, and local votes depend on this.", view: { kind: "town" } as SheetView }]),
    ...feed.openAreas.map((id) => {
      const a = LIFE_AREAS.find((x) => x.id === id)!;
      return { key: id, title: a.heading, why: a.why, view: { kind: "area", id } as SheetView };
    }),
  ];
  const decided = feed.items.filter((i) => i.status === "decided");
  const timeline = buildTimeline(feed.items, civic, today);
  const forYou = timeline.filter((e) => tierOf(e) === "touches");
  const open = (e: TimelineEntry) => (e.kind === "doc" ? onOpenDoc(e.item.doc.id) : onOpenItem(e.card.item.id));

  return (
    <div className="mx-auto w-full max-w-2xl bg-surface px-5 pb-16 pt-6 sm:my-6 sm:rounded-xl sm:px-8 sm:shadow-card">
      {/* Header: town, the avatar ring, and the profile pill. */}
      <header className="flex items-center gap-4">
        <AvatarRing
          parts={parts}
          percent={meter.percent}
          size={64}
          onFigure={() => onOpenProfile({ kind: "list" })}
          onPart={(p) => onOpenProfile(viewForPart(p))}
        />
        <div className="min-w-0 flex-1">
          <p className="text-title font-bold tracking-tight">{town ?? "Massachusetts"}</p>
          <p className="text-small text-muted-foreground">What is being decided near you</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={PILL}>
            Your profile
          </button>
          {remember && (
            <button type="button" onClick={onForget} className={`min-h-9 px-2 text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
              Forget me
            </button>
          )}
        </div>
      </header>

      <h1 className="sr-only">Your timeline</h1>

      {/* For you always comes first: its top item as the hero, or a prompt when nothing matches yet. */}
      <section aria-labelledby="h-touches" className="mt-8">
        <h2 id="h-touches" className="text-title font-bold tracking-tight">
          For you
        </h2>
        <p className="text-small text-muted-foreground">{TIERS[0].sub}</p>
        {forYou[0] ? (
          <>
            <Hero entry={forYou[0]} today={today} onOpen={() => open(forYou[0])} onOpenMeasure={onOpenMeasure} />
            <Rows entries={forYou.slice(1)} today={today} open={open} onOpenMeasure={onOpenMeasure} />
            {!nudgeDismissed && <Sharpen prompts={prompts} compact onOpenProfile={onOpenProfile} onDismiss={onDismissNudge} />}
          </>
        ) : (
          <div className="mt-4 rounded-lg border border-border p-5">
            <p className={`text-body font-semibold ${SERIF}`}>Nothing matches your answers yet.</p>
            <p className="mt-1 text-small text-muted-foreground">
              {prompts.length
                ? "Answer one of these and what touches you shows up here first. Your answers stay in this browser."
                : "Nothing in your answers points to what is being decided right now."}
            </p>
            <Sharpen prompts={prompts} onOpenProfile={onOpenProfile} />
          </div>
        )}
      </section>

      {TIERS.slice(1).map((t) => {
        const entries = timeline.filter((e) => tierOf(e) === t.id);
        return entries.length ? (
          <Section key={t.id} id={`h-${t.id}`} title={t.title} sub={t.sub} count={entries.length}>
            {(all) =>
              (all ? entries : entries.slice(0, ROWS_SHOWN)).map((e) => (
                <Row key={e.key} entry={e} today={today} onOpen={() => open(e)} onOpenMeasure={onOpenMeasure} />
              ))
            }
          </Section>
        ) : null;
      })}

      {decided.length > 0 && (
        <details className="group mt-10">
          <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between rounded-md border border-border px-5 ${FOCUS}`}>
            <span className="text-body font-semibold">
              Decided <span className="text-muted-foreground">{decided.length}</span>
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

      <footer className="mt-12 space-y-2 text-small text-muted-foreground">
        {town && !feed.items.some((i) => i.scope === "town") && <p>Legible has no documents for {town} yet. State decisions still show here.</p>}
        <p>Most relevant to you first, then soonest. Your answers and your town stay in this browser. Legible sorts the official text; it never says how to vote.</p>
      </footer>
    </div>
  );
}

/** Section heading in bold sans with a "Show all" pill, like a news reader's topic block. */
/** The rest of For you, below its hero, with the same Show all pill. */
function Rows({
  entries,
  today,
  open,
  onOpenMeasure,
}: {
  entries: TimelineEntry[];
  today: string;
  open: (e: TimelineEntry) => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
}) {
  const [all, setAll] = useState(false);
  if (!entries.length) return null;
  return (
    <>
      <ul className="mt-2">
        {(all ? entries : entries.slice(0, ROWS_SHOWN)).map((e) => (
          <Row key={e.key} entry={e} today={today} onOpen={() => open(e)} onOpenMeasure={onOpenMeasure} />
        ))}
      </ul>
      {entries.length > ROWS_SHOWN && (
        <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className={`mt-2 ${PILL}`}>
          {all ? "Show less" : `Show all ${entries.length}`}
        </button>
      )}
    </>
  );
}

function Section({ id, title, sub, count, children }: { id: string; title: string; sub: string; count: number; children: (all: boolean) => ReactNode }) {
  const [all, setAll] = useState(false);
  return (
    <section aria-labelledby={id} className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-title font-bold tracking-tight">
          {title}
        </h2>
        {count > ROWS_SHOWN && (
          <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className={PILL}>
            {all ? "Show less" : `Show all ${count}`}
          </button>
        )}
      </div>
      <p className="text-small text-muted-foreground">{sub}</p>
      <ul className="mt-2">{children(all)}</ul>
    </section>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Square thumbnail: the day for dated items, a pictogram for undated bills. */
function DayTile({ date, size = 80 }: { date?: string; size?: number }) {
  if (!date) {
    return (
      <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-md bg-info text-info-foreground" style={{ width: size, height: size }}>
        <Part name="book" size={Math.round(size * 0.45)} />
      </span>
    );
  }
  const [, m, d] = date.split("-").map(Number);
  return (
    <span aria-hidden="true" className="flex shrink-0 flex-col items-center justify-center rounded-md bg-surface-muted leading-none" style={{ width: size, height: size }}>
      <span className="text-small font-semibold uppercase text-muted-foreground">{MONTHS[m - 1]}</span>
      <span className="mt-1 text-title font-bold">{d}</span>
    </span>
  );
}

/** When it is due, as a fact: "Today • Sat, Oct 24, 11:59 PM", "Voters decide in 10 days • Nov 3". */
function dueLine(e: TimelineEntry, today: string): string {
  if (e.kind === "doc") {
    const d = e.item.doc.decideBy;
    return d ? `${decideByRelative(d, today)} • ${shortDate(d.date)}` : DOC_TYPE_LABEL[e.item.doc.docType];
  }
  const c: CivicCard = e.card;
  const i = c.item;
  if (!i.at) return [i.status, i.lastAction && `latest action ${i.lastAction.date}`].filter(Boolean).join(" • ");
  return `${timingTag(c)} • ${dateTime(i.until && c.timing === "open" ? i.until : i.at)}`;
}

function titleOf(e: TimelineEntry): string {
  return e.kind === "doc" ? e.item.doc.title : e.card.item.title;
}

function bodyOf(e: TimelineEntry): string {
  return e.kind === "doc" ? (e.item.doc.decideBy?.who ?? e.item.doc.place.name) : e.card.item.body;
}

const KIND_PART = { deadline: "ballot", window: "ballot_box", election: "ballot_box", meeting: "town_hall", bill: "book" } as const;

/** The most relevant item, large: serif headline on deep purple, who acts at the foot. */
function Hero({
  entry: e,
  today,
  onOpen,
  onOpenMeasure,
}: {
  entry: TimelineEntry;
  today: string;
  onOpen: () => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
}) {
  const part = e.kind === "doc" ? "ballot_box" : KIND_PART[e.card.item.kind];
  const ballot = e.kind === "doc" ? e.item : e.ballot;
  return (
    <section aria-label="Most relevant to you" className="mt-4">
      <button
        type="button"
        onClick={onOpen}
        className={`relative flex min-h-64 w-full flex-col justify-end overflow-hidden rounded-lg bg-accent p-5 text-left text-accent-foreground transition-transform duration-(--duration) ease-legible hover:-translate-y-0.5 ${FOCUS}`}
      >
        <span aria-hidden="true" className="absolute -right-8 -top-8 opacity-15">
          <Part name={part} size={150} strokeWidth={1.2} />
        </span>
        {e.touches && <span className="absolute right-4 top-4 rounded-sm bg-accent-foreground px-2.5 py-1 text-small font-semibold text-foreground">For you</span>}
        <span className="relative text-small font-semibold opacity-85">{dueLine(e, today)}</span>
        <span className={`relative mt-2 block text-title font-semibold leading-tight ${SERIF}`}>{titleOf(e)}</span>
        <span className="relative mt-2 block text-small opacity-90">{e.forYou}</span>
        <span className="relative mt-4 flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-md bg-accent-foreground/15">
            <Part name={part} size={22} />
          </span>
          <span className="text-body font-semibold">{bodyOf(e)}</span>
        </span>
      </button>
      {ballot && <MeasureLinks ballot={ballot} onOpenMeasure={onOpenMeasure} />}
    </section>
  );
}

/** The measures of a ballot or warrant that touch the person, as thumbnail rows. */
function MeasureLinks({ ballot, onOpenMeasure }: { ballot: FeedItem; onOpenMeasure: (docId: string, measureId: string) => void }) {
  const touching: Card[] = ballot.cards.filter((c) => c.relevance === "touches");
  if (!touching.length) return null;
  const isBallot = ballot.doc.docType === "ballot";
  return (
    <ul className="mt-2">
      {touching.map((c) => (
        <li key={c.measure.id}>
          <button
            type="button"
            onClick={() => onOpenMeasure(ballot.doc.id, c.measure.id)}
            className={`flex w-full items-center gap-4 rounded-md py-3 text-left hover:bg-surface-muted/60 ${FOCUS}`}
          >
            <Cover measure={c.measure} label={`${isBallot ? "Q" : "#"}${c.measure.number}`} size={28} className="size-20 shrink-0 rounded-md" />
            <span className="min-w-0 flex-1">
              <span className={`line-clamp-2 block text-body font-semibold leading-snug ${SERIF}`}>{c.measure.title}</span>
              <span className="mt-1 block text-small text-muted-foreground">
                {isBallot ? "Question" : "Article"} {c.measure.number} • touches you
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** One timeline entry: thumbnail, serif headline, date line, and how it reaches the person. */
function Row({
  entry: e,
  today,
  onOpen,
  onOpenMeasure,
}: {
  entry: TimelineEntry;
  today: string;
  onOpen: () => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
}) {
  const ballot = e.kind === "doc" ? e.item : e.ballot;
  const what = e.kind === "doc" ? docWhat(e.item) : e.card.item.summary;
  return (
    <li className="border-b border-border last:border-0">
      <button type="button" onClick={onOpen} className={`flex w-full gap-4 rounded-md py-4 text-left hover:bg-surface-muted/60 ${FOCUS}`}>
        <DayTile date={e.date} />
        <span className="min-w-0 flex-1">
          <span className={`line-clamp-2 block text-body font-semibold leading-snug ${SERIF}`}>{titleOf(e)}</span>
          <span className="mt-1 block text-small text-muted-foreground">{dueLine(e, today)}</span>
          <span className="mt-1.5 line-clamp-2 block text-small">{what}</span>
          {tierOf(e) !== "everyone" && <span className={`mt-1.5 block text-small ${e.touches ? "font-semibold" : "text-muted-foreground"}`}>{e.forYou}</span>}
        </span>
      </button>
      {ballot && <MeasureLinks ballot={ballot} onOpenMeasure={onOpenMeasure} />}
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

type Prompt = { key: string; title: string; why: string; view: SheetView };

/** Profile prompts inside For you: full cards when nothing matches yet, a pill row once something does. */
function Sharpen({
  prompts,
  compact = false,
  onOpenProfile,
  onDismiss,
}: {
  prompts: Prompt[];
  compact?: boolean;
  onOpenProfile: (v: SheetView) => void;
  onDismiss?: () => void;
}) {
  if (!prompts.length) return null;
  if (compact) {
    return (
      <div className="relative mt-4 rounded-md bg-surface-muted p-4 pr-12">
        <p className="text-small text-muted-foreground">Sharpen For you. Your answers stay in this browser.</p>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className={`absolute right-1 top-1 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-border ${FOCUS}`}>
            <Glyph name="close" size={16} />
          </button>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button key={p.key} type="button" onClick={() => onOpenProfile(p.view)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface px-4 text-small font-semibold hover:bg-border ${FOCUS}`}>
              {p.title}
              <span aria-hidden="true" className="-rotate-90">
                <Glyph name="chevron" size={14} />
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <ul className="mt-4 space-y-3">
      {prompts.map((p) => (
        <li key={p.key}>
          <button
            type="button"
            onClick={() => onOpenProfile(p.view)}
            className={`flex w-full items-start gap-3 rounded-md border border-border bg-surface p-4 text-left hover:bg-surface-muted/60 ${FOCUS}`}
          >
            <span className="min-w-0 flex-1">
              <span className={`block text-body font-semibold ${SERIF}`}>{p.title}</span>
              <span className="mt-1 block text-small text-muted-foreground">{p.why}</span>
            </span>
            <span aria-hidden="true" className="flex size-7 shrink-0 -rotate-90 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Glyph name="chevron" size={14} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
