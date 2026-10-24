"use client";

// One document, opened from the feed, as a guide: the header in Home's card
// language, then every question ranked for this person (or in ballot order),
// filterable, each with a plain line, both outcomes, the official cost line, and
// how it reaches them. No polls and no arguments for a side.
import { useState } from "react";
import { DOC_TYPE_LABEL, decideByRelative, shortDate } from "@/lib/engine/decide-by";
import type { FeedItem } from "@/lib/engine/feed";
import { localReach } from "@/lib/engine/next-steps";
import { canAskInCard, type Profile } from "@/lib/engine/profile";
import { docWhat } from "@/lib/engine/timeline";
import { buildGuide, guideTopics, topicLabel, type GuideEntry, type GuideFilter, type GuideSort } from "@/lib/engine/ballot-guide";
import { DIRECTION_DEFS, type TopicId } from "@/lib/vocab";
import { AskButton } from "./AskSheet";
import { DirectionMark, Glyph } from "./icons";
import { FOCUS, Tag } from "./ui";
import { SECONDARY } from "./updates";

export function DocumentView({
  item,
  today,
  profile,
  town,
  onBack,
  onOpenMeasure,
}: {
  item: FeedItem;
  today: string;
  profile: Profile;
  town?: string;
  onBack: () => void;
  onOpenMeasure: (measureId: string) => void;
}) {
  const { doc, cards } = item;
  const ballot = doc.docType === "ballot";
  const d = doc.decideBy;
  const kind = `${item.scope === "state" ? "Massachusetts" : doc.place.name} ${DOC_TYPE_LABEL[doc.docType].toLowerCase()}`;

  const [sort, setSort] = useState<GuideSort>("relevance");
  const [filter, setFilter] = useState<GuideFilter>({ kind: "all" });
  const entries = buildGuide(cards, sort, filter);
  const touching = cards.filter((c) => c.relevance === "touches").length;
  const following = cards.filter((c) => c.onYourList).length;
  const topics = guideTopics(cards);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <nav className="sticky top-0 z-20 -mx-4 flex h-14 items-center bg-background/95 px-2 backdrop-blur sm:-mx-6 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className={`flex min-h-12 items-center gap-1 rounded-md pl-2 pr-4 text-body font-semibold hover:bg-surface-muted ${FOCUS}`}
        >
          <Glyph name="back" /> Back
        </button>
      </nav>

      <header className="pt-4">
        <p className="text-small font-semibold uppercase tracking-wider text-muted-foreground">{kind}</p>
        <h1 className="mt-2 text-title">{doc.title}</h1>
        {d && (
          <p className="mt-2 text-body font-semibold">
            {decideByRelative(d, today)} · {shortDate(d.date)}
          </p>
        )}
        <p className="mt-2 text-body text-muted-foreground">
          {docWhat(item)}{" "}
          {ballot && (touching > 0 ? `${touching} may affect you, based on your answers. They come first.` : "Every voter sees the same questions. Answer a few profile questions and the ones that may affect you come first.")}
        </p>
      </header>

      {ballot && (
        <div className="mt-4">
          <AskButton variant="pill" />
        </div>
      )}

      <Controls
        sort={sort}
        setSort={setSort}
        filter={filter}
        setFilter={setFilter}
        touching={touching}
        following={following}
        topics={topics}
      />

      <ol className="mt-4 space-y-4" aria-label={`${ballot ? "Questions" : "Items"}, ${sort === "relevance" ? "most relevant to you first" : "in ballot order"}`}>
        {entries.map((e) => (
          <GuideCard key={e.card.measure.id} entry={e} ballot={ballot} sortedByYou={sort === "relevance"} town={town} profile={profile} onOpen={() => onOpenMeasure(e.card.measure.id)} />
        ))}
      </ol>
      {entries.length === 0 && <p className="mt-6 text-small text-muted-foreground">Nothing matches this filter. Try All.</p>}

      {doc.source.url && (
        <p className="mt-8 flex flex-wrap items-center gap-3 text-small text-muted-foreground">
          <a href={doc.source.url} target="_blank" rel="noreferrer" className={SECONDARY}>
            Official source <Glyph name="external" size={14} />
            <span className="sr-only">(opens the official site)</span>
          </a>
          {doc.source.name}
        </p>
      )}
    </div>
  );
}

const CHIP = `inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-small font-semibold transition-colors duration-(--duration) ease-legible ${FOCUS}`;

