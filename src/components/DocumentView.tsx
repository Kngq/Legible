"use client";

// One document, opened from the feed: its measures as cards, sorted for this person.
// Touches you, On your list, Applies to everyone, then Probably not you.
import { useEffect, useRef } from "react";
import { DOC_TYPE_LABEL, longDate, measureNoun, verb } from "@/lib/engine/decide-by";
import { daysBetween, type FeedItem } from "@/lib/engine/feed";
import { localReach } from "@/lib/engine/next-steps";
import { canAskInCard, type Profile } from "@/lib/engine/profile";
import type { Card } from "@/lib/engine/types";
import { Cover, DocTile } from "./covers";
import { Glyph } from "./icons";
import { FOCUS, Tag } from "./ui";

export function DocumentView({
  item,
  today,
  profile,
  town,
  onBack,
  onOpenMeasure,
  focusFirst,
}: {
  item: FeedItem;
  today: string;
  profile: Profile;
  town?: string;
  onBack: () => void;
  onOpenMeasure: (measureId: string) => void;
  /** On mount, open "Probably not you" and focus the first decision row (Ballot Wrapped exit). */
  focusFirst?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const quietRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!focusFirst) return;
    if (quietRef.current) quietRef.current.open = true;
    // preventScroll keeps the page at the top; the caller already scrolled there.
    rootRef.current?.querySelector<HTMLButtonElement>("[data-decision-row]")?.focus({ preventScroll: true });
    // Mount only: re-running on later renders would steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { doc, cards, touches, total } = item;
  const noun = measureNoun(doc.docType, total);
  const localCards = doc.place.kind === "state" ? cards.filter((c) => localReach(c.measure.id)) : [];
  const d = doc.decideBy;
  const days = d ? daysBetween(today, d.date) : undefined;
  const placeLabel = doc.place.kind === "state" ? "State" : doc.place.name;

  const groups: { id: string; title: string; note?: string; cards: Card[] }[] = [
    { id: "touches", title: "Touches you", note: "Something in your answers points at these.", cards: cards.filter((c) => c.relevance === "touches") },
    { id: "list", title: "On your list", note: "Subjects you follow.", cards: cards.filter((c) => c.relevance !== "touches" && c.onYourList) },
    { id: "everyone", title: "Applies to everyone", cards: cards.filter((c) => c.relevance === "everyone" && !c.onYourList) },
  ];
  const quiet = cards.filter((c) => c.relevance === "probably_not" && !c.onYourList);
  const card = (c: Card) => <DecisionRow key={c.measure.id} card={c} profile={profile} ballot={doc.docType === "ballot"} onOpen={() => onOpenMeasure(c.measure.id)} />;

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
      <nav className="sticky top-0 z-20 -mx-4 flex h-14 items-center gap-2 bg-background/95 px-2 backdrop-blur sm:-mx-6 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className={`flex min-h-12 items-center gap-1 rounded-md pl-2 pr-4 text-body font-semibold hover:bg-surface-muted ${FOCUS}`}
        >
          <Glyph name="back" /> All decisions
        </button>
      </nav>

      <header className="mt-2 flex flex-col items-center text-center">
        <DocTile docType={doc.docType} size={88} />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Tag>{placeLabel}</Tag>
          <Tag>{DOC_TYPE_LABEL[doc.docType]}</Tag>
        </div>
        <h1 className="mt-3 text-title">{doc.title}</h1>
        {doc.docType === "ballot" && <p className="mt-1 text-body text-muted-foreground">Here is your ballot, sorted by your answers.</p>}
        {doc.source.url && (
          <a
            href={doc.source.url}
            target="_blank"
            rel="noreferrer"
            className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-muted px-5 text-body font-semibold hover:bg-border ${FOCUS}`}
          >
            Official source <Glyph name="external" size={16} />
          </a>
        )}
      </header>

      {/* The event */}
      <section aria-label="When this is decided" className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr]">
        <div className="col-span-2 rounded-xl bg-accent p-6 text-accent-foreground md:col-span-1 md:row-span-2">
          <p className="text-small font-semibold opacity-85">
            {doc.docType === "ballot" ? "State election" : DOC_TYPE_LABEL[doc.docType]}
            {d ? ` · ${longDate(d.date)}` : ""}
          </p>
          {d && days !== undefined && (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
              <span className="text-display">{days > 0 ? `${days} ${days === 1 ? "day" : "days"}` : days === 0 ? "Today" : "Decided"}</span>
              <span className="text-small opacity-85">{days > 0 ? `until ${verb(d).toLowerCase()}` : ""}</span>
            </p>
          )}
          <p className="mt-3 max-w-md text-body opacity-90">
            {doc.docType === "ballot"
              ? `Every Massachusetts voter sees the same ${total} ${noun}. Here they are sorted by your answers, with the official text behind every line.`
              : `${total} ${noun}, sorted by your answers, with the official text behind every line.`}
          </p>
          <MeasureDots cards={doc.measures.map((m) => cards.find((c) => c.measure.id === m.id)!)} prefix={doc.docType === "ballot" ? "Q" : "#"} />
        </div>
        <Stat tone="info" label="Touch you" value={`${touches} of ${total}`} sub={touches ? `${noun} here` : "Answer a card question to sort"} />
        {localCards.length > 0 ? (
          <Stat
            tone="attention"
            label={town ? `Reach ${town}` : "Reach your town"}
            value={`${localCards.length}`}
            sub={`${noun} with a town-level effect`}
            onClick={() => document.getElementById("h-town")?.scrollIntoView({ behavior: "smooth" })}
          />
        ) : (
          <Stat tone="attention" label="On your list" value={`${cards.filter((c) => c.onYourList).length}`} sub="subjects you follow" />
        )}
      </section>

      {localCards.length > 0 && <TownReach town={town} cards={localCards} onOpen={onOpenMeasure} />}

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
              <ul className="divide-y divide-border">{g.cards.map(card)}</ul>
            </section>
          ),
      )}

      {quiet.length > 0 && (
        <details ref={quietRef} className="group mt-10">
          <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between rounded-lg bg-surface px-5 shadow-card ${FOCUS}`}>
            <span className="text-body font-semibold">
              Probably not you <span className="text-muted-foreground">{quiet.length}</span>
            </span>
            <span className="transition-transform duration-(--duration) ease-nine group-open:rotate-180">
              <Glyph name="chevron" />
            </span>
          </summary>
          <p className="mt-3 px-1 text-small text-muted-foreground">Nothing in your answers points at these. They are still part of this decision.</p>
          <ul className="mt-1 divide-y divide-border">{quiet.map(card)}</ul>
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
    </div>
  );
}

