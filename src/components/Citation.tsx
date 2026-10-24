"use client";

// One of Legible's sentences and the official words it comes from, opened in
// place ("Show the words"), plus the chain from sentence to saved file ("How do
// we know this?"). Shared by ballot questions and bills: each passes a
// CiteSource saying where its quotes live and how they were checked.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AskSource } from "@/lib/ask/context";
import { excerpt, type PageSentence } from "@/lib/engine/measure-page";
import type { Quote } from "@/lib/engine/types";
import { Fingerprint } from "./FullText";
import { Glyph } from "./icons";
import { FOCUS, Tag } from "./ui";
import { Reveal } from "./Reveal";

const SERIF = "font-[family-name:var(--font-serif)]";
const LABEL = "text-small font-semibold text-muted-foreground";

export interface CiteSource {
  quote: (id: string) => Quote | undefined;
  /** "Information for Voters 2026", "Bill S.2836, saved copy". */
  title: string;
  url?: string;
  fingerprint: { hash?: string; savedOn?: string };
  /** What the machine check compared against: "the page text", "the saved bill text". */
  checkedAgainst: string;
  /** What happens when a word does not match. */
  onFail: string;
  /** When set, highlighting the official words opens Ask Kiro on this source. */
  ask?: AskSource;
}

export function OfficialWords({ src, s }: { src: CiteSource; s: PageSentence }) {
  const q = src.quote(s.quoteId);
  if (!q) return null;
  const e = excerpt(q, s.mark);
  return (
    <p
      data-ask-official={src.ask ? true : undefined}
      data-ask-kind={src.ask?.kind}
      data-ask-id={src.ask?.id}
      data-ask-title={src.ask?.title}
      data-ask-locator={src.ask ? q.locator : undefined}
      data-ask-url={src.ask?.url}
      className={`mt-1.5 text-body leading-relaxed ${SERIF}`}
    >
      {e.before}
      <mark className="rounded-[4px] bg-accent-soft px-0.5 text-foreground shadow-[inset_0_-2px_0_var(--accent)]">{e.marked}</mark>
    </p>
  );
}

/**
 * One of Legible's sentences, its source line, and the official words opened in
 * place. With `pane` (the annotated reader on wide screens) the source line
 * selects the sentence instead, and the words show in the pane beside it.
 */
