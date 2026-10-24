"use client";

// One measure as a page to read, like an article: kicker, title, meta, cover,
// the For you card (what changes for this person, cited line by line), then the
// official text verbatim in a reading face.
import { useState } from "react";
import { flushSync } from "react-dom";
import { shortDate } from "@/lib/engine/decide-by";
import type { FeedItem } from "@/lib/engine/feed";
import { localReach, nextSteps } from "@/lib/engine/next-steps";
import type { Profile } from "@/lib/engine/profile";
import type { Card, Quote } from "@/lib/engine/types";
import type { CivicCard } from "@/lib/engine/civic";
import { CivicRow } from "./CivicRow";
import { Cover, DocTile } from "./covers";
import { AskButton } from "./HighlightMenu";
import { ForYou } from "./ForYou";
import { Cost, Outcomes, WhatItDoes } from "./MeasureParts";
import { FullText } from "./FullText";
import { Glyph } from "./icons";
import { Draft, Sentences } from "./MeasureCard";
import type { SheetView } from "./ProfileSheet";
import { Reveal } from "./Reveal";
import { Button, FOCUS } from "./ui";


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
  profile,
  setProfile,
  town,
  backLabel,
  onBack,
  onOpenProfile,
  related,
  onOpenItem,
}: {
  /** Optional: deadlines, meetings, and bills related to this measure. */
  related?: CivicCard[];
  onOpenItem?: (id: string) => void;
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
  const [shared, setShared] = useState(false);
  const update = (p: Profile) => withTransition(() => setProfile(p));
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
    <article data-ask-measure={m.id} data-ask-title={`Question ${m.number}: ${m.title}`} data-ask-url={m.sourceUrl} className="mx-auto w-full max-w-2xl px-4 pb-20 sm:px-6" aria-labelledby="measure-title">
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

      <Cover measure={m} label={`${isBallot ? "Q" : "#"}${m.number}`} size={48} className="mt-5 aspect-[16/5] rounded-lg" />

      {/* The same four parts as the ballot card, in the same order, each in full. */}
      <section aria-label="What it does, what YES and NO do, and the cost" className="mt-5 rounded-lg bg-surface p-5 pt-1 shadow-card">
        <WhatItDoes card={card} detailed />
        <Outcomes card={card} detailed />
        <Cost measure={m} detailed />
      </section>

      <ForYou card={card} doc={doc} profile={profile} update={update} onOpenProfile={onOpenProfile} />

      <div className="mt-3">
        <AskButton source={{ kind: "ballot", id: m.id, title: `Question ${m.number}: ${m.title}`, url: m.sourceUrl }} variant="pill" />
      </div>

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

      {local && (
        <section className="mt-8" aria-labelledby="local-h">
          <h2 id="local-h" className="text-small font-semibold uppercase tracking-wider text-muted-foreground">
            In {town ?? "your city or town"}
          </h2>
          <Sentences sentences={[local]} measure={m} />
        </section>
      )}

      <FullText measure={m} source={doc.source} />

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

      <p className="mt-10 text-small text-muted-foreground">Source: {doc.source.name}</p>
    </article>
  );
}
