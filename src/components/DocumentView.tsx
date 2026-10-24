"use client";

// One document, opened from the feed. Same card language as Home's UpdateCard:
// what is being decided and when, then "How could this affect you?" first, then
// what reaches the town, what applies to everyone, and the rest folded away.
import type { ReactNode } from "react";
import { DOC_TYPE_LABEL, decideByRelative, shortDate } from "@/lib/engine/decide-by";
import type { FeedItem } from "@/lib/engine/feed";
import { localReach } from "@/lib/engine/next-steps";
import { canAskInCard, type Profile } from "@/lib/engine/profile";
import { docWhat } from "@/lib/engine/timeline";
import type { Card } from "@/lib/engine/types";
import { Glyph } from "./icons";
import { FOCUS, Tag } from "./ui";
import { H2, SECONDARY } from "./updates";

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
  const label = (c: Card) => `${ballot ? "Question" : "Item"} ${c.measure.number}: ${c.measure.title}`;
  const d = doc.decideBy;
  const kind = `${item.scope === "state" ? "Massachusetts" : doc.place.name} ${DOC_TYPE_LABEL[doc.docType].toLowerCase()}`;

  const touching = cards.filter((c) => c.relevance === "touches");
  const local = item.scope === "state" ? cards.filter((c) => c.relevance !== "touches" && localReach(c.measure.id)) : [];
  const shown = new Set([...touching, ...local].map((c) => c.measure.id));
  const everyone = cards.filter((c) => !shown.has(c.measure.id) && (c.relevance === "everyone" || c.onYourList));
  const quiet = cards.filter((c) => !shown.has(c.measure.id) && c.relevance === "probably_not" && !c.onYourList);
  const asks = (c: Card) => c.relevance !== "touches" && c.pendingQuestions.some((f) => canAskInCard(profile, f));

  const row = (c: Card, line: string | undefined) => (
    <li key={c.measure.id}>
      <button type="button" onClick={() => onOpenMeasure(c.measure.id)} className={`flex w-full items-start gap-3 py-3 text-left ${FOCUS}`}>
        <span className="min-w-0 flex-1">
          <span className="block text-small font-semibold">{label(c)}</span>
          {line && <span className="mt-0.5 block text-small text-muted-foreground">{line}</span>}
          {(c.onYourList || asks(c)) && (
            <span className="mt-1.5 flex flex-wrap items-center gap-2">
              {c.onYourList && <Tag pop="info">You follow this</Tag>}
              {asks(c) && <span className="text-small text-muted-foreground">One quick question tells you if this reaches you</span>}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="mt-0.5 -rotate-90">
          <Glyph name="chevron" size={16} />
        </span>
      </button>
    </li>
  );

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
          {docWhat(item)} {ballot && "Every voter in the state sees the same questions. Here they are sorted by your answers."}
        </p>
      </header>

      <section aria-labelledby="h-touches" className="mt-8 rounded-lg bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <h2 id="h-touches" className={H2}>
            How could this affect you?
          </h2>
          {touching.length > 0 && <Tag pop="accent">{touching.length} may affect you</Tag>}
        </div>
        {touching.length > 0 ? (
          <>
            <p className="mt-1 text-small text-muted-foreground">Possible effects of questions that match your answers, in plain words. Voters decide.</p>
            <ul className="mt-2 divide-y divide-border">{touching.map((c) => row(c, c.why[0]?.text))}</ul>
          </>
        ) : (
          <p className="mt-1 text-small text-muted-foreground">Nothing in your answers points at a specific question yet. Open any question to answer the one thing that sorts it.</p>
        )}
      </section>

      {local.length > 0 && (
        <Group id="town" title={`Could reach ${town ?? "your town"}`} note="Decided statewide, with an effect on cities and towns.">
          {local.map((c) => row(c, localReach(c.measure.id, town)!.text))}
        </Group>
      )}

      {everyone.length > 0 && (
        <Group id="everyone" title="Applies to everyone" note="These change rules for every resident.">
          {everyone.map((c) => row(c, c.why[0]?.text))}
        </Group>
      )}

      {quiet.length > 0 && (
        <details className="group mt-4 rounded-lg bg-surface shadow-card">
          <summary className={`flex min-h-14 cursor-pointer list-none items-center justify-between rounded-lg px-5 ${FOCUS}`}>
            <span className="text-body font-bold">
              Probably not you <span className="font-normal text-muted-foreground">{quiet.length}</span>
            </span>
            <span className="transition-transform duration-(--duration) ease-legible group-open:rotate-180">
              <Glyph name="chevron" />
            </span>
          </summary>
          <div className="px-5 pb-3">
            <p className="text-small text-muted-foreground">Nothing in your answers points at these. They are still on the ballot.</p>
            <ul className="mt-1 divide-y divide-border">{quiet.map((c) => row(c, c.why[0]?.text))}</ul>
          </div>
        </details>
      )}

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

function Group({ id, title, note, children }: { id: string; title: string; note: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`h-${id}`} className="mt-4 rounded-lg bg-surface p-5 shadow-card">
      <h2 id={`h-${id}`} className="text-body font-bold">
        {title}
      </h2>
      <p className="text-small text-muted-foreground">{note}</p>
      <ul className="mt-2 divide-y divide-border">{children}</ul>
    </section>
  );
}
