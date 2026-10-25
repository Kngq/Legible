"use client";

// The six story compositions of Ballot stories (first built as "Your ballot, wrapped"). Each slide is one idea on
// its own Notebook surface; variety comes from scale, layout, paper, and line
// illustration, never from a colour standing for a topic or a side. Plum appears
// only where the data supports a personal link (a known town, a decision that may
// affect the person) and on the one primary action; apricot only on the date.
// Content comes from buildStory; nothing here writes a claim of its own.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { SlideModel } from "@/lib/engine/wrapped-slides";
import { constellation, constellationCapacity, countUpValue, type StoryMotion } from "@/lib/engine/wrapped-layout";
import { WRAPPED_STRINGS as S } from "@/lib/vocab/wrapped";
import { Part } from "../icons";
import { FOCUS } from "../ui";
import css from "./wrapped.module.css";

export type SlideAction = { kind: "measure"; href: string } | { kind: "profile" } | { kind: "topics" } | { kind: "save" } | { kind: "explore" };

/** The default share image, drawn on the device by the player for the closing slide. */
export interface SharePicture {
  url?: string;
  alt: string;
}

interface Props {
  motion: StoryMotion;
  onAction: (a: SlideAction) => void;
  share: SharePicture;
}

/** Stagger index for the rise animation. */
const at = (i: number): CSSProperties => ({ ["--i" as string]: i });

const PAGE = "relative flex h-full flex-col overflow-hidden px-6 pb-24 pt-[4.75rem] sm:px-8";
const HEADING = "font-display text-[2rem] leading-[1.04] tracking-[-0.02em] text-balance sm:text-[2.25rem] [@media(max-height:640px)]:text-[1.625rem]";
const TEXT_LINK = `inline-flex min-h-11 items-center gap-1 font-semibold underline decoration-border underline-offset-4 interactive hover:decoration-foreground ${FOCUS}`;

function Arrow() {
  return (
    <span aria-hidden="true" className="nudge">
      →
    </span>
  );
}

function useCountUp(target: number, ms: number): number {
  const [v, setV] = useState(ms > 0 ? 0 : target);
  useEffect(() => {
    if (ms <= 0) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const n = countUpValue(target, t - t0, ms);
      setV(n);
      if (n < target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return ms > 0 ? v : target;
}

/* 1. Opening ------------------------------------------------------------- */

function NineBoxes() {
  return (
    <div className="grid grid-cols-3 gap-2.5" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex aspect-square items-center justify-center rounded-sm font-display text-[1.375rem] shadow-[inset_0_0_0_1.5px_var(--foreground)]">
          {i + 1}
        </span>
      ))}
    </div>
  );
}

function Opening({ s }: { s: Extract<SlideModel, { id: "opening" }> }) {
  const sheet = (style: CSSProperties, extra = "") => <div className={`${css.drift} absolute rounded-lg bg-surface shadow-card ${extra}`} style={style} aria-hidden="true" />;
  return (
    <section className={`${PAGE} bg-surface-muted ${css.grain}`}>
      <h2 className={`${css.settle} font-display text-[clamp(3.25rem,16vw,5.25rem)] leading-[0.9] tracking-[-0.035em]`}>{s.heading}</h2>
      <p className={`${css.rise} mt-5 max-w-[15em] font-display text-[1.375rem] italic leading-snug text-muted-foreground`} style={at(2)}>
        {s.line}
      </p>
      {/* Layered paper with the nine questions sketched on the top sheet. */}
      <div className="relative mx-auto mt-auto h-[44%] min-h-[190px] w-full max-w-[320px]">
        {sheet({ left: "8%", right: "14%", top: "14%", bottom: "-6%", ["--r" as string]: "-7deg", transform: "rotate(-7deg)", ["--drift-s" as string]: "9s" }, "opacity-70")}
        {sheet({ left: "18%", right: "4%", top: "6%", bottom: "0%", ["--r" as string]: "4deg", transform: "rotate(4deg)", ["--drift-s" as string]: "11s", ["--drift-d" as string]: "-3s" }, "opacity-85")}
        <div className={`${css.rise} absolute inset-x-[12%] bottom-[4%] top-0 -rotate-1 rounded-lg bg-surface p-5 shadow-card`} style={at(3)}>
          <p className="text-small font-semibold text-muted-foreground">{s.ballotLabel}</p>
          <div className="mt-3 w-[72%]">
            <NineBoxes />
          </div>
        </div>
      </div>
      {/* Touch screens see "Tap to begin"; a mouse and keyboard see the keys. */}
      <p className={`${css.breathe} mt-6 flex items-center gap-2 text-small font-semibold`} aria-hidden="true">
        <span className="[@media(pointer:fine)]:hidden">
          {s.hint} <span className="text-base">→</span>
        </span>
        <span className="hidden [@media(pointer:fine)]:inline">{S.openingHintKeys}</span>
      </p>
    </section>
  );
}

