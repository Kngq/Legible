"use client";

// The Nine avatar: a line-drawn figure that gains one part per yes and per subject.
// Parts sit in a ring around the figure. Never a sensitive fact.
// With onFigure and onPart, the figure and each badge are buttons (no nesting).
import type { AvatarPart } from "@/lib/engine/avatar";
import { Part } from "./icons";
import { FOCUS } from "./ui";

const RING = 8; // slots shown around the figure; extra parts collapse into "+N"

export function Avatar({
  parts,
  size = 200,
  newest,
  onPart,
  onFigure,
  figureLabel = "Open your profile",
}: {
  parts: AvatarPart[];
  size?: number;
  newest?: string;
  onPart?: (p: AvatarPart) => void;
  onFigure?: () => void;
  figureLabel?: string;
}) {
  const shown = parts.slice(0, RING);
  const extra = parts.length - shown.length;
  const badge = Math.max(24, Math.round(size * 0.2));
  const r = size / 2 - badge / 2 - 2;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role={onFigure || onPart ? "group" : "img"}
      aria-label={parts.length ? `Your avatar: ${parts.map((p) => p.label).join(", ")}` : "Your avatar, no parts yet"}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-foreground" aria-hidden="true">
        <circle cx="50" cy="50" r="31" className="fill-surface" stroke="var(--border)" strokeWidth="1" />
        <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="50" cy="42" r="10" />
          <path d="M46 44.5c1.2 1.4 2.4 2 4 2s2.8-.6 4-2" />
          <circle cx="46.2" cy="40" r="0.5" fill="currentColor" />
          <circle cx="53.8" cy="40" r="0.5" fill="currentColor" />
          <path d="M33 74c1.5-10 8.5-16 17-16s15.5 6 17 16" />
        </g>
      </svg>
      {onFigure && (
        <button
          type="button"
          onClick={onFigure}
          aria-label={figureLabel}
          className={`absolute rounded-full ${FOCUS}`}
          style={{ left: size * 0.19, top: size * 0.19, width: size * 0.62, height: size * 0.62 }}
        />
      )}
      {shown.map((p, i) => {
        const a = (-90 + (360 / RING) * i) * (Math.PI / 180);
        const key = `${p.kind}:${p.id}`;
        const style = {
          left: size / 2 + r * Math.cos(a) - badge / 2,
          top: size / 2 + r * Math.sin(a) - badge / 2,
          width: badge,
          height: badge,
        };
        const cls = `absolute flex items-center justify-center rounded-full border border-border shadow-card animate-part-in ${
          newest === key ? "bg-accent text-accent-foreground" : "bg-surface text-foreground"
        }`;
        const icon = <Part name={p.part} size={Math.round(badge * 0.58)} />;
        return onPart ? (
          <button key={key} type="button" title={p.label} aria-label={`Edit: ${p.label}`} onClick={() => onPart(p)} className={`${cls} ${FOCUS}`} style={style}>
            {icon}
          </button>
        ) : (
          <span key={key} title={p.label} className={cls} style={style}>
            {icon}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="absolute bottom-0 right-0 rounded-sm bg-surface-muted px-2 py-0.5 text-small font-semibold">+{extra}</span>
      )}
    </div>
  );
}
