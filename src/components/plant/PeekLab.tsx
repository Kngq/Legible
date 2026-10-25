"use client";

// Dev preview: ways for the For you plant to peek past the edge of something,
// with no decoration behind it. 1: over a hairline ledge, its base tucked below
// the line. 2: rising out of a soft tile, its crown breaking the top-right
// corner. 3: sitting in a soft porthole, everything above the rim free. Each in
// a slice of the For you hero at desktop and phone width; hover (or "Hold
// hover") lifts the plant a little further out. Nothing here touches the
// garden or the homepage.
import { motion, useReducedMotion, type Transition } from "motion/react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { ACCESSORIES, type AccessoryId } from "@/lib/garden";
import { stageDef, type GrowthStage } from "@/lib/growth";
import { CivicPlant, type PlantSignal } from "./CivicPlant";
import { WaterDrop } from "./WaterDrop";

type Variant = "ledge" | "tile" | "porthole";
const SPRING: Transition = { type: "spring", stiffness: 280, damping: 26, mass: 0.8 };

/** The frame for each variant: what sits behind, how the plant is clipped, where it rests, and how far it rises. */
function frame(variant: Variant, S: number, A: number) {
  if (variant === "ledge") {
    const line = Math.round(A * 0.92); // the ledge, just under the smile
    return {
      height: line + 1,
      rise: 6,
      clip: `inset(-80px -60px ${A - line}px -60px)`,
      behind: null,
      front: <span className="absolute -inset-x-4 h-px bg-border" style={{ top: line }} />,
    };
  }
  if (variant === "tile") {
    const top = Math.round(A * 0.66); // just under the pot's rim
    return {
      height: A + 6,
      rise: 4,
      clip: undefined,
      behind: <span className="absolute rounded-[1.25rem] bg-surface-muted" style={{ left: -S * 0.14, right: S * 0.04, top, bottom: 0 }} />,
      front: null,
    };
  }
  // Porthole: below its centre the plant is clipped to the circle; above, it is free.
  const d = Math.round(S * 0.8);
  const r = d / 2;
  const cx = S / 2;
  const cy = A + 6 - r;
  const clip = `path("M -60,-80 H ${S + 60} V ${cy} H ${cx + r} A ${r} ${r} 0 0 1 ${cx - r} ${cy} H -60 Z")`;
  return {
    height: A + 6,
    sink: 0,
    rise: 6,
    clip,
    behind: <span className="absolute rounded-full bg-surface-muted" style={{ left: cx - r, top: cy - r, width: d, height: d }} />,
    front: null,
  };
}

function Companion({ variant, size, stage, accessory, water, hold }: { variant: Variant; size: number; stage: GrowthStage; accessory: AccessoryId; water: number; hold: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const [signal, setSignal] = useState<PlantSignal>({ tap: 0, milestone: 0 });
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [down, setDown] = useState(false);
  const up = hold || hover || focus || down;
  const A = Math.round((size * 144) / 112);
  const f = frame(variant, size, A);
  const transition: Transition = reduce ? { duration: 0 } : SPRING;
  const clipStyle: CSSProperties = f.clip ? { clipPath: f.clip } : {};

  return (
    <button
      type="button"
      onClick={() => setSignal((v) => ({ ...v, tap: v.tap + 1 }))}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => (setHover(false), setDown(false))}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      onFocus={(e) => setFocus(e.currentTarget.matches(":focus-visible"))}
      onBlur={() => setFocus(false)}
      aria-label={water > 0 ? `Your little garden: ${water} drops ready to pour` : "Your little garden"}
      className="group relative -m-3 flex cursor-pointer flex-col items-center rounded-xl p-3 pb-2 text-muted-foreground outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="relative block" style={{ width: size, height: f.height }}>
        {f.behind}
        <span className="absolute inset-x-0 top-0" style={{ height: A, ...clipStyle }}>
          <motion.span
            className="absolute inset-0"
            style={{ transformOrigin: "50% 100%" }}
            initial={false}
            animate={up && !reduce ? { y: -f.rise, rotate: -1.5 } : { y: 0, rotate: 0 }}
            transition={transition}
          >
            <CivicPlant stage={stage} size={size} signal={signal} accessory={accessory} lively quiet label="" tapOnClick={false} className="-m-6 select-none p-6" />
          </motion.span>
        </span>
        {f.front}
      </span>
      <span aria-hidden="true" className="mt-1.5 flex flex-col items-center gap-0.5 whitespace-nowrap text-small font-medium">
        <span className={`transition-colors duration-300 ${up ? "text-foreground" : ""}`}>
          Your <span className={size > 100 ? "" : "hidden"}>little </span>garden{" "}
          <span className={`inline-block transition-transform duration-300 motion-reduce:transition-none ${up ? "translate-x-0.5" : ""}`}>→</span>
        </span>
        {water > 0 && size > 100 && (
          <span className="inline-flex items-center gap-1 text-[0.75rem] tabular-nums opacity-80">
            <WaterDrop size={10} />
            {water}
          </span>
        )}
      </span>
    </button>
  );
}

