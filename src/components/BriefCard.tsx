"use client";

// Home's feed card, built around three questions: what's being proposed or
// happening, why it may matter to you, and what you can do next.
// 1. a compact header: subject or category with the bill number or date, and a
//    neutral status chip ("Proposal under review", "In 3 days");
// 2. a conversational headline, the strongest thing on the card;
// 3. one or two sentences (committee history stays on the detail page);
// 4. "Why this may matter to you", only when an answer or a followed subject
//    supports it, with "Why you're seeing this" one quiet tap away; when it
//    depends on something unanswered, a single grey line says so instead;
// 5. one primary button and one secondary link.
// On a mouse, the cursor "Read more" pill opens the detail page from the card's
// empty space. Explore keeps the fuller UpdateCard.
import { useState } from "react";
import { docWhat, type TimelineEntry } from "@/lib/engine/timeline";
import { actionsFor, cardHeader, dateLine, explanation, headline, relevanceOf, type Action, type RelevanceKind } from "@/lib/engine/home-copy";
import { DOC_TYPE_LABEL } from "@/lib/engine/decide-by";
import { useCursorCta } from "./CursorCta";
import { Glyph } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { LIFE_AREAS } from "@/lib/vocab";
import { FOCUS } from "./ui";
import type { CardProps } from "./updates";

const KIND_EXPLAINED: Record<RelevanceKind, string> = {
  direct: "Directly related to your situation.",
  potential: "A possible connection, not a certain effect.",
  interest: "Matches a subject you follow; nothing says it changes your situation.",
  open: "Depends on something you haven't told Legible yet.",
};

const BUTTON = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground hover:opacity-90 ${FOCUS}`;
const LINK = `inline-flex min-h-11 items-center gap-1 text-small font-semibold underline decoration-border underline-offset-4 hover:decoration-foreground ${FOCUS}`;

function Spark() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-accent">
      <path d="M12 2.5l1.9 6.1 6.1 1.9-6.1 1.9-1.9 6.1-1.9-6.1-6.1-1.9 6.1-1.9z" />
    </svg>
  );
}

export function BriefCard({
  entry: e,
  today,
  onOpenItem,
  onOpenDoc,
  onOpenProfile,
}: { entry: TimelineEntry; onOpenProfile: (v: SheetView) => void } & CardProps) {
  const [why, setWhy] = useState(false);
  const civic = e.kind === "civic" ? e.card : null;
  const head = civic ? cardHeader(civic) : { meta: [DOC_TYPE_LABEL[e.kind === "doc" ? e.item.doc.docType : "other"], dateLine(e, today)].filter(Boolean).join(" · ") };
  const title = civic ? headline(civic) : e.kind === "doc" ? e.item.doc.title : "";
  const what = civic ? explanation(civic) : e.kind === "doc" ? docWhat(e.item) : "";
  const relevance = relevanceOf(e);
  const personal = relevance && relevance.kind !== "open" ? relevance : null;
  const { primary, secondary } = actionsFor(e);
  // Phones have no cursor pill; if both actions leave the app, add an in-app way in.
  const noDetail = "href" in primary.to && (!secondary || "href" in secondary.to);
  // "Add details" opens the profile step that holds the unanswered question.
  const openArea = LIFE_AREAS.find((a) => civic?.open.some((o) => a.facts.includes(o.fact)));

  const docId = e.kind === "doc" ? e.item.doc.id : e.ballot?.doc.id;
  const openDetail = () => (civic ? onOpenItem(civic.item.id) : docId && onOpenDoc(docId));
  const cta = useCursorCta(openDetail);
  const go = (a: Action) => {
    if ("href" in a.to) return;
    if (a.to.open === "doc" && docId) onOpenDoc(docId);
    else openDetail();
  };

  const arrow = (
    <span aria-hidden="true" className="-rotate-90">
      <Glyph name="chevron" size={14} />
    </span>
  );
  // Every primary button looks the same; the external mark is for the secondary link.
  const button = (a: Action, main: boolean) =>
    "href" in a.to ? (
      <a key={a.label} href={a.to.href} target="_blank" rel="noreferrer" className={main ? BUTTON : LINK}>
        {a.label}
        {main ? arrow : <Glyph name="external" size={13} />}
        <span className="sr-only">(opens the official site)</span>
      </a>
    ) : (
      <button key={a.label} type="button" onClick={() => go(a)} className={main ? BUTTON : LINK}>
        {a.label}
        {main && arrow}
      </button>
    );

  return (
    <li {...cta.handlers} className={`relative rounded-[16px] border border-border/60 bg-surface p-4 shadow-card sm:p-6 ${cta.cursorClass}`}>
      {cta.pill}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p className="text-[0.8125rem] font-semibold uppercase tracking-wider text-muted-foreground">{head.meta}</p>
        {head.status && <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[0.8125rem] font-medium text-foreground">{head.status}</span>}
      </div>
      <h3 className="mt-3 text-[1.25rem] font-semibold leading-snug tracking-tight sm:text-[1.375rem]">{title}</h3>
      <p className="mt-3 text-[1rem] leading-relaxed text-muted-foreground">{what}</p>

      {personal && (
        <div className="mt-4 rounded-md border border-accent/20 bg-accent-soft/60 px-3.5 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-1.5 text-small font-semibold">
              <Spark />
              Why this may matter to you
            </p>
            <button
              type="button"
              onClick={() => setWhy(!why)}
              aria-expanded={why}
              aria-label="Why you're seeing this"
              title="Why you're seeing this"
              className={`-my-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground ${FOCUS}`}
            >
              <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full border border-current text-[10px] font-bold leading-none">
                i
              </span>
            </button>
          </div>
          <p className="mt-1 text-small leading-relaxed">{personal.text}</p>
          {why && (
            <div className="mt-2 space-y-1 border-t border-accent/20 pt-2 text-small text-muted-foreground">
              <p className="font-semibold text-foreground">Why you&apos;re seeing this</p>
              {personal.basis.map((b) => (
                <p key={b}>{b}</p>
              ))}
              <p>{KIND_EXPLAINED[personal.kind]}</p>
              <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`min-h-9 font-semibold text-foreground underline underline-offset-4 ${FOCUS}`}>
                Update your interests
              </button>
            </div>
          )}
        </div>
      )}
      {relevance?.kind === "open" && (
        <p className="mt-4 text-small text-muted-foreground">
          {relevance.text}{" "}
          <button
            type="button"
            onClick={() => onOpenProfile(openArea ? { kind: "area", id: openArea.id } : { kind: "list" })}
            className={`font-semibold text-foreground underline underline-offset-4 ${FOCUS}`}
          >
            Add details
          </button>
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {button(primary, true)}
        {secondary && button(secondary, false)}
        {noDetail && (
          <button type="button" onClick={openDetail} className={`[@media(hover:hover)_and_(pointer:fine)]:hidden ${LINK}`}>
            Read more
          </button>
        )}
      </div>
    </li>
  );
}
