"use client";

// The plant in the For you hero: the same CivicPlant and growth stage as the
// header avatar and Civic Profile. It leans toward a mouse that comes near
// (within its own padded area, never page-wide), and a press gives a small
// squash and then opens the Growth Story (or, while growth is not tracked, the
// Civic Profile). A button, so it works from the
// keyboard too.
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { CivicPlant } from "./CivicPlant";
import { useGrowth } from "./useGrowth";

export function HomePlant({ size, onOpen }: { size: number; onOpen: () => void }) {
  const g = useGrowth();
  const reduce = useReducedMotion() ?? false;
  const [signal, setSignal] = useState({ tap: 0, milestone: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!g.enabled) return null;

  const press = () => {
    setSignal((v) => ({ ...v, tap: v.tap + 1 }));
    // Let the squash land before the profile sheet covers the plant.
    clearTimeout(timer.current);
    timer.current = setTimeout(onOpen, reduce ? 0 : 320);
  };

  return (
    <button
      type="button"
      onClick={press}
      aria-label={g.tracking ? "Your plant. Open your journey" : "Your plant. Open your Civic Profile"}
      className="group relative rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      {/* Padding widens the lean area around the plant; the negative margin keeps layout unchanged. */}
      <CivicPlant stage={g.stage} size={size} signal={signal} tapOnClick={false} label="" className="-m-6 cursor-pointer p-6" />
    </button>
  );
}
