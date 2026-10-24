"use client";

// Home's feed pieces. Two shapes, so dates and decisions never blur together:
// - DeadlineRow: a compact row in the "Coming up" panel. Date tile, headline,
//   when, one line on who it is for (only when Legible knows), one action.
// - BriefCard: a decision card. Subject and number with a status, a headline,
//   two lines on what is proposed, the relevance line (why it is here), and one
//   primary action into the detail page with the official source beside it.
// The relevance line is the same pattern everywhere: a mark, a label, and the
// sentence from relevanceOf, with "Why you're seeing this" one tap away.
// On a mouse, the cursor "Read more" pill opens the detail page from empty space.
import { useState } from "react";
import { docWhat, type TimelineEntry } from "@/lib/engine/timeline";
import { actionsFor, cardHeader, civicRelevance, dateLine, explanation, headline, keyDate, relevanceOf, type Action, type Relevance, type RelevanceKind } from "@/lib/engine/home-copy";
import { DOC_TYPE_LABEL, shortDate } from "@/lib/engine/decide-by";
import type { FeedItem } from "@/lib/engine/feed";
import type { Card } from "@/lib/engine/types";
import { questionBecause } from "@/lib/engine/update-copy";
import type { CivicCard } from "@/lib/engine/civic";
import { LIFE_AREAS, type LifeAreaId, type TopicId } from "@/lib/vocab";
import { CivicTile } from "./CivicRow";
import { useCursorCta } from "./CursorCta";
import { Glyph, Part } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { FOCUS } from "./ui";
import type { CardProps } from "./updates";

const KIND_EXPLAINED: Record<RelevanceKind, string> = {
  direct: "Directly related to your situation.",
  potential: "A possible connection, not a certain effect.",
  interest: "Matches a subject you follow; nothing says it changes your situation.",
  open: "Depends on something you haven't told Legible yet.",
};

/** The relevance line's label, by how the item connects to the person. */
const KIND_LABEL: Record<RelevanceKind, string> = {
  direct: "Relevant to you",
  potential: "Relevant to you",
  interest: "On your list",
  open: "Might apply",
};

// The chat dock's orb is fixed bottom-right (56px + 16px inset). On phones, action
// rows keep clear of that strip so a primary button is never under it.
const CLEAR_ORB = "max-sm:pr-[4.5rem]";
const BUTTON = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground transition-opacity duration-(--duration) ease-legible hover:opacity-90 ${FOCUS}`;
const LINK = `inline-flex min-h-11 items-center gap-1 text-small font-semibold text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground ${FOCUS}`;
const ROW_ACTION = `inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-3.5 text-small font-semibold transition-colors duration-(--duration) ease-legible hover:border-foreground sm:min-h-9 ${FOCUS}`;
const CARD = `relative rounded-lg border border-border/60 bg-surface shadow-card transition-[transform,box-shadow] duration-(--duration) ease-legible [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-[0_2px_4px_rgb(17_17_17/0.05),0_16px_40px_rgb(17_17_17/0.10)]`;

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

function partFor(e: TimelineEntry): string {
  if (e.kind === "doc") return "ballot";
  const i = e.card.item;
  return i.topics.map((t) => TOPIC_PART[t]).find(Boolean) ?? KIND_PART[i.kind];
}

function Spark({ className = "text-accent" }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`}>
      <path d="M12 2.5l1.9 6.1 6.1 1.9-6.1 1.9-1.9 6.1-1.9-6.1-6.1-1.9 6.1-1.9z" />
    </svg>
  );
}

/** A small clock for dated items, a half-filled circle for proposals still under review. */
function StatusMark({ dated }: { dated: boolean }) {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      {dated ? <path d="M12 7v5l3 2" /> : <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />}
    </svg>
  );
}

/**
 * Why this is on the page: mark, label, the matching sentence, and the basis on
 * request. Every word comes from relevanceOf; nothing here adds a fact.
 */
