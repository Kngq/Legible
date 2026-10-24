"use client";

// "Coming up" as a time ribbon: one column per day from today to the last
// time-sensitive date, a pin on each day something is due, and an open window
// drawn as a band to its close. Apricot marks time. Selecting a pin shows that date below with its
// one action; the most urgent date is selected first. Dates come only from the
// verified items (keyDate and days); the order comes from homeSections. Plum
// appears only on the selected date's relevance line, and only for a match.
import { useState } from "react";
import { actionsFor, cardHeader, civicRelevance, headline, isUrgent, type Action } from "@/lib/engine/home-copy";
import type { TimelineEntry } from "@/lib/engine/timeline";
import { Spark } from "./BriefCard";
import { Glyph } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { FOCUS } from "./ui";
import type { CardProps } from "./updates";

type Dated = Extract<TimelineEntry, { kind: "civic" }> & { days: number };

/** The calendar day `n` days after `today` (YYYY-MM-DD), for the column heads. */
function dayAfter(today: string, n: number) {
  const [y, m, d] = today.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d + n));
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o }).format(at);
  return { weekday: f({ weekday: "short" }), day: f({ day: "numeric" }), long: f({ weekday: "long", month: "long", day: "numeric" }) };
}

/** Short pin label: the item's own title, or "Early voting ends …" for an open window. */
const pinLabel = (e: Dated) => (e.card.timing === "open" ? headline(e.card) : e.card.item.title);

/** When, relative to today, in the words the cards already use. */
const when = (e: Dated) => cardHeader(e.card).status ?? "";

