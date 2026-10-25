// A water drop: the garden's one currency icon, wherever water is shown.
// Its blue is part of the plant illustration, not the UI palette.
export const WATER = { light: "#a9dcf7", mid: "#6cbbe8", dark: "#3f97cf" };

export function WaterDrop({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 20" width={size} height={(size * 20) / 16} aria-hidden="true" className={className} style={{ display: "inline-block", flexShrink: 0 }}>
      <path d="M8,1 C10.6,5 14,8.6 14,12.6 C14,16.2 11.3,19 8,19 C4.7,19 2,16.2 2,12.6 C2,8.6 5.4,5 8,1 Z" fill={WATER.mid} />
      <path d="M8,1 C10.6,5 14,8.6 14,12.6 C14,16.2 11.3,19 8,19 C9.8,17.4 11,15.2 11,12.6 C11,9.2 9.4,5.6 8,1 Z" fill={WATER.dark} opacity="0.45" />
      <ellipse cx="5.6" cy="12.4" rx="1.3" ry="2.4" fill="#fff" opacity="0.6" />
    </svg>
  );
}
