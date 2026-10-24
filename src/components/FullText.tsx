"use client";

// The original: the full law as printed in the official booklet. The PDF opens at
// the exact page; "Read it here" loads that page range's text only when asked, so
// long laws (Question 9 runs 41 pages) never weigh down the page.
import { useState } from "react";
import type { DocumentData, Measure } from "@/lib/engine/types";
import { Glyph } from "./icons";
import { FOCUS } from "./ui";

interface PageText {
  page: number;
  text: string;
}

const SERIF = "font-[family-name:var(--font-serif)]";

function pageLabel([from, to]: [number, number]): string {
  return from === to ? `page ${from}` : `pages ${from}–${to}`;
}

/** "Full law · page 41 (PDF)": a small link for cards. */
export function FullTextLink({ measure }: { measure: Measure }) {
  const f = measure.fullText;
  if (!f) return null;
  return (
    <a href={`${f.pdf}#page=${f.pages[0]}`} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 text-small font-semibold ${FOCUS}`}>
      Full law, {pageLabel(f.pages)}
      <Glyph name="external" size={14} />
      <span className="sr-only">(opens the official booklet)</span>
    </a>
  );
}

/** "Fingerprint 0d809a43…339b09, saved Oct 24, 2026": lets anyone check this copy matches the official file. */
export function Fingerprint({ source }: { source: Pick<DocumentData["source"], "hash" | "savedOn"> }) {
  if (!source.hash) return null;
  const saved = source.savedOn ? new Date(`${source.savedOn}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  return (
    <p className="text-small text-muted-foreground">
      <span title={`SHA-256 ${source.hash}`} className="font-mono">
        Fingerprint {source.hash.slice(0, 8)}…{source.hash.slice(-6)}
      </span>
      {saved ? `, saved ${saved}` : ""}
    </p>
  );
}

export function FullText({ measure, source }: { measure: Measure; source?: DocumentData["source"] }) {
  const f = measure.fullText;
  const [pages, setPages] = useState<PageText[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  if (!f) return null;

  const load = async () => {
    if (pages) return setPages(null);
    setState("loading");
    try {
      const res = await fetch(f.pageText);
      const data = (await res.json()) as { pages: PageText[] };
      setPages(data.pages);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <section className="mt-10 rounded-lg bg-surface p-5 shadow-card" aria-labelledby="fulltext-h">
      <h2 id="fulltext-h" className="text-body font-bold">
        The full law, word for word
      </h2>
      <p className="mt-1 text-small text-muted-foreground">
        {f.label}, Information for Voters 2026, {pageLabel(f.pages)}. This is the original the summaries above come from.
      </p>
      {source && (
        <div className="mt-1">
          <Fingerprint source={source} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`${f.pdf}#page=${f.pages[0]}`}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-small font-semibold text-primary-foreground ${FOCUS}`}
        >
          Open the official PDF at page {f.pages[0]}
          <Glyph name="external" size={14} />
        </a>
        <button
          type="button"
          onClick={load}
          aria-expanded={Boolean(pages)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-muted px-5 text-small font-semibold hover:bg-border ${FOCUS}`}
        >
          {pages ? "Hide the text" : state === "loading" ? "Loading…" : "Read it here"}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-small">The text didn&apos;t load. The PDF link above has the same pages.</p>}
      {pages && (
        <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto rounded-md bg-surface-muted p-4">
          <p className="text-small text-muted-foreground">
            Copied from the booklet&apos;s pages. Where a page prints more than one question, the columns run together here; the PDF shows the original layout.
          </p>
          {pages.map((p) => (
            <article key={p.page}>
              <h3 className="text-small font-bold uppercase tracking-wider text-muted-foreground">Page {p.page}</h3>
              <p className={`mt-1 whitespace-pre-line text-small leading-relaxed ${SERIF}`}>{p.text}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
