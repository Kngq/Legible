"use client";

// A bill, explained in four parts with the same headings, cited lines, and
// "Show the words" as a ballot question: What it proposes, What would change,
// Who it could affect (with the person's own lines, direct apart from possible),
// and Where it stands. Every line comes from an Explainer the build verified
// against the saved bill text. Nothing here says the bill is law.
// On wide screens it reads as an annotated reader: selecting a line's source
// shows the bill's own words in a pane beside it. Narrow screens keep "Show the
// words" in place under each line.
import { motion, useReducedMotion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import type { CivicCard } from "@/lib/engine/civic";
import { localISODate } from "@/lib/engine/feed";
import type { PageSentence } from "@/lib/engine/measure-page";
import { answerFact, canAskInCard, declineFact, skipFact, type Profile } from "@/lib/engine/profile";
import { personalView } from "@/lib/explain/personal";
import type { CitedLine as Line, Explainer, PersonalRule } from "@/lib/explain/types";
import { allLines } from "@/lib/explain/verify";
import { FACT_DEFS, SENSITIVE_FACTS, type FactId } from "@/lib/vocab";
import { transition } from "@/lib/motion";
import { ChainSheet, CitedLine, OfficialWords, TrustLine, type CiteSource } from "./Citation";
import { Glyph } from "./icons";
import { FactQuestion } from "./MeasureCard";
import { PartLabel } from "./MeasureParts";
import { areaOf, type SheetView } from "./ProfileSheet";
import { Reveal } from "./Reveal";
import { FOCUS, Tag } from "./ui";

const LABEL = "text-small font-semibold text-muted-foreground";
/** One part of the explainer: a hairline and air, not a card. */
const PART = "mt-8 border-t border-border pt-6";

/** The annotated reader needs room for the pane: 1024px and up. */
const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WIDE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}
const ROW = "border-t border-border pt-3 mt-3";
/** How many change groups show before "Show all changes". */
const FIRST_GROUPS = 2;
const FIRST_HISTORY = 3;

export function billCiteSource(e: Explainer): CiteSource {
  const quotes = new Map(e.quotes.map((q) => [q.id, q]));
  const number = e.source.id.replace(/^([HS])/, "$1.");
  return {
    quote: (id) => quotes.get(id),
    title: `Bill ${number}, saved copy`,
    url: e.source.url,
    fingerprint: e.source,
    checkedAgainst: "the saved bill text",
    onFail: "If a single word fails to match, the build stops and the line is never shown.",
    ask: { kind: "bill", id: e.source.id, title: `Bill ${e.source.id}: ${e.source.title}`, url: e.source.url },
  };
}

const because = (r: Pick<PersonalRule, "fact" | "when">) => (r.when ? FACT_DEFS[r.fact].because.yes : FACT_DEFS[r.fact].because.no);

