"use client";

// Home: where the person's life meets what is being decided, statewide and in
// their town. Each decision says what it is, why it reaches them, and a next step.
import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { avatarParts } from "@/lib/engine/avatar";
import { buildCards, touchCount } from "@/lib/engine/cards";
import { localReach } from "@/lib/engine/next-steps";
import { nextItem, personalization, type ChecklistItem } from "@/lib/engine/personalization";
import type { Profile } from "@/lib/engine/profile";
import type { Card, DocumentData } from "@/lib/engine/types";
import { LIFE_AREAS } from "@/lib/vocab";
import { AvatarRing } from "./AvatarRing";
import { Glyph } from "./icons";
import { cardDomId, MeasureCard } from "./MeasureCard";
import { itemView, viewForPart, type SheetView } from "./ProfileSheet";
import { townName } from "./profile-steps";
import { Button, FOCUS } from "./ui";

type Scope = "all" | "state" | "town";

const MS_DAY = 86_400_000;

function daysUntil(isoDate: string, now = new Date()): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / MS_DAY);
}

/** Re-sort with a view transition where the browser has one and motion is allowed. */
function withTransition(fn: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(fn));
  else fn();
}

export function Home({
  doc,
  profile,
  setProfile,
  remember,
  onOpenProfile,
  onForget,
  nudgeDismissed,
  onDismissNudge,
}: {
  doc: DocumentData;
  profile: Profile;
  setProfile: (p: Profile) => void;
  remember: boolean;
  onOpenProfile: (v: SheetView) => void;
  onForget: () => void;
  nudgeDismissed: boolean;
  onDismissNudge: () => void;
}) {
  const [scope, setScope] = useState<Scope>("all");
  const cards = useMemo(() => buildCards(doc, profile), [doc, profile]);
  const town = townName(profile.townId);
  const touches = touchCount(cards);
  const localCards = cards.filter((c) => localReach(c.measure.id));
  const meter = personalization(profile);
  const parts = avatarParts(profile);
  const nudge = nudgeDismissed ? null : nextItem(profile);
  const openList = () => onOpenProfile({ kind: "list" });
  const days = doc.date ? daysUntil(doc.date) : undefined;
  const update = (p: Profile) => withTransition(() => setProfile(p));

  const shown = scope === "town" ? localCards : cards;
  const groups: { id: string; title: string; note?: string; cards: Card[] }[] = [
    { id: "touches", title: "Touches you", note: "Something in your answers points at these.", cards: shown.filter((c) => c.relevance === "touches") },
    { id: "list", title: "On your list", note: "Subjects you follow.", cards: shown.filter((c) => c.relevance !== "touches" && c.onYourList) },
    { id: "everyone", title: "Applies to everyone", cards: shown.filter((c) => c.relevance === "everyone" && !c.onYourList) },
  ];
  const quiet = shown.filter((c) => c.relevance === "probably_not" && !c.onYourList);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 lg:grid lg:grid-cols-[300px_1fr] lg:gap-8 lg:pt-8">
      {/* Profile: avatar ring. Compact header on mobile, sticky panel on desktop. */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="flex items-center gap-4 rounded-xl bg-surface p-4 shadow-card lg:flex-col lg:p-6 lg:text-center">
          <div className="lg:hidden">
            <AvatarRing parts={parts} percent={meter.percent} size={104} onFigure={openList} onPart={(p) => onOpenProfile(viewForPart(p))} />
          </div>
          <div className="hidden lg:block">
            <AvatarRing parts={parts} percent={meter.percent} size={200} onFigure={openList} onPart={(p) => onOpenProfile(viewForPart(p))} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-body font-semibold lg:text-title">{town ? `Here is what ${town} is deciding.` : "Here is what is being decided."}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 lg:justify-center">
              <button type="button" onClick={openList} className={`min-h-10 rounded-sm text-small font-semibold underline decoration-border underline-offset-4 hover:decoration-foreground ${FOCUS}`}>
                Your profile
              </button>
              {remember && (
                <button type="button" onClick={onForget} className={`min-h-10 rounded-sm text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
                  Forget me
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 hidden px-2 text-small text-muted-foreground lg:block">
          Your answers stay in this browser. Nine sorts the official text; it never says how to vote.
        </p>
      </aside>

      <main className="mt-6 min-w-0 lg:mt-0">
        <h1 className="text-title">Where your life meets what is being decided</h1>

        {/* Scope switch */}
        <div role="tablist" aria-label="Scope" className="mt-4 grid grid-cols-3 rounded-full bg-surface p-1 shadow-card">
          {(
            [
              ["all", "All"],
              ["state", "Statewide"],
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

        {nudge && <Nudge item={nudge} onOpen={() => onOpenProfile(itemView(nudge))} onDismiss={onDismissNudge} />}

        {/* The event */}
        <section aria-label="The event" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr]">
          <div className="col-span-2 rounded-xl bg-accent p-6 text-accent-foreground md:col-span-1 md:row-span-2">
            <p className="text-small font-semibold opacity-85">State election · Tuesday, November 3</p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
              <span className="text-display">{days !== undefined && days > 0 ? `${days} days` : days === 0 ? "Today" : "Nov 3"}</span>
              <span className="text-small opacity-85">{days !== undefined && days > 0 ? "until Election Day" : ""}</span>
            </p>
            <p className="mt-3 max-w-md text-body opacity-90">
              Every Massachusetts voter sees the same {doc.measures.length} questions. Here they are sorted by your answers, with the official text behind every line.
            </p>
            <QuestionDots cards={doc.measures.map((m) => cards.find((c) => c.measure.id === m.id)!)} />
          </div>
          <Stat
            tone="info"
            label="Touch you"
            value={`${touches} of ${doc.measures.length}`}
            sub={touches ? "questions on your ballot" : "Answer a card question to sort"}
          />
          <Stat
            tone="attention"
            label={town ? `Reach ${town}` : "Reach your town"}
            value={`${localCards.length}`}
            sub="state questions with a town-level effect"
            onClick={() => setScope("town")}
          />
        </section>

        {scope !== "state" && <TownBlock town={town} cards={localCards} onAddTown={() => onOpenProfile({ kind: "town" })} />}

        {groups.map(
          (g) =>
            g.cards.length > 0 && (
              <section key={g.id} aria-labelledby={`h-${g.id}`} className="mt-10">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 id={`h-${g.id}`} className="text-title">
                    {g.title} <span className="text-muted-foreground">{g.cards.length}</span>
                  </h2>
                  {g.note && <p className="hidden text-small text-muted-foreground sm:block">{g.note}</p>}
                </div>
                <div className="space-y-4">
                  {g.cards.map((c) => (
                    <MeasureCard key={c.measure.id} card={c} documentId={doc.id} profile={profile} update={update} townName={town} onOpenProfile={onOpenProfile} />
                  ))}
                </div>
              </section>
            ),
        )}

        {quiet.length > 0 && (
          <details className="group mt-10">
            <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between rounded-lg bg-surface px-5 shadow-card ${FOCUS}`}>
              <span className="text-body font-semibold">
                Probably not you <span className="text-muted-foreground">{quiet.length}</span>
              </span>
              <span className="transition-transform duration-(--duration) ease-nine group-open:rotate-180">
                <Glyph name="chevron" />
              </span>
            </summary>
            <p className="mt-3 px-1 text-small text-muted-foreground">Nothing in your answers points at these. They are still on your ballot.</p>
            <div className="mt-3 space-y-4">
              {quiet.map((c) => (
                <MeasureCard key={c.measure.id} card={c} documentId={doc.id} profile={profile} update={update} townName={town} onOpenProfile={onOpenProfile} />
              ))}
            </div>
          </details>
        )}

        <p className="mt-12 text-small text-muted-foreground">
          Source: {doc.source.name}{" "}
          {doc.source.url && (
            <a href={doc.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              Official page
            </a>
          )}
        </p>
      </main>
    </div>
  );
}

function Stat({ tone, label, value, sub, onClick }: { tone: "info" | "attention"; label: string; value: string; sub: string; onClick?: () => void }) {
  const cls = `rounded-xl p-5 text-on-strong text-left ${tone === "info" ? "bg-info" : "bg-attention"}`;
  const body = (
    <>
      <p className="text-small font-semibold opacity-85">{label}</p>
      <p className="mt-6 text-title">{value}</p>
      <p className="text-small opacity-85">{sub}</p>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} ${FOCUS}`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Nine dot columns, one per question. Taller columns touch you. A flat nod to the reference's dot chart. */
function QuestionDots({ cards }: { cards: Card[] }) {
  return (
    <div className="mt-6" aria-hidden="true">
      <div className="flex h-12 items-end justify-between gap-1">
        {cards.map((c) => {
          const n = c.relevance === "touches" ? 5 : c.onYourList ? 3 : c.relevance === "everyone" ? 2 : 1;
          return (
            <span key={c.measure.id} className="flex flex-col items-center gap-1">
              {Array.from({ length: n }, (_, i) => (
                <span key={i} className={`size-1.5 rounded-full ${c.relevance === "touches" ? "bg-accent-foreground" : "bg-accent-foreground/45"}`} />
              ))}
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-small opacity-80">
        <span>Q1</span>
        <span>Q{cards.length}</span>
      </div>
    </div>
  );
}

function TownBlock({ town, cards, onAddTown }: { town?: string; cards: Card[]; onAddTown: () => void }) {
  return (
    <section aria-labelledby="h-town" className="mt-10">
      <h2 id="h-town" className="text-title">
        In {town ?? "your town"}
      </h2>
      <div className="mt-3 space-y-3 rounded-lg bg-surface p-5 shadow-card">
        <p className="text-small font-semibold text-muted-foreground">Decided by the town</p>
        {town ? (
          <p className="text-body">
            No {town} documents are in Nine yet. When a Town Meeting warrant or council agenda is added, its decisions appear here, sorted the same way.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body">Add your city or town to see the decisions that reach it.</p>
            <Button variant="secondary" onClick={onAddTown}>
              Add your town
            </Button>
          </div>
        )}
      </div>
      {cards.length > 0 && (
        <div className="mt-3 rounded-lg bg-surface p-5 shadow-card">
          <p className="text-small font-semibold text-muted-foreground">Decided statewide, felt {town ? `in ${town}` : "locally"}</p>
          <ul className="mt-2 divide-y divide-border">
            {cards.map((c) => (
              <li key={c.measure.id}>
                <a
                  href={`#${cardDomId(c.measure)}`}
                  className={`flex min-h-12 gap-3 rounded-sm py-3 hover:bg-surface-muted/60 ${FOCUS}`}
                >
                  <span className="mt-0.5 w-8 shrink-0 font-mono text-small text-muted-foreground">Q{c.measure.number}</span>
                  <span className="flex-1">
                    <span className="block text-body font-semibold">{c.measure.title}</span>
                    <span className="block text-small text-muted-foreground">{localReach(c.measure.id, town)!.text}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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
      <span aria-hidden="true" className="mt-1 size-2.5 shrink-0 rounded-full bg-accent" />
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
