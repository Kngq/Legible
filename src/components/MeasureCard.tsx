"use client";

// One measure, sorted for one person: what it is, why it reaches them, and a next step.
// YES and NO are verbatim. Every Nine sentence carries a quote badge.
import { useState } from "react";
import { draftMessage, DRAFT_QUESTIONS, localReach, nextSteps, wordCount } from "@/lib/engine/next-steps";
import { answerFact, canAskInCard, clearFact, declineFact, skipFact, type Profile } from "@/lib/engine/profile";
import type { Card, Measure, Quote, WhySentence } from "@/lib/engine/types";
import { DIRECTION_DEFS, FACT_DEFS, SENSITIVE_FACTS, TOPIC_DEFS, type FactId } from "@/lib/vocab";
import { DirectionMark, Glyph } from "./icons";
import { areaOf, type SheetView } from "./ProfileSheet";
import { Button, FOCUS, Tag } from "./ui";

export function cardDomId(m: Measure) {
  return `card-${m.id}`;
}

export function MeasureCard({
  card,
  documentId,
  profile,
  update,
  townName,
  onOpenProfile,
}: {
  card: Card;
  documentId: string;
  profile: Profile;
  update: (p: Profile) => void;
  townName?: string;
  onOpenProfile: (v: SheetView) => void;
}) {
  const m = card.measure;
  const [open, setOpen] = useState<"none" | "text" | "draft">("none");
  const [editing, setEditing] = useState<FactId | null>(null);
  const steps = nextSteps(card, profile);
  const primary = steps[0];
  const askable = card.pendingQuestions.filter((f) => canAskInCard(profile, f));
  const local = localReach(m.id, townName);
  const source = { kind: "card", documentId, measureId: m.id } as const;
  const quiet = card.relevance === "probably_not" && !card.onYourList;

  return (
    <article
      id={cardDomId(m)}
      style={{ viewTransitionName: `card-${m.number}` }}
      className="scroll-mt-6 rounded-lg bg-surface p-5 shadow-card sm:p-6"
      aria-labelledby={`${cardDomId(m)}-title`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-small text-muted-foreground">Question {m.number}</span>
        {card.relevance === "touches" && <Tag pop="accent">Touches you</Tag>}
        {card.onYourList && <Tag>On your list</Tag>}
        {card.relevance === "everyone" && <Tag>Applies to everyone</Tag>}
        {m.kind === "referendum" && <Tag>Referendum</Tag>}
      </div>

      <h3 id={`${cardDomId(m)}-title`} className="mt-2 text-title">
        {m.title}
      </h3>

      <div className="mt-3 flex items-center gap-2 text-small text-muted-foreground">
        <DirectionMark direction={card.direction} size={26} />
        <span>
          <span className="font-semibold text-foreground">{DIRECTION_DEFS[card.direction].label}.</span>{" "}
          {card.relevance === "touches" ? "Why it reaches you:" : "What it does:"}
        </span>
      </div>

      <Sentences sentences={card.why} measure={m} />

      {card.because.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {card.because.map((b) =>
            b.kind === "fact" ? (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  // Life-area facts open the profile sheet on that row; card-only facts edit here.
                  const area = areaOf(b.id);
                  if (area) onOpenProfile({ kind: "area", id: area });
                  else setEditing(editing === b.id ? null : b.id);
                }}
                aria-expanded={editing === b.id}
                className={`min-h-9 rounded-md border border-border px-3 py-1.5 text-left text-small font-semibold hover:bg-surface-muted ${FOCUS}`}
              >
                Because {b.value ? FACT_DEFS[b.id].because.yes : FACT_DEFS[b.id].because.no}
              </button>
            ) : (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpenProfile({ kind: "topics" })}
                className={`inline-flex min-h-9 items-center rounded-md bg-surface-muted px-3 py-1.5 text-left text-small font-semibold hover:bg-border ${FOCUS}`}
              >
                You follow {TOPIC_DEFS[b.id].label.toLowerCase()}
              </button>
            ),
          )}
        </div>
      )}

      {editing && (
        <FactQuestion
          fact={editing}
          intro="Change this answer. The list re-sorts right away."
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

      {local && !quiet && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-small font-semibold text-muted-foreground">In {townName ?? "your city or town"}</p>
          <Sentences sentences={[local]} measure={m} />
        </div>
      )}

      {/* Next step */}
      <div className="mt-5 rounded-md bg-background p-4">
        <p className="text-small font-semibold text-muted-foreground">Next step</p>
        {primary.kind === "answer" && askable[0] ? (
          <FactQuestion
            fact={askable[0]}
            intro={
              SENSITIVE_FACTS.includes(askable[0])
                ? "Asked only here, because this question depends on it. Your answer stays in this browser."
                : "One answer sorts this card. It stays in this browser."
            }
            onAnswer={(v) => update(answerFact(profile, askable[0], v, source))}
            onSkip={() => update(skipFact(profile, askable[0], source))}
            onDecline={() => update(declineFact(profile, askable[0], source))}
          />
        ) : (
          <>
            <p className="mt-1 text-body font-semibold">{primary.label}</p>
            <p className="text-small text-muted-foreground">{primary.detail}</p>
            <div className="mt-3">
              {primary.kind === "registration" && (
                <a
                  href={primary.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground ${FOCUS}`}
                >
                  Open the state lookup <Glyph name="external" size={18} />
                </a>
              )}
              {primary.kind === "read" && (
                <Button variant="secondary" onClick={() => setOpen(open === "text" ? "none" : "text")} aria-expanded={open === "text"}>
                  {open === "text" ? "Hide the official text" : "Show YES and NO"}
                </Button>
              )}
            </div>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {primary.kind !== "read" && (
            <LinkButton onClick={() => setOpen(open === "text" ? "none" : "text")} expanded={open === "text"}>
              Read what YES and NO do
            </LinkButton>
          )}
          <LinkButton onClick={() => setOpen(open === "draft" ? "none" : "draft")} expanded={open === "draft"}>
            Ask your legislator a factual question
          </LinkButton>
        </div>
      </div>

      {open === "text" && <OfficialText measure={m} />}
      {open === "draft" && <Draft measure={m} />}
    </article>
  );
}

function LinkButton({ onClick, expanded, children }: { onClick: () => void; expanded: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={`min-h-10 rounded-sm text-small font-semibold underline decoration-border underline-offset-4 hover:decoration-foreground ${FOCUS}`}
    >
      {children}
    </button>
  );
}

function quoteById(m: Measure, id: string): Quote | undefined {
  return m.quotes.find((q) => q.id === id);
}

export function Sentences({ sentences, measure }: { sentences: WhySentence[]; measure: Measure }) {
  const [shown, setShown] = useState<string | null>(null);
  const q = shown ? quoteById(measure, shown) : undefined;
  return (
    <div className="mt-2 space-y-2">
      {sentences.map((s) => (
        <p key={s.text} className="text-body">
          {s.text}{" "}
          <button
            type="button"
            onClick={() => setShown(shown === s.quoteId ? null : s.quoteId)}
            aria-expanded={shown === s.quoteId}
            aria-label="Show the official text this sentence comes from"
            className={`inline-flex translate-y-0.5 items-center gap-1 rounded-sm px-1.5 py-0.5 text-small font-semibold transition-colors duration-(--duration) ease-nine ${FOCUS} ${
              shown === s.quoteId ? "bg-accent-soft" : "bg-surface-muted hover:bg-accent-soft"
            }`}
          >
            <Glyph name="quote" size={14} />
            {quoteById(measure, s.quoteId)?.page ? `p. ${quoteById(measure, s.quoteId)!.page}` : "source"}
          </button>
        </p>
      ))}
      {q && (
        <figure className="animate-fade-in rounded-md border border-border p-4">
          <blockquote className="text-body">
            <mark className="bg-accent-soft text-foreground">&ldquo;{q.text}&rdquo;</mark>
          </blockquote>
          <figcaption className="mt-2 flex flex-wrap items-center gap-2 text-small text-muted-foreground">
            <span>
              {q.locator}
              {q.page ? `, page ${q.page}` : ""}, Information for Voters 2026
            </span>
            {q.status !== "failed" && <Tag pop="positive">{q.status === "reviewed" ? "Reviewed" : "Found word for word"}</Tag>}
          </figcaption>
        </figure>
      )}
    </div>
  );
}

export function FactQuestion({
  fact,
  intro,
  current,
  onAnswer,
  onSkip,
  onDecline,
  onClear,
}: {
  fact: FactId;
  intro: string;
  current?: boolean;
  onAnswer: (v: boolean) => void;
  onSkip?: () => void;
  onDecline?: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="mt-2 animate-fade-in">
      <p className="text-body font-semibold">{FACT_DEFS[fact].question}</p>
      <p className="text-small text-muted-foreground">{intro}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={current === v}
            onClick={() => onAnswer(v)}
            className={`min-h-12 min-w-20 rounded-md border-2 bg-surface px-5 font-semibold hover:border-foreground ${FOCUS} ${
              current === v ? "border-foreground" : "border-border"
            }`}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
        {onSkip && (
          <button type="button" onClick={onSkip} className={`min-h-12 rounded-md px-3 text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
            Skip for now
          </button>
        )}
        {onDecline && (
          <button type="button" onClick={onDecline} className={`min-h-12 rounded-md px-3 text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
            Prefer not to say
          </button>
        )}
        {onClear && (
          <button type="button" onClick={onClear} className={`min-h-12 rounded-md px-3 text-small font-semibold text-muted-foreground hover:text-foreground ${FOCUS}`}>
            Remove this answer
          </button>
        )}
      </div>
    </div>
  );
}

export function OfficialText({ measure }: { measure: Measure }) {
  const { yes, no } = measure.outcomes;
  return (
    <div className="mt-4 animate-fade-in space-y-3">
      {measure.kind === "referendum" && (
        <p className="text-small text-muted-foreground">This law is already in effect. A YES vote keeps it in place.</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {yes && <Outcome label="What YES does" quote={yes} />}
        {no && <Outcome label="What NO does" quote={no} />}
      </div>
      {measure.sourceUrl && (
        <a
          href={measure.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-sm text-small font-semibold underline decoration-border underline-offset-4 hover:decoration-foreground ${FOCUS}`}
        >
          Full official page for Question {measure.number} <Glyph name="external" size={14} />
        </a>
      )}
    </div>
  );
}

function Outcome({ label, quote }: { label: string; quote: Quote }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-small font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-serif)] text-body leading-relaxed">{quote.text}</p>
      <p className="mt-2 text-small text-muted-foreground">
        {quote.locator}
        {quote.page ? `, page ${quote.page}` : ""}, verbatim
      </p>
    </div>
  );
}

