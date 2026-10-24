"use client";

// The personalization meter drawn as a ring around the avatar. The arc moves only
// when the percentage changes; it never animates on its own. Pass `from` to fill
// from an earlier value (after a Save in the profile sheet).
import { useEffect, useRef } from "react";
import type { AvatarPart } from "@/lib/engine/avatar";
import { Avatar } from "./Avatar";

export function AvatarRing({
  parts,
  percent,
  size,
  from,
  newest,
  onPart,
  onFigure,
  showLabel = true,
}: {
  parts: AvatarPart[];
  percent: number;
  size: number;
  from?: number;
  newest?: string;
  onPart?: (p: AvatarPart) => void;
  onFigure?: () => void;
  showLabel?: boolean;
}) {
  const arc = useRef<SVGCircleElement>(null);
  const prev = useRef(from ?? percent);

  const stroke = Math.max(3, Math.round(size / 40));
  const r = 50 - (stroke / size) * 50 - 0.5;
  const c = 2 * Math.PI * r;
  const full = percent === 100;

  // Fill from the previous value with the theme's duration and curve. The DOM
  // attribute already holds the final value, so nothing depends on frame timing.
  useEffect(() => {
    const start = prev.current;
    prev.current = percent;
    if (start === percent || !arc.current?.animate) return;
    const root = getComputedStyle(document.documentElement);
    const raw = root.getPropertyValue("--duration").trim(); // "400ms", or "0.4s" once computed
    const duration = (parseFloat(raw) || 0) * (raw.endsWith("ms") ? 1 : 1000);
    if (!duration) return;
    arc.current.animate([{ strokeDashoffset: c * (1 - start / 100) }, { strokeDashoffset: c * (1 - percent / 100) }], {
      duration,
      easing: root.getPropertyValue("--ease").trim() || "ease-out",
    });
  }, [percent, c]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth={(stroke / size) * 100} />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={(stroke / size) * 100}
            strokeLinecap={full ? "butt" : "round"}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - percent / 100)}
            ref={arc}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar parts={parts} size={Math.round(size - stroke * 2 - size * 0.06)} newest={newest} onPart={onPart} onFigure={onFigure} />
        </div>
      </div>
      {showLabel && (
        <span className="text-small font-semibold text-muted-foreground" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Life profile filled in">
          {percent}%
        </span>
      )}
    </div>
  );
}
