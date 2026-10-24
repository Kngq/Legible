"use client";

// "Your profile": a bottom sheet with the ring, the seven meter items, and the
// one-question screens that fill them. Opens from the avatar, because chips, and
// avatar badges. Everything stays in the browser.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { avatarParts, type AvatarPart } from "@/lib/engine/avatar";
import { nextItem, personalization, type ChecklistItem } from "@/lib/engine/personalization";
import { answerArea, confirmTopics, declineArea, type Profile } from "@/lib/engine/profile";
import { LIFE_AREAS, TOPIC_DEFS, TOPIC_IDS, type FactId, type LifeAreaId } from "@/lib/vocab";
import { AvatarRing } from "./AvatarRing";
import { Glyph } from "./icons";
import { AreaStep, FACT_SHORT, TopicsStep, TownStep, townName } from "./profile-steps";
import { Button, FOCUS } from "./ui";

export type SheetView = { kind: "list" } | { kind: "town" } | { kind: "area"; id: LifeAreaId } | { kind: "topics" };

const EDIT = { kind: "edit" } as const;

export function itemView(item: ChecklistItem): SheetView {
  return item.kind === "area" ? { kind: "area", id: item.id } : { kind: item.kind };
}

export function itemLabel(item: ChecklistItem): string {
  if (item.kind === "town") return "Your town";
  if (item.kind === "topics") return "Subjects you follow";
  return LIFE_AREAS.find((a) => a.id === item.id)!.heading;
}

/** The life area holding a fact, if any. Facts outside the areas are asked on cards. */
export function areaOf(fact: FactId): LifeAreaId | undefined {
  return LIFE_AREAS.find((a) => a.facts.includes(fact))?.id;
}

export function viewForPart(p: AvatarPart): SheetView {
  if (p.kind === "topic") return { kind: "topics" };
  const id = areaOf(p.id);
  return id ? { kind: "area", id } : { kind: "list" };
}

function summary(item: ChecklistItem, p: Profile): string {
  if (item.kind === "town") return townName(p.townId) ?? "";
  if (item.kind === "topics") {
    const on = TOPIC_IDS.filter((t) => p.topics[t]).map((t) => TOPIC_DEFS[t].label);
    return on.length ? on.join(" · ") : "None picked";
  }
  const area = LIFE_AREAS.find((a) => a.id === item.id)!;
  if (area.facts.every((f) => !p.facts[f])) return "Prefer not to say";
  const yes = area.facts.filter((f) => p.facts[f]?.value).map((f) => FACT_SHORT[f]);
  return yes.length ? yes.join(" · ") : "None of these";
}

