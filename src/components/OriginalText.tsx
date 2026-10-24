"use client";

// "Official text" on a civic item: the saved original's words, where they live,
// and its fingerprint. When no original exists yet (an agenda not posted), it
// says so instead of showing anything else in its place.
import { useState } from "react";
import type { CivicOriginal } from "@/lib/engine/civic";
import { Fingerprint } from "./FullText";
import { Glyph } from "./icons";
import { FOCUS } from "./ui";

const SERIF = "font-[family-name:var(--font-serif)]";

export function OriginalText({ original }: { original?: CivicOriginal }) {
  if (!original) return null;
  return (
    <section className="mt-8 rounded-lg bg-surface p-5 shadow-card" aria-labelledby="original-h">
      <h2 id="original-h" className="text-body font-bold">
        Official text
      </h2>
      <p className="mt-1 text-small text-muted-foreground">{original.label}</p>
      <Fingerprint source={original} />
      {original.text && (
        <blockquote className={`mt-3 rounded-md bg-surface-muted p-4 text-body leading-relaxed ${SERIF}`}>
          <mark className="bg-accent-soft text-foreground">{original.text}</mark>
        </blockquote>
      )}
      {original.note && <p className="mt-3 text-body">{original.note}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {original.kind === "bill" && original.file && <BillReader file={original.file} />}
        {original.kind !== "bill" && original.file && (
          <a
            href={original.file}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-small font-semibold text-primary-foreground ${FOCUS}`}
          >
            {original.kind === "booklet" ? "Open the booklet page" : "Open the saved copy"}
            <Glyph name="external" size={14} />
          </a>
        )}
        <a
          href={original.url}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-muted px-5 text-small font-semibold hover:bg-border ${FOCUS}`}
        >
          Official page
          <Glyph name="external" size={14} />
        </a>
      </div>
    </section>
  );
}

interface BillCopy {
  bill: string;
  title?: string;
  pinslip: string | null;
  text: string;
  history: { date: string; branch: string; action: string }[];
}

/** The saved bill: its official description, full text, and every action, loaded when asked. */
function BillReader({ file }: { file: string }) {
  const [copy, setCopy] = useState<BillCopy | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const toggle = async () => {
    if (copy) return setCopy(null);
    setState("loading");
    try {
      setCopy((await (await fetch(file)).json()) as BillCopy);
      setState("idle");
    } catch {
      setState("error");
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={Boolean(copy)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-small font-semibold text-primary-foreground ${FOCUS}`}
      >
        {copy ? "Hide the bill" : state === "loading" ? "Loading…" : "Read the bill text"}
      </button>
      {state === "error" && <p className="basis-full text-small">The saved copy didn&apos;t load. The official page has the same text.</p>}
      {copy && (
        <div className="basis-full space-y-4 rounded-md bg-surface-muted p-4">
          {copy.pinslip && (
            <p className="text-small">
              <span className="font-semibold">Official description: </span>
              {copy.pinslip}
            </p>
          )}
          <div className="max-h-[60vh] overflow-y-auto">
            <h3 className="text-small font-bold uppercase tracking-wider text-muted-foreground">Bill text</h3>
            <p className={`mt-1 whitespace-pre-line text-small leading-relaxed ${SERIF}`}>{copy.text}</p>
          </div>
          <div>
            <h3 className="text-small font-bold uppercase tracking-wider text-muted-foreground">Official history</h3>
            <ol className="mt-1 space-y-1 text-small">
              {copy.history.map((h, k) => (
                <li key={k}>
                  <span className="font-semibold">{h.date}</span> · {h.branch}: {h.action}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
