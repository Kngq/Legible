"use client";

// Home's decisions, in the Notebook direction. Two shapes from one view model:
// - FeaturedDecision: the first decision, on the page's one raised surface, with
//   an editorial headline. Its relevance note is emphasised (plum) only when the
//   matching data supports it (a direct or potential match); a followed subject
//   gets a quieter lilac note; an open question or no match stays plain text.
// - DecisionRow: every other decision as a compact row in a hairline list. The
//   whole row opens the detail page; "Add details", "Why", and the official
//   source keep their own clicks.
// Every word of relevance comes from relevanceOf (or the ballot card's own
// match); nothing here adds a fact. On a mouse, the cursor "Read more" pill
// opens the featured decision from empty space.
import { useState, type ReactNode } from "react";
import { docWhat, type TimelineEntry } from "@/lib/engine/timeline";
import { actionsFor, cardHeader, explanation, headline, relevanceOf, dateLine, type Action, type Relevance, type RelevanceKind } from "@/lib/engine/home-copy";
import { DOC_TYPE_LABEL, shortDate } from "@/lib/engine/decide-by";
import type { FeedItem } from "@/lib/engine/feed";
import type { Card } from "@/lib/engine/types";
import { questionBecause } from "@/lib/engine/update-copy";
import type { CivicCard } from "@/lib/engine/civic";
import { LIFE_AREAS, type LifeAreaId, type TopicId } from "@/lib/vocab";
import { useCursorCta } from "./CursorCta";
import { Glyph, Part } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { Reveal } from "./Reveal";
import { FOCUS } from "./ui";
import type { CardProps } from "./updates";

const KIND_EXPLAINED: Record<RelevanceKind, string> = {
  direct: "Directly related to your situation.",
  potential: "A possible connection, not a certain effect.",
  interest: "Matches a subject you follow; nothing says it changes your situation.",
  open: "Depends on something you haven't told Legible yet.",
};

/** The relevance label, by how the item connects to the person. */
const KIND_LABEL: Record<RelevanceKind, string> = {
  direct: "Relevant to you",
  potential: "Relevant to you",
  interest: "On your list",
  open: "Might apply",
};

/** Supported by the matching data: the only relevance that gets the plum accent. */
const supported = (r: Relevance | null): r is Relevance => r?.kind === "direct" || r?.kind === "potential";

const LINK = `group inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-muted-foreground underline decoration-border underline-offset-4 interactive hover:text-foreground hover:decoration-foreground ${FOCUS}`;
const BUTTON = `group inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4.5 text-body font-semibold text-primary-foreground interactive press hover:bg-primary-hover ${FOCUS}`;
const ADD = `relative z-10 font-semibold text-accent underline decoration-accent/30 underline-offset-4 interactive hover:decoration-accent ${FOCUS}`;

/** Subject pictograms: shape, not colour, tells decision types apart. */
const TOPIC_PART: Partial<Record<TopicId, string>> = {
  housing_costs: "house",
  schools: "backpack",
  local_control: "town_hall",
  public_safety: "shield",
  voting_access: "ballot",
  elections: "ballot_box",
  taxes: "coin",
  open_space: "tree",
};
const KIND_PART: Record<CivicCard["item"]["kind"], string> = { deadline: "ballot", window: "ballot_box", election: "ballot_box", meeting: "town_hall", bill: "book" };

