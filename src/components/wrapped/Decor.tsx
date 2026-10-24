// Decorative shapes behind each Ballot Wrapped Slide. Solid palette colours only (no
// gradients), kept to the frame edges so they never sit under body text. aria-hidden.
// The float animation stops under reduced motion (global rule sets durations to 0).
import { SLIDE_COLOUR_HEX, SLIDE_COLOURS, type SlideColour } from "@/lib/vocab/wrapped";

type Shape = "circle" | "ring" | "star" | "pill" | "dots";
interface Piece {
  shape: Shape;
  /** Position as % of the frame; negative or >100 pushes the shape partly off-frame. */
  x: number;
  y: number;
  size: number; // % of frame width
  rotate: number;
  /** 0 = first accent colour, 1 = second accent colour. */
  tone: 0 | 1;
}

// One fixed layout per Slide index. Shapes hug the corners and edges.
const LAYOUTS: Piece[][] = [
  [
    { shape: "circle", x: -18, y: -10, size: 62, rotate: 0, tone: 0 },
    { shape: "star", x: 78, y: 70, size: 30, rotate: 12, tone: 1 },
    { shape: "dots", x: 72, y: 12, size: 22, rotate: 0, tone: 1 },
  ],
  [
    { shape: "ring", x: 62, y: -12, size: 60, rotate: 0, tone: 0 },
    { shape: "pill", x: -22, y: 80, size: 58, rotate: -24, tone: 1 },
  ],
  [
    { shape: "star", x: -10, y: 4, size: 34, rotate: -8, tone: 0 },
    { shape: "circle", x: 70, y: 82, size: 48, rotate: 0, tone: 1 },
  ],
  [
    { shape: "ring", x: -30, y: 60, size: 80, rotate: 0, tone: 0 },
    { shape: "dots", x: 74, y: 14, size: 22, rotate: 0, tone: 1 },
    { shape: "star", x: 80, y: 80, size: 22, rotate: 20, tone: 1 },
  ],
  [
    { shape: "pill", x: 60, y: -6, size: 62, rotate: 28, tone: 0 },
    { shape: "circle", x: -20, y: 84, size: 44, rotate: 0, tone: 1 },
  ],
  [
    { shape: "star", x: 64, y: -8, size: 46, rotate: 10, tone: 0 },
    { shape: "star", x: -12, y: 78, size: 32, rotate: -14, tone: 1 },
    { shape: "dots", x: 6, y: 12, size: 20, rotate: 0, tone: 1 },
  ],
  [
    { shape: "circle", x: 66, y: -14, size: 56, rotate: 0, tone: 1 },
    { shape: "ring", x: -24, y: 76, size: 60, rotate: 0, tone: 0 },
  ],
  [
    { shape: "dots", x: 76, y: 10, size: 20, rotate: 0, tone: 0 },
    { shape: "dots", x: 4, y: 84, size: 20, rotate: 0, tone: 1 },
  ],
];

/** Two palette colours that differ from the background, picked by index so they vary. */
function accents(bg: SlideColour, index: number): [string, string] {
  const others = SLIDE_COLOURS.filter((c) => c !== bg);
  const a = others[index % others.length];
  const b = others[(index + 2) % others.length];
  return [SLIDE_COLOUR_HEX[a], SLIDE_COLOUR_HEX[b]];
}

function ShapeSvg({ shape, fill }: { shape: Shape; fill: string }) {
  switch (shape) {
    case "circle":
      return <circle cx="50" cy="50" r="50" fill={fill} />;
    case "ring":
      return <circle cx="50" cy="50" r="42" fill="none" stroke={fill} strokeWidth="14" />;
    case "star":
      return <path d="M50 0C54 34 66 46 100 50 66 54 54 66 50 100 46 66 34 54 0 50 34 46 46 34 50 0Z" fill={fill} />;
    case "pill":
      return <rect x="0" y="32" width="100" height="36" rx="18" fill={fill} />;
    case "dots":
      return (
        <g fill={fill}>
          {[15, 50, 85].flatMap((cx) => [15, 50, 85].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" />))}
        </g>
      );
  }
}

export function Decor({ index, colour }: { index: number; colour: SlideColour }) {
  const [a, b] = accents(colour, index);
  const pieces = LAYOUTS[index % LAYOUTS.length];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <svg
          key={i}
          viewBox="0 0 100 100"
          className="wrapped-float absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}%`,
            aspectRatio: "1",
            rotate: `${p.rotate}deg`,
            animationDelay: `${i * -2.3}s`,
          }}
        >
          <ShapeSvg shape={p.shape} fill={p.tone === 0 ? a : b} />
        </svg>
      ))}
    </div>
  );
}
