"use client";

// One measure as a page to read, like an article: kicker, title, meta, cover,
// why it reaches you, then the official text verbatim in a reading face.
import { useState } from "react";
import { flushSync } from "react-dom";
import { shortDate } from "@/lib/engine/decide-by";
import type { FeedItem } from "@/lib/engine/feed";
import { localReach, nextSteps } from "@/lib/engine/next-steps";
import { answerFact, canAskInCard, clearFact, declineFact, skipFact, type Profile } from "@/lib/engine/profile";
import type { Card, Quote } from "@/lib/engine/types";
import { DIRECTION_DEFS, FACT_DEFS, SENSITIVE_FACTS, TOPIC_DEFS, type FactId } from "@/lib/vocab";
import { Cover, DocTile } from "./covers";
import { DirectionMark, Glyph } from "./icons";
import { Draft, FactQuestion, OfficialText, Sentences } from "./MeasureCard";
import { areaOf, type SheetView } from "./ProfileSheet";
import { Button, FOCUS, Tag } from "./ui";

const SERIF = "font-[family-name:var(--font-serif)]";

function withTransition(fn: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(fn));
  else fn();
}

function readingMinutes(quotes: (Quote | undefined)[]): number {
  const words = quotes.reduce((n, q) => n + (q ? q.text.split(/\s+/).length : 0), 0);
  return Math.max(1, Math.round(words / 220));
}

