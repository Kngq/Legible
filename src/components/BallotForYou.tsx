"use client";

// For you's main section: the nine questions on the ballot. Questions an answer
// touches come first, then ones on the person's list (ballotPicks), the first
// as the featured decision and the rest as rows, each saying why it is here.
// Every other question follows as a compact row in ballot order, with what would
// put it closer, so all nine are always one tap away. With no profile nothing
// is put forward and all nine show in ballot order. Runs in the browser.
import { ballotPicks, type BallotPick } from "@/lib/engine/ballot-picks";
import { shortDate } from "@/lib/engine/decide-by";
import type { FeedItem } from "@/lib/engine/feed";
import type { Profile } from "@/lib/engine/profile";
import { ballotDecision, DecisionRow, FeaturedDecision } from "./BriefCard";
import { Glyph } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { FOCUS } from "./ui";

const LINK = `font-semibold text-accent underline decoration-accent/30 underline-offset-4 interactive hover:decoration-accent ${FOCUS}`;

/** One question as a compact row: number, title, and where it stands for this person. */
function QuestionRow({ pick, onOpen }: { pick: BallotPick; onOpen: () => void }) {
  const m = pick.card.measure;
  const r = pick.reason;
  return (
    <li>
      <button type="button" onClick={onOpen} className={`group -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-3.5 rounded-md px-3 py-3 text-left interactive hover:bg-surface ${FOCUS}`}>
        <span aria-hidden="true" className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md bg-surface leading-none shadow-hairline">
          <span className="text-[0.625rem] font-bold uppercase text-muted-foreground">Q</span>
          <span className="text-body font-bold">{m.number}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold leading-snug">
            <span className="sr-only">Question {m.number}: </span>
            {m.title}
          </span>
          <span className="mt-0.5 block text-small text-muted-foreground">{r.kind === "open" ? `${r.label} · ${r.text}` : r.label}</span>
        </span>
        <span aria-hidden="true" className="-rotate-90 text-muted-foreground group-hover:text-foreground">
          <span className="nudge block">
            <Glyph name="chevron" size={14} />
          </span>
        </span>
      </button>
    </li>
  );
}

export function BallotForYou({
  ballot,
  profile,
  onOpenMeasure,
  onOpenDoc,
  onOpenProfile,
}: {
  ballot: FeedItem;
  profile: Profile;
  onOpenMeasure: (docId: string, measureId: string) => void;
  onOpenDoc: (id: string) => void;
  onOpenProfile: (v: SheetView) => void;
}) {
  const { recommended, others } = ballotPicks(ballot, profile);
  const [featured, ...rest] = recommended.map((p) => ballotDecision(p, ballot, onOpenMeasure));
  const d = ballot.doc.decideBy;
  const total = ballot.cards.length;
  const open = (p: BallotPick) => onOpenMeasure(ballot.doc.id, p.card.measure.id);

  return (
    <section id="ballot" aria-labelledby="h-ballot" className="mt-section scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="h-ballot" className="font-display text-title font-normal">
          Your ballot
        </h2>
        <p className="text-small text-muted-foreground">
          {total} questions{d ? ` · Voters decide ${shortDate(d.date)}` : ""}
        </p>
      </div>
      <p className="mt-1 text-small text-muted-foreground">
        {recommended.length > 0 ? (
          <>
            {recommended.length} of {total} {recommended.length === 1 ? "connects" : "connect"} to your Civic Profile, closest to your life first.{" "}
            <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={LINK}>
              Edit profile
            </button>
          </>
        ) : (
          <>
            Nothing in your Civic Profile points to a question yet, so here are all {total} in ballot order.{" "}
            <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={LINK}>
              Add a few details
            </button>{" "}
            and the ones closest to your life come first.
          </>
        )}
      </p>

      {featured && (
        <div className="mt-4">
          <FeaturedDecision d={featured} onOpenProfile={onOpenProfile} />
        </div>
      )}
      {rest.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {rest.map((x) => (
            <DecisionRow key={x.key} d={x} onOpenProfile={onOpenProfile} />
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <div className={recommended.length ? "mt-8" : "mt-4"}>
          {recommended.length > 0 && <h3 className="text-small font-bold uppercase tracking-wider text-muted-foreground">The other {others.length} questions</h3>}
          <ul className="mt-1 divide-y divide-border">
            {others.map((p) => (
              <QuestionRow key={p.card.measure.id} pick={p} onOpen={() => open(p)} />
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpenDoc(ballot.doc.id)}
        className={`group mt-4 inline-flex min-h-11 items-center gap-2 text-small font-semibold underline decoration-border underline-offset-4 interactive hover:decoration-foreground ${FOCUS}`}
      >
        Compare all {total} side by side in the ballot guide
        <span aria-hidden="true" className="-rotate-90">
          <span className="nudge block">
            <Glyph name="chevron" size={13} />
          </span>
        </span>
      </button>
    </section>
  );
}
