"use client";

// One ballot question as a page, in the order a person needs it: the title and a
// short summary, then 1. How could this affect you? (opening with the same reason
// For you gave, so the page continues the recommendation), 2. What would change?,
// 3. What happens if YES or NO wins?, 4. How do we know? (official words and the
// checks behind them, on demand), and 5. Ask Kiro. Official text stays verbatim
// and apart from Legible's own lines; nothing here suggests a vote.
import { useState } from "react";
import { flushSync } from "react-dom";
import { askKiro } from "@/lib/ask/context";
import { ASK_SUGGESTIONS } from "@/lib/engine/ask-suggestions";
import { firstSentence } from "@/lib/engine/ballot-guide";
import type { BallotPick, BallotReason } from "@/lib/engine/ballot-picks";
import { shortDate } from "@/lib/engine/decide-by";
import type { FeedItem } from "@/lib/engine/feed";
import type { PageSentence } from "@/lib/engine/measure-page";
import { nextSteps } from "@/lib/engine/next-steps";
import type { Profile } from "@/lib/engine/profile";
import type { Card, Quote } from "@/lib/engine/types";
import type { CivicCard } from "@/lib/engine/civic";
import { ChainSheet, CitedLine } from "./Citation";
import { CivicRow } from "./CivicRow";
import { DocTile } from "./covers";
import { AskButton } from "./HighlightMenu";
import { ballotCiteSource, ForYou } from "./ForYou";
import { Outcomes, PartLabel, WhatItDoes } from "./MeasureParts";
import { FullText } from "./FullText";
import { Glyph } from "./icons";
import { Draft } from "./MeasureCard";
import type { SheetView } from "./ProfileSheet";
import { Reveal } from "./Reveal";
import { Button, FOCUS } from "./ui";

const SERIF = "font-[family-name:var(--font-serif)]";
const PART = "mt-10 border-t border-border pt-5";
const TOGGLE = `inline-flex min-h-11 items-center gap-1.5 text-small font-semibold underline underline-offset-4 ${FOCUS}`;

function withTransition(fn: () => void) {
  type Transition = { ready: Promise<void>; finished: Promise<void> };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => Transition };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (doc.startViewTransition && !reduce) {
    const t = doc.startViewTransition(() => flushSync(fn));
    // A transition aborted by a hidden tab or a resize still applies the update; ignore it.
    t.ready.catch(() => {});
    t.finished.catch(() => {});
  } else fn();
}

function readingMinutes(quotes: (Quote | undefined)[]): number {
  const words = quotes.reduce((n, q) => n + (q ? q.text.split(/\s+/).length : 0), 0);
  return Math.max(1, Math.round(words / 220));
}