function RelevanceLine({
  relevance,
  openArea,
  place,
  compact = false,
  onOpenProfile,
}: {
  relevance: Relevance | null;
  openArea?: LifeAreaId;
  /** Where the item happens, for the "not from your answers" label. */
  place?: string;
  compact?: boolean;
  onOpenProfile: (v: SheetView) => void;
}) {
  const [why, setWhy] = useState(false);
  const addDetails = (
    <button
      type="button"
      onClick={() => onOpenProfile(openArea ? { kind: "area", id: openArea } : { kind: "list" })}
      className={`font-semibold text-foreground underline underline-offset-4 ${FOCUS}`}
    >
      Add details
    </button>
  );

  if (!relevance) {
    if (compact || !place) return null;
    return (
      <p className="mt-3 text-small text-muted-foreground">
        <span className="font-semibold text-foreground">Happening in {place}.</span> Not based on your answers.
      </p>
    );
  }

  if (relevance.kind === "open") {
    return (
      <p className={`${compact ? "mt-1" : "mt-3"} text-small text-muted-foreground`}>
        {!compact && <span className="font-semibold text-foreground">{KIND_LABEL.open}. </span>}
        {relevance.text} {addDetails}
      </p>
    );
  }

  const personal = relevance.kind !== "interest";
  return (
    <div className={`${compact ? "mt-1.5" : "mt-3"} border-l-2 ${personal ? "border-accent" : "border-info"} pl-3`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-small">
          {/* Full cards stack the label over the sentence; rows keep it inline. */}
          <span className={`items-center gap-1 font-semibold ${compact ? "mr-1.5 inline-flex align-[-2px]" : "flex"}`}>
            <Spark className={personal ? "text-accent" : "text-muted-foreground"} />
            {KIND_LABEL[relevance.kind]}
          </span>
          <span className={compact ? "text-muted-foreground" : "mt-0.5 block"}>{relevance.text}</span>
        </p>
        <button
          type="button"
          onClick={() => setWhy(!why)}
          aria-expanded={why}
          aria-label="Why you're seeing this"
          title="Why you're seeing this"
          className={`-my-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground ${FOCUS}`}
        >
          <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full border border-current text-[10px] font-bold leading-none">
            i
          </span>
        </button>
      </div>
      {why && (
        <div className="mt-2 animate-fade-in space-y-1 text-small text-muted-foreground">
          <p className="font-semibold text-foreground">Why you&apos;re seeing this</p>
          {relevance.basis.map((b) => (
            <p key={b}>{b}</p>
          ))}
          <p>{KIND_EXPLAINED[relevance.kind]}</p>
          <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`min-h-9 font-semibold text-foreground underline underline-offset-4 ${FOCUS}`}>
            Update your profile
          </button>
        </div>
      )}
    </div>
  );
}

/** Shared wiring: where the card opens, its actions, and the profile area for "Add details". */
function useEntry(e: TimelineEntry, onOpenItem: (id: string) => void, onOpenDoc: (id: string) => void) {
  const civic = e.kind === "civic" ? e.card : null;
  const docId = e.kind === "doc" ? e.item.doc.id : e.ballot?.doc.id;
  const openDetail = () => (civic ? onOpenItem(civic.item.id) : docId && onOpenDoc(docId));
  const go = (a: Action) => {
    if ("href" in a.to) return;
    if (a.to.open === "doc" && docId) onOpenDoc(docId);
    else openDetail();
  };
  const openArea = LIFE_AREAS.find((a) => civic?.open.some((o) => a.facts.includes(o.fact)))?.id;
  return { civic, openDetail, go, openArea, ...actionsFor(e), relevance: relevanceOf(e) };
}

const arrow = (
  <span aria-hidden="true" className="-rotate-90 transition-transform duration-(--duration) ease-legible group-hover:translate-y-0.5">
    <Glyph name="chevron" size={14} />
  </span>
);

function ActionLink({ a, main, go, className }: { a: Action; main: boolean; go: (a: Action) => void; className?: string }) {
  const cls = `group ${className ?? (main ? BUTTON : LINK)}`;
  if ("href" in a.to)
    return (
      <a href={a.to.href} target="_blank" rel="noreferrer" className={cls}>
        {a.label}
        {/* Every primary ends in the same chevron; the external mark is for the secondary link. */}
        {main ? arrow : <Glyph name="external" size={13} />}
        <span className="sr-only">(opens the official site)</span>
      </a>
    );
  return (
    <button type="button" onClick={() => go(a)} className={cls}>
      {a.label}
      {main && arrow}
    </button>
  );
}

