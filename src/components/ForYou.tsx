"use client";

// The measure page's first part, "How could this affect you?": why the question
// is recommended (the same words as on For you, so the page reads as the
// recommendation continued), then what could change for this person, possible
// indirect effects, and what the official text says is not known. Each group
// shows only cited lines, and an empty group is left out. Every line opens its
// official words in place, and "How do we know this?" walks the chain to the
// source file. Answers already in the Civic Profile are reused, never asked again.
import { useState } from "react";
import type { BallotReason } from "@/lib/engine/ballot-picks";
import { RELEVANCE_LABEL } from "@/lib/engine/home-copy";
import { impactFor, quoteFor, trustSummary, type PageSentence } from "@/lib/engine/measure-page";
import { answerFact, canAskInCard, clearFact, declineFact, skipFact, type Profile } from "@/lib/engine/profile";
import type { Card, DocumentData, Measure } from "@/lib/engine/types";
import { FACT_DEFS, SENSITIVE_FACTS, TOPIC_DEFS, type FactId } from "@/lib/vocab";
import { Spark } from "./BriefCard";
import { ChainSheet, CitedLine, TrustLine, type CiteSource } from "./Citation";
import { FactQuestion } from "./MeasureCard";
import { PartLabel, personalHeading } from "./MeasureParts";
import { areaOf, type SheetView } from "./ProfileSheet";
import { FOCUS } from "./ui";

const GROUP = "mt-5 border-t border-border pt-4";
const GROUP_H = "text-body font-bold";
const GROUP_NOTE = "mt-0.5 text-small text-muted-foreground";

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
  reason,
  town,
  profile,
  update,
  onOpenProfile,
}: {
  card: Card;
  doc: DocumentData;
  /** Why this question is on For you; the page opens with the same words. */
  reason: BallotReason;
  town?: string;
  profile: Profile;
  update: (p: Profile) => void;
  onOpenProfile: (v: SheetView) => void;
}) {
  const m = card.measure;
  const [editing, setEditing] = useState<FactId | null>(null);
  const [chain, setChain] = useState<PageSentence | null>(null);
  const askable = card.pendingQuestions.filter((f) => canAskInCard(profile, f));
  const source = { kind: "card", documentId: doc.id, measureId: m.id } as const;
  const touches = card.relevance === "touches";
  const impact = impactFor(card, town);
  const shown = [...impact.direct, ...(impact.takesEffect ? [impact.takesEffect.why] : []), ...impact.indirect, ...impact.uncertain];
  const trust = trustSummary(m, doc, shown);
  const src = ballotCiteSource(m, doc);
  const line = (s: PageSentence) => <CitedLine key={s.text} s={s} src={src} onChain={setChain} />;
  const strong = reason.kind === "direct";
  // The words For you used: "Why this matters to you: You rent."
  const label = reason.kind === "direct" ? RELEVANCE_LABEL.direct : reason.label;
  const said = reason.text.replace(/^Because you/, "You");

  return (
    <section className={`mt-6 rounded-lg p-5 sm:p-6 ${touches ? "bg-accent-soft" : "bg-surface shadow-card"}`} aria-labelledby="foryou-h">
      <PartLabel n={1} id="foryou-h">
        How could this affect you?
      </PartLabel>

      {/* The recommendation, carried over from For you. "Applies to every voter" and no
          match are said once, under Direct impact. */}
      {reason.kind !== "everyone" && reason.kind !== "none" && (
        <p className="mt-3 text-small">
          <span className={`inline-flex items-center gap-1.5 font-semibold ${strong ? "text-accent" : "text-foreground"}`}>
            {strong && <Spark />}
            {label}:
          </span>{" "}
          <span className="text-muted-foreground">{said}</span>
        </p>
      )}

      <div className="mt-4">
        <h3 className={GROUP_H}>Direct impact</h3>
        {touches ? (
          <>
            <p className={GROUP_NOTE}>{personalHeading(card)}, this is what could change.</p>
            {impact.direct.map(line)}
          </>
        ) : (
          <p className="mt-1 text-body">
            {card.relevance === "probably_not"
              ? "Nothing in your answers points to a direct change for you."
              : "It applies to everyone in Massachusetts. Nothing in your answers points to a specific change for you."}
          </p>
        )}

        {askable[0] && (
          <div className="mt-4 rounded-md bg-surface p-4 shadow-hairline">
            <p className="text-small font-semibold">{touches ? "One more answer could change what applies to you" : "One answer decides whether this reaches you directly"}</p>
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

        {impact.takesEffect && (
          <div className="mt-4">
            <p className="text-small font-semibold text-muted-foreground">When it would reach you</p>
            <span className="mt-2 inline-block rounded-sm border border-border px-2.5 py-1 text-small font-semibold">{impact.takesEffect.label}</span>
            {line(impact.takesEffect.why)}
          </div>
        )}
      </div>

      {impact.indirect.length > 0 && (
        <div className={GROUP}>
          <h3 className={GROUP_H}>Possible indirect impact</h3>
          <p className={GROUP_NOTE}>Broader changes that could reach you through your city or town, or the state budget.</p>
          {impact.indirect.map(line)}
        </div>
      )}

      {impact.uncertain.length > 0 && (
        <div className={GROUP}>
          <h3 className={GROUP_H}>What&rsquo;s uncertain</h3>
          <p className={GROUP_NOTE}>What the official material says is not known.</p>
          {impact.uncertain.map(line)}
        </div>
      )}

      {card.because.length > 0 && (
        <div className={GROUP}>
          <p className="text-small font-semibold text-muted-foreground">Based on what you told Legible</p>
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
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-left text-small font-semibold hover:bg-surface-muted ${FOCUS}`}
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
              ? "Your answers decide “Direct impact.” Subjects you follow only add “On your list.” "
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

      {trust.lines > 0 && (
        <TrustLine lines={trust.lines} quotes={trust.quotes} provenance={trust.aiDraft ? "ai_draft" : trust.allReviewed ? "reviewed" : "verified"} against="the official text" />
      )}

      {chain && <ChainSheet s={chain} src={src} onClose={() => setChain(null)} />}
    </section>
  );
}
