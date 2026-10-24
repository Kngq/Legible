"use client";

// Pieces shared by Home and Explore: the top bar with Home and Explore tabs, the
// update card, the decided-row, and the one "How Legible works" note.
import type { ReactNode } from "react";
import { avatarParts } from "@/lib/engine/avatar";
import { decidedLine, decideByLine, decideByRelative, DOC_TYPE_LABEL, shortDate } from "@/lib/engine/decide-by";
import { timingTag } from "@/lib/engine/civic-copy";
import type { FeedItem } from "@/lib/engine/feed";
import { personalization } from "@/lib/engine/personalization";
import type { Profile } from "@/lib/engine/profile";
import { docWhat, type TimelineEntry } from "@/lib/engine/timeline";
import type { Provenance } from "@/lib/engine/types";
import { friendlyWhen, KIND_LABEL, whyLine } from "@/lib/engine/update-copy";
import { AvatarRing } from "./AvatarRing";
import { DocTile } from "./covers";
import { Glyph } from "./icons";
import { OriginalLine } from "./OriginalText";
import { PhotoCredit, PhotoThumb, useEntryPhoto } from "./photos";
import { viewForPart, type SheetView } from "./ProfileSheet";
import { FOCUS, Tag } from "./ui";

export const H2 = "text-title font-bold tracking-tight";
export const PRIMARY = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-small font-semibold text-primary-foreground hover:opacity-90 ${FOCUS}`;
export const SECONDARY = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-5 text-small font-semibold hover:bg-border ${FOCUS}`;

const TRUST: Record<Provenance, { label: string; pop: "positive" | "attention" }> = {
  reviewed: { label: "Reviewed", pop: "positive" },
  verified: { label: "Verified", pop: "positive" },
  ai_draft: { label: "AI draft", pop: "attention" },
};