export function BillExplainer({
  card,
  explainer: e,
  profile,
  update,
  onOpenProfile,
}: {
  card: CivicCard;
  explainer: Explainer;
  profile: Profile;
  update: (p: Profile) => void;
  onOpenProfile: (v: SheetView) => void;
}) {
  const [chain, setChain] = useState<PageSentence | null>(null);
  const [allChanges, setAllChanges] = useState(false);
  const [allHistory, setAllHistory] = useState(false);
  const wide = useWide();
  const [active, setActive] = useState<Line | undefined>(e.proposes[0]);
  const src = billCiteSource(e);
  // Keys include the position: a model's draft can repeat a sentence or a label.
  const line = (s: Line, k: number) => (
    <CitedLine key={`${k}-${s.quoteId}`} s={s} src={src} onChain={setChain} pane={wide ? { selected: active === s, onSelect: () => setActive(s) } : undefined} />
  );
  const { matched, open } = personalView(e, profile);
  const askable = open.filter((f) => canAskInCard(profile, f));
  const direct = matched.filter((r) => r.effect === "direct");
  const possible = matched.filter((r) => r.effect === "possible");
  const touches = matched.length > 0;
  const lines = allLines(e);
  const quoteCount = new Set(lines.map((l) => l.quoteId)).size;
  const group = (g: Explainer["changes"][number], k: number) => (
    <div key={`${k}-${g.heading}`} className={ROW}>
      <h4 className={LABEL}>{g.heading}</h4>
      {g.lines.map(line)}
    </div>
  );
  const hidden = e.changes.slice(FIRST_GROUPS).reduce((n, g) => n + g.lines.length, 0);
  const history = [...e.history].reverse();
  const shownHistory = allHistory ? history : history.slice(0, FIRST_HISTORY);
  const source = { kind: "item", itemId: card.item.id } as const;
  const today = localISODate(new Date());
  const notes = e.versionNotes.length > 0 && (
    <ul className="mt-2 space-y-2 rounded-md bg-attention-soft px-3.5 py-3 text-small">
      {e.versionNotes.map((n) => (
        <li key={`${n.entry.date}-${n.text}`}>
          <span className="font-semibold">{n.text}</span>{" "}
          <span className="text-muted-foreground">
            Official history, {n.entry.date} · {n.entry.branch}: {n.entry.action}
          </span>
        </li>
      ))}
    </ul>
  );
  const none = e.personal.length === 0;
  const heading = touches ? `If ${[...new Set(matched.map(because))].join(" and ")}` : none ? "Not tied to your answers" : open.length ? "Could this reach you?" : "Probably not you";

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
      <div className="min-w-0">
      {/* 1 and 2: what the bill would do, cited line by line. */}
      <section aria-label="What it proposes and what would change" className="mt-6">
        <section>
          <PartLabel n={1}>What it proposes</PartLabel>
          {e.proposes.map(line)}
        </section>

        <section className="mt-6">
          <PartLabel n={2}>What would change</PartLabel>
          <p className="mt-1 text-small text-muted-foreground">If it became law. Each line opens the words in the bill it comes from.</p>
          {notes}
          {e.changes.slice(0, FIRST_GROUPS).map(group)}
          <Reveal open={allChanges}>{e.changes.slice(FIRST_GROUPS).map((g, k) => group(g, k + FIRST_GROUPS))}</Reveal>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setAllChanges(!allChanges)}
              aria-expanded={allChanges}
              className={`mt-3 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold underline underline-offset-4 ${FOCUS}`}
            >
              {allChanges ? "Show fewer changes" : `Show ${hidden} more changes`}
            </button>
          )}
        </section>
      </section>

      {/* 3: who it names, then this person's lines, direct apart from possible. */}
      <section className={PART} aria-labelledby="affects-h">
        <PartLabel n={3} id="affects-h">
          Who it could affect
        </PartLabel>
        {e.affects.map(line)}

        <div className={`mt-4 rounded-md p-4 ${touches ? "bg-accent-soft" : "bg-surface-muted"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-body font-bold">{heading}</p>
            {direct.length > 0 && <span className="rounded-sm bg-accent px-2.5 py-1 text-small font-semibold text-accent-foreground">Touches you</span>}
          </div>

          {direct.length > 0 && (
            <div className="mt-2">
              <p className={LABEL}>What the bill text would change for you</p>
              {direct.flatMap((r) => r.lines).map(line)}
            </div>
          )}

          {possible.length > 0 && (
            <div className={direct.length ? ROW : "mt-2"}>
              <p className={LABEL}>What could reach you indirectly</p>
              <p className="text-small text-muted-foreground">Possible effects. The bill does not name your situation; these follow from what it would allow.</p>
              {possible.map((r) => (
                <div key={r.fact}>
                  {r.lines.map(line)}
                  {r.notStated && (
                    <p className="mt-1 flex items-start gap-2 text-small">
                      <span className="mt-0.5 shrink-0" aria-hidden="true">
                        <Glyph name="check" size={14} />
                      </span>
                      <span>
                        {r.notStated.text} <span className="text-muted-foreground">Checked by searching the saved bill.</span>
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!touches && (
            <p className="mt-1.5 text-body">
              {none
                ? "No line here depends on what you told Legible."
                : open.length
                  ? "One answer tells you whether a line here is about your situation."
                  : "Nothing in your answers points to this bill."}
            </p>
          )}

          {matched.length > 0 && (
            <div className={ROW}>
              <p className={LABEL}>Based on what you told Legible</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...new Map(matched.map((r) => [r.fact, r])).values()].map((r) => {
                  const area = areaOf(r.fact);
                  return (
                    <button
                      key={r.fact}
                      type="button"
                      disabled={!area}
                      onClick={() => area && onOpenProfile({ kind: "area", id: area })}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-1.5 text-left text-small font-semibold hover:bg-surface-muted ${FOCUS}`}
                    >
                      Because {because(r)}
                      {area && <span className="font-normal text-muted-foreground">Change</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-small text-muted-foreground">Your answers stay in this browser.</p>
            </div>
          )}

          {askable[0] && <AskFact fact={askable[0]} profile={profile} update={update} source={source} />}
        </div>

        {e.takesEffect.length > 0 && (
          <div className={ROW}>
            <p className={LABEL}>When it would start</p>
            {e.takesEffect.map((t, k) => (
              <div key={`${k}-${t.label}`} className="mt-3">
                <span className="inline-block rounded-sm border border-border px-2.5 py-1 text-small font-semibold">{t.label}</span>
                {t.pastOn && today >= t.pastOn && <span className="ml-2 inline-block rounded-sm bg-attention-soft px-2.5 py-1 text-small font-semibold">Already passed</span>}
                {line(t.line, k)}
                {t.pastOn && today >= t.pastOn && <p className="text-small text-muted-foreground">This date in the saved text has already passed. A final version could set a new one.</p>}
              </div>
            ))}
          </div>
        )}

        <TrustLine lines={lines.length} quotes={quoteCount} provenance={e.provenance} against="the saved bill text" />
      </section>

      {/* 4: the official record, verbatim. */}
      <section className={PART} aria-labelledby="stands-h">
        <PartLabel n={4} id="stands-h">
          Where it stands
        </PartLabel>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Tag pop="attention">Proposed, not law</Tag>
          {card.item.status && <span className="text-body font-semibold">{card.item.status}</span>}
        </div>
        <p className="mt-2 text-body">To become law, the House and the Senate would both have to pass the same version, and then the Governor would act on it.</p>
        {notes}
        <p className={`${ROW} ${LABEL}`}>Official history, newest first</p>
        <ol className="mt-2 space-y-2 text-small">
          {shownHistory.map((h, k) => (
            <li key={k}>
              <span className="font-semibold">{h.date}</span> · {h.branch}: {h.action}
            </li>
          ))}
        </ol>
        {history.length > FIRST_HISTORY && (
          <button type="button" onClick={() => setAllHistory(!allHistory)} aria-expanded={allHistory} className={`mt-2 inline-flex min-h-11 items-center text-small font-semibold underline underline-offset-4 ${FOCUS}`}>
            {allHistory ? "Show fewer" : `Show all ${history.length} actions`}
          </button>
        )}
        <p className="mt-2 text-small text-muted-foreground">From the Legislature, saved {e.source.savedOn}. Words as the Legislature records them.</p>
      </section>

      </div>

      {wide && <SourcePane line={active} src={src} onChain={setChain} />}

      {chain && <ChainSheet s={chain} src={src} onClose={() => setChain(null)} />}
    </div>
  );
}

