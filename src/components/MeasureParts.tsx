"use client";

// The four parts every ballot question shows, in the same order and with the same
// headings on the ballot card and on the question's page, so the page reads as
// the card opened up: What it does, What YES and NO do, Cost, and If you ….
// The card passes detailed={false}; the page shows the fuller version.
import { useState } from "react";
import { firstSentence } from "@/lib/engine/ballot-guide";
import { pageLines } from "@/lib/engine/measure-page";
import type { Card, Measure } from "@/lib/engine/types";
import { DIRECTION_DEFS, FACT_DEFS } from "@/lib/vocab";
import { DirectionMark, Glyph } from "./icons";
import { FOCUS } from "./ui";

const SERIF = "font-[family-name:var(--font-serif)]";

/** One heading style for the four parts, on card and page alike. */
export function PartLabel({ n, children, id }: { n: number; children: string; id?: string }) {
  return (
    <h3 id={id} className="flex items-center gap-2 text-small font-bold uppercase tracking-wider text-muted-foreground">
      <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-surface-muted text-foreground">
        {n}
      </span>
      {children}
    </h3>
  );
}

/** "If you rent", "Probably not you", or "If you live in Massachusetts": the heading of part 4. */
export function personalHeading(card: Card): string {
  const facts = card.because.filter((b) => b.kind === "fact");
  if (card.relevance === "touches" && facts.length) {
    return `If ${facts.map((b) => (b.kind === "fact" ? (b.value ? FACT_DEFS[b.id].because.yes : FACT_DEFS[b.id].because.no) : "")).join(" and ")}`;
  }
  return card.relevance === "probably_not" ? "Probably not you" : "If you live in Massachusetts";
}

/** 1. What it does: one plain cited line and the kind of change; the page adds the official summary. */
export function WhatItDoes({ card, detailed = false }: { card: Card; detailed?: boolean }) {
  const m = card.measure;
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-5">
      <PartLabel n={1}>What it does</PartLabel>
      {m.overview[0] && <p className="mt-2 text-body">{m.overview[0].text}</p>}
      <p className="mt-2 flex items-center gap-2 text-small font-semibold">
        <DirectionMark direction={card.direction} size={24} />
        {DIRECTION_DEFS[card.direction].label}
      </p>
      {detailed && (
        <>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={`mt-1 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
            {open ? "Hide the official summary" : "Read the official summary"}
          </button>
          {open && (
            <div className="mt-1 animate-fade-in rounded-md bg-surface-muted p-4">
              <p className={`text-body leading-relaxed ${SERIF}`}>{m.summary.text}</p>
              <p className="mt-2 text-small text-muted-foreground">
                {m.summary.locator}
                {m.summary.page ? `, page ${m.summary.page}` : ""}, word for word
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** 2. What YES and NO do: the official statements side by side; the page adds the plain line under each. */
export function Outcomes({ card, detailed = false }: { card: Card; detailed?: boolean }) {
  const m = card.measure;
  const referendum = m.kind === "referendum";
  const lines = pageLines(m.id);
  // A separate plain YES line exists only where part 1 does not already say it (Q9).
  const plainYes = lines?.yes;
  const box = (yes: boolean) => {
    const q = yes ? m.outcomes.yes : m.outcomes.no;
    const plain = yes ? plainYes : lines?.no;
    return (
      <div className="rounded-md border border-border p-4">
        <p className="flex items-center gap-2 text-small font-bold uppercase tracking-wider">
          <span aria-hidden="true" className={`size-2 rounded-full ${yes ? "bg-accent" : "bg-muted-foreground"}`} />
          If {yes ? "YES" : "NO"} wins{referendum ? (yes ? " · law stays" : " · law ends") : ""}
        </p>
        {q && <p className={`mt-1.5 text-body ${SERIF}`}>{q.text}</p>}
        {detailed && q && (
          <p className="mt-1 text-small text-muted-foreground">
            {q.locator}
            {q.page ? `, page ${q.page}` : ""}, word for word
          </p>
        )}
        {detailed && plain && (
          <p className="mt-3 border-t border-border pt-3 text-small">
            <span className="font-semibold">In plain words: </span>
            {plain.text}
          </p>
        )}
      </div>
    );
  };
  return (
    <section className="mt-5">
      <PartLabel n={2}>What YES and NO do</PartLabel>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {box(true)}
        {box(false)}
      </div>
    </section>
  );
}

/** 3. Cost: the official fiscal statement, first sentence on the card, in full on the page. */
export function Cost({ measure: m, detailed = false }: { measure: Measure; detailed?: boolean }) {
  if (!m.fiscal) return null;
  return (
    <section className="mt-5">
      <PartLabel n={3}>Cost</PartLabel>
      <p className={`mt-2 ${detailed ? `text-body leading-relaxed ${SERIF}` : "text-small"}`}>{detailed ? m.fiscal.text : firstSentence(m.fiscal.text)}</p>
      <p className="mt-1 text-small text-muted-foreground">
        Official fiscal statement
        {detailed && m.fiscal.page ? `, page ${m.fiscal.page}, word for word` : ""}
      </p>
    </section>
  );
}

/** The card's way into the page, named for what it opens. */
export function OpenDetails({ onOpen, asks }: { onOpen: () => void; asks: boolean }) {
  return (
    <button type="button" onClick={onOpen} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground ${FOCUS}`}>
      {asks ? "Answer one question and see all 4 parts in full" : "See all 4 parts in full"}
      <span aria-hidden="true" className="-rotate-90">
        <Glyph name="chevron" size={14} />
      </span>
    </button>
  );
}

/** 4. If you …: the card's short version; the page uses ForYou under the same heading. */
export function PersonalSummary({ card, asks, local, town }: { card: Card; asks: boolean; local?: string; town?: string }) {
  const touches = card.relevance === "touches";
  return (
    <section className={`mt-5 rounded-md p-4 ${touches ? "bg-accent-soft" : "bg-surface-muted"}`}>
      <PartLabel n={4}>{personalHeading(card)}</PartLabel>
      {touches ? (
        card.why.map((s) => (
          <p key={s.text} className="mt-1.5 text-body">
            {s.text}
          </p>
        ))
      ) : (
        <p className="mt-1.5 text-body">
          {card.relevance === "probably_not" ? "Nothing in your answers points to this question." : "It applies to everyone; nothing in your answers points to it directly."}
          {asks && " One quick question on its page tells you if it reaches you."}
        </p>
      )}
      {local && <p className="mt-2 text-small text-muted-foreground">In {town ?? "your city or town"}: {local}</p>}
    </section>
  );
}
