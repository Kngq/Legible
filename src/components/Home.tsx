"use client";

// Home: a feed of decisions near the person, state and town. Each item is one
// document; opening it shows the DocumentView. All filtering runs in the browser.
import { useState } from "react";
import { avatarParts } from "@/lib/engine/avatar";
import { decidedLine, decideByLine, decideByRelative, DOC_TYPE_LABEL, measureNoun } from "@/lib/engine/decide-by";
import type { Feed, FeedItem } from "@/lib/engine/feed";
import { nextItem, personalization, type ChecklistItem } from "@/lib/engine/personalization";
import type { Profile } from "@/lib/engine/profile";
import type { Provenance } from "@/lib/engine/types";
import { LIFE_AREAS } from "@/lib/vocab";
import { AvatarRing } from "./AvatarRing";
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
  onOpenProfile,
  onForget,
  nudgeDismissed,
  onDismissNudge,
  onUpload,
}: {
  feed: Feed;
  today: string;
  profile: Profile;
  remember: boolean;
  onOpenDoc: (id: string) => void;
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6 lg:pt-8">
      {/* Header: town, line, avatar with its ring */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 pt-2">
          <p className="text-title">{town ?? "Massachusetts"}</p>
          <p className="text-body text-muted-foreground">What is being decided near you</p>
          {remember && (
            <button type="button" onClick={onForget} className={`mt-1 min-h-10 rounded-sm text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
              Forget me
            </button>
          )}
        </div>
        <AvatarRing
          parts={parts}
          percent={meter.percent}
          size={84}
          onFigure={() => onOpenProfile({ kind: "list" })}
          onPart={(p) => onOpenProfile(viewForPart(p))}
        />
      </header>

      {nudge && <Nudge item={nudge} onOpen={() => onOpenProfile(itemView(nudge))} onDismiss={onDismissNudge} />}

      {up && <UpNext item={up} today={today} onOpen={() => onOpenDoc(up.doc.id)} />}

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

      {upcoming.length > 0 && (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {upcoming.map((i) => (
            <li key={i.doc.id}>
              <FeedCard item={i} today={today} onOpen={() => onOpenDoc(i.doc.id)} />
            </li>
          ))}
        </ul>
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
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {decided.map((i) => (
              <li key={i.doc.id}>
                <FeedCard item={i} today={today} onOpen={() => onOpenDoc(i.doc.id)} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-12 text-small text-muted-foreground">Your answers and your town stay in this browser. Nine sorts the official text; it never says how to vote.</p>
    </div>
  );
}

function UpNext({ item, today, onOpen }: { item: FeedItem; today: string; onOpen: () => void }) {
  const d = item.doc.decideBy;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mt-4 block w-full rounded-xl bg-accent p-6 text-left text-on-strong shadow-card transition-transform duration-(--duration) ease-nine hover:-translate-y-0.5 ${FOCUS}`}
    >
      <span className="flex items-center justify-between gap-3 text-small font-semibold opacity-85">
        <span>
          Up next · {item.scope === "state" ? "State" : item.doc.place.name} {DOC_TYPE_LABEL[item.doc.docType].toLowerCase()}
        </span>
        <span className="flex size-9 rotate-180 items-center justify-center rounded-full bg-on-strong/15">
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

function FeedCard({ item, today, onOpen }: { item: FeedItem; today: string; onOpen: () => void }) {
  const { doc } = item;
  const d = doc.decideBy;
  const trust = TRUST[doc.provenance];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex h-full w-full flex-col gap-2 rounded-lg bg-surface p-5 text-left shadow-card transition-colors duration-(--duration) ease-nine hover:bg-surface-muted/50 ${FOCUS}`}
    >
      <span className="flex flex-wrap gap-2">
        <Tag>{item.scope === "state" ? "State" : doc.place.name}</Tag>
        <Tag>{DOC_TYPE_LABEL[doc.docType]}</Tag>
      </span>
      <span className="text-body font-semibold">{doc.title}</span>
      {d && (
        <span className="text-small text-muted-foreground">
          {item.status === "decided" ? decidedLine(d) : decideByLine(d)}
          {item.status === "upcoming" && d.date === today ? ", today" : ""}
        </span>
      )}
      <span>
        {item.touches > 0 ? (
          <Tag pop="accent">
            {item.touches} of {item.total} touch you
          </Tag>
        ) : (
          <span className="text-small text-muted-foreground">Nothing in your answers points here yet</span>
        )}
      </span>
      {item.topTouching && <span className="text-small">Including: {item.topTouching}</span>}
      <span className="mt-auto pt-1">
        <Tag pop={trust.pop}>{trust.label}</Tag>
      </span>
    </button>
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