/* 2. Your world ---------------------------------------------------------- */

function Contours({ known }: { known: boolean }) {
  // An abstract map: loose rings around a pin, like contour lines on a field map.
  const rings = [38, 62, 88, 116, 146, 178];
  return (
    <svg className="absolute -right-24 top-6 h-[360px] w-[360px] text-border" viewBox="-200 -200 400 400" aria-hidden="true">
      {rings.map((r, i) => (
        <path
          key={r}
          className={css.draw}
          pathLength={1}
          style={at(i)}
          d={`M ${-r} 0 C ${-r} ${-r * 0.62}, ${-r * 0.5} ${-r * 0.96}, ${r * 0.08} ${-r * 0.92} S ${r * 1.04} ${-r * 0.38}, ${r * 0.96} ${r * 0.12} S ${r * 0.42} ${r * 1.02}, ${-r * 0.12} ${r * 0.94} S ${-r} ${r * 0.5}, ${-r} 0 Z`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
        />
      ))}
      <circle r={9} className={known ? "fill-accent" : "fill-none stroke-foreground"} strokeWidth={2} />
      <circle r={20} fill="none" className={known ? "stroke-accent" : "stroke-foreground"} strokeOpacity={0.35} strokeWidth={1.5} />
    </svg>
  );
}

function World({ s, motion }: { s: Extract<SlideModel, { id: "world" }>; motion: StoryMotion }) {
  const n = useCountUp(s.questionCount, motion.countUp);
  return (
    <section className={`${PAGE} bg-background`}>
      <Contours known={s.placeKnown} />
      <p className={`${css.rise} relative flex items-center gap-2 text-small font-semibold uppercase tracking-[0.12em]`} style={at(0)}>
        <span aria-hidden="true" className={`size-2 rounded-full ${s.placeKnown ? "bg-accent" : "shadow-[inset_0_0_0_1.5px_var(--foreground)]"}`} />
        {s.place}
      </p>
      <h2 className={`${css.rise} relative mt-3 max-w-[12em] ${HEADING}`} style={at(1)}>
        {s.heading}
      </h2>
      <div className="relative mt-auto">
        <p className={`${css.rise} flex items-end gap-3`} style={at(2)}>
          <span className="font-display text-[clamp(7rem,38vw,10rem)] leading-[0.8] tracking-[-0.05em] tabular-nums" aria-hidden="true">
            {n}
          </span>
          <span className="mb-2 max-w-[7em] text-title font-semibold leading-tight">{s.countLabel}</span>
          <span className="sr-only">
            {s.questionCount} {s.countLabel}
          </span>
        </p>
        {s.statewide && (
          <p className={`${css.rise} mt-4 max-w-[22em] text-small text-muted-foreground`} style={at(3)}>
            {s.statewide}
          </p>
        )}
        {s.dateLabel && (
          <p className={`${css.rise} mt-4 inline-flex items-center gap-2 rounded-sm bg-attention-soft px-2.5 py-1 text-small font-semibold text-foreground`} style={at(4)}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-attention" />
            {s.dateLabel}
          </p>
        )}
        <p className={`${css.rise} mt-6 font-display text-[1.375rem] italic leading-snug`} style={at(5)}>
          {s.line}
        </p>
      </div>
    </section>
  );
}

/* 3. What connects to you ------------------------------------------------ */

const SLIP_TILT = ["-rotate-[1.2deg]", "rotate-[0.8deg]", "-rotate-[0.4deg]"];

function Connects({ s, onAction }: { s: Extract<SlideModel, { id: "connects" }>; onAction: Props["onAction"] }) {
  const personal = s.mode === "personal";
  return (
    <section className={`${PAGE} ${personal ? "bg-accent-soft" : "bg-background"}`}>
      <h2 className={`${css.rise} ${HEADING}`} style={at(0)}>
        {s.heading}
      </h2>
      <p className={`${css.rise} mt-3 max-w-[26em] text-small text-muted-foreground`} style={at(1)}>
        {s.intro}
      </p>
      <ol className={`relative -mx-2 mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-3 pt-1 [scrollbar-width:none] ${s.items.length < 3 ? "justify-center" : "[mask-image:linear-gradient(to_bottom,#000_86%,transparent)]"}`} data-story-scroll>
        {s.items.map((it, i) => (
          <li key={it.measureId} className={`${css.rise} relative`} style={at(i + 2)}>
            {s.items.length === 1 && <span aria-hidden="true" className="absolute inset-x-3 -bottom-3 top-3 rotate-[2.5deg] rounded-lg bg-surface/60 shadow-card" />}
            <button
              type="button"
              onClick={() => onAction({ kind: "measure", href: it.href })}
              className={`group relative block w-full rounded-lg bg-surface p-4 text-left shadow-card interactive hover:rotate-0 ${SLIP_TILT[i % 3]} ${FOCUS}`}
            >
              <span className="flex flex-wrap items-center gap-x-2 text-small font-semibold text-muted-foreground">
                <span>{it.number}</span>
                <span aria-hidden="true">·</span>
                <span>{it.status.label}</span>
              </span>
              <span className="mt-1 block font-display text-[1.3125rem] leading-[1.15] text-balance">{it.title}</span>
              {it.reasons.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {it.reasons.map((r) => (
                    <span key={r} className="rounded-sm bg-accent-soft px-2 py-0.5 text-small font-semibold text-foreground">
                      {r}
                    </span>
                  ))}
                </span>
              )}
              {it.sentence && <span className="mt-2 line-clamp-2 block text-small text-muted-foreground">{it.sentence.text}</span>}
              <span className="sr-only">. {it.status.detail}</span>
            </button>
          </li>
        ))}
      </ol>
      {s.action && (
        <button type="button" onClick={() => onAction({ kind: "profile" })} className={`${css.rise} mt-2 self-start text-small ${TEXT_LINK}`} style={at(6)}>
          {s.action} <Arrow />
        </button>
      )}
    </section>
  );
}