export function MeasureView({
  item,
  card,
  profile,
  setProfile,
  town,
  backLabel,
  onBack,
  onOpenProfile,
}: {
  item: FeedItem;
  card: Card;
  profile: Profile;
  setProfile: (p: Profile) => void;
  town?: string;
  backLabel: string;
  onBack: () => void;
  onOpenProfile: (v: SheetView) => void;
}) {
  const m = card.measure;
  const { doc } = item;
  const [drafting, setDrafting] = useState(false);
  const [editing, setEditing] = useState<FactId | null>(null);
  const [shared, setShared] = useState(false);
  const update = (p: Profile) => withTransition(() => setProfile(p));
  const source = { kind: "card", documentId: doc.id, measureId: m.id } as const;
  const askable = card.pendingQuestions.filter((f) => canAskInCard(profile, f));
  const registration = nextSteps(card, profile).find((s) => s.kind === "registration");
  const local = localReach(m.id, town);
  const isBallot = doc.docType === "ballot";
  const kicker = `${doc.place.kind === "state" ? "Massachusetts" : doc.place.name} ${isBallot ? "ballot" : doc.docType} · ${isBallot ? "Question" : "Article"} ${m.number}`;
  const minutes = readingMinutes([m.summary, m.outcomes.yes, m.outcomes.no, m.fiscal]);

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
    <article className="mx-auto w-full max-w-2xl px-4 pb-20 sm:px-6" aria-labelledby="measure-title">
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
          {m.sourceUrl && (
            <a href={m.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open the official page" className={`flex size-12 items-center justify-center rounded-full hover:bg-surface-muted ${FOCUS}`}>
              <Glyph name="external" />
            </a>
          )}
        </div>
      </nav>

      <header className="mt-4">
        <p className="text-small font-semibold uppercase tracking-wider text-muted-foreground">{kicker}</p>
        <h1 id="measure-title" className="mt-2 text-title">
          {m.title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-small text-muted-foreground">
          <DocTile docType={doc.docType} size={28} />
          <span>
            {m.summary.locator}
            {doc.decideBy ? ` · ${shortDate(doc.decideBy.date)}` : ""} · {minutes} min read
          </span>
        </div>
        <hr className="mt-4 border-border" />
      </header>

      <Cover measure={m} label={`${isBallot ? "Q" : "#"}${m.number}`} size={72} className="mt-5 aspect-[16/9] rounded-lg" />

      {/* Why it reaches you */}
      <section className="mt-6" aria-labelledby="why-h">
        <div className="flex flex-wrap items-center gap-2">
          {card.relevance === "touches" && <Tag pop="accent">Touches you</Tag>}
          {card.onYourList && <Tag>On your list</Tag>}
          {card.relevance === "everyone" && <Tag>Applies to everyone</Tag>}
          {m.kind === "referendum" && <Tag>Referendum</Tag>}
        </div>
        <h2 id="why-h" className="mt-3 flex items-center gap-2 text-body font-semibold">
          <DirectionMark direction={card.direction} size={26} />
          {DIRECTION_DEFS[card.direction].label}
        </h2>
        <Sentences sentences={card.why} measure={m} />

        {card.because.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
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
                  className={`min-h-9 rounded-md border border-border px-3 py-1.5 text-left text-small font-semibold hover:bg-surface-muted ${FOCUS}`}
                >
                  Because {b.value ? FACT_DEFS[b.id].because.yes : FACT_DEFS[b.id].because.no}
                </button>
              ) : (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onOpenProfile({ kind: "topics" })}
                  className={`min-h-9 rounded-md bg-surface-muted px-3 py-1.5 text-left text-small font-semibold hover:bg-border ${FOCUS}`}
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

        {askable[0] && (
          <div className="mt-5 rounded-lg bg-surface p-4 shadow-card">
            <FactQuestion
              fact={askable[0]}
              intro={
                SENSITIVE_FACTS.includes(askable[0])
                  ? "Asked only here, because this decision depends on it. Your answer stays in this browser."
                  : "One answer sorts this. It stays in this browser."
              }
              onAnswer={(v) => update(answerFact(profile, askable[0], v, source))}
              onSkip={() => update(skipFact(profile, askable[0], source))}
              onDecline={() => update(declineFact(profile, askable[0], source))}
            />
          </div>
        )}

        {registration?.kind === "registration" && (
          <div className="mt-5 rounded-lg bg-surface p-4 shadow-card">
            <p className="text-body font-semibold">{registration.label}</p>
            <p className="text-small text-muted-foreground">{registration.detail}</p>
            <a
              href={registration.href}
              target="_blank"
              rel="noreferrer"
              className={`mt-3 inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground ${FOCUS}`}
            >
              Open the state lookup <Glyph name="external" size={18} />
            </a>
          </div>
        )}
      </section>

      {local && (
        <section className="mt-8" aria-labelledby="local-h">
          <h2 id="local-h" className="text-small font-semibold uppercase tracking-wider text-muted-foreground">
            In {town ?? "your city or town"}
          </h2>
          <Sentences sentences={[local]} measure={m} />
        </section>
      )}

      {/* The official text, verbatim */}
      <section className="mt-10" aria-labelledby="official-h">
        <h2 id="official-h" className="text-small font-semibold uppercase tracking-wider text-muted-foreground">
          The official summary, word for word
        </h2>
        <p className={`mt-3 text-body leading-relaxed ${SERIF}`}>{m.summary.text}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-small text-muted-foreground">
          {m.summary.locator}
          {m.summary.page ? `, page ${m.summary.page}` : ""}
          {m.summary.status !== "failed" && <Tag pop="positive">{m.summary.status === "reviewed" ? "Reviewed" : "Found word for word"}</Tag>}
        </p>
      </section>

      <OfficialText measure={m} />

      {m.fiscal && (
        <section className="mt-8" aria-labelledby="fiscal-h">
          <h2 id="fiscal-h" className="text-small font-semibold uppercase tracking-wider text-muted-foreground">
            Fiscal effect, word for word
          </h2>
          <p className={`mt-3 text-body leading-relaxed ${SERIF}`}>{m.fiscal.text}</p>
          <p className="mt-2 text-small text-muted-foreground">
            {m.fiscal.locator}
            {m.fiscal.page ? `, page ${m.fiscal.page}` : ""}
          </p>
        </section>
      )}

      <section id="draft" className="mt-10 scroll-mt-20">
        {drafting ? (
          <Draft measure={m} />
        ) : (
          <Button variant="secondary" onClick={() => setDrafting(true)}>
            Ask your legislator a factual question
          </Button>
        )}
      </section>

      <p className="mt-10 text-small text-muted-foreground">Source: {doc.source.name}</p>
    </article>
  );
}
