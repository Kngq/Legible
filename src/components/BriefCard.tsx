"use client";

// Home's card: what's happening, why it matters, what you can do.
// 1. category and date, 2. a headline a person can read, 3. one or two sentences
// on what is happening, 4. why it matters to this person (only when Legible can
// say so, from the one answer or interest that explains it), 5. one action named
// for what it does, plus an optional link to the official source. "Why you're
// seeing this" opens the reasoning and links to the profile. Explore keeps the
// fuller UpdateCard.
import { docWhat, type TimelineEntry } from "@/lib/engine/timeline";
import { actionsFor, CATEGORY, dateLine, explanation, headline, relevanceOf, type Action, type RelevanceKind } from "@/lib/engine/home-copy";
import { DOC_TYPE_LABEL } from "@/lib/engine/decide-by";
import { Glyph } from "./icons";
import type { SheetView } from "./ProfileSheet";
import { FOCUS, Tag } from "./ui";
import { PRIMARY, type CardProps } from "./updates";

const KIND_TAG: Record<RelevanceKind, { label: string; pop: "accent" | "info" | "muted" }> = {
  direct: { label: "Relevant to you", pop: "accent" },
  potential: { label: "Relevant to you", pop: "accent" },
  interest: { label: "Matches your interests", pop: "info" },
  open: { label: "Worth exploring", pop: "muted" },
};

const KIND_EXPLAINED: Record<RelevanceKind, string> = {
  direct: "Directly related to your situation.",
  potential: "Could affect you indirectly. It is a possibility, not a certainty.",
  interest: "Matches your interests; it may not change your situation.",
  open: "Depends on something you haven't shared.",
};

export function BriefCard({
  entry: e,
  today,
  onOpenItem,
  onOpenDoc,
  onOpenProfile,
  showTag = true,
}: { entry: TimelineEntry; onOpenProfile: (v: SheetView) => void; showTag?: boolean } & CardProps) {
  const civic = e.kind === "civic" ? e.card : null;
  const category = civic ? CATEGORY[civic.item.kind] : DOC_TYPE_LABEL[e.kind === "doc" ? e.item.doc.docType : "other"];
  const title = civic ? headline(civic) : e.kind === "doc" ? e.item.doc.title : "";
  const what = civic ? explanation(civic) : e.kind === "doc" ? docWhat(e.item) : "";
  const when = dateLine(e, today);
  const relevance = relevanceOf(e);
  const { primary, secondary } = actionsFor(e);
  const source = civic?.item.source.url;

  const go = (a: Action) => {
    if ("href" in a.to) return;
    if (a.to.open === "doc") onOpenDoc(e.kind === "doc" ? e.item.doc.id : e.ballot!.doc.id);
    else if (civic) onOpenItem(civic.item.id);
  };
  const button = (a: Action, main: boolean) =>
    "href" in a.to ? (
      <a key={a.label} href={a.to.href} target="_blank" rel="noreferrer" className={main ? PRIMARY : `inline-flex min-h-11 items-center gap-1.5 text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
        {a.label}
        <Glyph name="external" size={14} />
        <span className="sr-only">(opens the official site)</span>
      </a>
    ) : (
      <button key={a.label} type="button" onClick={() => go(a)} className={main ? PRIMARY : `inline-flex min-h-11 items-center text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
        {a.label}
        {main && (
          <span aria-hidden="true" className="-rotate-90">
            <Glyph name="chevron" size={14} />
          </span>
        )}
      </button>
    );

  return (
    <li className="rounded-lg bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-small font-semibold uppercase tracking-wider text-muted-foreground">
          {category}
          {when && <span className="normal-case tracking-normal"> · {when}</span>}
        </p>
        {showTag && relevance && <Tag pop={KIND_TAG[relevance.kind].pop}>{KIND_TAG[relevance.kind].label}</Tag>}
      </div>
      <h3 className="mt-2 text-title">{title}</h3>
      <p className="mt-2 text-body text-muted-foreground">{what}</p>

      {relevance && (
        <div className="mt-4 rounded-md bg-accent-soft px-4 py-3">
          <p className="text-small font-semibold">{relevance.kind === "open" ? "Might apply to you" : "Why this matters to you"}</p>
          <p className="mt-0.5 text-body">{relevance.text}</p>
          <details className="group mt-2">
            <summary className={`inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-small text-muted-foreground hover:text-foreground ${FOCUS}`}>
              Why you&apos;re seeing this
              <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full border border-current text-[10px] font-bold leading-none">
                i
              </span>
            </summary>
            <div className="mt-1 space-y-1 text-small">
              {relevance.basis.map((b) => (
                <p key={b}>{b}</p>
              ))}
              <p className="text-muted-foreground">{KIND_EXPLAINED[relevance.kind]}</p>
              <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`min-h-9 font-semibold underline underline-offset-4 ${FOCUS}`}>
                Update your interests
              </button>
            </div>
          </details>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        {button(primary, true)}
        {secondary && button(secondary, false)}
        {!secondary && source && primary.label !== "View details" && "open" in primary.to && (
          <a href={source} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
            Official source <Glyph name="external" size={14} />
          </a>
        )}
      </div>
    </li>
  );
}