export function Spark({ className = "text-accent" }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`}>
      <path d="M12 2.5l1.9 6.1 6.1 1.9-6.1 1.9-1.9 6.1-1.9-6.1-6.1-1.9 6.1-1.9z" />
    </svg>
  );
}

/** A small clock for dated items, a half-filled circle for proposals still under review. */
function StatusMark({ dated }: { dated: boolean }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      {dated ? <path d="M12 7v5l3 2" /> : <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />}
    </svg>
  );
}

const arrow = (
  <span aria-hidden="true" className="-rotate-90">
    <span className="nudge block">
      <Glyph name="chevron" size={14} />
    </span>
  </span>
);

/* ------------------------------------------------------------- view model */

/** One decision, whatever it came from: a civic item, a document, or a ballot question. */
type Decision = {
  key: string;
  part: string;
  meta: string;
  status?: string;
  dated: boolean;
  title: string;
  what: string;
  relevance: Relevance | null;
  /** Where the item happens, for the "not based on your answers" line. */
  place?: string;
  openArea?: LifeAreaId;
  open: () => void;
  primary: Action;
  secondary?: Action;
  go: (a: Action) => void;
  /** Both actions leave the app, so the detail page needs its own way in. */
  noDetail: boolean;
};

function fromEntry(e: TimelineEntry, today: string, onOpenItem: (id: string) => void, onOpenDoc: (id: string) => void): Decision {
  const civic = e.kind === "civic" ? e.card : null;
  const docId = e.kind === "doc" ? e.item.doc.id : e.ballot?.doc.id;
  const open = () => (civic ? onOpenItem(civic.item.id) : docId && onOpenDoc(docId));
  const go = (a: Action) => {
    if ("href" in a.to) return;
    if (a.to.open === "doc" && docId) onOpenDoc(docId);
    else open();
  };
  const head = civic ? cardHeader(civic) : { meta: DOC_TYPE_LABEL[e.kind === "doc" ? e.item.doc.docType : "other"], status: dateLine(e, today) || undefined };
  const { primary, secondary } = actionsFor(e);
  return {
    key: e.key,
    part: civic ? (civic.item.topics.map((t) => TOPIC_PART[t]).find(Boolean) ?? KIND_PART[civic.item.kind]) : "ballot",
    meta: head.meta,
    status: head.status,
    dated: !civic || civic.item.kind !== "bill",
    title: civic ? headline(civic) : e.kind === "doc" ? e.item.doc.title : "",
    what: civic ? explanation(civic) : e.kind === "doc" ? docWhat(e.item) : "",
    relevance: relevanceOf(e),
    place: civic?.item.place.name,
    openArea: LIFE_AREAS.find((a) => civic?.open.some((o) => a.facts.includes(o.fact)))?.id,
    open,
    primary,
    secondary,
    go,
    noDetail: "href" in primary.to && (!secondary || "href" in secondary.to),
  };
}

/**
 * A ballot question that touches the person, or is on their list. Why it is here
 * comes from the card's own match (questionBecause) and its first verified "why"
 * sentence; it opens the question's existing page.
 */
function fromBallotCard(c: Card, ballot: FeedItem, onOpenMeasure: (docId: string, measureId: string) => void): Decision {
  const m = c.measure;
  const open = () => onOpenMeasure(ballot.doc.id, m.id);
  const touches = c.relevance === "touches";
  const because = questionBecause(c);
  const d = ballot.doc.decideBy;
  return {
    key: m.id,
    part: m.topics.map((t) => TOPIC_PART[t]).find(Boolean) ?? "ballot",
    meta: `Ballot question ${m.number}`,
    status: d ? `Voters decide ${shortDate(d.date)}` : undefined,
    dated: true,
    title: m.title,
    what: m.overview[0]?.text ?? "",
    relevance: because
      ? {
          kind: touches ? "direct" : "interest",
          text: [`${because}.`, touches ? c.why[0]?.text : null].filter(Boolean).join(" "),
          basis: [`${because}.`, "Your ballot page lists this question first."],
        }
      : null,
    open,
    primary: { label: "Understand this decision", to: { open: "item" } },
    secondary: m.sourceUrl ? { label: "Read official text", to: { href: m.sourceUrl } } : undefined,
    go: open,
    noDetail: false,
  };
}

/** Every decision for Home, in the order given: ballot questions that touch, then the ranked entries, then listed questions. */
export function decisionsFor({
  touching,
  affect,
  listed,
  ballot,
  today,
  onOpenItem,
  onOpenDoc,
  onOpenMeasure,
}: { touching: Card[]; affect: TimelineEntry[]; listed: Card[]; ballot?: FeedItem } & CardProps): Decision[] {
  return [
    ...(ballot ? touching.map((c) => fromBallotCard(c, ballot, onOpenMeasure)) : []),
    ...affect.map((e) => fromEntry(e, today, onOpenItem, onOpenDoc)),
    ...(ballot ? listed.map((c) => fromBallotCard(c, ballot, onOpenMeasure)) : []),
  ];
}

/* ---------------------------------------------------------------- pieces */

function ActionLink({ a, main, go }: { a: Action; main: boolean; go: (a: Action) => void }) {
  const cls = main ? BUTTON : LINK;
  if ("href" in a.to)
    return (
      <a href={a.to.href} target="_blank" rel="noreferrer" className={`relative z-10 ${cls}`}>
        {a.label}
        {main ? arrow : <Glyph name="external" size={13} />}
        <span className="sr-only">(opens the official site)</span>
      </a>
    );
  return (
    <button type="button" onClick={() => go(a)} className={`relative z-10 ${cls}`}>
      {a.label}
      {main && arrow}
    </button>
  );
}

function AddDetails({ area, onOpenProfile }: { area?: LifeAreaId; onOpenProfile: (v: SheetView) => void }) {
  return (
    <button type="button" onClick={() => onOpenProfile(area ? { kind: "area", id: area } : { kind: "list" })} className={ADD}>
      Add details
    </button>
  );
}

/** "Why you're seeing this": the basis lines, the kind of match, and a way to change it. */
function WhyToggle({ open, onToggle, compact = false }: { open: boolean; onToggle: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`relative z-10 inline-flex items-center gap-1 text-small font-semibold text-accent interactive hover:text-primary-hover ${compact ? "min-h-6 align-middle" : "min-h-9"} ${FOCUS}`}
    >
      {compact ? "Why" : "Why you're seeing this"}
      <span aria-hidden="true" className={`transition-transform duration-(--dur-base) ease-legible ${open ? "rotate-180" : ""}`}>
        <Glyph name="chevron" size={13} />
      </span>
    </button>
  );
}

function WhyBox({ open, relevance, onOpenProfile }: { open: boolean; relevance: Relevance; onOpenProfile: (v: SheetView) => void }) {
  return (
    <Reveal open={open} className="space-y-1 pt-2 text-small text-muted-foreground">
      {relevance.basis.map((b) => (
        <p key={b}>{b}</p>
      ))}
      <p>{KIND_EXPLAINED[relevance.kind]}</p>
      <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`relative z-10 min-h-9 ${ADD}`}>
        Update your profile
      </button>
    </Reveal>
  );
}

/* ------------------------------------------------------------- featured */

/**
 * The relevance note on the featured decision. Plum and a serif voice only for a
 * supported match; lilac for a followed subject; plain text otherwise.
 */
function FeaturedNote({ d, onOpenProfile }: { d: Decision; onOpenProfile: (v: SheetView) => void }) {
  const [why, setWhy] = useState(false);
  const r = d.relevance;
  if (!r) {
    return d.place ? (
      <p className="mt-5 text-small text-muted-foreground">
        <span className="font-semibold text-foreground">Happening in {d.place}.</span> Not based on your answers.
      </p>
    ) : null;
  }
  if (r.kind === "open") {
    return (
      <p className="mt-5 text-small text-muted-foreground">
        <span className="font-semibold text-foreground">{KIND_LABEL.open}.</span> {r.text} <AddDetails area={d.openArea} onOpenProfile={onOpenProfile} />
      </p>
    );
  }
  const strong = supported(r);
  return (
    <div className={`mt-5 rounded-md px-4 py-3.5 sm:px-5 ${strong ? "bg-accent-soft" : "bg-info-soft"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`inline-flex items-center gap-1.5 text-small font-semibold ${strong ? "text-accent" : "text-foreground"}`}>
          {strong && <Spark />}
          {KIND_LABEL[r.kind]}
        </p>
        <WhyToggle open={why} onToggle={() => setWhy(!why)} compact />
      </div>
      <p className={`mt-1 ${strong ? "font-display text-[1.0625rem] italic leading-normal sm:text-lg" : "text-body"}`}>{r.text}</p>
      <WhyBox open={why} relevance={r} onOpenProfile={onOpenProfile} />
    </div>
  );
}