/* 4. On your radar ------------------------------------------------------- */

const LABEL_SIZE = ["text-[1.625rem]", "text-[1.3125rem]", "text-[1.0625rem]"];

function Radar({ s, motion, onAction }: { s: Extract<SlideModel, { id: "radar" }>; motion: StoryMotion; onAction: Props["onAction"] }) {
  const examples = s.mode === "examples";
  // Only as many subjects as the field can hold without crowding; the rest are counted.
  const field = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState(4);
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCap(constellationCapacity(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const topics = s.topics.slice(0, cap);
  const hidden = s.total - topics.length;
  const pts = constellation(topics.length);
  return (
    <section className={`${PAGE} ${examples ? "bg-background" : "bg-info-soft"}`}>
      <h2 className={`${css.rise} ${HEADING}`} style={at(0)}>
        {s.heading}
      </h2>
      <p className={`${css.rise} mt-3 max-w-[26em] text-small text-muted-foreground`} style={at(1)}>
        {s.intro}
      </p>
      <div ref={field} className="relative mt-2 min-h-0 flex-1">
        {/* Hairline arcs from a small centre star to each subject. */}
        <svg className={`absolute inset-0 h-full w-full ${examples ? "text-muted-foreground/50" : "text-foreground/40"}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {pts.map((p, i) => {
            // Each arc stops short of its label, so lines never run under the words.
            const ex = 50 + (p.x - 50) * 0.62;
            const ey = 50 + (p.y - 50) * 0.62;
            const cx = (50 + ex) / 2 + (i % 2 ? 6 : -6);
            const cy = (50 + ey) / 2;
            return (
              <path
                key={i}
                className={css.draw}
                pathLength={1}
                style={at(i)}
                d={`M 50 50 Q ${cx} ${cy} ${ex} ${ey}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={0.35}
                strokeDasharray={examples ? "1.2 1.6" : undefined}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <svg className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-foreground" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2c.6 4.6 2.4 6.9 7 8-4.6 1.1-6.4 3.4-7 8-.6-4.6-2.4-6.9-7-8 4.6-1.1 6.4-3.4 7-8Z" fill="currentColor" />
        </svg>
        <ul className="absolute inset-0">
          {topics.map((t, i) => {
            const p = pts[i];
            const style: CSSProperties = { left: `${p.x}%`, top: `${p.y}%`, ["--float-d" as string]: `-${p.delay}s`, ["--float-s" as string]: `${6 + (i % 3)}s`, transform: "translate(-50%, -50%)" };
            return (
              <li key={t.id} className={`absolute max-w-[46%] ${motion.drift ? css.float : ""}`} style={style}>
                <span className={`${css.rise} flex flex-col items-center text-center`} style={at(i + 2)}>
                  <span
                    aria-hidden="true"
                    className={`flex items-center justify-center rounded-full ${p.size === 0 ? "size-11" : "size-9"} ${examples ? "bg-background text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]" : "bg-surface text-foreground shadow-hairline"}`}
                  >
                    <Part name={t.part} size={p.size === 0 ? 24 : 20} strokeWidth={1.5} />
                  </span>
                  <span className={`mt-1 rounded-md px-1.5 font-display leading-[1.05] text-balance ${LABEL_SIZE[p.size]} ${examples ? "bg-background text-muted-foreground" : "bg-info-soft"}`}>{t.label}</span>
                  {t.count && <span className="mt-0.5 text-small font-semibold text-muted-foreground">{t.count}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {hidden > 0 && <p className="text-center text-small font-semibold text-muted-foreground">{S.radarMore(hidden)}</p>}
      {/* Followed subjects with no ballot question: said plainly, as an aside, never the slide's ending. */}
      {s.also && (
        <div className={`${css.rise} mt-2`} style={at(7)}>
          <p className="text-small text-muted-foreground">{s.also.label}</p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {s.also.topics.map((t) => (
              <span key={t} className="rounded-sm bg-surface px-2 py-0.5 text-small font-semibold text-foreground shadow-hairline">
                {t}
              </span>
            ))}
          </p>
        </div>
      )}
      {s.note && (
        <p className={`${css.rise} mt-3 font-display text-[1.0625rem] italic`} style={at(8)}>
          {s.note}
        </p>
      )}
      {s.action && (
        <button type="button" onClick={() => onAction({ kind: "topics" })} className={`${css.rise} mt-1 self-start text-small ${TEXT_LINK}`} style={at(8)}>
          {s.action} <Arrow />
        </button>
      )}
    </section>
  );
}

/* 5. One decision to explore --------------------------------------------- */

function Closer({ s, onAction }: { s: Extract<SlideModel, { id: "closer" }>; onAction: Props["onAction"] }) {
  const d = s.decision;
  return (
    <section className={`${PAGE} bg-surface`}>
      {d && (
        <span aria-hidden="true" className="pointer-events-none absolute right-6 top-[5.5rem] font-display text-[10rem] leading-none tracking-[-0.04em] text-surface-muted">
          {d.number.replace(/\D+/g, "")}
        </span>
      )}
      <h2 className={`${css.rise} relative text-small font-semibold uppercase tracking-[0.12em] text-muted-foreground`} style={at(0)}>
        {s.heading}
      </h2>
      {d ? (
        <div className="relative mt-auto flex min-h-0 flex-col">
          <p className={`${css.rise} flex flex-wrap items-center gap-x-2 text-small font-semibold`} style={at(1)}>
            <span className={`inline-flex items-center gap-1.5 ${d.basisPersonal ? "text-accent" : "text-muted-foreground"}`}>
              {d.basisPersonal && <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />}
              {d.basis}
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <span className="text-muted-foreground">{d.number}</span>
          </p>
          <h3 className={`${css.settle} mt-2 font-display text-[clamp(2.125rem,10vw,2.75rem)] leading-[1.02] tracking-[-0.025em] text-balance`}>{d.title}</h3>
          <div className={`${css.rise} mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 [@media(max-height:640px)]:mt-2`} style={at(3)}>
            <span className="rounded-sm px-2 py-0.5 text-small font-semibold shadow-[inset_0_0_0_1.5px_var(--foreground)]">{d.status.label}</span>
            <span className="text-small text-muted-foreground">{d.status.detail}</span>
          </div>
          <div className="mt-4 min-h-0 space-y-3 overflow-y-auto [@media(max-height:640px)]:mt-2" data-story-scroll>
            {d.factsLabel && (
              <p className={`${css.rise} text-small font-semibold text-muted-foreground`} style={at(4)}>
                {d.factsLabel}
              </p>
            )}
            {d.sentences.map((x, i) => (
              <p key={x.quoteId + i} className={`${css.rise} border-l-2 border-border pl-3`} style={at(5 + i)}>
                <span className="block text-body leading-snug">{x.text}</span>
                <span className="mt-1 block text-small font-semibold text-muted-foreground">{x.source}</span>
              </p>
            ))}
            {d.noSummary && <p className="text-body text-muted-foreground">{d.noSummary}</p>}
          </div>
          <div className={`${css.rise} mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 [@media(max-height:640px)]:mt-3`} style={at(7)}>
            <button
              type="button"
              onClick={() => onAction({ kind: "measure", href: d.href })}
              className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-body font-semibold text-primary-foreground interactive press hover:bg-primary-hover ${FOCUS}`}
            >
              {d.action} <Arrow />
            </button>
            {/* The Secretary's page for the question, in a new tab so the story stays where it is. */}
            {d.official && (
              <a href={d.official.url} target="_blank" rel="noopener noreferrer" className={`group text-small ${TEXT_LINK}`}>
                {d.official.label}
                <span aria-hidden="true">↗</span>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* 6. Your shareable moment ----------------------------------------------- */

function Closing({ s, share, onAction }: { s: Extract<SlideModel, { id: "closing" }>; share: SharePicture; onAction: Props["onAction"] }) {
  return (
    <section className={`${PAGE} bg-positive-soft ${css.grain}`}>
      <h2 className={`${css.rise} ${HEADING}`} style={at(0)}>
        {s.heading}
      </h2>
      {/* The default share image itself, so what is shown is what would be saved. */}
      <div className={`${css.rise} relative my-3 flex min-h-0 flex-1 items-center justify-center`} style={at(2)}>
        <div className="relative aspect-[9/16] h-full max-h-[460px]">
          <span aria-hidden="true" className={`${css.drift} absolute inset-0 rounded-md bg-surface-muted shadow-card`} style={{ transform: "rotate(5deg)", ["--r" as string]: "5deg" }} />
          <div className="absolute inset-0 -rotate-2 overflow-hidden rounded-md bg-info-soft shadow-card">
            {/* A blob URL of the drawn image: next/image cannot optimise it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {share.url ? <img src={share.url} alt={share.alt} className="h-full w-full object-cover" /> : <span className="sr-only">{share.alt}</span>}
          </div>
        </div>
      </div>
      <p className={`${css.rise} max-w-[24em] text-small text-muted-foreground`} style={at(3)}>
        {s.note}
      </p>
      <div className={`${css.rise} mt-3 flex flex-wrap items-center gap-x-4 gap-y-1`} style={at(4)}>
        <button
          type="button"
          onClick={() => onAction({ kind: "save" })}
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-body font-semibold text-primary-foreground interactive press hover:bg-primary-hover ${FOCUS}`}
        >
          {s.save}
        </button>
        <button type="button" onClick={() => onAction({ kind: "explore" })} className={`group ${TEXT_LINK} text-body`}>
          {s.explore} <Arrow />
        </button>
      </div>
    </section>
  );
}

/** One slide, by id. */
export function Slide({ s, motion, onAction, share }: { s: SlideModel } & Props): ReactNode {
  switch (s.id) {
    case "opening":
      return <Opening s={s} />;
    case "world":
      return <World s={s} motion={motion} />;
    case "connects":
      return <Connects s={s} onAction={onAction} />;
    case "radar":
      return <Radar s={s} motion={motion} onAction={onAction} />;
    case "closer":
      return <Closer s={s} onAction={onAction} />;
    case "closing":
      return <Closing s={s} share={share} onAction={onAction} />;
  }
}