/** One date in the "Coming up" panel. Urgency comes only from the verified date. */
export function DeadlineRow({ entry: e, today, onOpenItem, onOpenDoc, onOpenProfile }: { entry: TimelineEntry; onOpenProfile: (v: SheetView) => void } & CardProps) {
  const { civic, openDetail, go, openArea, primary } = useEntry(e, onOpenItem, onOpenDoc);
  const cta = useCursorCta(openDetail);
  if (!civic) return null;
  // The item's own relevance only: the ballot's questions have their own cards above.
  const relevance = civicRelevance(civic);
  const head = cardHeader(civic);
  const soon = civic.timing === "today" || (civic.days !== undefined && civic.days <= 3);

  return (
    <li {...cta.handlers} className={`relative flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-3 sm:flex-nowrap sm:gap-x-4 sm:px-5 ${cta.cursorClass}`}>
      {cta.pill}
      <span className="self-start">
        {/* An open window shows its closing day: the date a person acts by. */}
        <CivicTile card={civic} size={48} at={keyDate(civic)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-small text-muted-foreground">
          {head.status && (
            <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 font-semibold text-foreground ${soon ? "bg-attention-soft" : ""}`}>
              <StatusMark dated />
              {head.status}
            </span>
          )}
          <span>{head.meta}</span>
        </p>
        <h3 className="mt-0.5 text-body font-semibold leading-snug">
          <button type="button" onClick={openDetail} className={`text-left hover:underline hover:underline-offset-4 ${FOCUS}`}>
            {headline(civic)}
          </button>
        </h3>
        {relevance ? (
          <RelevanceLine relevance={relevance} openArea={openArea} compact onOpenProfile={onOpenProfile} />
        ) : (
          <p className="mt-0.5 line-clamp-1 text-small text-muted-foreground">{explanation(civic)}</p>
        )}
      </div>
      <div className={`w-full min-[360px]:pl-[3.875rem] sm:w-auto sm:shrink-0 sm:pl-0 ${CLEAR_ORB}`}>
        <ActionLink a={primary} main go={go} className={ROW_ACTION} />
      </div>
      <span className="sr-only">{dateLine(e, today)}</span>
    </li>
  );
}

/**
 * A date due today or tomorrow, above the decisions. One compact bar: when, what,
 * who it is for (the relevance line keeps "May be relevant if" when Legible
 * does not know), and one action. Never shown for a date further out.
 */
export function UrgentAlert({ entry: e, onOpenItem, onOpenDoc, onOpenProfile }: { entry: TimelineEntry; onOpenProfile: (v: SheetView) => void } & CardProps) {
  const { civic, openDetail, go, openArea, primary, relevance } = useEntry(e, onOpenItem, onOpenDoc);
  if (!civic) return null;
  const head = cardHeader(civic);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-attention/40 bg-attention-soft px-4 py-3 sm:flex-nowrap sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-small">
          <span className="inline-flex items-center gap-1 font-bold">
            <StatusMark dated />
            {head.status}
          </span>
          <span className="text-muted-foreground">{head.meta}</span>
        </p>
        <p className="mt-0.5 text-body font-semibold leading-snug">
          <button type="button" onClick={openDetail} className={`text-left hover:underline hover:underline-offset-4 ${FOCUS}`}>
            {headline(civic)}
          </button>
        </p>
        <RelevanceLine relevance={relevance} openArea={openArea} compact onOpenProfile={onOpenProfile} />
      </div>
      <div className={`w-full sm:w-auto sm:shrink-0 ${CLEAR_ORB}`}>
        <ActionLink a={primary} main go={go} className={BUTTON} />
      </div>
    </div>
  );
}

/** One decision in the For you feed. */
export function BriefCard({ entry: e, today, onOpenItem, onOpenDoc, onOpenProfile }: { entry: TimelineEntry; onOpenProfile: (v: SheetView) => void } & CardProps) {
  const { civic, openDetail, go, openArea, primary, secondary, relevance } = useEntry(e, onOpenItem, onOpenDoc);
  const head = civic ? cardHeader(civic) : { meta: DOC_TYPE_LABEL[e.kind === "doc" ? e.item.doc.docType : "other"], status: dateLine(e, today) || undefined };
  const title = civic ? headline(civic) : e.kind === "doc" ? e.item.doc.title : "";
  const what = civic ? explanation(civic) : e.kind === "doc" ? docWhat(e.item) : "";
  // Phones have no cursor pill; if both actions leave the app, add an in-app way in.
  const noDetail = "href" in primary.to && (!secondary || "href" in secondary.to);
  const cta = useCursorCta(openDetail);

  return (
    <li {...cta.handlers} className={`${CARD} p-4 sm:p-5 ${cta.cursorClass}`}>
      {cta.pill}
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-small font-semibold text-muted-foreground">
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-foreground">
            <Part name={partFor(e)} size={17} strokeWidth={1.8} />
          </span>
          <span className="truncate">{head.meta}</span>
        </p>
        {head.status && (
          <span className="inline-flex shrink-0 items-center gap-1 text-small font-medium text-muted-foreground">
            <StatusMark dated={!civic || civic.item.kind !== "bill"} />
            {head.status}
          </span>
        )}
      </div>

      <h3 className="mt-2.5 text-title">{title}</h3>
      <p className="mt-1.5 line-clamp-2 text-body text-muted-foreground">{what}</p>

      <RelevanceLine relevance={relevance} openArea={openArea} place={civic?.item.place.name} onOpenProfile={onOpenProfile} />

      <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 ${CLEAR_ORB}`}>
        <ActionLink a={primary} main go={go} />
        {secondary && <ActionLink a={secondary} main={false} go={go} />}
        {noDetail && (
          <button type="button" onClick={openDetail} className={`[@media(hover:hover)_and_(pointer:fine)]:hidden ${LINK}`}>
            Read more
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * A ballot question that touches the person, or is on their list, as a decision
 * card. Why it is here comes from the card's own match (questionBecause) and its
 * first verified "why" sentence; it opens the question's existing page.
 */
export function BallotQuestionCard({
  card: c,
  ballot,
  onOpenMeasure,
  onOpenProfile,
}: {
  card: Card;
  ballot: FeedItem;
  onOpenMeasure: (docId: string, measureId: string) => void;
  onOpenProfile: (v: SheetView) => void;
}) {
  const m = c.measure;
  const open = () => onOpenMeasure(ballot.doc.id, m.id);
  const cta = useCursorCta(open);
  const touches = c.relevance === "touches";
  const because = questionBecause(c);
  const relevance: Relevance | null = because
    ? {
        kind: touches ? "direct" : "interest",
        text: [`${because}.`, touches ? c.why[0]?.text : null].filter(Boolean).join(" "),
        basis: [`${because}.`, "Your ballot page lists this question first."],
      }
    : null;
  const d = ballot.doc.decideBy;
  const part = m.topics.map((t) => TOPIC_PART[t]).find(Boolean) ?? "ballot";

  return (
    <li {...cta.handlers} className={`${CARD} p-4 sm:p-5 ${cta.cursorClass}`}>
      {cta.pill}
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-small font-semibold text-muted-foreground">
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-foreground">
            <Part name={part} size={17} strokeWidth={1.8} />
          </span>
          <span className="truncate">Ballot question {m.number}</span>
        </p>
        {d && (
          <span className="inline-flex shrink-0 items-center gap-1 text-small font-medium text-muted-foreground">
            <StatusMark dated />
            Voters decide {shortDate(d.date)}
          </span>
        )}
      </div>

      <h3 className="mt-2.5 text-title">{m.title}</h3>
      {m.overview[0] && <p className="mt-1.5 line-clamp-2 text-body text-muted-foreground">{m.overview[0].text}</p>}

      <RelevanceLine relevance={relevance} onOpenProfile={onOpenProfile} />

      <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 ${CLEAR_ORB}`}>
        <ActionLink a={{ label: "Understand this decision", to: { open: "item" } }} main go={open} />
        {m.sourceUrl && <ActionLink a={{ label: "Read official text", to: { href: m.sourceUrl } }} main={false} go={open} />}
      </div>
    </li>
  );
}
