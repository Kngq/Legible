"use client";

// "Official text" on a civic item: the saved original's words, where they live,
// and its fingerprint. When no original exists yet (an agenda not posted), it
// says so instead of showing anything else in its place.
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
        {original.file && (
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