export function Draft({ measure }: { measure: Measure }) {
  const [question, setQuestion] = useState<string>(DRAFT_QUESTIONS[0]);
  const [text, setText] = useState(() => draftMessage(measure.number, measure.title, DRAFT_QUESTIONS[0]));
  const [copied, setCopied] = useState(false);
  const words = wordCount(text);
  return (
    <div className="mt-4 animate-fade-in space-y-3 rounded-md border border-border p-4">
      <fieldset>
        <legend className="text-small font-semibold text-muted-foreground">Pick a factual question</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DRAFT_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              aria-pressed={question === q}
              onClick={() => {
                setQuestion(q);
                setText(draftMessage(measure.number, measure.title, q));
                setCopied(false);
              }}
              className={`min-h-10 rounded-full border-2 px-3 text-small font-semibold ${FOCUS} ${question === q ? "border-foreground" : "border-transparent bg-surface-muted"}`}
            >
              {q}
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`draft-${measure.id}`} className="sr-only">
        Message draft
      </label>
      <textarea
        id={`draft-${measure.id}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setCopied(false);
        }}
        rows={7}
        className={`w-full rounded-md bg-background p-3 text-body ${FOCUS}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-small text-muted-foreground">
          {words} of 80 words. Nine never sends it and leaves your answers out.
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Glyph name={copied ? "check" : "copy"} size={18} />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
