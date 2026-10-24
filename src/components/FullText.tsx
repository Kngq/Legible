"use client";

// The original: the full law as printed in the official booklet. The PDF opens at
// the exact page; "Read it here" loads that page range's text only when asked, so
// long laws (Question 9 runs 41 pages) never weigh down the page.
import { useState } from "react";
import { reflow } from "@/lib/engine/reflow";
import type { DocumentData, Measure } from "@/lib/engine/types";
import { Glyph } from "./icons";
import { READ, Reader } from "./Reader";
import { FOCUS } from "./ui";

interface PageText {
  page: number;
  text: string;
}

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

/**
 * "Saved Oct 24, 2026 · ID 0d809a43…339b09": when the copy was saved, and a short
 * ID (its SHA-256) that changes if a single character of the file changes, so
 * anyone can check this copy matches the official file.
 */
export function Fingerprint({ source }: { source: Pick<DocumentData["source"], "hash" | "savedOn"> }) {
  if (!source.hash) return null;
  const saved = source.savedOn ? new Date(`${source.savedOn}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  return (
    <p className="text-small text-muted-foreground">
      {saved ? `Saved ${saved} · ` : ""}
      <span
        title={`File ID (SHA-256): ${source.hash}. It changes if a single character of the file changes, so you can check this copy matches the official one.`}
        className="font-mono"
      >
        ID {source.hash.slice(0, 8)}…{source.hash.slice(-6)}
      </span>
    </p>
  );
}

export function FullText({ measure, source }: { measure: Measure; source?: DocumentData["source"] }) {
  const f = measure.fullText;
  const [pages, setPages] = useState<PageText[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [open, setOpen] = useState(false);
  if (!f) return null;

  const load = async () => {
    if (pages) return setOpen(true);
    setState("loading");
    try {
      const res = await fetch(f.pageText);
      const data = (await res.json()) as { pages: PageText[] };
      setPages(data.pages);
      setOpen(true);
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
          aria-haspopup="dialog"
          className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-muted px-5 text-small font-semibold hover:bg-border ${FOCUS}`}
        >
          {state === "loading" ? "Loading…" : "Read it here"}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-small">The text didn&apos;t load. The PDF link above has the same pages.</p>}
      {open && pages && (
        <Reader
          kicker={`Question ${measure.number} · ${f.label}`}
          title={measure.title}
          meta={
            <>
              <p>Information for Voters 2026, {pageLabel(f.pages)}. Line breaks are joined for reading; the words are the booklet&apos;s.</p>
              {source && <Fingerprint source={source} />}
            </>
          }
          onClose={() => setOpen(false)}
          askSource={{ kind: "ballot", id: measure.id, title: `Question ${measure.number}: ${measure.title}`, locator: f.label, url: measure.sourceUrl }}
          footer={
            <a href={`${f.pdf}#page=${f.pages[0]}`} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-small font-semibold text-primary-foreground ${FOCUS}`}>
              See the original layout in the PDF
              <Glyph name="external" size={14} />
            </a>
          }
        >
          {pages.map((p) => (
            <section key={p.page} aria-label={`Page ${p.page}`} data-ask-page={p.page} className="space-y-5">
              <p className="text-small font-semibold uppercase tracking-wider text-muted-foreground">Page {p.page}</p>
              {reflow(p.text).map((para, k) => (
                <p key={k} className={READ}>
                  {para}
                </p>
              ))}
            </section>
          ))}
        </Reader>
      )}
    </section>
  );
}