export function MeasureView({
  item,
  card,
  reason,
  next,
  profile,
  setProfile,
  town,
  backLabel,
  onBack,
  onAllQuestions,
  onOpenMeasure,
  onOpenProfile,
  related,
  onOpenItem,
}: {
  /** Optional: deadlines, meetings, and bills related to this measure. */
  related?: CivicCard[];
  onOpenItem?: (id: string) => void;
  item: FeedItem;
  card: Card;
  /** Why For you lists this question; the page opens with the same words. */
  reason: BallotReason;
  /** The question after this one on For you, if any. */
  next?: BallotPick;
  profile: Profile;
  setProfile: (p: Profile) => void;
  town?: string;
  backLabel: string;
  onBack: () => void;
  /** Back to the ballot questions on For you. */
  onAllQuestions: () => void;
  onOpenMeasure: (measureId: string) => void;
  onOpenProfile: (v: SheetView) => void;
}) {
  const m = card.measure;
  const { doc } = item;
  const [drafting, setDrafting] = useState(false);
  const [shared, setShared] = useState(false);
  const [proof, setProof] = useState(false);
  const [fullCost, setFullCost] = useState(false);
  const [chain, setChain] = useState<PageSentence | null>(null);
  const update = (p: Profile) => withTransition(() => setProfile(p));
  const registration = nextSteps(card, profile).find((s) => s.kind === "registration");
  const isBallot = doc.docType === "ballot";
  const kicker = `${doc.place.kind === "state" ? "Massachusetts" : doc.place.name} ${isBallot ? "ballot" : doc.docType} · ${isBallot ? "Question" : "Article"} ${m.number}`;
  const minutes = readingMinutes([m.summary, m.outcomes.yes, m.outcomes.no, m.fiscal]);
  const src = ballotCiteSource(m, doc);
  const askSource = { kind: "ballot", id: m.id, title: `Question ${m.number}: ${m.title}`, url: m.sourceUrl } as const;
  const [lead, ...more] = m.overview;
  const reviewed = [m.summary, m.outcomes.yes, m.outcomes.no, m.fiscal, ...m.quotes].every((q) => !q || q.status === "reviewed");

  const share = async () => {
    const url = m.sourceUrl ?? doc.source.url;
    try {
      if (navigator.share) await navigator.share({ title: m.title, url });
      else if (url) {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  return (
    <article data-ask-measure={m.id} data-ask-title={askSource.title} data-ask-url={m.sourceUrl} className="mx-auto w-full max-w-2xl px-4 pb-20 sm:px-6" aria-labelledby="measure-title">
      <nav className="sticky top-16 z-20 -mx-4 flex h-16 items-center justify-between bg-background/95 px-3 backdrop-blur sm:-mx-6 sm:px-5">
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
          {m.sourceUrl && (
            <a href={m.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open the official page" className={`flex size-12 items-center justify-center rounded-full hover:bg-surface-muted ${FOCUS}`}>
              <Glyph name="external" />
            </a>
          )}
        </div>
      </nav>

      <header className="mt-4">
        <p className="text-small font-semibold uppercase tracking-wider text-muted-foreground">{kicker}</p>
        <h1 id="measure-title" className="mt-2 font-display text-[2rem] leading-[1.1] tracking-[-0.02em] text-balance">
          {m.title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-small text-muted-foreground">
          <DocTile docType={doc.docType} size={28} />
          <span>
            {m.summary.locator}
            {doc.decideBy ? ` · Voters decide ${shortDate(doc.decideBy.date)}` : ""} · {minutes} min read
          </span>
        </div>
        {/* The short summary: Legible's first plain line, with its official words one tap away. */}
        {lead && (
          <div className="mt-3 [&>p:first-child]:text-lg [&>p:first-child]:leading-relaxed">
            <CitedLine s={lead} src={src} onChain={setChain} />
          </div>
        )}
      </header>

      <ForYou card={card} doc={doc} reason={reason} town={town} profile={profile} update={update} onOpenProfile={onOpenProfile} />

      {registration?.kind === "registration" && (
        <section className="mt-4 rounded-lg bg-surface p-5 shadow-card" aria-labelledby="next-h">
          <h2 id="next-h" className="text-body font-semibold">
            {registration.label}
          </h2>
          <p className="text-small text-muted-foreground">{registration.detail}</p>
          <a
            href={registration.href}
            target="_blank"
            rel="noreferrer"
            className={`mt-3 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground ${FOCUS}`}
          >
            Open the state lookup <Glyph name="external" size={18} />
          </a>
        </section>
      )}

      {/* 2. What would change: plain lines first, the official summary and cost on demand. */}
      <div className={PART}>
        <WhatItDoes
          card={card}
          detailed
          n={2}
          title="What would change?"
          // The first plain line is the summary under the title; this part adds the rest.
          plain={<>{more.map((s) => <CitedLine key={s.text} s={s} src={src} onChain={setChain} />)}</>}
        />
        {m.fiscal && (
          <div className="mt-3 rounded-md bg-surface-muted p-4">
            <p className="text-small font-semibold">Cost, from the official fiscal statement</p>
            <p data-ask-official data-ask-locator={m.fiscal.locator} data-ask-page={m.fiscal.page} className={`mt-1 text-body leading-relaxed ${SERIF}`}>
              {fullCost ? m.fiscal.text : firstSentence(m.fiscal.text)}
            </p>
            {firstSentence(m.fiscal.text) !== m.fiscal.text.trim() && (
              <button type="button" onClick={() => setFullCost(!fullCost)} aria-expanded={fullCost} className={TOGGLE}>
                {fullCost ? "Show less" : "Read the full fiscal statement"}
              </button>
            )}
            <p className="mt-1 text-small text-muted-foreground">
              {m.fiscal.locator}
              {m.fiscal.page ? `, page ${m.fiscal.page}` : ""}, word for word
            </p>
          </div>
        )}
      </div>

      {/* 3. Both outcomes, side by side, with equal weight. */}
      <div className={PART}>
        <Outcomes card={card} detailed n={3} title="What happens if YES or NO wins?" note="The official statements, word for word, with a plain line under each. Legible explains both and never suggests a vote." />
      </div>

      {/* 4. Evidence on demand: what was checked, against which file, and the full law. */}
      <section className={PART} aria-labelledby="proof-h">
        <PartLabel n={4} id="proof-h">
          How do we know?
        </PartLabel>
        <p className="mt-2 text-body">
          Every line Legible writes here cites a quote from the official voter guide, and every quote was found word for word in it.{" "}
          {reviewed ? "A person reviewed each one." : "Human review is pending."} Tap &ldquo;Show the words&rdquo; under any line to see its quote.
        </p>
        <button type="button" onClick={() => setProof(!proof)} aria-expanded={proof} className={TOGGLE}>
          {proof ? "Hide sources and checks" : "Show sources and checks"}
          <span aria-hidden="true" className={`transition-transform duration-(--dur-base) ease-legible ${proof ? "rotate-180" : ""}`}>
            <Glyph name="chevron" size={13} />
          </span>
        </button>
        <Reveal open={proof}>
          <div className="space-y-3 pt-2 text-small text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Source:</span> {doc.source.name.replace(/\.$/, "")}
              {m.summary.page ? `. This question starts on page ${m.summary.page}` : ""}.{" "}
              {m.sourceUrl && (
                <a href={m.sourceUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-4 ${FOCUS}`}>
                  Official page <Glyph name="external" size={12} />
                  <span className="sr-only">(opens the official site)</span>
                </a>
              )}
            </p>
            <p>{src.onFail}</p>
          </div>
          <FullText measure={m} source={doc.source} className="mt-4" />
        </Reveal>
      </section>

      {/* 5. Ask Kiro: neutral starters; the person's answers go only if they switch sharing on. */}
      <section className={PART} aria-labelledby="ask-h">
        <PartLabel n={5} id="ask-h">
          Ask Kiro
        </PartLabel>
        <p className="mt-2 text-body">Questions about this one? Kiro answers from the official text and cites it.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(ASK_SUGGESTIONS[m.id] ?? []).map((s) => (
            <button
              key={s.q}
              type="button"
              onClick={() => askKiro({ source: askSource, mode: "ask", question: s.q })}
              className={`min-h-11 rounded-full bg-surface px-4 py-2 text-left text-small font-semibold shadow-card hover:bg-surface-muted ${FOCUS}`}
            >
              {s.q}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <AskButton source={askSource} variant="pill" label="Ask about your situation" />
        </div>
        <p className="mt-2 text-small text-muted-foreground">Your answers stay in this browser. Kiro sees them only if you switch on &ldquo;Use what I told Legible&rdquo; in the chat.</p>
      </section>

      <section id="draft" className="mt-10 scroll-mt-20">
        {!drafting && (
          <Button variant="secondary" onClick={() => setDrafting(true)}>
            Ask your legislator a factual question
          </Button>
        )}
        <Reveal open={drafting}>
          <Draft measure={m} />
        </Reveal>
      </section>

      {related && related.length > 0 && onOpenItem && (
        <section className="mt-10" aria-labelledby="related-h">
          <h2 id="related-h" className="text-small font-semibold uppercase tracking-wider text-muted-foreground">
            Related near you
          </h2>
          <ul className="mt-1 divide-y divide-border">
            {related.map((c) => (
              <li key={c.item.id}>
                <CivicRow card={c} onOpen={() => onOpenItem(c.item.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The way on: the next question for this person, or back to all of them. */}
      <nav aria-label="More ballot questions" className="mt-12 border-t border-border pt-5">
        {next && (
          <button
            type="button"
            onClick={() => onOpenMeasure(next.card.measure.id)}
            className={`group block w-full rounded-lg bg-surface p-5 text-left shadow-card interactive hover:bg-surface-muted ${FOCUS}`}
          >
            <span className="text-small font-semibold text-muted-foreground">
              Next · Question {next.card.measure.number} · {next.reason.label}
            </span>
            <span className="mt-1 flex items-center justify-between gap-3 text-[1.0625rem] font-semibold leading-snug">
              {next.card.measure.title}
              <span aria-hidden="true" className="-rotate-90">
                <span className="nudge block">
                  <Glyph name="chevron" size={16} />
                </span>
              </span>
            </span>
          </button>
        )}
        <button type="button" onClick={onAllQuestions} className={`mt-3 ${TOGGLE}`}>
          <Glyph name="back" size={16} /> All your ballot questions
        </button>
      </nav>

      {chain && <ChainSheet s={chain} src={src} onClose={() => setChain(null)} />}
    </article>
  );
}
