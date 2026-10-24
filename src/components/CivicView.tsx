"use client";

// One civic item (deadline, voting window, meeting, bill) as a page, in the same
// reader layout as a measure: when and where, what it is, how it was checked,
// official actions, and the decisions it relates to.
import { useState } from "react";
import { checkLabel, type CivicCard } from "@/lib/engine/civic";
import { CIVIC_KIND_LABEL, civicMeta, dateTime, timingTag } from "@/lib/engine/civic-copy";
import type { FeedItem } from "@/lib/engine/feed";
import type { Card } from "@/lib/engine/types";
import { FACT_DEFS } from "@/lib/vocab";
import { Cover } from "./covers";
import { CivicTile } from "./CivicRow";
import { Glyph } from "./icons";
import { OriginalText } from "./OriginalText";
import { areaOf, type SheetView } from "./ProfileSheet";
import { FOCUS, Tag } from "./ui";

const SERIF = "font-[family-name:var(--font-serif)]";

export function CivicView({
  card,
  related,
  backLabel,
  onBack,
  onOpenMeasure,
  onOpenProfile,
}: {
  card: CivicCard;
  related: { item: FeedItem; card: Card }[];
  backLabel: string;
  onBack: () => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
  onOpenProfile: (v: SheetView) => void;
}) {
  const i = card.item;
  const [shared, setShared] = useState(false);
  const kicker = `${i.place.kind === "state" ? "Massachusetts" : i.place.name} · ${CIVIC_KIND_LABEL[i.kind]}`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: i.title, url: i.source.url });
      else {
        await navigator.clipboard.writeText(i.source.url);
        setShared(true);
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  return (
    <article className="mx-auto w-full max-w-2xl px-4 pb-20 sm:px-6" aria-labelledby="civic-title">
      <nav className="sticky top-0 z-20 -mx-4 flex h-16 items-center justify-between bg-background/95 px-3 backdrop-blur sm:-mx-6 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className={`flex size-12 items-center justify-center rounded-full bg-surface shadow-card hover:bg-surface-muted ${FOCUS}`}
        >
          <Glyph name="back" />
        </button>
        <div className="flex items-center rounded-full bg-surface px-1 shadow-card">
          <button type="button" onClick={share} aria-label={shared ? "Official link copied" : "Share the official page"} className={`flex size-12 items-center justify-center rounded-full hover:bg-surface-muted ${FOCUS}`}>
            <Glyph name={shared ? "check" : "share"} />
          </button>
          <a href={i.source.url} target="_blank" rel="noreferrer" aria-label="Open the official page" className={`flex size-12 items-center justify-center rounded-full hover:bg-surface-muted ${FOCUS}`}>
            <Glyph name="external" />
          </a>
        </div>
      </nav>

      <header className="mt-4">
        <p className="text-small font-semibold uppercase tracking-wider text-muted-foreground">{kicker}</p>
        <h1 id="civic-title" className="mt-2 text-title">
          {i.title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-small text-muted-foreground">
          <CivicTile card={card} size={28} />
          <span>{civicMeta(card)}</span>
        </div>
        <hr className="mt-4 border-border" />
      </header>

      {/* When, as a fact */}
      <section className="mt-5 rounded-xl bg-accent p-6 text-accent-foreground" aria-label="When">
        <p className="text-small font-semibold opacity-85">{i.body}</p>
        <p className="mt-2 text-display">{timingTag(card)}</p>
        {i.at && (
          <p className="mt-2 text-body opacity-90">
            {dateTime(i.at)}
            {i.until ? ` to ${dateTime(i.until)}` : ""}
          </p>
        )}
        {i.location && <p className="text-body opacity-90">{i.location}</p>}
        {i.lastAction && (
          <p className="mt-2 text-body opacity-90">
            Latest action, {i.lastAction.date}: {i.lastAction.text}
          </p>
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {card.relevance === "touches" && <Tag pop="accent">Touches you</Tag>}
        {card.onYourList && <Tag>On your list</Tag>}
        {card.relevance === "everyone" && <Tag>Applies to everyone</Tag>}
      </div>

      <p className={`mt-3 text-body leading-relaxed ${SERIF}`}>{i.summary}</p>

      {card.because.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {card.because.map((b) => {
            const area = areaOf(b.fact);
            const label = `Because ${b.value ? FACT_DEFS[b.fact].because.yes : FACT_DEFS[b.fact].because.no}`;
            return area ? (
              <button
                key={b.fact}
                type="button"
                onClick={() => onOpenProfile({ kind: "area", id: area })}
                className={`min-h-9 rounded-md border border-border px-3 py-1.5 text-left text-small font-semibold hover:bg-surface-muted ${FOCUS}`}
              >
                {label}
              </button>
            ) : (
              <span key={b.fact} className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-small font-semibold">
                {label}
              </span>
            );
          })}
        </div>
      )}

      {i.actions.length > 0 && (
        <section className="mt-6 flex flex-wrap gap-2" aria-label="Official actions">
          {i.actions.map((a, k) =>
            a.url ? (
              <a
                key={a.label}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 font-semibold ${k === 0 ? "bg-primary text-primary-foreground" : "bg-surface-muted hover:bg-border"} ${FOCUS}`}
              >
                {a.label} <Glyph name="external" size={16} />
              </a>
            ) : (
              <span key={a.label} className="inline-flex min-h-12 items-center rounded-full bg-surface-muted px-5 font-semibold">
                {a.label}
              </span>
            ),
          )}
        </section>
      )}

      <OriginalText original={i.original} title={i.title} />

      <section className="mt-10" aria-labelledby="checked-h">
        <h2 id="checked-h" className="text-small font-semibold uppercase tracking-wider text-muted-foreground">
          How this was checked
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-body">
          <Tag pop={i.check.kind === "schedule" ? "attention" : "positive"}>{i.check.kind === "quote" ? "Verified" : i.check.kind === "page" ? "Checked" : "Schedule"}</Tag>
          {checkLabel(i.check)}
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-10" aria-labelledby="rel-h">
          <h2 id="rel-h" className="text-small font-semibold uppercase tracking-wider text-muted-foreground">
            Related decisions
          </h2>
          <ul className="mt-1 divide-y divide-border">
            {related.map(({ item, card: c }) => (
              <li key={c.measure.id}>
                <button
                  type="button"
                  onClick={() => onOpenMeasure(item.doc.id, c.measure.id)}
                  className={`flex w-full gap-4 rounded-md py-3 text-left hover:bg-surface-muted/60 ${FOCUS}`}
                >
                  <Cover measure={c.measure} label={`${item.doc.docType === "ballot" ? "Q" : "#"}${c.measure.number}`} size={22} className="size-14 shrink-0 rounded-md [&>span]:left-2 [&>span]:top-1 [&>span]:text-body [&>span]:font-semibold" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold">{c.measure.title}</span>
                    {c.why[0] && <span className={`line-clamp-2 block text-small text-muted-foreground ${SERIF}`}>{c.why[0].text}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-small text-muted-foreground">
        Source:{" "}
        <a href={i.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          {i.source.name}
        </a>
      </p>
    </article>
  );
}