/** "Legible", Home and Explore tabs, and the avatar that opens the profile. */
export function TopBar({
  active,
  profile,
  onHome,
  onExplore,
  onOpenProfile,
}: {
  active: "home" | "explore";
  profile: Profile;
  onHome: () => void;
  onExplore: () => void;
  onOpenProfile: (v: SheetView) => void;
}) {
  const tab = (id: "home" | "explore", label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-current={active === id ? "page" : undefined}
      className={`min-h-10 rounded-full px-4 text-small font-semibold transition-colors duration-(--duration) ease-legible ${FOCUS} ${
        active === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
  return (
    <nav aria-label="Main" className="flex h-16 items-center justify-between gap-3">
      <span className="text-body font-bold tracking-tight">Legible</span>
      <span className="flex items-center rounded-full bg-surface p-1 shadow-card">
        {tab("home", "Home", onHome)}
        {tab("explore", "Explore", onExplore)}
      </span>
      <span className="flex items-center gap-1">
        <span className="sr-only">Your profile</span>
        <AvatarRing
          parts={avatarParts(profile)}
          percent={personalization(profile).percent}
          size={44}
          showLabel={false}
          onFigure={() => onOpenProfile({ kind: "list" })}
          onPart={(p) => onOpenProfile(viewForPart(p))}
        />
      </span>
    </nav>
  );
}

/** Privacy and sources, said once per page. */
export function HowItWorks({ onOpenProfile }: { onOpenProfile: (v: SheetView) => void }) {
  return (
    <section aria-labelledby="h-how" className="mt-14 rounded-lg bg-surface-muted p-5">
      <h2 id="h-how" className="text-body font-bold">
        How Legible works
      </h2>
      <dl className="mt-3 space-y-3 text-small">
        <div>
          <dt className="font-semibold">Your details stay with you</dt>
          <dd className="text-muted-foreground">
            Your town and answers stay in this browser and are used only to sort what you see.{" "}
            <button type="button" onClick={() => onOpenProfile({ kind: "list" })} className={`font-semibold text-foreground underline underline-offset-4 ${FOCUS}`}>
              Manage or clear them
            </button>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Official sources</dt>
          <dd className="text-muted-foreground">Dates and summaries come from state and city sources, linked on each update.</dd>
        </div>
        <div>
          <dt className="font-semibold">You decide</dt>
          <dd className="text-muted-foreground">Legible explains what is being decided and how it could affect you. It never tells you how to vote.</dd>
        </div>
      </dl>
    </section>
  );
}

export type CardProps = {
  today: string;
  onOpenItem: (id: string) => void;
  onOpenDoc: (id: string) => void;
  onOpenMeasure: (docId: string, measureId: string) => void;
};

function ExternalAction({ label, url, primary }: { label: string; url: string; primary: boolean }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className={primary ? PRIMARY : SECONDARY}>
      {label}
      <Glyph name="external" size={14} />
      <span className="sr-only">(opens the official site)</span>
    </a>
  );
}

/**
 * One update: what kind and when, a clear title, a plain explanation, why it is
 * shown to this person, how it could affect them (ballots), and one obvious action.
 */
export function UpdateCard({ entry: e, today, onOpenItem, onOpenDoc, onOpenMeasure }: { entry: TimelineEntry } & CardProps) {
  let kind: string;
  let when: string;
  let title: string;
  let explain: string;
  let why: string | null;
  let actions: ReactNode;
  const ballot = e.kind === "doc" ? e.item : e.ballot;

  if (e.kind === "civic") {
    const c = e.card;
    const i = c.item;
    kind = i.kind === "bill" && i.status ? `${KIND_LABEL.bill} · ${i.status}` : KIND_LABEL[i.kind];
    when = i.at ? `${friendlyWhen(c)} · ${timingTag(c)}` : friendlyWhen(c);
    title = i.title;
    explain = i.summary;
    why = whyLine(c);
    const links = i.actions.filter((a) => a.url);
    actions = (
      <>
        {ballot ? (
          <button type="button" onClick={() => onOpenDoc(ballot.doc.id)} className={PRIMARY}>
            Explore what&apos;s on the ballot
          </button>
        ) : (
          links[0] && <ExternalAction label={links[0].label} url={links[0].url!} primary />
        )}
        {ballot && links[0] && <ExternalAction label={links[0].label} url={links[0].url!} primary={false} />}
        <button type="button" onClick={() => onOpenItem(i.id)} className={`min-h-11 px-2 text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
          Details and source
        </button>
      </>
    );
  } else {
    const d = e.item.doc.decideBy;
    kind = `${e.item.scope === "state" ? "Massachusetts" : e.item.doc.place.name} ${DOC_TYPE_LABEL[e.item.doc.docType].toLowerCase()}`;
    when = d ? `${decideByRelative(d, today)} · ${shortDate(d.date)}` : "";
    title = e.item.doc.title;
    explain = docWhat(e.item);
    why = null;
    actions = (
      <button type="button" onClick={() => onOpenDoc(e.item.doc.id)} className={PRIMARY}>
        See all {e.item.total} {e.item.doc.docType === "ballot" ? "questions" : "items"}
      </button>
    );
  }

  const touching = ballot ? ballot.cards.filter((c) => c.relevance === "touches") : [];
  const thumb = useEntryPhoto(e.key);

  return (
    <li className="rounded-lg bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-small font-semibold uppercase tracking-wider text-muted-foreground">{kind}</p>
        {e.touches ? <Tag pop="accent">May affect you</Tag> : e.level === "list" ? <Tag pop="info">You follow this</Tag> : e.level === "maybe" ? <Tag>Might apply</Tag> : null}
      </div>
      <div className="mt-2 flex items-start gap-3">
        {thumb.photo && <PhotoThumb photo={thumb.photo} onError={thumb.onError} />}
        <div className="min-w-0 flex-1">
          <h3 className="text-title">{title}</h3>
          {when && <p className="mt-1 text-body font-semibold">{when}</p>}
        </div>
      </div>
      <p className="mt-2 text-body text-muted-foreground">{explain}</p>
      {thumb.photo && <PhotoCredit photo={thumb.photo} />}
      {why && (
        <p className="mt-3 rounded-md bg-accent-soft px-3 py-2 text-small">
          <span className="font-semibold">Why you&apos;re seeing this: </span>
          {why}
        </p>
      )}

      {touching.length > 0 && ballot && (
        <div className="mt-4 rounded-md border border-border p-4">
          <p className="text-body font-bold">How could this affect you?</p>
          <p className="text-small text-muted-foreground">Possible effects of questions that match your answers, in plain words. Voters decide.</p>
          <ul className="mt-2 divide-y divide-border">
            {touching.map((c) => (
              <li key={c.measure.id}>
                <button type="button" onClick={() => onOpenMeasure(ballot.doc.id, c.measure.id)} className={`flex w-full items-start gap-3 py-3 text-left ${FOCUS}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-small font-semibold">
                      Question {c.measure.number}: {c.measure.title}
                    </span>
                    {c.why[0] && <span className="mt-0.5 block text-small text-muted-foreground">{c.why[0].text}</span>}
                  </span>
                  <span aria-hidden="true" className="mt-0.5 -rotate-90">
                    <Glyph name="chevron" size={16} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {e.kind === "civic" ? (
        <OriginalLine original={e.card.item.original} onOpen={() => onOpenItem(e.card.item.id)} />
      ) : (
        <OriginalLine
          original={{ kind: "booklet", label: e.item.doc.source.name.split(",")[0], hash: e.item.doc.source.hash }}
          onOpen={() => onOpenDoc(e.item.doc.id)}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
    </li>
  );
}

/** A document as a reading-list row: tile, title, decide-by meta, touches, preview. */
export function FeedRow({ item, today, onOpen }: { item: FeedItem; today: string; onOpen: () => void }) {
  const { doc } = item;
  const d = doc.decideBy;
  const trust = TRUST[doc.provenance];
  const meta = [item.scope === "state" ? "State" : doc.place.name, DOC_TYPE_LABEL[doc.docType]];
  if (d) meta.push(item.status === "decided" ? decidedLine(d) : decideByLine(d) + (d.date === today ? ", today" : ""));
  return (
    <button type="button" onClick={onOpen} className={`flex w-full gap-4 rounded-md py-4 text-left hover:bg-surface-muted/60 ${FOCUS}`}>
      <DocTile docType={doc.docType} />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="line-clamp-2 block text-body font-semibold">{doc.title}</span>
        <span className="block text-small text-muted-foreground">{meta.join(" · ")}</span>
        {item.topTouching && <span className="line-clamp-1 block font-[family-name:var(--font-serif)] text-small text-muted-foreground">Including: {item.topTouching}</span>}
        <span className="flex flex-wrap items-center gap-2 pt-1">
          {item.touches > 0 ? (
            <Tag pop="accent">
              {item.touches} of {item.total} touch you
            </Tag>
          ) : (
            <span className="text-small text-muted-foreground">Nothing in your answers points here yet</span>
          )}
          <Tag pop={trust.pop}>{trust.label}</Tag>
        </span>
      </span>
    </button>
  );
}

