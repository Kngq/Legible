"use client";

// Home: one timeline of what is being decided near the person, soonest first.
// Each entry says what it is, when it is due, and how it reaches this person.
// All filtering runs in the browser.
import { avatarParts } from "@/lib/engine/avatar";
import { decidedLine, decideByLine, decideByRelative, DOC_TYPE_LABEL, shortDate } from "@/lib/engine/decide-by";
import type { CivicCard } from "@/lib/engine/civic";
import { dateTime, timingTag } from "@/lib/engine/civic-copy";
import type { Feed, FeedItem } from "@/lib/engine/feed";
import { nextItem, personalization, type ChecklistItem } from "@/lib/engine/personalization";
import type { Profile } from "@/lib/engine/profile";
import { buildTimeline, docWhat, type TimelineEntry } from "@/lib/engine/timeline";
import type { Provenance } from "@/lib/engine/types";
import { LIFE_AREAS } from "@/lib/vocab";
import { AvatarRing } from "./AvatarRing";
import { DocTile } from "./covers";
import { Glyph, Part } from "./icons";
import { itemView, viewForPart, type SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { Button, FOCUS, Tag } from "./ui";

const TRUST: Record<Provenance, { label: string; pop: "positive" | "attention" }> = {
  reviewed: { label: "Reviewed", pop: "positive" },
  verified: { label: "Verified", pop: "positive" },
  ai_draft: { label: "AI draft", pop: "attention" },
};

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
  onUpload,
  civic,
  onOpenItem,
}: {
  /** Deadlines, meetings, and bills for this person's state and town, in feed order. */
  civic: CivicCard[];
  /** A civic item that takes the Up next card, when it touches the person sooner. */
  civicUp: CivicCard | null;
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
  const nudge = nudgeDismissed ? null : nextItem(profile);
  const decided = feed.items.filter((i) => i.status === "decided");
  const timeline = buildTimeline(feed.items, civic, today);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-6 lg:pt-8">
      {/* Header: the person's page. Avatar with its ring, town, profile button. */}
      <header className="flex flex-col items-center pt-4 text-center">
        <AvatarRing
          parts={parts}
          percent={meter.percent}
          size={120}
          onFigure={() => onOpenProfile({ kind: "list" })}
          onPart={(p) => onOpenProfile(viewForPart(p))}
        />
        <p className="mt-2 text-title">{town ?? "Massachusetts"}</p>
        <p className="text-body text-muted-foreground">What is being decided near you</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenProfile({ kind: "list" })}
            className={`min-h-11 rounded-full bg-surface-muted px-5 text-body font-semibold hover:bg-border ${FOCUS}`}
          >
            Your profile
          </button>
          {remember && (
            <button type="button" onClick={onForget} className={`min-h-11 rounded-full px-4 text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
              Forget me
            </button>
          )}
        </div>
      </header>

      {nudge && <Nudge item={nudge} onOpen={() => onOpenProfile(itemView(nudge))} onDismiss={onDismissNudge} />}

      <section aria-labelledby="h-timeline" className="mt-8">
        <h1 id="h-timeline" className="text-title">
          Your timeline
        </h1>
        <p className="mt-1 text-small text-muted-foreground">Deadlines, votes, and meetings, most relevant to you first, then soonest. Each one says why it is here.</p>

        <ol className="mt-5">
          {timeline.map((e, i) => (
            <TimelineRow
              key={e.key}
              entry={e}
              today={today}
              last={i === timeline.length - 1}
              onOpenItem={onOpenItem}
              onOpenDoc={onOpenDoc}
              onOpenMeasure={onOpenMeasure}
            />
          ))}
        </ol>
      </section>

      {!feed.items.some((i) => i.scope === "town") && (
        <EmptyTown town={town} onAddTown={() => onOpenProfile({ kind: "town" })} onUpload={onUpload} />
      )}

      {feed.openAreas.length > 0 && (
        <section aria-labelledby="h-open" className="mt-10">
          <h2 id="h-open" className="text-title">
            Open questions for you
          </h2>
          <p className="mt-1 text-small text-muted-foreground">Each one sorts more of your feed. Your answers stay in this browser.</p>
          <ul className="mt-3 overflow-hidden rounded-lg bg-surface shadow-card">
            {feed.openAreas.map((id) => {
              const a = LIFE_AREAS.find((x) => x.id === id)!;
              return (
                <li key={id} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => onOpenProfile({ kind: "area", id })}
                    className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted ${FOCUS}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold">{a.heading}</span>
                      <span className="block text-small text-muted-foreground">{a.why}</span>
                    </span>
                    <span className="shrink-0 text-small font-semibold">Answer</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {decided.length > 0 && (
        <details className="group mt-10">
          <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between rounded-lg bg-surface px-5 shadow-card ${FOCUS}`}>
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

      <p className="mt-12 text-small text-muted-foreground">Your answers and your town stay in this browser. Legible sorts the official text; it never says how to vote.</p>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Date tile for a YYYY-MM-DD day, or a pictogram for undated bills. */
function DayTile({ date }: { date?: string }) {
  if (!date) {
    return (
      <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-md bg-info text-info-foreground">
        <Part name="book" size={30} />
      </span>
    );
  }
  const [, m, d] = date.split("-").map(Number);
  return (
    <span aria-hidden="true" className="flex size-14 shrink-0 flex-col items-center justify-center rounded-md bg-surface leading-none shadow-card">
      <span className="text-small font-semibold uppercase text-muted-foreground">{MONTHS[m - 1]}</span>
      <span className="mt-0.5 text-title">{d}</span>
    </span>
  );
}

/** When it is due, as a fact: "Today · Sat, Oct 24, 11:59 PM", "Voters decide in 10 days · Nov 3". */
function dueLine(e: TimelineEntry, today: string): string {
  if (e.kind === "doc") {
    const d = e.item.doc.decideBy;
    return d ? `${decideByRelative(d, today)} · ${shortDate(d.date)}` : DOC_TYPE_LABEL[e.item.doc.docType];
  }
  const c: CivicCard = e.card;
  const i = c.item;
  if (!i.at) return [i.status, i.lastAction && `latest action ${i.lastAction.date}`].filter(Boolean).join(" · ");
  return `${timingTag(c)} · ${dateTime(i.until && c.timing === "open" ? i.until : i.at)}`;
}

function TimelineRow({
  entry: e,
  today,
  last,
  onOpenItem,
  onOpenDoc,
  onOpenMeasure,
}: {
  entry: TimelineEntry;
  today: string;
  last: boolean;
  onOpenItem: (id: string) => void;
  onOpenDoc: (id: string) => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
}) {
  const title = e.kind === "doc" ? e.item.doc.title : e.card.item.title;
  const what = e.kind === "doc" ? docWhat(e.item) : e.card.item.summary;
  const open = () => (e.kind === "doc" ? onOpenDoc(e.item.doc.id) : onOpenItem(e.card.item.id));
  const ballot = e.kind === "doc" ? e.item : e.ballot;
  const touching = ballot ? ballot.cards.filter((c) => c.relevance === "touches") : [];
  const soon = e.days !== undefined && e.days <= 0;

  return (
    <li className="relative flex gap-4 pb-5">
      {!last && <span aria-hidden="true" className="absolute bottom-0 left-7 top-14 w-px bg-border" />}
      <DayTile date={e.date} />
      <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-surface shadow-card">
        <button type="button" onClick={open} className={`block w-full p-4 text-left hover:bg-surface-muted/60 ${FOCUS}`}>
          <span className="flex items-start justify-between gap-3">
            <span className="text-body font-semibold">{title}</span>
            {e.touches && <Tag pop="accent">For you</Tag>}
          </span>
          <span className={`mt-1 block text-small font-semibold ${soon ? "text-foreground" : "text-muted-foreground"}`}>{dueLine(e, today)}</span>
          <span className="mt-2 line-clamp-3 block text-body">{what}</span>
          <span className={`mt-3 block rounded-md px-3 py-2 text-small ${e.touches ? "bg-accent-soft font-semibold" : "bg-surface-muted"}`}>{e.forYou}</span>
        </button>
        {ballot && (
          <div className="border-t border-border px-4 pb-3 pt-2">
            {touching.map((c) => (
              <button
                key={c.measure.id}
                type="button"
                onClick={() => onOpenMeasure(ballot.doc.id, c.measure.id)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 text-left text-small font-semibold ${FOCUS}`}
              >
                <span>
                  {ballot.doc.docType === "ballot" ? "Question" : "Article"} {c.measure.number}: {c.measure.title}
                </span>
                <span className="-rotate-90">
                  <Glyph name="chevron" size={16} />
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onOpenDoc(ballot.doc.id)}
              className={`min-h-11 text-small font-semibold underline underline-offset-4 ${FOCUS}`}
            >
              See all {ballot.total} {ballot.doc.docType === "ballot" ? "questions" : "items"}
            </button>
          </div>
        )}
      </div>
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

function EmptyTown({ town, onAddTown, onUpload }: { town?: string; onAddTown: () => void; onUpload?: () => void }) {
  return (
    <div className="mt-4 rounded-lg bg-surface p-5 shadow-card">
      {town ? (
        <>
          <p className="text-body font-semibold">Legible does not have documents for {town} yet.</p>
          <p className="mt-1 text-small text-muted-foreground">Town Meeting warrants, budgets, and hearing notices help. State decisions still show here.</p>
          <Button variant="secondary" className="mt-3" onClick={onUpload} disabled={!onUpload} title={onUpload ? undefined : "Upload arrives with the upload panel"}>
            Upload a town document
          </Button>
        </>
      ) : (
        <>
          <p className="text-body font-semibold">Add your town to see what it is deciding.</p>
          <p className="mt-1 text-small text-muted-foreground">It stays in this browser. State decisions show either way.</p>
          <Button variant="secondary" className="mt-3" onClick={onAddTown}>
            Add your town
          </Button>
        </>
      )}
    </div>
  );
}

/** "Decisions about zoning, rent, and property tax depend on this." -> "decisions about zoning, rent, and property tax" */
function decisionsPhrase(why: string): string {
  const t = why.replace(/ depend on this\.$/, "");
  return t.charAt(0).toLowerCase() + t.slice(1);
}

export function nudgeCopy(item: ChecklistItem): string {
  if (item.kind === "town") return "Add your town to see what it is deciding.";
  if (item.kind === "topics") return "Pick the subjects you follow to tag them On your list.";
  const a = LIFE_AREAS.find((x) => x.id === item.id)!;
  return `Add ${a.heading.charAt(0).toLowerCase() + a.heading.slice(1)} to sort ${decisionsPhrase(a.why)}.`;
}

/** The single nudge card. Never names a document; never more than one. */
function Nudge({ item, onOpen, onDismiss }: { item: ChecklistItem; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-lg bg-surface p-4 shadow-card">
      <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-body">{nudgeCopy(item)}</p>
        <Button variant="secondary" className="mt-3 min-h-10! px-4" onClick={onOpen}>
          Add
        </Button>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className={`-m-2 flex size-12 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted ${FOCUS}`}>
        <Glyph name="close" size={18} />
      </button>
    </div>
  );
}
