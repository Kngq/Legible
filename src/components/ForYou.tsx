"use client";

// The measure page's "For you" card: what changes for this person if YES or NO
// passes, when, and which answers put it here. Every line opens its official
// words in place, and "How do we know this?" walks the chain to the source file.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { excerpt, pageLines, quoteFor, trustSummary, yesLines, type PageSentence } from "@/lib/engine/measure-page";
import { answerFact, canAskInCard, clearFact, declineFact, skipFact, type Profile } from "@/lib/engine/profile";
import type { Card, DocumentData, Measure } from "@/lib/engine/types";
import { DIRECTION_DEFS, FACT_DEFS, SENSITIVE_FACTS, TOPIC_DEFS, type FactId } from "@/lib/vocab";
import { DirectionMark, Glyph } from "./icons";
import { Fingerprint } from "./FullText";
import { FactQuestion } from "./MeasureCard";
import { areaOf, type SheetView } from "./ProfileSheet";
import { FOCUS, Tag } from "./ui";

const SERIF = "font-[family-name:var(--font-serif)]";
const LABEL = "text-small font-semibold text-muted-foreground";
const ROW = "border-t border-border pt-3 mt-3";

function sourceTitle(doc: DocumentData): string {
  return doc.source.name.split(",")[0];
}

function OfficialWords({ measure, s }: { measure: Measure; s: PageSentence }) {
  const q = quoteFor(measure, s.quoteId);
  if (!q) return null;
  const e = excerpt(q, s.mark);
  return (
    <p className={`mt-1.5 text-body leading-relaxed ${SERIF}`}>
      {e.before}
      <mark className="rounded-[4px] bg-accent-soft px-0.5 text-foreground shadow-[inset_0_-2px_0_var(--accent)]">{e.marked}</mark>
    </p>
  );
}