function Controls({
  sort,
  setSort,
  filter,
  setFilter,
  touching,
  following,
  topics,
}: {
  sort: GuideSort;
  setSort: (s: GuideSort) => void;
  filter: GuideFilter;
  setFilter: (f: GuideFilter) => void;
  touching: number;
  following: number;
  topics: TopicId[];
}) {
  const same = (f: GuideFilter) => f.kind === filter.kind && (f.kind !== "topic" || (filter.kind === "topic" && f.id === filter.id));
  const chip = (f: GuideFilter, label: string) => (
    <button key={f.kind === "topic" ? f.id : f.kind} type="button" aria-pressed={same(f)} onClick={() => setFilter(f)} className={`${CHIP} ${same(f) ? "bg-primary text-primary-foreground" : "bg-surface text-foreground shadow-card hover:bg-surface-muted"}`}>
      {label}
    </button>
  );
  return (
    <div className="mt-6 space-y-3">
      <div role="radiogroup" aria-label="Sort" className="inline-flex rounded-full bg-surface p-1 shadow-card">
        {(
          [
            ["relevance", "Most relevant to you"],
            ["ballot", "Ballot order"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={sort === id}
            onClick={() => setSort(id)}
            className={`${CHIP} min-h-9 ${sort === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div aria-label="Filter" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:none]">
        {chip({ kind: "all" }, "All")}
        {touching > 0 && chip({ kind: "touches" }, `May affect you · ${touching}`)}
        {following > 0 && chip({ kind: "follow" }, `You follow · ${following}`)}
        {topics.map((t) => chip({ kind: "topic", id: t }, topicLabel(t)))}
      </div>
    </div>
  );
}

/** One question as a guide card: what it does, both outcomes, the cost, and how it reaches you. */
function GuideCard({
  entry: e,
  ballot,
  sortedByYou,
  town,
  profile,
  onOpen,
}: {
  entry: GuideEntry;
  ballot: boolean;
  sortedByYou: boolean;
  town?: string;
  profile: Profile;
  onOpen: () => void;
}) {
  const c = e.card;
  const m = c.measure;
  const touches = c.relevance === "touches";
  const referendum = m.kind === "referendum";
  const local = localReach(m.id, town);
  const asks = !touches && c.pendingQuestions.some((f) => canAskInCard(profile, f));
  const origin = referendum ? "Referendum on a law already in effect" : m.kind === "initiative" ? "Placed on the ballot by voter petition" : DOC_TYPE_LABEL.ballot;

  return (
    <li data-ask-measure={m.id} className={`rounded-lg bg-surface p-5 shadow-card ${touches ? "ring-2 ring-accent" : ""}`}>
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="flex size-14 shrink-0 flex-col items-center justify-center rounded-md bg-accent-soft leading-none">
          <span className="text-small font-bold uppercase text-muted-foreground">{ballot ? "Q" : "#"}</span>
          <span className="text-title font-bold">{m.number}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {touches && <Tag pop="accent">{sortedByYou ? `#${e.rank} for you · ` : ""}May affect you</Tag>}
            {c.onYourList && <Tag pop="info">You follow this</Tag>}
          </div>
          <h3 className="mt-1 font-[family-name:var(--font-serif)] text-title font-semibold leading-tight">{m.title}</h3>
          <p className="mt-1 text-small text-muted-foreground">{origin}</p>
        </div>
      </div>

      {e.plain && <p className="mt-4 text-body">{e.plain.text}</p>}

      <p className="mt-3 flex items-center gap-2 text-small font-semibold">
        <DirectionMark direction={c.direction} size={24} />
        {DIRECTION_DEFS[c.direction].label}
      </p>

      <p className="mt-4 text-small text-muted-foreground">What YES and NO do, in the official words:</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border p-4">
          <p className="flex items-center gap-2 text-small font-bold uppercase tracking-wider">
            <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
            If YES wins{referendum ? " · law stays" : ""}
          </p>
          {e.passes && <p className="mt-1.5 font-[family-name:var(--font-serif)] text-body">{e.passes.text}</p>}
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="flex items-center gap-2 text-small font-bold uppercase tracking-wider">
            <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground" />
            If NO wins{referendum ? " · law ends" : ""}
          </p>
          {e.fails && <p className="mt-1.5 font-[family-name:var(--font-serif)] text-body">{e.fails.text}</p>}
        </div>
      </div>

      {e.cost && (
        <p className="mt-3 text-small">
          <span className="mr-2 font-bold uppercase tracking-wider text-muted-foreground">Cost</span>
          {e.cost} <span className="text-muted-foreground">(official fiscal statement)</span>
        </p>
      )}

      <div className={`mt-4 rounded-md p-4 ${touches ? "bg-accent-soft" : "bg-surface-muted"}`}>
        <p className="text-small font-bold uppercase tracking-wider">{e.ifYou ?? (c.relevance === "probably_not" ? "Probably not you" : "If you live in Massachusetts")}</p>
        {touches ? (
          c.why.map((s) => (
            <p key={s.text} className="mt-1.5 text-body">
              {s.text}
            </p>
          ))
        ) : (
          <p className="mt-1.5 text-body">
            {c.relevance === "probably_not" ? "Nothing in your answers points to this question." : "It applies to everyone; nothing in your answers points to it directly."}
            {asks && " One quick question on its page tells you if it reaches you."}
          </p>
        )}
        {local && <p className="mt-2 text-small text-muted-foreground">In {town ?? "your city or town"}: {local.text}</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5">
        <AskButton measureId={m.id} />
        <button type="button" onClick={onOpen} className={`inline-flex min-h-11 items-center gap-1.5 text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
          {asks ? "Answer one question and read more" : "Read more and check the official text"}
          <span aria-hidden="true" className="-rotate-90">
            <Glyph name="chevron" size={14} />
          </span>
        </button>
      </div>
    </li>
  );
}