function Stat({ tone, label, value, sub, onClick }: { tone: "info" | "attention"; label: string; value: string; sub: string; onClick?: () => void }) {
  const cls = `rounded-xl p-5 text-left ${tone === "info" ? "bg-info text-info-foreground" : "bg-attention text-attention-foreground"}`;
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

/** One dot column per measure. Taller columns touch you. */
export function MeasureDots({ cards, prefix }: { cards: Card[]; prefix: string }) {
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
        <span>{prefix}1</span>
        <span>
          {prefix}
          {cards.length}
        </span>
      </div>
    </div>
  );
}

/** State measures with a town-level effect. Each line is a cited sentence on its card. */
function TownReach({ town, cards, onOpen }: { town?: string; cards: Card[]; onOpen: (measureId: string) => void }) {
  return (
    <section aria-labelledby="h-town" className="mt-10 scroll-mt-16">
      <h2 id="h-town" className="text-title">
        Decided statewide, felt {town ? `in ${town}` : "locally"}
      </h2>
      <ul className="mt-3 divide-y divide-border rounded-lg bg-surface px-5 shadow-card">
        {cards.map((c) => (
          <li key={c.measure.id}>
            <button type="button" onClick={() => onOpen(c.measure.id)} className={`flex min-h-12 w-full gap-3 rounded-sm py-3 text-left hover:bg-surface-muted/60 ${FOCUS}`}>
              <span className="mt-0.5 w-8 shrink-0 font-mono text-small text-muted-foreground">Q{c.measure.number}</span>
              <span className="flex-1">
                <span className="block text-body font-semibold">{c.measure.title}</span>
                <span className="block text-small text-muted-foreground">{localReach(c.measure.id, town)!.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A measure as a list row: cover thumbnail, title, first sentence in the reading face, status. */
function DecisionRow({ card, profile, ballot, onOpen }: { card: Card; profile: Profile; ballot: boolean; onOpen: () => void }) {
  const m = card.measure;
  const asks = card.pendingQuestions.some((f) => canAskInCard(profile, f));
  return (
    <li>
      <button type="button" data-decision-row onClick={onOpen} className={`flex w-full gap-4 rounded-md py-4 text-left hover:bg-surface-muted/60 ${FOCUS}`}>
        <Cover measure={m} label={`${ballot ? "Q" : "#"}${m.number}`} size={22} className="size-16 shrink-0 rounded-md [&>span]:left-2 [&>span]:top-1 [&>span]:text-body [&>span]:font-semibold" />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block text-body font-semibold">{m.title}</span>
          {card.why[0] && <span className="line-clamp-2 block font-[family-name:var(--font-serif)] text-small text-muted-foreground">{card.why[0].text}</span>}
          <span className="flex flex-wrap items-center gap-2 pt-0.5">
            {card.relevance === "touches" && <Tag pop="accent">Touches you</Tag>}
            {card.onYourList && <Tag>On your list</Tag>}
            {asks && <span className="text-small text-muted-foreground">One question sorts this</span>}
          </span>
        </span>
      </button>
    </li>
  );
}
