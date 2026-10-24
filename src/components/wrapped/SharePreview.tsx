"use client";

// The share preview for "Your ballot, wrapped" (W5). Shows the exact PNG that
// Save image downloads (the same blob) and a plain list of what it holds. The
// town is on by default when known, with a switch; followed topics are opt-in,
// and sensitive subjects stay unchecked until picked. Drawn on this device;
// nothing is uploaded. Choices live in memory only.
import { useEffect, useMemo, useState } from "react";
import { TOPIC_DEFS, type TopicId } from "@/lib/vocab";
import { SENSITIVE_TOPICS, WRAPPED_STRINGS as S } from "@/lib/vocab/wrapped";
import { defaultShareChoices, shareItems, withTimeout, type ShareBase, type ShareChoices } from "@/lib/engine/wrapped-share-layout";
import { FOCUS } from "../ui";
import { downloadBlob, renderShareImage } from "./share-image";

const DRAW_LIMIT_MS = 4000;

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex min-h-11 w-full items-center justify-between gap-3 text-left text-body font-semibold ${FOCUS} rounded-md`}
    >
      {label}
      <span aria-hidden="true" className={`relative h-6 w-10 shrink-0 rounded-full interactive ${on ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-surface shadow-hairline interactive ${on ? "left-[1.125rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function SharePreview({ base, onClose }: { base: ShareBase; onClose: () => void }) {
  const [choices, setChoices] = useState<ShareChoices>(() => defaultShareChoices(base));
  const items = useMemo(() => shareItems(base, choices), [base, choices]);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [state, setState] = useState<"drawing" | "ready" | "error" | "saved">("drawing");

  // Redraw whenever the content changes; the preview is always the image that will be saved.
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setState("drawing");
    withTimeout(renderShareImage(items), DRAW_LIMIT_MS).then(
      (blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
        setState("ready");
      },
      () => alive && setState("error"),
    );
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [items]);

  const toggleTopic = (t: TopicId) =>
    setChoices((c) => ({ ...c, picked: c.picked.includes(t) ? c.picked.filter((x) => x !== t) : [...c.picked, t] }));

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="share-h" className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-background px-6 pb-8 pt-6 animate-fade-in sm:px-8" data-story-ignore>
      <div className="flex items-center justify-between gap-3">
        <h2 id="share-h" className="font-display text-title font-normal">
          {S.shareHeading}
        </h2>
        <button type="button" onClick={onClose} className={`min-h-11 text-small font-semibold underline decoration-border underline-offset-4 hover:decoration-foreground ${FOCUS} rounded-sm`}>
          {S.shareDone}
        </button>
      </div>
      <p className="mt-2 text-small text-muted-foreground">{S.shareIntro}</p>

      <div className="mt-4 flex gap-4">
        <div className="relative aspect-[9/16] w-[42%] max-w-[180px] shrink-0 overflow-hidden rounded-md bg-surface-muted shadow-hairline">
          {/* A blob URL of the drawn image: next/image cannot optimise it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image && <img src={image.url} alt="Preview of the image that will be saved" className={`h-full w-full object-cover interactive ${state === "drawing" ? "opacity-50" : ""}`} />}
          {state === "drawing" && !image && <p className="absolute inset-0 flex items-center justify-center p-2 text-center text-small text-muted-foreground">{S.shareMaking}</p>}
        </div>
        <div className="min-w-0">
          <p className="text-small font-semibold">{S.shareContains}</p>
          <ul className="mt-1 space-y-0.5 text-small text-muted-foreground">
            {items.flatMap((it, i) =>
              it.kind === "countLabel" ? [] : [<li key={`${it.kind}-${i}`}>{it.kind === "count" ? `${it.text} ${items[i + 1]?.text ?? ""}` : it.text}</li>],
            )}
          </ul>
        </div>
      </div>

      <div className="mt-5 divide-y divide-border border-y border-border">
        {base.place && (
          <div className="py-1">
            <Switch label={S.shareTown} on={choices.includePlace} onChange={(v) => setChoices((c) => ({ ...c, includePlace: v }))} />
          </div>
        )}
        {base.followed.length > 0 && (
          <div className="py-1">
            <Switch label={S.shareTopics} on={choices.includeTopics} onChange={(v) => setChoices((c) => ({ ...c, includeTopics: v }))} />
            {choices.includeTopics && (
              <fieldset className="pb-3">
                <legend className="sr-only">{S.shareTopics}</legend>
                <div className="flex flex-wrap gap-2">
                  {base.followed.map((t) => {
                    const on = choices.picked.includes(t);
                    return (
                      <label key={t} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-small font-semibold shadow-hairline has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${on ? "bg-info-soft" : "bg-surface"}`}>
                        <input type="checkbox" checked={on} onChange={() => toggleTopic(t)} className="size-4 accent-[var(--primary)]" />
                        {TOPIC_DEFS[t].label}
                      </label>
                    );
                  })}
                </div>
                {base.followed.some((t) => SENSITIVE_TOPICS.includes(t)) && <p className="mt-2 text-small text-muted-foreground">{S.shareSensitive}</p>}
              </fieldset>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!image || state === "drawing" || state === "error"}
          onClick={() => {
            if (!image) return;
            downloadBlob(image.blob);
            setState("saved");
          }}
          className={`inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 text-body font-semibold text-primary-foreground interactive press hover:bg-primary-hover disabled:bg-surface-muted disabled:text-muted-foreground ${FOCUS}`}
        >
          {S.shareSave}
        </button>
        <p role="status" className="text-small text-muted-foreground">
          {state === "error" ? S.shareError : state === "saved" ? S.shareSaved : ""}
        </p>
      </div>
    </div>
  );
}