export function ProfileSheet({
  profile,
  setProfile,
  initial,
  onClose,
  rememberPrompt,
  onKeep,
  onNotNow,
  onSavedBeyondTown,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  initial: SheetView;
  onClose: () => void;
  /** Show the one-line "Keep this on this device?" under the ring. */
  rememberPrompt: boolean;
  onKeep: () => void;
  onNotNow: () => void;
  onSavedBeyondTown: () => void;
}) {
  const [view, setView] = useState<SheetView>(initial);
  const [draft, setDraft] = useState<Profile>(profile);
  const [lastSave, setLastSave] = useState<{ from: number; part?: string; at: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const m = personalization(profile);
  const next = nextItem(profile);

  useEffect(() => {
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const open = (v: SheetView) => {
    setDraft(profile);
    setView(v);
    panel.current?.scrollTo({ top: 0 });
  };

  const save = (p: Profile, part?: string) => {
    setLastSave((prev) => ({ from: m.percent, part, at: (prev?.at ?? 0) + 1 }));
    setProfile(p);
    if (view.kind !== "town") onSavedBeyondTown();
    setView({ kind: "list" });
    panel.current?.scrollTo({ top: 0 });
  };

  let body: ReactNode;
  if (view.kind === "list") {
    const parts = avatarParts(profile);
    body = (
      <>
        <div className="flex flex-col items-center pt-2 text-center">
          <AvatarRing
            key={lastSave?.at ?? 0}
            parts={parts}
            percent={m.percent}
            from={lastSave?.from}
            newest={lastSave?.part}
            size={184}
            onPart={(p) => open(viewForPart(p))}
          />
          <p className="mt-2 text-body text-muted-foreground">
            {m.percent === 100 ? "Your profile is filled in." : `${m.done} of ${m.total} filled in. It all stays in this browser.`}
          </p>
          {rememberPrompt && (
            <div className="mt-3 w-full animate-fade-in rounded-md bg-surface-muted p-3 text-left">
              <p className="text-small">
                <span className="font-semibold">Keep this on this device?</span> It stays in this browser only. Forget me erases it any time.
              </p>
              <div className="mt-2 flex gap-2">
                <Button className="min-h-10! px-4" onClick={onKeep}>
                  Keep
                </Button>
                <Button variant="text" className="min-h-10!" onClick={onNotNow}>
                  Not now
                </Button>
              </div>
            </div>
          )}
          {lastSave && next && (
            <Button variant="text" className="mt-1" onClick={() => open(itemView(next))}>
              Next: {itemLabel(next)}
            </Button>
          )}
        </div>
        <ul className="mt-4 overflow-hidden rounded-lg bg-surface shadow-card">
          {m.items.map((item) => {
            const key = item.kind === "area" ? item.id : item.kind;
            return (
              <li key={key} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => open(itemView(item))}
                  className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted ${FOCUS}`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-primary text-primary-foreground" : "border-2 border-border"}`}
                  >
                    {item.done && <Glyph name="check" size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold">{itemLabel(item)}</span>
                    {item.done && <span className="block truncate text-small text-muted-foreground">{summary(item, profile)}</span>}
                  </span>
                  <span className="shrink-0 text-small font-semibold text-muted-foreground">
                    {item.done ? <span className="sr-only">Edit</span> : "Add"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </>
    );
  } else if (view.kind === "area") {
    const area = LIFE_AREAS.find((a) => a.id === view.id)!;
    body = (
      <AreaStep
        key={area.id}
        area={area}
        profile={profile}
        onNext={(picked) => save(answerArea(profile, area.facts, picked, EDIT), picked.length ? `fact:${picked[picked.length - 1]}` : undefined)}
        onDecline={() => save(declineArea(profile, area.facts, EDIT))}
      />
    );
  } else if (view.kind === "topics") {
    body = (
      <div className="space-y-6">
        <TopicsStep profile={draft} setProfile={(p) => setDraft(p)} />
        <Button
          className="w-full"
          onClick={() => {
            const added = TOPIC_IDS.filter((t) => draft.topics[t] && !profile.topics[t]);
            save(confirmTopics(draft), added.length ? `topic:${added[added.length - 1]}` : undefined);
          }}
        >
          Save
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-6">
        <TownStep profile={draft} setProfile={setDraft} />
        <Button className="w-full" disabled={!draft.townId} onClick={() => save({ ...profile, townId: draft.townId })}>
          Save
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40" role="presentation">
      <button type="button" aria-label="Close your profile" onClick={onClose} className="absolute inset-0 h-full w-full bg-foreground/30" tabIndex={-1} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-sheet-title"
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-lg animate-fade-in overflow-y-auto rounded-t-xl bg-background px-4 pb-8 pt-2 shadow-card outline-none sm:px-6"
      >
        <div aria-hidden="true" className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-border" />
        <header className="sticky top-0 z-10 -mx-4 flex h-14 items-center gap-2 bg-background px-2 sm:-mx-6 sm:px-4">
          {view.kind !== "list" ? (
            <button type="button" onClick={() => setView({ kind: "list" })} aria-label="Back to your profile" className={`flex size-12 items-center justify-center rounded-md hover:bg-surface-muted ${FOCUS}`}>
              <Glyph name="back" />
            </button>
          ) : (
            <span className="size-12" />
          )}
          <h2 id="profile-sheet-title" className="flex-1 text-center text-body font-semibold">
            Your profile
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className={`flex size-12 items-center justify-center rounded-md hover:bg-surface-muted ${FOCUS}`}>
            <Glyph name="close" />
          </button>
        </header>
        <div key={view.kind === "area" ? view.id : view.kind} className="animate-fade-in">
          {body}
        </div>
      </div>
    </div>
  );
}

