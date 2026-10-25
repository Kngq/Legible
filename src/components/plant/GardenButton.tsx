"use client";

// The way into the garden from every screen: a small pill in the header with
// the plant at its stage and the water ready to pour. When exploring earns
// water, a quiet "+3" floats up from it and a screen reader hears one polite
// line. No pop-ups, nothing that covers what the person is reading.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { dropsLabel } from "@/lib/garden";
import { FOCUS } from "../ui";
import { CivicPlant } from "./CivicPlant";
import { useGarden } from "./useGarden";
import { WaterDrop } from "./WaterDrop";

export function GardenButton({ onOpen, active }: { onOpen: () => void; active?: boolean }) {
  const g = useGarden();
  const reduce = useReducedMotion() ?? false;
  // Show the note only for rewards earned while this header is on screen.
  const [seen, setSeen] = useState(g.earned.n);
  const [note, setNote] = useState<{ n: number; drops: number } | null>(null);
  if (g.earned.n !== seen) {
    setSeen(g.earned.n);
    if (g.earned.n > seen && g.earned.drops) setNote({ n: g.earned.n, drops: g.earned.drops });
  }
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2600);
    return () => clearTimeout(t);
  }, [note]);

  if (!g.ready) return <span className="h-11 w-11 shrink-0 sm:w-16" />;
  const water = g.state.water;
  return (
    <div className="relative shrink-0">
      <motion.button
        type="button"
        onClick={onOpen}
        aria-label={active ? "Your garden" : `Your garden: ${dropsLabel(water)} ready to pour`}
        aria-current={active ? "page" : undefined}
        animate={note && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`flex h-11 items-center gap-1 rounded-full px-3 ring-1 sm:pl-1.5 interactive hover:ring-muted-foreground ${active ? "bg-accent-soft ring-accent" : "bg-surface ring-border"} ${FOCUS}`}
      >
        {/* Phones keep the header to the drop and count; the plant is on For you. In the garden the
            count lives in the garden's own watering button, so here the pill shows just the plant. */}
        <span className={`${active ? "flex" : "hidden sm:flex"} size-8 items-end justify-center overflow-hidden rounded-full`}>
          <CivicPlant stage={g.stage} size={26} accessory={g.state.accessory} label="" still />
        </span>
        {!active && (
          <>
            <WaterDrop size={11} />
            <span className="text-small font-semibold tabular-nums">{water}</span>
          </>
        )}
      </motion.button>
      <AnimatePresence>
        {note && (
          <motion.span
            key={note.n}
            aria-hidden="true"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 1, 0], y: [4, -2, -8, -14] }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 2.4, times: [0, 0.15, 0.7, 1], ease: "easeOut" }}
            className="pointer-events-none absolute -top-1 right-1 inline-flex items-center gap-0.5 rounded-full bg-surface px-1.5 text-small font-bold shadow-card"
          >
            +{note.drops} <WaterDrop size={9} />
          </motion.span>
        )}
      </AnimatePresence>
      <span role="status" aria-live="polite" className="sr-only">
        {note ? `You earned ${dropsLabel(note.drops)} of water for your plant.` : ""}
      </span>
    </div>
  );
}
