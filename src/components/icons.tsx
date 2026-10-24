// Single-line-weight pictograms on a 24px grid. Stroke only, currentColor.
// Keyed by the avatarPart names in src/lib/vocab. Sensitive parts (leaf, target,
// scales) are deliberately absent: the avatar never reflects a sensitive fact.
import type { ReactNode } from "react";
import type { Direction } from "@/lib/vocab";

const PARTS: Record<string, ReactNode> = {
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M21 12v2" />
    </>
  ),
  house: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  two_figures: (
    <>
      <circle cx="8.5" cy="8" r="2.5" />
      <circle cx="16" cy="9" r="2" />
      <path d="M4 19c0-3 2-5 4.5-5s4.5 2 4.5 5M13 19c0-2.4 1.3-4 3-4s3 1.6 3 4" />
    </>
  ),
  ballot: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="m8.5 10 2 2 4-4M8.5 16h7" />
    </>
  ),
  checkmark: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  badge: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.5 16.5c.7-1.6 2-2.5 3.5-2.5s2.8.9 3.5 2.5M10 4v2h4V4" />
    </>
  ),
  blueprint: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M7 15.5 12 9l5 6.5M9 15.5v-2.5M15 15.5v-2.5" />
    </>
  ),
  backpack: (
    <>
      <rect x="6" y="7" width="12" height="13" rx="3" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7M9 14h6v3H9z" />
    </>
  ),
  storefront: (
    <>
      <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5c0 1.4 1.2 2.5 2.7 2.5S9.3 10.9 9.3 9.5c0 1.4 1.2 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1.2 2.5 2.6 2.5S20 10.9 20 9.5" />
      <path d="M5.5 12v8h13v-8M10 20v-4.5h4V20" />
    </>
  ),
  car: (
    <>
      <path d="M4 16v-3.5L6 8h12l2 4.5V16M3.5 16h17v2.5h-17zM4.5 12.5h15" />
      <circle cx="7.5" cy="14.3" r="0.6" fill="currentColor" />
      <circle cx="16.5" cy="14.3" r="0.6" fill="currentColor" />
    </>
  ),
  bus: (
    <>
      <rect x="5" y="3.5" width="14" height="14" rx="2.5" />
      <path d="M5 11h14M8 17.5V20M16 17.5V20M9 7h6" />
      <circle cx="8.5" cy="14.3" r="0.6" fill="currentColor" />
      <circle cx="15.5" cy="14.3" r="0.6" fill="currentColor" />
    </>
  ),
  roof: <path d="M3 13 12 5l9 8M7 10v9h10v-9" />,
  tree: (
    <>
      <path d="M12 21v-6" />
      <path d="M12 3c-3.6 0-6 2.7-6 6 0 3.1 2.6 6 6 6s6-2.9 6-6c0-3.3-2.4-6-6-6Z" />
    </>
  ),
  ballot_box: (
    <>
      <path d="M4 11h16v9H4zM9 11V5h6v6M8 15h8" />
    </>
  ),
  podium: <path d="M6 9h12l-1.5 11h-9zM12 9V5M9.5 4h5M9 14h6" />,
  magnifier: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5" />
    </>
  ),
  hardhat: <path d="M4 17h16M5 17v-2a7 7 0 0 1 14 0v2M10 8.5V6h4v2.5M3.5 20h17" />,
  gavel: <path d="m13.5 4.5 6 6M11 7l6 6M12.2 5.8l-3.4 3.4M18.2 11.8l-3.4 3.4M10.5 11.5 4 18M3.5 21h9" />,
  leaf_badge: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 16c0-4.5 3-8 8-8 0 5-3.5 8-8 8ZM8 16l4-4" />
    </>
  ),
  target_badge: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  shield: <path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6z" />,
  town_hall: <path d="M3.5 20.5h17M5 20.5v-9M19 20.5v-9M9 20.5v-6M15 20.5v-6M3.5 11.5h17L12 5zM12 5V2.5" />,
  book: <path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v14c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-14c-3.8 0-6.3.5-8 2ZM12 6.5v14" />,
  road: <path d="M8 3.5 4 20.5M16 3.5l4 17M12 4.5v2.5M12 10.5v3M12 17v3" />,
};

export function Part({ name, size = 24, className, strokeWidth = 1.6 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const body = PARTS[name];
  if (!body) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {body}
    </svg>
  );
}

export function hasPart(name: string): boolean {
  return name in PARTS;
}

// Direction pictograms. A small figure (the avatar's head and shoulders) plus one mark.
const FIGURE = (
  <>
    <circle cx="9" cy="8" r="2.6" />
    <path d="M4.5 18.5c0-3 2-5 4.5-5s4.5 2 4.5 5" />
  </>
);

const DIRECTION_MARKS: Record<Direction, ReactNode> = {
  expands: <path d="M15 12h6M18 9v6" />,
  restricts: <path d="M15 12h6" />,
  rule_change: <path d="M15 9.5h6l-2-2M21 14.5h-6l2 2" />,
  who_decides: <path d="M14.5 12h6m-2.5-3 3 3-3 3" />,
  none: <circle cx="18" cy="12" r="0.6" fill="currentColor" />,
};

export function DirectionMark({ direction, size = 28 }: { direction: Direction; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {FIGURE}
      {DIRECTION_MARKS[direction]}
    </svg>
  );
}

export function Glyph({ name, size = 20 }: { name: "back" | "close" | "check" | "chevron" | "quote" | "external" | "copy" | "share"; size?: number }) {
  const d: Record<typeof name, ReactNode> = {
    back: <path d="M15 5 8 12l7 7" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    quote: <path d="M5 11h4v6H5zM5 11c0-3 1.3-4.5 4-5M14 11h4v6h-4zM14 11c0-3 1.3-4.5 4-5" />,
    external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    share: <path d="M12 15V3.5M8 7.5l4-4 4 4M7 11H5.5v9.5h13V11H17" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d[name]}
    </svg>
  );
}
