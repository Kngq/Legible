"use client";

// The measure page's "For you" card: what changes for this person if YES or NO
// passes, when, and which answers put it here. Every line opens its official
// words in place, and "How do we know this?" walks the chain to the source file.
import { useState } from "react";
import { pageLines, quoteFor, trustSummary, type PageSentence } from "@/lib/engine/measure-page";
import { answerFact, canAskInCard, clearFact, declineFact, skipFact, type Profile } from "@/lib/engine/profile";
import type { Card, DocumentData, Measure } from "@/lib/engine/types";
import { FACT_DEFS, SENSITIVE_FACTS, TOPIC_DEFS, type FactId } from "@/lib/vocab";
import { ChainSheet, CitedLine, TrustLine, type CiteSource } from "./Citation";
import { FactQuestion } from "./MeasureCard";
import { PartLabel, personalHeading } from "./MeasureParts";
import { areaOf, type SheetView } from "./ProfileSheet";
import { FOCUS, Tag } from "./ui";

const LABEL = "text-small font-semibold text-muted-foreground";
const ROW = "border-t border-border pt-3 mt-3";

function sourceTitle(doc: DocumentData): string {
  return doc.source.name.split(",")[0];
}

/** Where a ballot question's quotes live: the booklet, checked page by page. */
export function ballotCiteSource(measure: Measure, doc: DocumentData): CiteSource {
  return {
    quote: (id) => quoteFor(measure, id),
    title: sourceTitle(doc),
    url: measure.sourceUrl ?? doc.source.url,
    fingerprint: doc.source,
    checkedAgainst: "the page text",
    onFail: "If a single word fails to match, Legible hides the measure and lists it as flagged.",
  };
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
  const touches = card.relevance === "touches";
  const personal: PageSentence[] = touches ? card.why : [];
  const shown = [...personal, ...(lines?.takesEffect ? [lines.takesEffect.why] : [])];
  const trust = trustSummary(m, doc, shown);
  const src = ballotCiteSource(m, doc);
  const line = (s: PageSentence) => <CitedLine key={s.text} s={s} src={src} onChain={setChain} />;

  return (
    <section className={`mt-5 rounded-lg p-5 ${touches ? "bg-accent-soft" : "bg-surface shadow-card"}`} aria-labelledby="foryou-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PartLabel n={4} id="foryou-h">
          {personalHeading(card)}
        </PartLabel>
        <div className="flex flex-wrap gap-1.5">
          {touches && <span className="rounded-sm bg-accent px-2.5 py-1 text-small font-semibold text-accent-foreground">Touches you</span>}
          {card.onYourList && <Tag pop="info">On your list</Tag>}
        </div>
      </div>

      {touches ? (
        <>
          <p className="mt-2 text-small text-muted-foreground">What could change for you, in plain words. Each line opens the official words it comes from.</p>
          {personal.map(line)}
        </>
      ) : (
        <p className="mt-2 text-body">
          {card.relevance === "probably_not" ? "Nothing in your answers points to this question." : "It applies to everyone; nothing in your answers points to it directly."}
        </p>
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

      {trust.lines > 0 && (
        <TrustLine lines={trust.lines} quotes={trust.quotes} provenance={trust.aiDraft ? "ai_draft" : trust.allReviewed ? "reviewed" : "verified"} against="the official text" />
      )}

      {chain && <ChainSheet s={chain} src={src} onClose={() => setChain(null)} />}
    </section>
  );
}