/** One of Legible's sentences, its source line, and the official words opened in place. */
function CitedLine({
  s,
  measure,
  doc,
  onChain,
}: {
  s: PageSentence;
  measure: Measure;
  doc: DocumentData;
  onChain: (s: PageSentence) => void;
}) {
  const [open, setOpen] = useState(false);
  const q = quoteFor(measure, s.quoteId);
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
      {open && q && (
        <div className="animate-fade-in rounded-md bg-surface-muted px-4 py-3.5">
          <p className={LABEL}>Official text, word for word</p>
          <OfficialWords measure={measure} s={s} />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {q.status !== "failed" && <Tag pop="positive">{q.status === "reviewed" ? "Reviewed" : "Found word for word"}</Tag>}
            <span className="text-small text-muted-foreground">
              {sourceTitle(doc)}
              {q.page ? `, p. ${q.page}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChain(s)}
            className={`mt-1 min-h-11 rounded-sm text-small font-semibold underline underline-offset-4 ${FOCUS}`}
          >
            How do we know this?
          </button>
        </div>
      )}
    </div>
  );
}

/** Sentence, quote, page, file: the chain behind one line, as a bottom sheet. */
export function ChainSheet({
  s,
  measure,
  doc,
  onClose,
}: {
  s: PageSentence;
  measure: Measure;
  doc: DocumentData;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const q = quoteFor(measure, s.quoteId);
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
  const url = measure.sourceUrl ?? doc.source.url;
  const steps: { label: string; body: ReactNode }[] = [
    { label: "Legible's sentence", body: <p className="mt-1 text-body">{s.text}</p> },
    { label: "The quote it cites", body: <OfficialWords measure={measure} s={s} /> },
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
          {url ? (
        <a href={url} target="_blank" rel="noreferrer" className={`mt-1 inline-flex min-h-11 items-center gap-2 text-body font-semibold underline underline-offset-4 ${FOCUS}`}>
          {sourceTitle(doc)} <Glyph name="external" size={16} />
        </a>
      ) : (
        <p className="mt-1 text-body font-semibold">{sourceTitle(doc)}</p>
          )}
          <Fingerprint source={doc.source} />
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
            <p>{q && q.status !== "failed" ? "Passed. Every word matched the page text." : "Not found. This line is hidden."}</p>
          </div>
          <div className={`rounded-md px-3.5 py-3 ${q?.status === "reviewed" ? "bg-positive-soft" : "border border-dashed border-border bg-surface"}`}>
            <p className="font-bold">Human review</p>
            <p>{q?.status === "reviewed" ? "Done. A person checked it against the file." : "Pending. No person has checked it yet."}</p>
          </div>
        </div>
        <p className="mt-3 text-small text-muted-foreground">If a single word fails to match, Legible hides the measure and lists it as flagged.</p>
      </section>
    </div>
  );
}

export function ForYou({
  card,
  doc,
  profile,
  update,
  onOpenProfile,
}: {
  card: Card;
  doc: DocumentData;
  profile: Profile;
  update: (p: Profile) => void;
  onOpenProfile: (v: SheetView) => void;
}) {
  const m = card.measure;
  const [editing, setEditing] = useState<FactId | null>(null);
  const [chain, setChain] = useState<PageSentence | null>(null);
  const lines = pageLines(m.id);
  const askable = card.pendingQuestions.filter((f) => canAskInCard(profile, f));
  const source = { kind: "card", documentId: doc.id, measureId: m.id } as const;
  const referendum = m.kind === "referendum";
  const yes = yesLines(card, lines);
  const shown = [...yes, ...(lines ? [lines.no, ...(lines.takesEffect ? [lines.takesEffect.why] : [])] : [])];
  const trust = trustSummary(m, doc, shown);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const line = (s: PageSentence) => <CitedLine key={s.text} s={s} measure={m} doc={doc} onChain={setChain} />;

  return (
    <section className="mt-5 rounded-lg bg-surface p-5 shadow-card" aria-labelledby="foryou-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="foryou-h" className="text-body font-bold">
          How could this affect you?
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {card.relevance === "touches" && (
            <span className="rounded-sm bg-accent px-2.5 py-1 text-small font-semibold text-accent-foreground">Touches you</span>
          )}
          {card.onYourList && <Tag pop="info">On your list</Tag>}
          {card.relevance === "everyone" && <Tag>Applies to everyone</Tag>}
          {card.relevance === "probably_not" && <Tag>Probably not for you</Tag>}
        </div>
      </div>

      {referendum && (
        <p className="mt-3 rounded-md border border-border px-3.5 py-2.5 text-small">
          <strong>Referendum.</strong> This law is already in effect. YES keeps it. NO repeals it.
        </p>
      )}

      <p className="mt-3.5 flex items-center gap-3 text-body font-semibold">
        <DirectionMark direction={card.direction} size={36} />
        {DIRECTION_DEFS[card.direction].label}
      </p>
      {card.relevance === "probably_not" && <p className="mt-2 text-body">Nothing in your answers points to this measure directly.</p>}
      <p className="mt-3 text-small text-muted-foreground">
        Possible effects in plain words, if it passes or fails. Each line opens the official text it comes from, so you can check it.
      </p>

      <div className={ROW}>
        <p className={LABEL}>If YES passes{referendum ? " · the law stays" : ""}</p>
        {yes.map(line)}
      </div>

      {lines && (
        <div className={ROW}>
          <p className={LABEL}>If NO passes{referendum ? " · the law ends" : ""}</p>
          {line(lines.no)}
        </div>
      )}

      {lines?.takesEffect && (
        <div className={ROW}>
          <p className={LABEL}>When it would reach you</p>
          <span className="mt-2 inline-block rounded-sm border border-border px-2.5 py-1 text-small font-semibold">{lines.takesEffect.label}</span>
          {line(lines.takesEffect.why)}
        </div>
      )}

      {card.because.length > 0 && (
        <div className={ROW}>
          <p className={LABEL}>Based on what you told Legible</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {card.because.map((b) =>
              b.kind === "fact" ? (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    const area = areaOf(b.id);
                    if (area) onOpenProfile({ kind: "area", id: area });
                    else setEditing(editing === b.id ? null : b.id);
                  }}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-1.5 text-left text-small font-semibold hover:bg-surface-muted ${FOCUS}`}
                >
                  Because {b.value ? FACT_DEFS[b.id].because.yes : FACT_DEFS[b.id].because.no}
                  <span className="font-normal text-muted-foreground">Change</span>
                </button>
              ) : (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onOpenProfile({ kind: "topics" })}
                  className={`min-h-11 rounded-md bg-surface-muted px-3 py-1.5 text-left text-small font-semibold hover:bg-border ${FOCUS}`}
                >
                  You follow {TOPIC_DEFS[b.id].label.toLowerCase()}
                </button>
              ),
            )}
          </div>
          <p className="mt-2 text-small text-muted-foreground">
            {card.because.some((b) => b.kind === "fact") && card.because.some((b) => b.kind === "topic")
              ? "Your answers decide “Touches you.” Subjects you follow only add “On your list.” "
              : ""}
            Your answers stay in this browser.
          </p>
          {editing && (
            <FactQuestion
              fact={editing}
              intro="Change this answer. Everything re-sorts right away."
              current={profile.facts[editing]?.value}
              onAnswer={(v) => {
                setEditing(null);
                update(answerFact(profile, editing, v, { kind: "edit" }));
              }}
              onClear={() => {
                setEditing(null);
                update(clearFact(profile, editing));
              }}
            />
          )}
        </div>
      )}

      {askable[0] && (
        <div className="mt-4 rounded-lg bg-accent-soft p-4">
          <p className="text-small font-semibold">One answer decides whether this touches you</p>
          <FactQuestion
            fact={askable[0]}
            intro={
              SENSITIVE_FACTS.includes(askable[0])
                ? "Asked only here, because this decision depends on it. Your answer stays in this browser."
                : "It stays in this browser."
            }
            onAnswer={(v) => update(answerFact(profile, askable[0], v, source))}
            onSkip={() => update(skipFact(profile, askable[0], source))}
            onDecline={() => update(declineFact(profile, askable[0], source))}
          />
        </div>
      )}

      <p className={`mt-4 flex items-start gap-2.5 rounded-md px-3.5 py-3 text-small ${trust.aiDraft ? "bg-attention-soft" : "bg-positive-soft"}`}>
        <span className="mt-0.5 shrink-0">
          <Glyph name="check" size={16} />
        </span>
        <span>
          <strong>
            {plural(trust.lines, "line")}, {plural(trust.quotes, "quote")}.
          </strong>{" "}
          {trust.aiDraft
            ? "AI draft, quotes verified, not human reviewed."
            : trust.allReviewed
              ? "Each one found word for word and reviewed by a person."
              : "Each one found word for word in the official text. Human review pending."}
        </span>
      </p>

      {chain && <ChainSheet s={chain} measure={m} doc={doc} onClose={() => setChain(null)} />}
    </section>
  );
}