/** The first decision: the page's one raised surface, with an editorial headline. */
export function FeaturedDecision({ d, onOpenProfile }: { d: Decision; onOpenProfile: (v: SheetView) => void }) {
  const cta = useCursorCta(d.open);
  return (
    <article {...cta.handlers} className={`relative -mx-1 rounded-lg bg-surface px-5 pb-6 pt-6 shadow-card sm:mx-0 sm:px-8 sm:pt-7 ${cta.cursorClass}`}>
      {cta.pill}
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2.5 text-small font-semibold text-muted-foreground">
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground shadow-[inset_0_0_0_1.5px_var(--foreground)]">
            <Part name={d.part} size={18} strokeWidth={1.8} />
          </span>
          <span className="truncate">{d.meta}</span>
        </p>
        {d.status && (
          <span className="inline-flex shrink-0 items-center gap-1 text-small font-medium text-muted-foreground">
            <StatusMark dated={d.dated} />
            {d.status}
          </span>
        )}
      </div>

      <h3 className="mt-4 font-display text-feature text-balance">{d.title}</h3>
      <p className="mt-3 max-w-[36em] text-body text-muted-foreground">{d.what}</p>

      <FeaturedNote d={d} onOpenProfile={onOpenProfile} />

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1">
        <ActionLink a={d.primary} main go={d.go} />
        {d.secondary && <ActionLink a={d.secondary} main={false} go={d.go} />}
        {d.noDetail && (
          <button type="button" onClick={d.open} className={`[@media(hover:hover)_and_(pointer:fine)]:hidden ${LINK}`}>
            Read more
          </button>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ rows */

/** One line of relevance for a row: label and sentence, or "Might apply" with Add details. */
function RowRelevance({ d, why, onWhy, onOpenProfile }: { d: Decision; why: boolean; onWhy: () => void; onOpenProfile: (v: SheetView) => void }) {
  const r = d.relevance;
  if (!r) return <p className="mt-1 line-clamp-1 text-small text-muted-foreground">{d.what}</p>;
  if (r.kind === "open")
    return (
      <p className="mt-1 text-small text-muted-foreground">
        {KIND_LABEL.open}. {r.text} <AddDetails area={d.openArea} onOpenProfile={onOpenProfile} />
      </p>
    );
  return (
    <p className="mt-1 text-small text-muted-foreground">
      <span className={`font-semibold ${supported(r) ? "text-accent" : "text-foreground"}`}>{KIND_LABEL[r.kind]}.</span> {r.text}{" "}
      <span className="whitespace-nowrap">
        <WhyToggle open={why} onToggle={onWhy} compact />
      </span>
    </p>
  );
}

/** A decision as a compact row. The headline is the row's link; it covers the row. */
export function DecisionRow({ d, onOpenProfile }: { d: Decision; onOpenProfile: (v: SheetView) => void }) {
  const [why, setWhy] = useState(false);
  const external = d.noDetail && "href" in d.primary.to ? d.primary.to.href : undefined;
  const stretch = "text-left after:absolute after:inset-0 after:rounded-md after:content-['']";
  const title: ReactNode = external ? (
    <a href={external} target="_blank" rel="noreferrer" className={`${stretch} ${FOCUS}`}>
      {d.title}
      <span className="sr-only"> (opens the official site)</span>
    </a>
  ) : (
    <button type="button" onClick={d.open} className={`${stretch} ${FOCUS}`}>
      {d.title}
    </button>
  );
  const source = d.secondary && "href" in d.secondary.to ? d.secondary : undefined;

  return (
    <li className="relative -mx-3 grid grid-cols-[2.25rem_1fr] gap-x-3.5 rounded-md px-3 py-4 interactive hover:bg-surface sm:grid-cols-[2.5rem_1fr]">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-9 items-center justify-center rounded-full sm:size-10 ${supported(d.relevance) ? "bg-accent-soft text-accent" : "bg-surface text-foreground shadow-hairline"}`}
      >
        <Part name={d.part} size={18} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 text-small text-muted-foreground">
          <span className="font-semibold">{d.meta}</span>
          {d.status && (
            <span className="inline-flex items-center gap-1">
              <StatusMark dated={d.dated} />
              {d.status}
            </span>
          )}
        </p>
        <h3 className="mt-0.5 text-[1.0625rem] font-semibold leading-snug sm:text-lg">{title}</h3>
        <RowRelevance d={d} why={why} onWhy={() => setWhy(!why)} onOpenProfile={onOpenProfile} />
        {d.relevance && <WhyBox open={why} relevance={d.relevance} onOpenProfile={onOpenProfile} />}
        {source && (
          <a href={(source.to as { href: string }).href} target="_blank" rel="noreferrer" className={`relative z-10 ${LINK} min-h-9`}>
            {source.label}
            <Glyph name="external" size={12} />
            <span className="sr-only">(opens the official site)</span>
          </a>
        )}
      </div>
    </li>
  );
}