export function CitedLine({
  s,
  src,
  onChain,
  pane,
}: {
  s: PageSentence;
  src: CiteSource;
  onChain: (s: PageSentence) => void;
  pane?: { selected: boolean; onSelect: () => void };
}) {
  const [open, setOpen] = useState(false);
  const q = src.quote(s.quoteId);
  if (pane) {
    return (
      <div className={`-mx-3 mt-1 rounded-r-md border-l-2 px-3 py-1 interactive ${pane.selected ? "border-accent bg-surface" : "border-transparent hover:bg-surface"}`}>
        <p className="text-body">{s.text}</p>
        {q && (
          <button
            type="button"
            onClick={pane.onSelect}
            aria-pressed={pane.selected}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-sm text-small font-semibold interactive ${pane.selected ? "text-accent" : "hover:text-accent"} ${FOCUS}`}
          >
            <Glyph name="check" size={14} />
            {q.locator}
            {q.page ? `, page ${q.page}` : ""}
            <span className="font-normal text-muted-foreground">{pane.selected ? "Shown beside" : "Show the words"}</span>
          </button>
        )}
      </div>
    );
  }
  return (
    <div>
      <p className="mt-1 text-body">{s.text}</p>
      {q && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm text-small font-semibold ${FOCUS}`}
        >
          <Glyph name="check" size={14} />
          {q.locator}
          {q.page ? `, page ${q.page}` : ""}
          <span className="font-normal text-muted-foreground">{open ? "Hide" : "Show the words"}</span>
        </button>
      )}
      <Reveal open={open && Boolean(q)}>
        {q && (
        <div className="rounded-md bg-surface-muted px-4 py-3.5">
          <p className={LABEL}>Official text, word for word</p>
          <OfficialWords src={src} s={s} />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {q.status !== "failed" && <Tag pop="positive">{q.status === "reviewed" ? "Reviewed" : "Found word for word"}</Tag>}
            <span className="text-small text-muted-foreground">
              {src.title}
              {q.page ? `, p. ${q.page}` : ""}
            </span>
          </div>
          <button type="button" onClick={() => onChain(s)} className={`mt-1 min-h-11 rounded-sm text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
            How do we know this?
          </button>
        </div>
        )}
      </Reveal>
    </div>
  );
}

/** Sentence, quote, place, file: the chain behind one line, as a bottom sheet. */
export function ChainSheet({ s, src, onClose }: { s: PageSentence; src: CiteSource; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const q = src.quote(s.quoteId);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);
  const steps: { label: string; body: ReactNode }[] = [
    { label: "Legible's sentence", body: <p className="mt-1 text-body">{s.text}</p> },
    { label: "The quote it cites", body: <OfficialWords src={src} s={s} /> },
    {
      label: "Where it appears",
      body: (
        <p className="mt-1 text-body font-semibold">
          {q?.page ? `Page ${q.page}, ` : ""}
          {q?.locator}
        </p>
      ),
    },
    {
      label: "The official file",
      body: (
        <>
          {src.url ? (
            <a href={src.url} target="_blank" rel="noreferrer" className={`mt-1 inline-flex min-h-11 items-center gap-2 text-body font-semibold underline underline-offset-4 ${FOCUS}`}>
              {src.title} <Glyph name="external" size={16} />
            </a>
          ) : (
            <p className="mt-1 text-body font-semibold">{src.title}</p>
          )}
          <Fingerprint source={src.fingerprint} />
        </>
      ),
    },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-foreground/40" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="chain-h"
        className="relative max-h-[88vh] w-full max-w-2xl animate-fade-in overflow-y-auto rounded-t-xl bg-background px-4 pb-8 pt-3 sm:px-6"
      >
        <div aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-border" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <h2 id="chain-h" className="text-title">
            How do we know this?
          </h2>
          <button ref={close} type="button" onClick={onClose} aria-label="Close" className={`flex size-12 items-center justify-center rounded-full bg-surface ${FOCUS}`}>
            <Glyph name="close" />
          </button>
        </div>
        <p className="mt-1 text-small text-muted-foreground">Four links from what Legible wrote back to the official file.</p>
        <ol className="mt-4 space-y-2.5">
          {steps.map((step, i) => (
            <li key={step.label} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-small font-bold">{i + 1}</span>
              <div className="min-w-0 flex-1 rounded-lg bg-surface px-4 py-3.5">
                <p className={LABEL}>{step.label}</p>
                {step.body}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid grid-cols-2 gap-2.5 text-small">
          <div className="rounded-md bg-positive-soft px-3.5 py-3">
            <p className="font-bold">Machine check</p>
            <p>{q && q.status !== "failed" ? `Passed. Every word matched ${src.checkedAgainst}.` : "Not found. This line is hidden."}</p>
          </div>
          <div className={`rounded-md px-3.5 py-3 ${q?.status === "reviewed" ? "bg-positive-soft" : "border border-dashed border-border bg-surface"}`}>
            <p className="font-bold">Human review</p>
            <p>{q?.status === "reviewed" ? "Done. A person checked it against the file." : "Pending. No person has checked it yet."}</p>
          </div>
        </div>
        <p className="mt-3 text-small text-muted-foreground">{src.onFail}</p>
      </section>
    </div>
  );
}

/** "5 lines, 4 quotes. Each one found word for word …": the trust line under a set of cited lines. */
export function TrustLine({ lines, quotes, provenance, against }: { lines: number; quotes: number; provenance: "reviewed" | "verified" | "ai_draft"; against: string }) {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return (
    <p className={`mt-4 flex items-start gap-2.5 rounded-md px-3.5 py-3 text-small ${provenance === "ai_draft" ? "bg-surface-muted" : "bg-positive-soft"}`}>
      <span className="mt-0.5 shrink-0">
        <Glyph name="check" size={16} />
      </span>
      <span>
        <strong>
          {plural(lines, "line")}, {plural(quotes, "quote")}.
        </strong>{" "}
        {provenance === "ai_draft"
          ? "AI draft, quotes verified, not human reviewed."
          : provenance === "reviewed"
            ? "Each one found word for word and reviewed by a person."
            : `Each one found word for word in ${against}. Human review pending.`}
      </span>
    </p>
  );
}
