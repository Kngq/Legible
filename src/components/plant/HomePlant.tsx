"use client";

// The plant in the For you hero: the same CivicPlant, stage, and accessory as
// in the garden, peeking over a short hairline ledge. The bottom of the pot is
// tucked below the line, so only the plant, its face, and the top of the pot
// show above it; nothing sits behind. The plant and its caption ("Your little
// garden →" and, while water is waiting, a small "💧 3"; phones: just "Your
// garden →") are one control. On hover, keyboard focus, or a press the plant
// rises a few pixels to look over the ledge and the caption darkens; a press
// then opens the garden.
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { dropsLabel } from "@/lib/garden";
import type { GrowthStage } from "@/lib/growth";
import { CivicPlant, type PlantSignal } from "./CivicPlant";
import { useGarden } from "./useGarden";
import { WaterDrop } from "./WaterDrop";

const SPRING: Transition = { type: "spring", stiffness: 280, damping: 26, mass: 0.8 };
// The ledge, as a share of the plant's artboard height: just under the smile.
const LEDGE = 0.92;
// Where each stage's drawing starts, in the plant's own units (its viewBox runs -24 to 120, the pot's base at
// 120), measured from the drawn plant with a little room for the hat. With `trim`, the companion's box starts
// here instead of at the top of the artboard, so the plant, not its empty headroom, lines up with the headline.
const TOP: Record<GrowthStage, number> = { 1: 50, 2: 28, 3: 4, 4: -6, 5: -12 };
// Above the drawing, room for its sway, lean, rise, and the little signs over its head; the rest is clipped.
const HEADROOM = 22;

/** `trim`: size the companion to the drawn plant rather than its full artboard (the For you hero on wider screens). */
export function HomePlant({ size, onOpen, trim = false }: { size: number; onOpen: () => void; trim?: boolean }) {
  const g = useGarden();
  const reduce = useReducedMotion() ?? false;
  const [signal, setSignal] = useState<PlantSignal>({ tap: 0, milestone: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Hover (a mouse only), keyboard focus, and a press all lift the plant.
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [down, setDown] = useState(false);
  const up = hover || focus || down;
  const transition: Transition = reduce ? { duration: 0 } : SPRING;
  const art = Math.round((size * 144) / 112);
  const ledge = Math.round(art * LEDGE);
  // How much empty artboard above the plant to leave out of the layout.
  const crop = trim ? Math.max(0, Math.round(((TOP[g.stage] + 24) / 144) * art) - 6) : 0;
  const clipTop = trim ? crop - HEADROOM : -80;

  const water = g.state.water;
  const press = () => {
    setSignal((v) => ({ ...v, tap: v.tap + 1 }));
    // Let the squash land before the garden opens.
    clearTimeout(timer.current);
    timer.current = setTimeout(onOpen, reduce ? 0 : 320);
  };

  return (
    <button
      type="button"
      onClick={press}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => (setHover(false), setDown(false))}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      onFocus={(e) => setFocus(e.currentTarget.matches(":focus-visible"))}
      onBlur={() => setFocus(false)}
      aria-label={water > 0 ? `Your little garden: ${dropsLabel(water)} ready to pour` : "Your little garden"}
      // The negative margin gives the focus ring room without moving anything on the page.
      className="group relative -m-3 flex cursor-pointer flex-col items-center rounded-xl p-3 pb-2 text-muted-foreground outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="relative block" style={{ width: size, height: ledge - crop + 1 }}>
        {/* Below the ledge the plant is hidden; above it (and its lean room to the sides) it is free. */}
        <span className="absolute inset-x-0" style={{ top: -crop, height: art, clipPath: `inset(${clipTop}px -60px ${art - ledge}px -60px)` }}>
          <motion.span
            className="absolute inset-0"
            style={{ transformOrigin: "50% 100%" }}
            initial={false}
            animate={up && !reduce ? { y: -5, rotate: -1 } : { y: 0, rotate: 0 }}
            transition={transition}
          >
            <CivicPlant stage={g.stage} size={size} signal={signal} accessory={g.state.accessory} lively quiet label="" tapOnClick={false} className="-m-6 select-none p-6" />
          </motion.span>
        </span>
        {/* The ledge: a hairline a little wider than the pot, no wider. */}
        <span aria-hidden="true" className="absolute h-px bg-border" style={{ top: ledge - crop, left: size * 0.09, right: size * 0.09 }} />
      </span>
      <span aria-hidden="true" className="mt-1.5 flex flex-col items-center gap-0.5 whitespace-nowrap text-small font-medium">
        <span className={`transition-colors duration-300 ${up ? "text-foreground" : ""}`}>
          Your <span className="hidden sm:inline">little </span>garden{" "}
          <span className={`inline-block transition-transform duration-300 motion-reduce:transition-none ${up ? "translate-x-0.5" : ""}`}>→</span>
        </span>
        {/* Phones keep it to one line; the header's pill already shows the water there. */}
        {water > 0 && (
          <span className="hidden items-center gap-1 text-[0.75rem] tabular-nums opacity-80 sm:inline-flex">
            <WaterDrop size={10} />
            {water}
          </span>
        )}
      </span>
    </button>
  );
}