/**
 * The annotated reader's pane: the selected line's words from the saved bill,
 * marked where the line comes from, with how it was checked and the chain of
 * custody one click away. Sticky beside the explainer on wide screens.
 */
function SourcePane({ line, src, onChain }: { line?: Line; src: CiteSource; onChain: (s: PageSentence) => void }) {
  const reduce = useReducedMotion() ?? false;
  const q = line ? src.quote(line.quoteId) : undefined;
  return (
    <aside aria-label="The bill's words" className="sticky top-24 mt-6 rounded-lg bg-surface p-5 shadow-hairline">
      <div className="flex items-baseline justify-between gap-3">
        <p className={LABEL}>The bill&apos;s words</p>
        {q && (
          <p className="text-small font-semibold text-accent">
            {q.locator}
            {q.page ? `, page ${q.page}` : ""}
          </p>
        )}
      </div>
      <div aria-live="polite">
        {line && q ? (
          <motion.div key={`${line.quoteId}-${line.text}`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: transition("base", reduce) }}>
            <OfficialWords src={src} s={line} />
            <p className="mt-4 flex items-start gap-1.5 border-t border-border pt-3 text-small text-muted-foreground">
              <span className="mt-0.5 shrink-0 text-foreground" aria-hidden="true">
                <Glyph name="check" size={14} />
              </span>
              <span>
                {q.status === "reviewed" ? "Reviewed by a person and found" : "Found"} word for word in {src.checkedAgainst}.
              </span>
            </p>
          </motion.div>
        ) : (
          <p className="mt-2 text-small text-muted-foreground">Select a line&apos;s source to read the bill&apos;s own words here.</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {line && q && (
          <button type="button" onClick={() => onChain(line)} className={`min-h-10 text-small font-semibold underline decoration-border underline-offset-4 interactive hover:decoration-foreground ${FOCUS}`}>
            How do we know this?
          </button>
        )}
        <a href={src.url} target="_blank" rel="noreferrer" className={`inline-flex min-h-10 items-center gap-1 text-small font-semibold text-muted-foreground underline decoration-border underline-offset-4 interactive hover:text-foreground hover:decoration-foreground ${FOCUS}`}>
          Official page
          <Glyph name="external" size={12} />
          <span className="sr-only">(opens the official site)</span>
        </a>
      </div>
    </aside>
  );
}

function AskFact({ fact, profile, update, source }: { fact: FactId; profile: Profile; update: (p: Profile) => void; source: { kind: "item"; itemId: string } }) {
  return (
    <div className="mt-4 rounded-lg bg-surface p-4">
      <p className="text-small font-semibold">One answer decides whether a line here is about you</p>
      <FactQuestion
        fact={fact}
        intro={SENSITIVE_FACTS.includes(fact) ? "Asked only here, because this bill's lines depend on it. Your answer stays in this browser." : "It stays in this browser."}
        onAnswer={(v) => update(answerFact(profile, fact, v, source))}
        onSkip={() => update(skipFact(profile, fact, source))}
        onDecline={() => update(declineFact(profile, fact, source))}
      />
    </div>
  );
}
