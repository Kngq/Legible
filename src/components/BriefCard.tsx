"use client";

// For you's card, kept to five things: what it is, one sentence on what it
// means, who it applies to, why this person sees it, and one button to go
// deeper. Everything else (official text, actions, each ballot question) is on
// the page the button opens. Explore keeps the fuller UpdateCard.
import { timingTag } from "@/lib/engine/civic-copy";
import { decideByRelative, DOC_TYPE_LABEL, shortDate } from "@/lib/engine/decide-by";
import { docWhat, type TimelineEntry } from "@/lib/engine/timeline";
import { ballotWhyLine, docWho, firstSentence, friendlyWhen, KIND_LABEL, whoLine, whyLine } from "@/lib/engine/update-copy";
import { Glyph } from "./icons";
import { Tag } from "./ui";
import { PRIMARY, type CardProps } from "./updates";

export function BriefCard({ entry: e, today, onOpenItem, onOpenDoc }: { entry: TimelineEntry } & CardProps) {
  let kind: string;
  let when: string;
  let title: string;
  let means: string;
  let who: string;
  let why: string | null;
  let button: { label: string; open: () => void };

  if (e.kind === "civic") {
    const c = e.card;
    const i = c.item;
    kind = KIND_LABEL[i.kind];
    when = i.at ? `${friendlyWhen(c)} · ${timingTag(c)}` : friendlyWhen(c);
    title = i.title;
    means = firstSentence(i.summary);
    who = whoLine(c);
    const ballotWhy = e.ballot ? ballotWhyLine(e.ballot.cards) : null;
    why = whyLine(c) ?? ballotWhy;
    // When the ballot is why Election Day is here, the questions are the deeper page.
    button =
      e.ballot && ballotWhy && !c.because.length
        ? { label: "See the questions that match you", open: () => onOpenDoc(e.ballot!.doc.id) }
        : { label: "See details", open: () => onOpenItem(i.id) };
  } else {
    const d = e.item.doc.decideBy;
    kind = DOC_TYPE_LABEL[e.item.doc.docType];
    when = d ? `${shortDate(d.date)} · ${decideByRelative(d, today)}` : "";
    title = e.item.doc.title;
    means = docWhat(e.item);
    who = docWho(e.item);
    why = ballotWhyLine(e.item.cards);
    button = { label: "See details", open: () => onOpenDoc(e.item.doc.id) };
  }

  return (
    <li className="rounded-lg bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-small font-semibold uppercase tracking-wider text-muted-foreground">
          {kind}
          {when && <span className="normal-case tracking-normal"> · {when}</span>}
        </p>
        {e.touches ? <Tag pop="accent">May affect you</Tag> : e.level === "list" ? <Tag pop="info">You follow this</Tag> : e.level === "maybe" ? <Tag>Might apply</Tag> : null}
      </div>
      <h3 className="mt-2 text-title">{title}</h3>
      <p className="mt-2 text-body text-muted-foreground">{means}</p>

      <dl className="mt-4 space-y-2 text-small">
        <div>
          <dt className="inline font-semibold">Who it applies to: </dt>
          <dd className="inline">{who}</dd>
        </div>
        {why && (
          <div className="rounded-md bg-accent-soft px-3 py-2">
            <dt className="inline font-semibold">Why you: </dt>
            <dd className="inline">{why}</dd>
          </div>
        )}
      </dl>

      <button type="button" onClick={button.open} className={`mt-4 ${PRIMARY}`}>
        {button.label}
        <span aria-hidden="true" className="-rotate-90">
          <Glyph name="chevron" size={14} />
        </span>
      </button>
    </li>
  );
}
