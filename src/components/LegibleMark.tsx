// The Legible magnifying glass, drawn inline with the same geometry and colours
// as public/icons/legible-mark.svg (the header's logo), so it can be animated
// and needs no image request. Decorative: always aria-hidden.
export function LegibleMark({ size = 38, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={(size * 180) / 200} viewBox="245 25 200 180" className={className}>
      <line x1="362" y1="137" x2="404" y2="179" stroke="#EAC077" strokeWidth="18" strokeLinecap="round" />
      <circle cx="325" cy="100" r="52" fill="#F5E4D0" stroke="#5A1677" strokeWidth="14" />
      <path d="M301 102 L318 119 L350 80" fill="none" stroke="#C98B68" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