export function ComingUp({ entries, today, onOpenItem, onOpenDoc, onOpenProfile }: { entries: TimelineEntry[]; onOpenProfile: (v: SheetView) => void } & CardProps) {
  const dated = entries.filter((e): e is Dated => e.kind === "civic" && e.days !== undefined);
  const first = dated.find(isUrgent) ?? dated[0];
  const [picked, setPicked] = useState<string | undefined>(undefined);
  if (!first) return null;
  const sel = dated.find((e) => e.key === picked) ?? first;
  const span = Math.max(...dated.map((e) => e.days));
  const cols = Array.from({ length: span + 1 }, (_, n) => ({ n, ...dayAfter(today, n), here: dated.filter((e) => e.days === n) }));
  const windows = dated.filter((e) => e.card.timing === "open");

  return (
    <section aria-labelledby="h-coming" className="mt-section">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="h-coming" className="text-body font-bold">
          Coming up
        </h2>
      </div>

      <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
        <ol className="relative grid px-(--pad) [--pad:2.5rem]" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`, minWidth: `calc(${cols.length} * 3.25rem + 5rem)` }} aria-label="Dates">
          {/* The day line, and each open window as a band to its close. */}
          <span aria-hidden="true" className="absolute top-[3.05rem] h-0.5 bg-border" style={{ left: `calc(var(--pad) + (100% - 2 * var(--pad)) / ${cols.length} / 2)`, right: `calc(var(--pad) + (100% - 2 * var(--pad)) / ${cols.length} / 2)` }} />
          {windows.map((w) => (
            <span
              key={w.key}
              aria-hidden="true"
              className="absolute top-[2.9rem] h-1.5 rounded-full bg-attention-soft"
              style={{ left: "var(--pad)", width: `calc((100% - 2 * var(--pad)) * ${w.days + 1} / ${cols.length} - (100% - 2 * var(--pad)) / ${cols.length} / 2)` }}
            />
          ))}
          {cols.map((c) => (
            <li key={c.n} className="relative flex min-w-0 flex-col items-center text-center tabular-nums">
              <span className="text-small font-semibold text-muted-foreground">{c.weekday}</span>
              <span className={`mt-0.5 text-body font-semibold ${c.n === 0 ? "rounded-sm bg-foreground px-1.5 text-background" : ""}`}>
                {c.day}
                {c.n === 0 && <span className="sr-only"> (today)</span>}
              </span>
              {c.here.length === 0 ? (
                <span aria-hidden="true" className="relative mt-2 size-2.5 rounded-full border-2 border-border bg-background" />
              ) : (
                c.here.map((e) => {
                  const on = e.key === sel.key;
                  const election = e.card.item.kind === "election";
                  return (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => setPicked(e.key)}
                      aria-pressed={on}
                      aria-label={`${headline(e.card)}, ${c.long}, ${when(e)}`}
                      className={`group relative mt-1 flex w-[7.5rem] shrink-0 flex-col items-center rounded-md px-1 pb-1.5 pt-1 interactive hover:bg-surface ${on ? "bg-surface shadow-hairline" : ""} ${FOCUS}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-3 interactive group-hover:scale-125 ${election ? "rounded-[3px] bg-foreground" : "rounded-full bg-attention"} ${on ? "scale-125" : ""}`}
                      />
                      <span className="mt-2 line-clamp-3 text-small font-semibold leading-tight text-balance">{pinLabel(e)}</span>
                      <span className="mt-0.5 text-small text-muted-foreground">{when(e)}</span>
                    </button>
                  );
                })
              )}
            </li>
          ))}
        </ol>
      </div>

      <DatePanel key={sel.key} entry={sel} today={today} onOpenItem={onOpenItem} onOpenDoc={onOpenDoc} onOpenProfile={onOpenProfile} />

      <p className="mt-2 text-right text-[11px] text-muted-foreground">Dates from official sources</p>
    </section>
  );
}

/** The selected date: when, what, who it is for (only when Legible knows), and one action. */
function DatePanel({ entry: e, onOpenItem, onOpenDoc, onOpenProfile }: { entry: Dated; today: string; onOpenItem: (id: string) => void; onOpenDoc: (id: string) => void; onOpenProfile: (v: SheetView) => void }) {
  const c = e.card;
  const head = cardHeader(c);
  const relevance = civicRelevance(c);
  const { primary } = actionsFor(e);
  const docId = e.ballot?.doc.id;
  const openDetail = () => onOpenItem(c.item.id);
  const go = (a: Action) => {
    if ("href" in a.to) return;
    if (a.to.open === "doc" && docId) onOpenDoc(docId);
    else openDetail();
  };
  const action = `group inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-surface px-4 text-small font-semibold shadow-hairline interactive press hover:shadow-[0_0_0_1px_var(--muted-foreground)] ${FOCUS}`;

  return (
    <div aria-live="polite" className="mt-3 flex animate-fade-in flex-wrap items-center gap-x-5 gap-y-3 rounded-md bg-attention-soft px-4 py-3.5 sm:flex-nowrap sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-small font-bold text-attention-strong">
          {[head.status, head.meta].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-0.5 text-body font-semibold leading-snug">
          <button type="button" onClick={openDetail} className={`text-left underline decoration-transparent underline-offset-4 interactive hover:decoration-current ${FOCUS}`}>
            {headline(c)}
          </button>
        </p>
        {relevance ? (
          <p className="mt-0.5 text-small text-muted-foreground">
            {relevance.kind === "interest" ? (
              <span className="mr-1 font-semibold text-foreground">On your list.</span>
            ) : relevance.kind !== "open" ? (
              <span className="mr-1 inline-flex items-center gap-1 font-semibold text-accent">
                <Spark />
                Relevant to you.
              </span>
            ) : null}
            {relevance.text}
            {relevance.kind === "open" && (
              <>
                {" "}
                <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`font-semibold text-accent underline decoration-accent/30 underline-offset-4 ${FOCUS}`}>
                  Add details
                </button>
              </>
            )}
          </p>
        ) : null}
      </div>
      {"href" in primary.to ? (
        <a href={primary.to.href} target="_blank" rel="noreferrer" className={action}>
          {primary.label}
          <Glyph name="external" size={13} />
          <span className="sr-only">(opens the official site)</span>
        </a>
      ) : (
        <button type="button" onClick={() => go(primary)} className={action}>
          {primary.label}
          <span aria-hidden="true" className="-rotate-90">
            <span className="nudge block">
              <Glyph name="chevron" size={14} />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