/** A slice of the For you hero, at one width, with the companion where it sits on the page. */
function Hero({ wide, children }: { wide: boolean; children: ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-lg bg-background ring-1 ring-border ${wide ? "w-full max-w-2xl px-6 pb-8 pt-10" : "w-[375px] shrink-0 px-4 pb-6 pt-6"}`}>
      <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 ${wide ? "sm:gap-x-10" : ""}`}>
        <div className={`min-w-0 ${wide ? "self-end" : ""}`}>
          <h2 className={`font-display tracking-[-0.02em] text-balance ${wide ? "text-headline leading-[1.1]" : "text-[1.875rem] leading-[1.08]"}`}>
            Your corner of <span className="font-medium">Somerville</span>.
          </h2>
        </div>
        <div className={`col-start-2 row-start-1 flex flex-col items-center ${wide ? "row-span-2 self-end" : ""}`}>{children}</div>
        <div className={`row-start-2 mt-3 ${wide ? "col-start-1" : "col-span-2"}`}>
          <p className="max-w-md text-body text-muted-foreground">Understand what&rsquo;s happening around you, one decision at a time.</p>
        </div>
      </div>
      <p className="mt-10 text-body font-bold">Coming up</p>
    </div>
  );
}

const VARIANTS: { id: Variant; name: string; line: string }[] = [
  { id: "ledge", name: "1. Over the ledge", line: "A hairline; the pot's base is tucked below it, so the plant peeks over. On hover it rises to look a little higher." },
  { id: "tile", name: "2. Breaking the tile", line: "A soft tile in the app's muted tint; the pot sits in it and the plant's crown breaks past the top-right corner." },
  { id: "porthole", name: "3. Porthole", line: "A soft circle; the pot sits inside, its base following the curve, and everything above the rim is free." },
];

const chip = (on: boolean) => `min-h-10 rounded-full px-4 text-small font-semibold ${on ? "bg-foreground text-background" : "bg-surface-muted"}`;

export function PeekLab() {
  const [stage, setStage] = useState<GrowthStage>(1);
  const [accessory, setAccessory] = useState<AccessoryId>("none");
  const [hold, setHold] = useState(false);
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-small font-semibold uppercase tracking-wide text-muted-foreground">Development preview</p>
      <h1 className="mt-1 font-display text-headline">The For you plant, peeking out</h1>
      <p className="mt-2 max-w-prose text-body text-muted-foreground">The same live plant, no decoration behind it, peeking past an edge three ways. Hover, tab to, or press each. Nothing here touches your garden.</p>

      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Stage">
        {([1, 2, 3, 4, 5] as GrowthStage[]).map((s) => (
          <button key={s} type="button" aria-pressed={stage === s} onClick={() => setStage(s)} className={chip(stage === s)}>
            {stageDef(s).name}
          </button>
        ))}
        <span className="mx-2 h-6 w-px bg-border" />
        {ACCESSORIES.map((a) => (
          <button key={a.id} type="button" aria-pressed={accessory === a.id} onClick={() => setAccessory(a.id)} className={chip(accessory === a.id)}>
            {a.id === "none" ? "No accessory" : a.id}
          </button>
        ))}
        <span className="mx-2 h-6 w-px bg-border" />
        <button type="button" aria-pressed={hold} onClick={() => setHold((v) => !v)} className={chip(hold)}>
          Hold hover
        </button>
      </div>

      {VARIANTS.map((v) => (
        <section key={v.id} aria-labelledby={`h-${v.id}`} className="mt-10">
          <h2 id={`h-${v.id}`} className="text-body font-bold">{v.name}</h2>
          <p className="mt-1 max-w-prose text-small text-muted-foreground">{v.line}</p>
          <div className="mt-4 flex flex-wrap items-start gap-6">
            <Hero wide>
              <Companion variant={v.id} size={144} stage={stage} accessory={accessory} water={3} hold={hold} />
            </Hero>
            <Hero wide={false}>
              <Companion variant={v.id} size={84} stage={stage} accessory={accessory} water={3} hold={hold} />
            </Hero>
          </div>
        </section>
      ))}
    </main>
  );
}
