"use client";

// Home: a feed of decisions near the person, state and town. Each item is one
// document; opening it shows the DocumentView. All filtering runs in the browser.
import { useState } from "react";
import { avatarParts } from "@/lib/engine/avatar";
import { decidedLine, decideByLine, decideByRelative, DOC_TYPE_LABEL, measureNoun } from "@/lib/engine/decide-by";
import type { CivicCard } from "@/lib/engine/civic";
import { CIVIC_KIND_LABEL, dateTime, timingTag } from "@/lib/engine/civic-copy";
import type { Feed, FeedItem } from "@/lib/engine/feed";
import { nextItem, personalization, type ChecklistItem } from "@/lib/engine/personalization";
import type { Profile } from "@/lib/engine/profile";
import type { Card, Provenance } from "@/lib/engine/types";
import { LIFE_AREAS } from "@/lib/vocab";
import { AvatarRing } from "./AvatarRing";
import { CivicRow } from "./CivicRow";
import { Cover, DocTile } from "./covers";
import { MeasureDots } from "./DocumentView";
import { Glyph } from "./icons";
import { itemView, viewForPart, type SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { Button, FOCUS, Tag } from "./ui";

type Scope = "all" | "state" | "town";

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
  civicUp,
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
  const [scope, setScope] = useState<Scope>("all");
  const town = townName(profile.townId);
  const meter = personalization(profile);
  const parts = avatarParts(profile);
  const nudge = nudgeDismissed ? null : nextItem(profile);

  const inScope = (i: FeedItem) => scope === "all" || i.scope === scope;
  const upcoming = feed.items.filter((i) => i.status === "upcoming" && inScope(i));
  const decided = feed.items.filter((i) => i.status === "decided" && inScope(i));
  const hasTownDocs = feed.items.some((i) => i.scope === "town");
  const up = feed.upNext;
  const civicShown = civic.filter((c) => scope === "all" || c.item.place.kind === scope);

  // Decisions, one level below documents: what touches you, then what you follow.
  const entries = (pick: (c: Card) => boolean) => upcoming.flatMap((item) => item.cards.filter(pick).map((card) => ({ item, card })));
  const touching = entries((c) => c.relevance === "touches");
  const listed = entries((c) => c.relevance !== "touches" && c.onYourList);
  const everyone = touching.length + listed.length === 0 ? entries((c) => c.relevance === "everyone") : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6 lg:pt-8">
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

      {civicUp ? (
        <CivicUpNext card={civicUp} onOpen={() => onOpenItem(civicUp.item.id)} />
      ) : (
        up && <UpNext item={up} today={today} onOpen={() => onOpenDoc(up.doc.id)} />
      )}

      <h1 className="mt-10 text-title">Where your life meets what is being decided.</h1>

      <div role="tablist" aria-label="Scope" className="mt-4 grid grid-cols-3 rounded-full bg-surface p-1 shadow-card">
        {(
          [
            ["all", "All"],
            ["state", "State"],
            ["town", town ?? "Your town"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={scope === id}
            onClick={() => setScope(id)}
            className={`min-h-11 truncate rounded-full px-3 text-body font-semibold transition-colors duration-(--duration) ease-nine ${FOCUS} ${
              scope === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {touching.length > 0 && (
        <Carousel title="Touches you" sub="From your answers" entries={touching} onOpen={onOpenMeasure} />
      )}
      {listed.length > 0 && <Carousel title="On your list" sub="Subjects you follow" entries={listed} onOpen={onOpenMeasure} />}
      {everyone.length > 0 && (
        <Carousel title="Applies to everyone" sub="Answer a few questions to sort these" entries={everyone} onOpen={onOpenMeasure} />
      )}

      {civicShown.length > 0 && (
        <section aria-labelledby="h-coming" className="mt-10">
          <h2 id="h-coming" className="text-title">
            Coming up
          </h2>
          <p className="text-small text-muted-foreground">Deadlines, meetings, and bills, from official sources</p>
          <ul className="mt-2 divide-y divide-border">
            {civicShown.map((c) => (
              <li key={c.item.id}>
                <CivicRow card={c} onOpen={() => onOpenItem(c.item.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="h-docs" className="mt-10">
          <h2 id="h-docs" className="text-title">
            Documents
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {upcoming.map((i) => (
              <li key={i.doc.id}>
                <FeedRow item={i} today={today} onOpen={() => onOpenDoc(i.doc.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {scope !== "state" && !hasTownDocs && (
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
            <span className="transition-transform duration-(--duration) ease-nine group-open:rotate-180">
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

      <p className="mt-12 text-small text-muted-foreground">Your answers and your town stay in this browser. Nine sorts the official text; it never says how to vote.</p>
    </div>
  );
}

/** Up next for a deadline or meeting that touches the person sooner than any document. */
function CivicUpNext({ card, onOpen }: { card: CivicCard; onOpen: () => void }) {
  const i = card.item;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mt-4 block w-full rounded-xl bg-accent p-6 text-left text-accent-foreground shadow-card transition-transform duration-(--duration) ease-nine hover:-translate-y-0.5 ${FOCUS}`}
    >
      <span className="flex items-center justify-between gap-3 text-small font-semibold opacity-85">
        <span>
          Up next · {i.place.kind === "state" ? "State" : i.place.name} {CIVIC_KIND_LABEL[i.kind].toLowerCase()}
        </span>
        <span className="flex size-9 rotate-180 items-center justify-center rounded-full bg-accent-foreground/15">
          <Glyph name="back" size={18} />
        </span>
      </span>
      <span className="mt-3 block text-title">{i.title}</span>
      <span className="mt-2 block text-body font-semibold">
        {timingTag(card)}
        {i.at ? ` · ${dateTime(i.until && card.timing === "open" ? i.until : i.at)}` : ""}
      </span>
      <span className="mt-1 block text-body opacity-90">{i.body}</span>
      <span className="mt-1 block text-small opacity-85">{i.summary}</span>
    </button>
  );
}

function UpNext({ item, today, onOpen }: { item: FeedItem; today: string; onOpen: () => void }) {
  const d = item.doc.decideBy;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mt-4 block w-full rounded-xl bg-accent p-6 text-left text-accent-foreground shadow-card transition-transform duration-(--duration) ease-nine hover:-translate-y-0.5 ${FOCUS}`}
    >
      <span className="flex items-center justify-between gap-3 text-small font-semibold opacity-85">
        <span>
          Up next · {item.scope === "state" ? "State" : item.doc.place.name} {DOC_TYPE_LABEL[item.doc.docType].toLowerCase()}
        </span>
        <span className="flex size-9 rotate-180 items-center justify-center rounded-full bg-accent-foreground/15">
          <Glyph name="back" size={18} />
        </span>
      </span>
      <span className="mt-3 block text-title">{item.doc.title}</span>
      {d && <span className="mt-2 block text-body font-semibold">{decideByRelative(d, today)}</span>}
      <span className="mt-1 block text-body opacity-90">
        {item.touches} of {item.total} {measureNoun(item.doc.docType, item.total)} touch you
      </span>
      {item.topTouching && <span className="mt-1 block text-small opacity-85">Including: {item.topTouching}</span>}
      <MeasureDots cards={item.doc.measures.map((m) => item.cards.find((c) => c.measure.id === m.id)!)} prefix={item.doc.docType === "ballot" ? "Q" : "#"} />
    </button>
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

/** A horizontal row of decisions with covers. Snaps card by card; scrolls by touch or keyboard. */
function Carousel({
  title,
  sub,
  entries,
  onOpen,
}: {
  title: string;
  sub: string;
  entries: { item: FeedItem; card: Card }[];
  onOpen: (docId: string, measureId: string) => void;
}) {
  const id = `h-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-title">
          {title}
        </h2>
        <span className="text-small text-muted-foreground">{entries.length}</span>
      </div>
      <p className="text-small text-muted-foreground">{sub}</p>
      {/* Keyed by its contents: when the decisions change, the row starts again at the
          first card instead of re-snapping to whichever card was in view. */}
      <ul key={entries.map((e) => e.card.measure.id).join()} className="-mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 [scrollbar-width:none]">
        {entries.map(({ item, card }) => {
          const m = card.measure;
          const ballot = item.doc.docType === "ballot";
          return (
            <li key={`${item.doc.id}:${m.id}`} className="w-64 shrink-0 snap-start sm:w-72">
              <button
                type="button"
                onClick={() => onOpen(item.doc.id, m.id)}
                className={`flex h-full w-full flex-col overflow-hidden rounded-lg bg-surface text-left shadow-card transition-transform duration-(--duration) ease-nine hover:-translate-y-0.5 ${FOCUS}`}
              >
                <Cover measure={m} label={`${ballot ? "Q" : "#"}${m.number}`} size={44} className="h-28 w-full" />
                <span className="flex flex-1 flex-col gap-1 p-4">
                  <span className="text-small text-muted-foreground">
                    {item.scope === "state" ? "State" : item.doc.place.name} {DOC_TYPE_LABEL[item.doc.docType].toLowerCase()}
                  </span>
                  <span className="line-clamp-2 text-body font-semibold">{m.title}</span>
                  {card.why[0] && (
                    <span className="line-clamp-3 font-[family-name:var(--font-serif)] text-small text-muted-foreground">{card.why[0].text}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EmptyTown({ town, onAddTown, onUpload }: { town?: string; onAddTown: () => void; onUpload?: () => void }) {
  return (
    <div className="mt-4 rounded-lg bg-surface p-5 shadow-card">
      {town ? (
        <>
          <p className="text-body font-semibold">Nine does not have documents for {town} yet.</p>
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
