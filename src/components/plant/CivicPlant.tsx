"use client";

// The little plant: a layered SVG character drawn from
// design-references/garden-concept.png. A chubby terracotta pot with a thick rim
// and a face (big eyes, pink cheeks, a tiny mouth), and round glossy leaves.
// Pot, soil, stem, leaves, buds, flowers, face, and accessories are separate
// layers so each can move on its own. Every stage shares one pot and one
// coordinate system: the plant grows from the soil at (50, 72).
//
// Stages, each with its own outline: a seed half in the soil with a tiny
// shoot; a sprout with a clear stem and two leaves; a branching crown; the crown
// with small white blossoms; white flowers with yellow hearts. Leaves are
// matte, muted, and varied (three shapes, each with its own size and bend), and
// from stage 3 thin side stems carry the outer ones.
//
// Accessories are worn, not stuck on: glasses and the scarf sit on the pot and
// squash with it; the bow and the hat sit on the plant's crown at a spot set per
// stage, and sway with it.
//
// Expressions: happy (closed smiling eyes, rosy cheeks), curious (round eyes, a
// tilt), excited (> < eyes, a big smile, a hop), sleepy (relaxed eyes, zZ), and
// surprised (round eyes, a tiny open mouth), plus a contented "ahh" while being
// watered. Small surprises (a blush, a wiggle, a sneeze) play when asked. Under
// reduced motion every change still happens, instantly, and nothing moves on
// its own.
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { AccessoryId } from "@/lib/garden";
import { GROWTH_STAGES, type GrowthStage } from "@/lib/growth";
import { EASE } from "@/lib/motion";

/** The stage type and names come from the shared growth definitions. */
export type PlantStage = GrowthStage;
export const STAGES = GROWTH_STAGES;

/**
 * Counters a parent bumps to trigger a reaction. `surprise` picks from SURPRISES in turn.
 * `drop` is a drop of water landing on the leaves, `shake` shakes the water off
 * after a pour, and `brace` is the held breath just before the plant grows.
 */
export type PlantSignal = { tap: number; milestone: number; drop?: number; surprise?: number; shake?: number; brace?: number };

/** The small surprises, played in turn. Visual only: they never change growth. */
export const SURPRISES = ["blush", "wiggle", "sneeze"] as const;
type Surprise = (typeof SURPRISES)[number];

/** The five named expressions, from the concept sheet. */
export const EXPRESSIONS = ["happy", "curious", "excited", "sleepy", "surprised"] as const;
export type Expression = (typeof EXPRESSIONS)[number];

type Face = "open" | Expression | "watered" | "sneeze" | "hopeful" | "brace";

// Colours sampled from the concept sheet. They live here, not in globals.css:
// the plant is an illustration, and its greens are not part of the UI palette.
const C = {
  // Matte terracotta, a little greyed so it sits on the page rather than glowing on it.
  potLight: "#f3c6a9",
  potMid: "#e7a687",
  potDark: "#d28c6d",
  rimLight: "#f6d2b9",
  rimMid: "#edb698",
  rimDark: "#dd9c7c",
  rimTop: "#e6a888",
  innerWall: "#c97a58",
  soilLight: "#8a5a35",
  soilMid: "#6a4227",
  soilDark: "#4a2c18",
  // Leaves: matte, muted botanical greens.
  leafLight: "#b9d199",
  leafMid: "#93b276",
  leafDark: "#6f8d57",
  leafLine: "#5d7849",
  vein: "#e6edd6",
  stem: "#7e9a64",
  stemLight: "#9fb884",
  seed: "#d6a46e",
  seedDark: "#a8743f",
  seedLight: "#f0cc9c",
  petal: "#ffffff",
  petalShade: "#f3ebe0",
  heart: "#ffc93c",
  heartDark: "#f0a826",
  sparkle: "#f8c95c",
  ink: "#3a2a24",
  cheek: "#ff9b9b",
  tongue: "#ff8a8a",
  frame: "#7a4b2c",
  bow: "#ff8db6",
  bowDark: "#ea6b9a",
  bowLight: "#ffc4da",
  straw: "#f4d28b",
  strawLight: "#fae2ac",
  strawDark: "#ddb066",
  ribbon: "#5eb0e8",
  scarf: "#6cb9ea",
  scarfDark: "#4b98cf",
  scarfLight: "#a6d8f6",
};

// Three leaf shapes, pointing right, base at the origin, about 31 units long:
// an elongated oval with a gently tapered, lifted tip; a narrow lance; and a
// broader leaf whose tip droops. Mixing them, with each pose's own size, bend,
// and width, keeps the crown from looking stamped.
type LeafShape = { d: string; shade: string; rib: string; veins: string };
const SHAPES: LeafShape[] = [
  {
    d: "M0,0 C2.4,-5.4 8.8,-8.2 16.4,-7.8 C23,-7.4 28.4,-4.4 31.6,-1.2 C28.4,2 23,5 16.4,5.6 C9,6.2 2.4,4 0,0 Z",
    shade: "M0,0 C9,-1.2 20,-1.8 31.6,-1.2 C28.4,2 23,5 16.4,5.6 C9,6.2 2.4,4 0,0 Z",
    rib: "M1.4,-0.1 C9,-1.2 20,-1.8 30.4,-1.2",
    veins: "M9,-0.9 Q12,-3.8 15,-5.4 M16.4,-1.4 Q19.4,-4 22.4,-5 M9.6,-0.9 Q12.4,1.8 14.8,3.4 M17,-1.5 Q19.6,0.8 22,2",
  },
  {
    d: "M0,0 C3.2,-4 10,-5.8 17.4,-5.4 C23.6,-5 28.8,-2.8 32.4,0 C28.6,2.4 23,4.4 17,4.6 C9.6,4.8 3,3 0,0 Z",
    shade: "M0,0 C10,-0.6 21,-0.6 32.4,0 C28.6,2.4 23,4.4 17,4.6 C9.6,4.8 3,3 0,0 Z",
    rib: "M1.4,0 C10,-0.6 21,-0.6 31.4,0",
    veins: "M10,-0.5 Q13,-2.8 15.8,-3.8 M18,-0.5 Q20.8,-2.6 23.4,-3.2 M10.6,-0.5 Q13.2,1.6 15.6,2.6",
  },
  {
    d: "M0,0 C1.8,-6.2 8.6,-9.2 16.2,-8.6 C23,-8 28.2,-4.4 30.8,1 C27.4,4 22,6.6 15.8,6.8 C8.2,7 2,4.4 0,0 Z",
    shade: "M0,0 C9,-1.2 20,-1.2 30.8,1 C27.4,4 22,6.6 15.8,6.8 C8.2,7 2,4.4 0,0 Z",
    rib: "M1.4,0 C9,-1.2 20,-1.2 29.8,0.8",
    veins: "M8.6,-0.8 Q11.4,-4.2 14.4,-6 M16,-0.9 Q19,-4.2 22,-5.4 M9.2,-0.7 Q12,2.4 14.4,4.2 M16.6,-0.6 Q19.4,2.4 22,3.6",
  },
];
const SPARKLE = "M0,-4 C0.5,-1.1 1.1,-0.5 4,0 C1.1,0.5 0.5,1.1 0,4 C-0.5,1.1 -1.1,0.5 -4,0 C-1.1,-0.5 -0.5,-1.1 0,-4 Z";
const HEART = "M0,1.6 C-0.6,0.4 -3.6,-1.6 -3.6,-3.6 C-3.6,-5.2 -1.6,-5.8 0,-4.2 C1.6,-5.8 3.6,-5.2 3.6,-3.6 C3.6,-1.6 0.6,0.4 0,1.6 Z";

type Side = "l" | "r";
/**
 * Where a leaf meets its stem, its angle above horizontal, blade length, stalk
 * length, which side it faces, its shape (SHAPES), and an optional bend of the
 * blade and width.
 */
type LeafPose = { x: number; y: number; elev: number; len: number; pet: number; side: Side; v: number; bend?: number; w?: number };

// Stems share one command shape so Motion can morph between stages.
const STEM: Record<PlantStage, string> = {
  1: "M50.2,66 C50.2,64.6 50.3,63.2 50.5,61.8",
  2: "M50,72 C49.4,65 49.6,58 50.4,52",
  3: "M50,72 C48.8,62 51.6,46 50.6,32",
  4: "M50,72 C48.6,60 51.8,40 50.8,22",
  5: "M50,72 C48.4,58 52,36 50.6,16",
};

// Leaves keep their letter from stage to stage, so a leaf that was already
// there moves to its new spot and the new ones unfold from the stem.
const LEAVES: Record<PlantStage, Record<string, LeafPose>> = {
  1: {
    a: { x: 50.4, y: 62.2, elev: 30, len: 8, pet: 0.4, side: "l", v: 1 },
    b: { x: 50.6, y: 61.8, elev: 54, len: 9.5, pet: 0.4, side: "r", v: 0, bend: -6 },
  },
  2: {
    a: { x: 50.2, y: 53, elev: 18, len: 28, pet: 1.4, side: "l", v: 0, bend: 6 },
    b: { x: 50.6, y: 52.4, elev: 36, len: 31, pet: 1.4, side: "r", v: 2, bend: -4, w: 0.95 },
  },
  3: {
    a: { x: 49.8, y: 64, elev: 6, len: 24, pet: 2, side: "l", v: 1, bend: 4, w: 0.9 },
    b: { x: 50.4, y: 61, elev: 22, len: 29, pet: 2.4, side: "r", v: 0, bend: -6 },
    c: { x: 36.5, y: 46.5, elev: 30, len: 30, pet: 1.6, side: "l", v: 2, bend: 6 },
    d: { x: 42, y: 51.5, elev: 66, len: 17, pet: 1, side: "l", v: 1, w: 0.9 },
    e: { x: 63.5, y: 39, elev: 28, len: 31, pet: 1.6, side: "r", v: 0, bend: -4 },
    f: { x: 57, y: 44.2, elev: 72, len: 17, pet: 1, side: "r", v: 1 },
    g: { x: 50.6, y: 32.4, elev: 78, len: 22, pet: 1, side: "r", v: 1, bend: -8 },
    h: { x: 50.5, y: 37, elev: 52, len: 20, pet: 1.2, side: "l", v: 0, bend: 4, w: 0.9 },
  },
  4: {
    a: { x: 49.6, y: 66, elev: 4, len: 27, pet: 2, side: "l", v: 1, bend: 4, w: 0.9 },
    b: { x: 31, y: 53.5, elev: 14, len: 37, pet: 1.6, side: "l", v: 2, bend: 6 },
    c: { x: 37, y: 31.5, elev: 42, len: 33, pet: 1.6, side: "l", v: 0, bend: 2 },
    d: { x: 43, y: 41, elev: 70, len: 19, pet: 1, side: "l", v: 1 },
    e: { x: 70, y: 47.5, elev: 16, len: 38, pet: 1.6, side: "r", v: 0, bend: -6 },
    f: { x: 63, y: 23.5, elev: 44, len: 32, pet: 1.6, side: "r", v: 2, bend: -2, w: 0.95 },
    g: { x: 57.6, y: 32, elev: 74, len: 19, pet: 1, side: "r", v: 1 },
    h: { x: 50.8, y: 22.4, elev: 82, len: 23, pet: 1, side: "r", v: 1, bend: -6 },
    i: { x: 50.6, y: 27, elev: 60, len: 21, pet: 1.2, side: "l", v: 0, bend: 4, w: 0.9 },
    j: { x: 60, y: 53, elev: 58, len: 17, pet: 1, side: "r", v: 1, w: 0.9 },
    k: { x: 50.4, y: 52, elev: 34, len: 21, pet: 1.2, side: "l", v: 0, bend: 2, w: 0.9 },
    l: { x: 50.8, y: 44, elev: 40, len: 22, pet: 1.2, side: "r", v: 1, bend: -2 },
    m: { x: 50.8, y: 23.5, elev: 70, len: 21, pet: 1, side: "l", v: 0, bend: 4, w: 0.9 },
  },
  5: {
    a: { x: 49.6, y: 67, elev: 2, len: 29, pet: 2, side: "l", v: 1, bend: 4, w: 0.9 },
    b: { x: 28, y: 54.5, elev: 12, len: 39, pet: 1.6, side: "l", v: 2, bend: 6 },
    c: { x: 36, y: 28.5, elev: 40, len: 34, pet: 1.6, side: "l", v: 0, bend: 2 },
    d: { x: 42.6, y: 39.6, elev: 68, len: 20, pet: 1, side: "l", v: 1 },
    e: { x: 73, y: 48, elev: 14, len: 40, pet: 1.6, side: "r", v: 0, bend: -6 },
    f: { x: 64, y: 19, elev: 42, len: 33, pet: 1.6, side: "r", v: 2, bend: -2, w: 0.95 },
    g: { x: 58, y: 30, elev: 72, len: 20, pet: 1, side: "r", v: 1 },
    h: { x: 50.6, y: 16.4, elev: 84, len: 23, pet: 1, side: "r", v: 1, bend: -6 },
    i: { x: 50.6, y: 24, elev: 58, len: 22, pet: 1.2, side: "l", v: 0, bend: 4, w: 0.9 },
    j: { x: 62, y: 54, elev: 56, len: 18, pet: 1, side: "r", v: 1, w: 0.9 },
    k: { x: 50.2, y: 52, elev: 32, len: 23, pet: 1.2, side: "l", v: 0, bend: 2, w: 0.9 },
    l: { x: 50.8, y: 42, elev: 38, len: 23, pet: 1.2, side: "r", v: 1, bend: -2 },
    m: { x: 50.6, y: 17.6, elev: 68, len: 22, pet: 1, side: "l", v: 0, bend: 4, w: 0.9 },
  },
};

/** Thin side stems that carry the outer leaves, so later stages branch and spread instead of stacking. */
const BRANCHES: Record<PlantStage, string[]> = {
  1: [],
  2: [],
  3: ["M50.2,57 C46,54 41,51 36.5,46.5", "M50.7,48 C54.6,45.6 59,43 63.5,39"],
  4: ["M50,62 C45,59 38,57 31,53.5", "M50.4,47 C46,43 41,38 37,31.5", "M50.6,56 C56,53 63,51 70,47.5", "M50.8,38 C55,34 59.6,29 63,23.5"],
  5: ["M50,63 C44,60 36,58 28,54.5", "M50.4,46 C45.6,41.6 40.4,36 36,28.5", "M50.6,57 C57,54 65,52 73,48", "M50.8,36 C55.4,31.6 60,26 64,19"],
};

type Spot = { x: number; y: number; s: number };
// Budding: a cluster of small white blossoms, half open. Blooming: bigger, open flowers.
const BUDS: Spot[] = [
  { x: 27, y: 30, s: 0.62 },
  { x: 74, y: 26, s: 0.62 },
  { x: 50.8, y: 13, s: 0.7 },
  { x: 38, y: 16, s: 0.5 },
  { x: 64, y: 13, s: 0.5 },
];
const FLOWERS: Spot[] = [
  { x: 24, y: 28, s: 1 },
  { x: 78, y: 23, s: 1.05 },
  { x: 50.6, y: 6, s: 1.25 },
  { x: 35, y: 12, s: 0.8 },
  { x: 67, y: 9, s: 0.85 },
];
/** Where the hat's brim and the bow sit, per stage: on top of the crown. */
const HAT_AT: Record<PlantStage, Spot> = {
  1: { x: 50.4, y: 64, s: 0.55 },
  2: { x: 50.4, y: 50, s: 0.9 },
  3: { x: 50.6, y: 26, s: 1.4 },
  4: { x: 50.8, y: 16, s: 1.5 },
  5: { x: 50.6, y: 10, s: 1.55 },
};
const BOW_AT: Record<PlantStage, Spot> = {
  1: { x: 50.4, y: 64.8, s: 0.6 },
  2: { x: 50.4, y: 50.6, s: 0.95 },
  3: { x: 50.6, y: 28, s: 1.3 },
  4: { x: 50.8, y: 22, s: 1.35 },
  5: { x: 50.6, y: 20, s: 1.35 },
};
/** The top of the plant, for the signs (?, !, zZ) and sparkles. */
const STAGE_TOP: Record<PlantStage, number> = { 1: 60, 2: 38, 3: 10, 4: 0, 5: -4 };

const STEADY_SPARKLES = [
  { x: 92, y: -6, s: 1 },
  { x: 8, y: 14, s: 0.8 },
  { x: 98, y: 40, s: 0.75 },
];
const BURST_SPARKLES = [
  { x: 18, y: -4, s: 0.9 },
  { x: 84, y: -10, s: 1.1 },
  { x: 100, y: 20, s: 0.8 },
  { x: 0, y: 40, s: 0.75 },
  { x: 96, y: 58, s: 0.7 },
];

/** A transparent square centred on the local origin, so fill-box transforms pivot there. */
function Pivot({ r }: { r: number }) {
  return <rect x={-r} y={-r} width={2 * r} height={2 * r} fill="none" />;
}

const PIVOT_STYLE = { transformBox: "fill-box", originX: 0.5, originY: 0.5 } as const;

/** How long each passing moment holds its face, in milliseconds. */
const MOMENT_MS: Partial<Record<Face, number>> = { surprised: 800, excited: 2400, happy: 1400, sneeze: 900, curious: 1700, brace: 420 };

export function CivicPlant({
  stage,
  size = 120,
  signal,
  label,
  still = false,
  tapOnClick = true,
  pouring = false,
  lively = false,
  accessory = "none",
  expression,
  ground = false,
  expecting = false,
  wet = 0,
  scene,
  quiet = false,
  className,
}: {
  stage: PlantStage;
  /** Width in px; height follows the 112:144 artboard. */
  size?: number;
  /** Bump a counter to play a tap, the milestone burst, a drop landing, or a surprise from outside. */
  signal?: PlantSignal;
  /** Being watered: eyes close happily, mouth opens ("ahh"), leaves lift. */
  pouring?: boolean;
  /** Water is on its way: it looks up hopefully and its leaves perk up. */
  expecting?: boolean;
  /** Bump when water lands: the soil darkens, then dries over a few seconds. */
  wet?: number;
  /** Drawn over the plant in its own coordinates and outside its sway (the watering can). */
  scene?: ReactNode;
  /** No decorative sparkles or rays (the For you hero). Faces, signs, and motion are unchanged. */
  quiet?: boolean;
  /** Occasional idle life: a curious tilt now and then, and sleepy eyes after a long quiet spell. */
  lively?: boolean;
  /** What the plant is wearing. */
  accessory?: AccessoryId;
  /** Holds one expression (the dev preview). */
  expression?: Expression;
  /** Sets the pot on a patch of textured soil, so it never floats on a blank page. */
  ground?: boolean;
  /** Accessible name. Defaults to the stage name; "" hides the plant from assistive tech (e.g. inside a labelled button). */
  label?: string;
  /** No idle sway, blink, lean, or tap: for small illustrations such as the journey. */
  still?: boolean;
  /** False when a wrapping control triggers the tap through `signal` instead (e.g. a button). */
  tapOnClick?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  // Calm: no ambient motion. Growth still animates unless the person prefers reduced motion.
  const calm = reduce || still;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (n: string) => `${uid}-${n}`;
  const url = (n: string) => `url(#${id(n)})`;

  const body = useAnimationControls();
  const eyes = useAnimationControls();
  const damp = useAnimationControls();
  const lean = useSpring(0, { stiffness: 70, damping: 16 });
  const look = useTransform(lean, (v) => v * 0.14);

  // Events: growth (stage went up), the milestone burst, a tap, a drop landing,
  // and a surprise. Tracked by counters, using React's "previous prop" pattern.
  // Each sets a passing "moment" (a face held for a little while) and, where it
  // moves, a request the effect below plays once.
  const sig = {
    tap: signal?.tap ?? 0,
    milestone: signal?.milestone ?? 0,
    drop: signal?.drop ?? 0,
    surprise: signal?.surprise ?? 0,
    shake: signal?.shake ?? 0,
    brace: signal?.brace ?? 0,
  };
  const [prev, setPrev] = useState({ stage, ...sig });
  const [grew, setGrew] = useState(false);
  const [burst, setBurst] = useState(0);
  const [moment, setMoment] = useState<{ face: Face; n: number } | null>(null);
  const [req, setReq] = useState({ tap: 0, bounce: 0, wiggle: 0, sneeze: 0, brace: 0 });
  const [hearts, setHearts] = useState(0);
  const [wave, setWave] = useState(0);
  // Anything that happens to the plant wakes it and restarts the sleepy timer.
  const [activity, setActivity] = useState(0);
  const [sleepy, setSleepy] = useState(false);
  const hold = (face: Face) => setMoment((m) => ({ face, n: (m?.n ?? 0) + 1 }));
  const bump = (k: keyof typeof req) => setReq((r) => ({ ...r, [k]: r[k] + 1 }));

  const changed = stage !== prev.stage || (Object.keys(sig) as (keyof typeof sig)[]).some((k) => sig[k] !== prev[k]);
  if (changed) {
    if (stage > prev.stage) {
      setGrew(true);
      setBurst((n) => n + 1);
      hold("excited");
      bump("bounce");
      setWave((n) => n + 1);
    } else if (stage < prev.stage) {
      setGrew(false);
    }
    if (sig.tap !== prev.tap) {
      bump("tap");
      hold("surprised");
    }
    if (sig.milestone !== prev.milestone) {
      setBurst((n) => n + 1);
      hold("excited");
    }
    if (sig.shake !== prev.shake) hold("happy");
    if (sig.brace !== prev.brace) {
      bump("brace");
      hold("brace");
    }
    if (sig.surprise !== prev.surprise) {
      const kind: Surprise = SURPRISES[(sig.surprise - 1 + SURPRISES.length) % SURPRISES.length];
      if (kind === "blush") {
        setHearts((n) => n + 1);
        hold("happy");
      } else if (kind === "wiggle") {
        bump("wiggle");
        setWave((n) => n + 1);
        hold("happy");
      } else {
        bump("sneeze");
        setWave((n) => n + 1);
        hold("sneeze");
      }
    }
    setActivity((n) => n + 1);
    setSleepy(false);
    setPrev({ stage, ...sig });
  }

  // A moment ends on its own; a surprise eases into a smile.
  useEffect(() => {
    if (!moment) return;
    const t = setTimeout(() => setMoment((m) => (m && m.n === moment.n ? (m.face === "surprised" ? { face: "happy", n: m.n + 1 } : null) : m)), MOMENT_MS[moment.face] ?? 1400);
    return () => clearTimeout(t);
  }, [moment]);

  // Sleepy after a long quiet spell; any activity wakes it.
  useEffect(() => {
    if (!lively || still || pouring || expecting) return;
    const t = setTimeout(() => setSleepy(true), 45000);
    return () => clearTimeout(t);
  }, [lively, still, pouring, expecting, activity]);

  // What the face shows now. Big feelings (growing, a tap, a sneeze) win over
  // being watered; being watered wins over the quieter moments.
  const strong = moment && (moment.face === "excited" || moment.face === "surprised" || moment.face === "sneeze" || moment.face === "brace") ? moment.face : null;
  const face: Face = expression ?? strong ?? (pouring ? "watered" : expecting ? "hopeful" : (moment?.face ?? (sleepy ? "sleepy" : "open")));
  const rosy = face === "happy" || face === "excited" || face === "watered" || hearts > 0;

  const squash = () => {
    if (calm) return;
    body.start({
      scaleY: [1, 0.93, 1.035, 1],
      scaleX: [1, 1.045, 0.985, 1],
      transition: { duration: 0.6, times: [0, 0.3, 0.65, 1], ease: "easeInOut" },
    });
  };
  const tap = () => {
    if (still) return;
    squash();
    hold("surprised");
    setActivity((n) => n + 1);
    setSleepy(false);
  };

  // Body reactions, each started once per request.
  const played = useRef(req);
  useEffect(() => {
    const p = played.current;
    if (req.tap !== p.tap) squash();
    if (!reduce && req.bounce !== p.bounce) {
      // Excited: a happy hop when it grows.
      body.start({ y: [0, -9, 0, -3, 0], scaleY: [null, 1.05, 0.96, 1.02, 1], scaleX: [null, 0.97, 1.03, 0.99, 1], transition: { duration: 0.9, ease: "easeOut" } });
    } else if (!calm && req.brace !== p.brace) {
      // Holds its breath, gathering itself, just before it grows.
      body.start({ scaleY: 0.95, scaleX: 1.03, transition: { duration: 0.28, ease: "easeOut" } });
    }
    if (!calm && req.wiggle !== p.wiggle) body.start({ rotate: [0, -4, 4, -3, 3, -1, 0], transition: { duration: 0.8, ease: "easeInOut" } });
    if (!calm && req.sneeze !== p.sneeze) {
      // Gathers itself, then "achoo": a quick jolt.
      body.start({ scaleY: [1, 0.95, 0.95, 1.07, 1], scaleX: [1, 1.03, 1.03, 0.96, 1], transition: { duration: 0.9, times: [0, 0.35, 0.55, 0.7, 1], ease: "easeOut" } });
    }
    played.current = req;
    // squash and body.start only start animations; they do not set state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  // Damp soil where the water soaked in, drying over a few seconds. More water re-darkens it.
  const lastWet = useRef(wet);
  useEffect(() => {
    if (wet === lastWet.current) return;
    lastWet.current = wet;
    let live = true;
    damp.start({ opacity: 0.55, transition: { duration: reduce ? 0 : 0.2 } }).then(() => {
      if (live) damp.start({ opacity: 0, transition: { duration: reduce ? 0 : 3.5, delay: reduce ? 2.5 : 1 } });
    });
    return () => {
      live = false;
    };
  }, [wet, damp, reduce]);

  // Blink every few seconds while the eyes are open; slower when sleepy.
  const blinking = face === "open" || face === "curious" || face === "sleepy";
  useEffect(() => {
    if (calm || !blinking) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          eyes.start({ scaleY: [1, 0.12, 1], transition: { duration: face === "sleepy" ? 0.9 : 0.22, ease: "easeInOut" } });
          loop();
        },
        face === "sleepy" ? 4200 + Math.random() * 2000 : 2600 + Math.random() * 3400,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, [calm, blinking, face, eyes]);

  // Curious: now and then it tilts to one side and looks there, then settles.
  const hovering = useRef(false);
  // Being watered (or about to be): it holds still and upright, so the water meets its leaves.
  const watered = pouring || expecting;
  const wateredRef = useRef(watered);
  useEffect(() => {
    wateredRef.current = watered;
    if (watered) lean.set(0);
  }, [watered, lean]);
  useEffect(() => {
    if (!lively || calm || sleepy) return;
    let t: ReturnType<typeof setTimeout>;
    let back: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        if (!hovering.current && !wateredRef.current) {
          lean.set(Math.random() < 0.5 ? -5 : 5);
          setMoment((m) => (m ? m : { face: "curious", n: 1 }));
          back = setTimeout(() => !hovering.current && lean.set(0), 1600);
        }
        loop();
      }, 9000 + Math.random() * 7000);
    };
    loop();
    return () => {
      clearTimeout(t);
      clearTimeout(back);
    };
  }, [lively, calm, sleepy, lean]);

  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (calm || e.pointerType !== "mouse") return;
    hovering.current = true;
    if (sleepy) {
      setSleepy(false);
      setActivity((n) => n + 1);
    }
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    lean.set(Math.max(-1, Math.min(1, dx)) * 6);
  };

  const unfold = (i: number) => ({ duration: reduce ? 0 : 0.9, ease: EASE, delay: reduce ? 0 : 0.15 + i * 0.12 });
  const move = { duration: reduce ? 0 : 0.9, ease: EASE };
  const pop = { duration: reduce ? 0 : 0.45, ease: EASE };
  const leaves = Object.entries(LEAVES[stage]);
  const before = grew ? LEAVES[(stage - 1) as PlantStage] : LEAVES[stage];
  let newIndex = 0;
  const top = STAGE_TOP[stage];
  const hat = HAT_AT[stage];
  const bow = BOW_AT[stage];

  return (
    <span
      className={className}
      // content-box: padding from className widens the hover area without shrinking the plant.
      style={{ display: "block", width: size, boxSizing: "content-box", touchAction: "manipulation" }}
      onPointerMove={onMove}
      onPointerLeave={() => {
        hovering.current = false;
        lean.set(0);
      }}
      onClick={tapOnClick ? tap : undefined}
    >
      <svg viewBox="-6 -24 112 144" width={size} height={(size * 144) / 112} {...(label === "" ? { "aria-hidden": true } : { role: "img", "aria-label": label ?? `Your plant: ${STAGES[stage - 1].name.toLowerCase()}` })} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id={id("pot")} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={C.potLight} />
            <stop offset="0.5" stopColor={C.potMid} />
            <stop offset="1" stopColor={C.potDark} />
          </linearGradient>
          <linearGradient id={id("rim")} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={C.rimLight} />
            <stop offset="0.5" stopColor={C.rimMid} />
            <stop offset="1" stopColor={C.rimDark} />
          </linearGradient>
          <linearGradient id={id("potShade")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#a8583a" stopOpacity="0.28" />
            <stop offset="0.25" stopColor="#a8583a" stopOpacity="0" />
            <stop offset="0.8" stopColor="#a8583a" stopOpacity="0" />
            <stop offset="1" stopColor="#a8583a" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id={id("soil")} gradientUnits="userSpaceOnUse" cx="46" cy="72" r="30">
            <stop offset="0" stopColor={C.soilLight} />
            <stop offset="0.55" stopColor={C.soilMid} />
            <stop offset="1" stopColor={C.soilDark} />
          </radialGradient>
          <linearGradient id={id("leaf")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.leafLight} />
            <stop offset="1" stopColor={C.leafMid} />
          </linearGradient>
          <linearGradient id={id("stem")} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={C.stemLight} />
            <stop offset="1" stopColor={C.stem} />
          </linearGradient>
          <radialGradient id={id("petal")} cx="0.1" cy="0.5" r="0.9">
            <stop offset="0" stopColor={C.petalShade} />
            <stop offset="0.6" stopColor={C.petal} />
          </radialGradient>
          <radialGradient id={id("heart")} cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#ffe07a" />
            <stop offset="1" stopColor={C.heart} />
          </radialGradient>
          <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <clipPath id={id("opening")}>
            <ellipse cx="50" cy="72.6" rx="31" ry="4.9" />
          </clipPath>
          <clipPath id={id("body")}>
            <path d={POT_BODY} />
          </clipPath>
        </defs>

        {ground && <SoilPatch />}

        {/* Ground shadow stays put while the body squashes. */}
        <ellipse cx="50" cy="119" rx="28" ry="3" fill="#4a2e1a" opacity={ground ? 0.3 : 0.16} filter={url("soft")} />

        <g transform="translate(50 119)">
          <motion.g animate={body} style={PIVOT_STYLE}>
            <Pivot r={145} />
            <g transform="translate(-50 -119)">
              {/* Rim, back: the top of the rim, the inner wall, the soil */}
              <ellipse cx="50" cy="72" rx="35" ry="6.5" fill={C.rimTop} />
              <ellipse cx="50" cy="72.6" rx="31" ry="4.9" fill={C.innerWall} />
              <g clipPath={url("opening")}>
                <ellipse cx="50" cy="74" rx="31" ry="4.6" fill={url("soil")} />
                <g fill={C.soilLight} opacity="0.55">
                  <ellipse cx="36" cy="73.4" rx="3" ry="1.2" />
                  <ellipse cx="60" cy="72.6" rx="3.4" ry="1.3" />
                  <ellipse cx="70" cy="74.6" rx="2.4" ry="1" />
                  <ellipse cx="28" cy="75" rx="2" ry="0.9" />
                </g>
                <motion.ellipse cx="50" cy="73.6" rx="31" ry="5" fill={C.soilDark} initial={{ opacity: 0 }} animate={damp} />
              </g>

              {/* Plant: lean toward the cursor, then a slow idle sway, pivoting on the soil */}
              <g transform="translate(50 72)">
                <motion.g style={{ ...PIVOT_STYLE, rotate: lean }}>
                  <Pivot r={130} />
                  <motion.g
                    style={PIVOT_STYLE}
                    animate={calm ? { rotate: 0 } : { rotate: [-1.1, 1.1, -1.1] }}
                    transition={calm ? { duration: 0 } : { duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Pivot r={130} />
                    <g transform="translate(-50 -72)">
                      {/* Stage 1: the seed itself, half in the soil, cracked open by the shoot. It drops away on sprouting. */}
                      <AnimatePresence initial={false}>
                        {stage === 1 && (
                          <motion.g key="seed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: 3, transition: { duration: reduce ? 0 : 0.5 } }}>
                            <Seed />
                          </motion.g>
                        )}
                      </AnimatePresence>
                      <AnimatePresence initial={false}>
                        {BRANCHES[stage].map((d, i) => (
                          <motion.path
                            key={`branch-${i}`}
                            initial={{ pathLength: 0, d }}
                            animate={{ pathLength: 1, d }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: reduce ? 0 : 0.7, ease: EASE, delay: reduce ? 0 : 0.1 + i * 0.1 }}
                            stroke={url("stem")}
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            fill="none"
                          />
                        ))}
                      </AnimatePresence>
                      <motion.path
                        initial={false}
                        animate={{ d: STEM[stage] }}
                        transition={move}
                        stroke={url("stem")}
                        strokeWidth={stage >= 4 ? 3 : stage === 1 ? 1.6 : 2.6}
                        strokeLinecap="round"
                        fill="none"
                      />
                      <AnimatePresence initial={false}>
                        {leaves.map(([key, pose], i) => {
                          const isNew = !before[key];
                          const order = isNew ? newIndex++ : 0;
                          return (
                            <Leaf
                              key={key}
                              side={pose.side}
                              pose={pose}
                              fill={url("leaf")}
                              idle={!calm}
                              phase={i}
                              transition={isNew ? unfold(order) : move}
                              reduce={reduce}
                              wave={calm ? 0 : wave}
                              lift={calm ? 0 : pouring ? 2 : expecting ? 1 : 0}
                              hit={calm ? 0 : sig.drop}
                              shake={calm ? 0 : sig.shake}
                            />
                          );
                        })}
                      </AnimatePresence>
                      <AnimatePresence initial={false}>
                        {stage === 4 &&
                          BUDS.map((b, i) => <Flower key={`bud-${i}`} at={b} petal={url("petal")} heart={url("heart")} delay={0.5 + i * 0.15} reduce={reduce} />)}
                        {stage === 5 &&
                          FLOWERS.map((f, i) => <Flower key={`flower-${i}-${burst}`} at={f} petal={url("petal")} heart={url("heart")} delay={0.35 + i * 0.18} reduce={reduce} />)}
                      </AnimatePresence>
                      {/* Worn on the crown, so they sway with the plant and move up as it grows. */}
                      <AnimatePresence initial={false}>
                        {accessory === "bow" && (
                          <motion.g key="bow" initial={{ x: bow.x, y: bow.y, scale: 0, opacity: 0 }} animate={{ x: bow.x, y: bow.y, scale: bow.s, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={pop} style={PIVOT_STYLE}>
                            <Pivot r={14} />
                            <Bow />
                          </motion.g>
                        )}
                        {accessory === "hat" && (
                          <motion.g
                            key="hat"
                            initial={{ x: hat.x, y: hat.y - 14, rotate: -6, scale: hat.s, opacity: 0 }}
                            animate={{ x: hat.x, y: hat.y, rotate: -6, scale: hat.s, opacity: 1 }}
                            exit={{ y: hat.y - 12, opacity: 0 }}
                            transition={pop}
                            style={PIVOT_STYLE}
                          >
                            <Pivot r={27} />
                            <Hat />
                          </motion.g>
                        )}
                      </AnimatePresence>
                    </g>
                  </motion.g>
                </motion.g>
              </g>

              {/* Soil in front of the stem base */}
              <g clipPath={url("opening")}>
                <ellipse cx="50" cy="73.4" rx="5.4" ry="1.7" fill={url("soil")} />
              </g>

              {/* Rim, front: a thick, rounded band */}
              <path d="M15,72 A35,6.5 0 0 0 85,72 L85,81.5 C85,85.4 81.6,87.6 77,88 Q50,90.6 23,88 C18.4,87.6 15,85.4 15,81.5 Z" fill={url("rim")} />
              <path d="M17,74.6 A33,5.6 0 0 0 83,74.6" stroke="#fff" strokeOpacity="0.3" strokeWidth="1" fill="none" strokeLinecap="round" />
              <ellipse cx="24" cy="81" rx="2.4" ry="3.2" fill="#fff" opacity="0.18" filter={url("soft")} />

              {/* Pot body: chubby, soft, with a sheen on the left */}
              <path d={POT_BODY} fill={url("pot")} />
              <g clipPath={url("body")}>
                <rect x="15" y="86" width="70" height="34" fill={url("potShade")} />
                <ellipse cx="28" cy="101" rx="3.2" ry="9" fill="#fff" opacity="0.15" filter={url("soft")} />
              </g>

              {/* Scarf: wrapped around the pot's middle, tied at the side */}
              <AnimatePresence initial={false}>
                {accessory === "scarf" && (
                  <motion.g key="scarf" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }} transition={pop}>
                    <Scarf />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Face */}
              <g fill={C.cheek} opacity={rosy ? 0.85 : 0.6} filter={url("soft")} style={{ transition: "opacity 0.4s" }}>
                <ellipse cx="30" cy="105.2" rx="5.8" ry="3.6" />
                <ellipse cx="70" cy="105.2" rx="5.8" ry="3.6" />
              </g>
              <motion.g style={{ x: look }}>
                <FaceArt face={face} eyes={eyes} />
              </motion.g>

              {/* Glasses: round frames on the face, arms back to the pot's sides */}
              <AnimatePresence initial={false}>
                {accessory === "glasses" && (
                  <motion.g key="glasses" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={pop}>
                    <Glasses />
                  </motion.g>
                )}
              </AnimatePresence>
            </g>
          </motion.g>
        </g>

        {ground && <SoilFront />}

        {/* Signs over the head: ? curious, ! surprised, zZ sleepy, sparkle lines excited, a heart happy */}
        <AnimatePresence>
          {(face === "curious" || face === "surprised" || face === "sleepy" || (face === "excited" && !quiet) || face === "happy") && (
            <motion.g
              key={face}
              aria-hidden="true"
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 4, scale: 0.6 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.25 } }}
              transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
              style={PIVOT_STYLE}
            >
              <Sign face={face} x={stage === 1 ? 74 : 82} y={Math.max(top + 8, -4)} />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Shaking off: two drops flick from the leaves */}
        {!calm && sig.shake > 0 && stage > 1 && (
          <g key={`flick-${sig.shake}`} aria-hidden="true">
            {[-1, 1].map((d) => (
              <motion.ellipse
                key={d}
                rx="1.4"
                ry="1.9"
                fill="#9cc9e2"
                initial={{ cx: 50 + d * 16, cy: top + 22, opacity: 0 }}
                animate={{ cx: 50 + d * 30, cy: [top + 22, top + 16, top + 34], opacity: [0, 1, 0] }}
                transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
              />
            ))}
          </g>
        )}

        {/* Sneeze: a little puff */}
        <AnimatePresence>
          {face === "sneeze" && !reduce && (
            <motion.g key={`puff-${req.sneeze}`} initial={{ opacity: 0, x: 0, scale: 0.4 }} animate={{ opacity: [0, 0, 0.9, 0], x: [0, 0, 6, 12], scale: [0.4, 0.4, 1, 1.2] }} transition={{ duration: 0.9, times: [0, 0.5, 0.7, 1] }}>
              <g fill="#fff" stroke="#e7dcd6" strokeWidth="0.5">
                <circle cx="62" cy="108" r="2.6" />
                <circle cx="66" cy="106" r="2" />
                <circle cx="65.4" cy="110" r="1.6" />
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Blush: a few hearts float up */}
        {!reduce && hearts > 0 && (
          <g key={`hearts-${hearts}`}>
            {[-16, 2, 18].map((dx, i) => (
              <motion.path
                key={i}
                d={HEART}
                fill={C.bow}
                style={PIVOT_STYLE}
                initial={{ x: 50 + dx, y: top + 10, opacity: 0, scale: 0.4 }}
                animate={{ y: top - 16 - i * 4, opacity: [0, 1, 0], scale: [0.4, 1.1, 0.9] }}
                transition={{ duration: 1.6, delay: i * 0.18, ease: "easeOut" }}
              />
            ))}
          </g>
        )}

        {/* Sparkles: a quiet twinkle while blooming, a short burst at each new stage */}
        {stage === 5 &&
          !quiet &&
          STEADY_SPARKLES.map((s, i) => (
            <g key={`steady-${i}`} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
              <motion.path
                d={SPARKLE}
                fill={C.sparkle}
                style={PIVOT_STYLE}
                animate={calm ? { opacity: 0.9 } : { opacity: [0.45, 1, 0.45], scale: [0.85, 1, 0.85] }}
                transition={calm ? { duration: 0 } : { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.9 }}
              />
            </g>
          ))}
        {!reduce && !quiet && burst > 0 && (
          <g key={`burst-${burst}`}>
            {BURST_SPARKLES.map((s, i) => (
              <g key={i} transform={`translate(${s.x} ${Math.max(s.y, top - 10 + i * 6)}) scale(${s.s})`}>
                <motion.path
                  d={SPARKLE}
                  fill={C.sparkle}
                  style={PIVOT_STYLE}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.1, 0.4], rotate: [0, 30] }}
                  transition={{ duration: 1.5, delay: 0.6 + i * 0.12, ease: "easeOut" }}
                />
              </g>
            ))}
          </g>
        )}

        {/* "Look at me" ticks over the seedling, and briefly after growth */}
        <AnimatePresence>
          {(stage === 1 || (grew && moment?.face === "excited")) && !expression && !quiet && (
            <motion.g
              key={`ticks-${stage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.4 }}
              stroke={C.sparkle}
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <g transform={`translate(50 ${top - 2})`}>
                <path d="M0,-3 L0,-8" />
                <path d="M-7,-1 L-10,-5" />
                <path d="M7,-1 L10,-5" />
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {scene}
      </svg>
    </span>
  );
}

const POT_BODY = "M20.5,88 C19.2,99 22.6,109.6 28.6,114.6 C31.6,117.2 35.8,118.2 41,118.2 L59,118.2 C64.2,118.2 68.4,117.2 71.4,114.6 C77.4,109.6 80.8,99 79.5,88 Z";

/** Eyes and mouth for each face, on the pot. Eyes at y 99, 21 units apart. */
function FaceArt({ face, eyes }: { face: Face; eyes: ReturnType<typeof useAnimationControls> }) {
  const ink = { stroke: C.ink, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const round = (rx: number, ry: number, dx = 0, dy = 0) => (
    <motion.g animate={eyes} style={PIVOT_STYLE}>
      {[39.6, 60.4].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="99" rx={rx} ry={ry} fill={C.ink} />
          <circle cx={cx + 1.3 + dx} cy={99 - 1.6 + dy} r={rx * 0.38} fill="#fff" />
          <circle cx={cx - 1 + dx} cy={99 + 1.5 + dy} r={rx * 0.17} fill="#fff" />
        </g>
      ))}
    </motion.g>
  );
  const arches = (
    <g {...ink}>
      <path d="M36.2,100 Q39.6,95.6 43,100" />
      <path d="M57,100 Q60.4,95.6 63.8,100" />
    </g>
  );
  const bigSmile = (
    <g>
      <path d="M45.4,102.6 Q50,109.8 54.6,102.6 Z" fill={C.ink} stroke={C.ink} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M47.4,105.8 Q50,104.4 52.6,105.8 Q50,108 47.4,105.8 Z" fill={C.tongue} />
    </g>
  );
  const smile = <path d="M46.8,103.2 Q50,106.4 53.2,103.2" {...ink} strokeWidth={1.4} />;

  switch (face) {
    case "happy":
      return (
        <g>
          {arches}
          {smile}
        </g>
      );
    case "watered":
      return (
        <g>
          {arches}
          {bigSmile}
        </g>
      );
    case "excited":
      return (
        <g>
          <g {...ink} strokeWidth={1.6}>
            <path d="M36.8,96.2 L42.2,99 L36.8,101.8" />
            <path d="M63.2,96.2 L57.8,99 L63.2,101.8" />
          </g>
          {bigSmile}
        </g>
      );
    case "surprised":
      return (
        <g>
          {round(4.6, 5.3)}
          <ellipse cx="50" cy="105" rx="1.7" ry="2.1" fill={C.ink} />
        </g>
      );
    case "curious":
      return (
        <g>
          {round(4.3, 5, 0.6, -0.5)}
          <path d="M48.2,104 Q50,104.8 51.8,103.6" {...ink} strokeWidth={1.3} />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <motion.g animate={eyes} style={PIVOT_STYLE} {...ink}>
            <path d="M36.4,99.2 Q39.6,101.6 42.8,99.2" />
            <path d="M57.2,99.2 Q60.4,101.6 63.6,99.2" />
          </motion.g>
          <path d="M48.4,104 Q50,105 51.6,104" {...ink} strokeWidth={1.2} />
        </g>
      );
    case "hopeful":
      // Looking up at the can, mouth a little open.
      return (
        <g>
          {round(4.4, 5.1, 0.4, -1.4)}
          <ellipse cx="50" cy="104.6" rx="1.6" ry="1.4" fill={C.ink} />
        </g>
      );
    case "brace":
      return (
        <g>
          <g {...ink} strokeWidth={1.6}>
            <path d="M37.4,97.4 L41.8,99.2 L37.4,101" />
            <path d="M62.6,97.4 L58.2,99.2 L62.6,101" />
          </g>
          <path d="M47.6,104 Q50,105.2 52.4,104" {...ink} strokeWidth={1.3} />
        </g>
      );
    case "sneeze":
      return (
        <g>
          <g {...ink} strokeWidth={1.6}>
            <path d="M37.4,97 L41.8,99 L37.4,101" />
            <path d="M62.6,97 L58.2,99 L62.6,101" />
          </g>
          <ellipse cx="50" cy="105" rx="2.4" ry="1.9" fill={C.ink} />
        </g>
      );
    default:
      return (
        <g>
          {round(4.1, 4.8)}
          {smile}
        </g>
      );
  }
}

/** The little sign by the plant's head for each expression. */
function Sign({ face, x, y }: { face: Face; x: number; y: number }) {
  const style = { fontFamily: "ui-rounded, system-ui, sans-serif", fontWeight: 800 } as const;
  return (
    <g transform={`translate(${x} ${y})`}>
      {face === "curious" && (
        <text x="0" y="0" fontSize="14" fill="#f08aa8" style={style} textAnchor="middle">
          ?
        </text>
      )}
      {face === "surprised" && (
        <text x="0" y="0" fontSize="14" fill="#f5b53a" style={style} textAnchor="middle">
          !
        </text>
      )}
      {face === "sleepy" && (
        <g fill="#d58ad8" style={style}>
          <text x="-3" y="2" fontSize="7">
            z
          </text>
          <text x="2" y="-4" fontSize="10">
            Z
          </text>
        </g>
      )}
      {face === "excited" && (
        <g stroke={C.sparkle} strokeWidth="1.7" strokeLinecap="round">
          <path d="M-4,-2 L-8,-7" />
          <path d="M0,-4 L1,-10" />
          <path d="M4,-1 L9,-5" />
        </g>
      )}
      {face === "happy" && <path d={HEART} transform="translate(0 -2) scale(1.3)" fill={C.bow} />}
    </g>
  );
}

// Soil after design-references/soil-reference.png: an irregular, crumbly patch,
// wider than the pot, with crumbs scattered at its edge. Kept minimal (no grass,
// pebbles, or flowers) so the plant stays the one thing to look at. Fixed
// positions, so it renders the same every time.
const CRUMBS: [number, number, number][] = [
  [2, 121, 0.9], [6, 117.6, 0.7], [-1, 118.6, 0.6], [98, 120.4, 0.9], [102, 117.8, 0.6], [95, 124.6, 0.7],
  [12, 125.6, 0.8], [26, 128, 0.7], [44, 129, 0.8], [62, 128.8, 0.7], [80, 127.4, 0.8], [90, 126.4, 0.6],
  [16, 114.6, 0.6], [86, 113.8, 0.6], [34, 127, 0.5], [72, 127.8, 0.5],
];

/** Behind the pot: the patch, its texture, and a soft shadow. Stays still. */
function SoilPatch() {
  return (
    <g aria-hidden="true">
      <ellipse cx="50" cy="121" rx="49" ry="8" fill="#5a3a22" opacity="0.14" />
      <path
        d="M3,119.4 C2,115.6 7,113 13,112.6 C16,110.2 22,110 26,111 C31,109 38,108.8 43,110 C49,108.6 56,108.8 61,110 C67,108.8 74,109.4 78,111.2 C84,110.4 90,111.6 92,113.6 C97,114 100.4,116.8 99.4,120 C100.6,123.6 96,126 90,126.2 C86,128.2 78,128.4 72,127.4 C64,129 54,129.2 46,128.2 C38,129 28,128.6 22,127 C14,127.6 7,125.8 6,123.2 C3.4,122.6 2.4,121 3,119.4 Z"
        fill="#8a5d3b"
      />
      <path d="M6,117 C14,112.4 30,111.4 50,111.4 C70,111.4 88,112.4 96,117 C86,115 68,114.4 50,114.4 C32,114.4 16,115 6,117 Z" fill="#ad7d54" opacity="0.85" />
      {/* Texture */}
      <g fill="#b48659" opacity="0.75">
        <circle cx="12" cy="119" r="1.1" />
        <circle cx="20" cy="122.6" r="0.9" />
        <circle cx="30" cy="125" r="1" />
        <circle cx="70" cy="125.4" r="1" />
        <circle cx="82" cy="122.6" r="0.9" />
        <circle cx="90" cy="119.6" r="1.1" />
        <circle cx="46" cy="126.4" r="0.8" />
        <circle cx="57" cy="126.6" r="0.8" />
      </g>
      <g fill="#4a2e1a" opacity="0.5">
        <circle cx="16" cy="121.4" r="0.7" />
        <circle cx="26" cy="118.4" r="0.6" />
        <circle cx="76" cy="118.8" r="0.6" />
        <circle cx="86" cy="124.4" r="0.7" />
        <circle cx="38" cy="124.6" r="0.6" />
        <circle cx="64" cy="127" r="0.6" />
      </g>
      <g fill="#8e6340">
        {CRUMBS.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
    </g>
  );
}

/** In front of the pot: soil heaped against its base. */
function SoilFront() {
  return (
    <g aria-hidden="true">
      <path d="M24,120.4 C28,118.2 33,118.2 37,119.4 C43,118 50,118.2 56,119.6 C62,118 69,118.2 74,120.2 C70,123 60,123.8 50,123.8 C39,123.8 28,123 24,120.4 Z" fill="#7a5233" />
      <g fill="#9a6c45">
        <circle cx="31" cy="120.6" r="1" />
        <circle cx="44" cy="121.4" r="0.9" />
        <circle cx="58" cy="121" r="1" />
        <circle cx="68" cy="120.8" r="0.8" />
      </g>
    </g>
  );
}

/** An accessory on its own, for the dress-up tiles. Drawn from the same art the plant wears. */
export function AccessoryIcon({ id, size = 40 }: { id: AccessoryId; size?: number }) {
  const box: Record<AccessoryId, string> = { none: "-3 -13 37 26", glasses: "19 89 62 20", bow: "-13 -9 26 21", hat: "-26 -16 52 25", scarf: "19 100 67 28" };
  return (
    <svg viewBox={box[id]} width={size} height={size} aria-hidden="true" style={{ display: "block", overflow: "visible" }} preserveAspectRatio="xMidYMid meet">
      {id === "none" && (
        <g transform="rotate(-30 15 0)">
          <path d={SHAPES[0].d} fill={C.leafMid} />
          <path d={SHAPES[0].shade} fill={C.leafDark} opacity="0.2" />
          <path d={SHAPES[0].rib} stroke={C.vein} strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </g>
      )}
      {id === "glasses" && <Glasses />}
      {id === "bow" && <Bow />}
      {id === "hat" && <Hat />}
      {id === "scarf" && <Scarf />}
    </svg>
  );
}

function Glasses() {
  return (
    <g>
      {[39.6, 60.4].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="99" r="7.6" fill="#fff" fillOpacity="0.2" stroke={C.frame} strokeWidth="2.4" />
          <path d={`M${cx - 4.2},96.2 Q${cx - 2.6},94.4 ${cx - 0.6},94.2`} stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <path d="M47.2,98 Q50,96 52.8,98" stroke={C.frame} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M32,98 L21,96 M68,98 L79,96" stroke={C.frame} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Scarf() {
  return (
    <g>
      {/* Two broad tails hang from the knot, behind the band */}
      <path d="M64.4,110 C63.4,113.4 62.8,116 62.6,118.6 L70,119.2 C70.2,116.4 70.8,113.6 71.8,111 Z" fill={C.scarfDark} />
      <path d="M69,110 C72.4,112.8 76,115.4 79.6,117.2 L84.4,113 C80.6,111.4 77,109.6 74,107.6 Z" fill={C.scarf} />
      <g stroke={C.scarfLight} strokeWidth="0.9" strokeLinecap="round">
        <path d="M63.6,118.8 l0,1.8 M66.2,119 l0,1.8 M68.8,119.2 l0,1.8" />
        <path d="M80.6,116.8 l1.2,1.6 M83,115 l1.2,1.6" />
      </g>
      {/* The band, following the pot's curve */}
      <path d="M21.4,103.4 Q50,110.4 78.6,103.4 L76.8,114.4 Q50,121.4 23.2,114.4 Z" fill={C.scarf} />
      <path d="M21.6,105.4 Q50,112.4 78.4,105.4" stroke={C.scarfLight} strokeWidth="1.1" fill="none" opacity="0.85" />
      <path d="M23,112.6 Q50,119.6 77,112.6" stroke={C.scarfDark} strokeWidth="1" fill="none" opacity="0.5" />
      <g stroke={C.scarfDark} strokeWidth="1" strokeLinecap="round" opacity="0.45">
        {[27, 33, 39, 45, 51, 57, 63].map((x) => (
          <path key={x} d={`M${x},${107.4 + (1 - Math.abs(50 - x) / 30) * 1.8} l-0.3,6.4`} />
        ))}
      </g>
      <ellipse cx="68.6" cy="109.4" rx="5" ry="4.6" fill={C.scarf} stroke={C.scarfDark} strokeWidth="0.8" />
      <path d="M66,108 Q68.6,106.6 71,108" stroke={C.scarfLight} strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** A pink bow, centred on the origin. */
function Bow() {
  return (
    <g>
      <path d="M-1.4,1.4 L-5.6,9.4 L-2.6,8.4 L-1,10.6 L0.6,2.2 Z" fill={C.bowDark} />
      <path d="M1.4,1.4 L5.6,9.4 L2.6,8.4 L1,10.6 L-0.6,2.2 Z" fill={C.bowDark} />
      <path d="M0,0 C-3,-5.6 -10.4,-7.4 -11.4,-2.6 C-12.2,1.4 -9,5.4 -4.4,3.8 C-2,3 -0.8,1.6 0,0 Z" fill={C.bow} />
      <path d="M0,0 C3,-5.6 10.4,-7.4 11.4,-2.6 C12.2,1.4 9,5.4 4.4,3.8 C2,3 0.8,1.6 0,0 Z" fill={C.bow} />
      <path d="M-3,-1.4 C-5,-3.6 -8,-4.4 -9.4,-3" stroke={C.bowLight} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M3,-1.4 C5,-3.6 8,-4.4 9.4,-3" stroke={C.bowLight} strokeWidth="1" fill="none" strokeLinecap="round" />
      <ellipse cx="0" cy="0.4" rx="2.6" ry="3" fill={C.bowDark} />
      <ellipse cx="-0.6" cy="-0.6" rx="0.9" ry="1" fill={C.bowLight} />
    </g>
  );
}

/** A straw hat with a blue ribbon, brim centred on the origin. */
function Hat() {
  return (
    <g>
      <ellipse cx="0" cy="1" rx="25" ry="6.6" fill={C.strawDark} />
      <ellipse cx="0" cy="0" rx="25" ry="6.4" fill={C.straw} />
      <path d="M-22,1.6 A23,5 0 0 0 22,1.6" stroke={C.strawLight} strokeWidth="1" fill="none" />
      <path d="M-13.5,-0.6 C-14,-9 -9,-14.4 0,-14.4 C9,-14.4 14,-9 13.5,-0.6 Q0,2 -13.5,-0.6 Z" fill={C.straw} />
      <path d="M-9,-11 C-5,-13 5,-13 9,-11" stroke={C.strawLight} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <g stroke={C.strawDark} strokeWidth="0.6" opacity="0.6">
        <path d="M-10,-8 C-4,-9.4 4,-9.4 10,-8" fill="none" />
        <path d="M-12,-5.4 C-5,-6.6 5,-6.6 12,-5.4" fill="none" />
      </g>
      <path d="M-13.6,-4.6 C-6,-2.6 6,-2.6 13.6,-4.6 L13.5,-0.8 C6,1.2 -6,1.2 -13.5,-0.8 Z" fill={C.ribbon} />
      <path d="M-13.4,-3.8 C-6,-1.9 6,-1.9 13.4,-3.8" stroke="#a6d6f6" strokeWidth="0.6" fill="none" />
    </g>
  );
}

function Leaf({
  side,
  pose,
  fill,
  idle,
  phase,
  transition,
  reduce,
  wave,
  lift,
  hit,
  shake,
}: {
  side: Side;
  pose: LeafPose;
  fill: string;
  idle: boolean;
  phase: number;
  /** Unfold timing for a new leaf, move timing for one that was already there. */
  transition: object;
  reduce: boolean;
  /** Bump to wave once (growing, a wiggle). */
  wave: number;
  /** 1: perked up, water is coming. 2: lifted happily while being watered. */
  lift: 0 | 1 | 2;
  /** Bump when a drop lands: the leaf dips under it and springs back. */
  hit: number;
  /** Bump to shake the water off. */
  shake: number;
}) {
  const waving = useAnimationControls();
  const reacting = useAnimationControls();
  const lastWave = useRef(wave);
  useEffect(() => {
    if (wave === lastWave.current) return;
    lastWave.current = wave;
    waving.start({ rotate: [null, 12, -9, 7, -4, 0], transition: { duration: 0.9, ease: "easeInOut", delay: phase * 0.05 } });
  }, [wave, waving, phase]);
  // Lifting is held, so it eases in and out rather than playing once.
  const lastLift = useRef(lift);
  useEffect(() => {
    if (lift === lastLift.current) return;
    lastLift.current = lift;
    waving.start({ rotate: lift === 2 ? -8 : lift === 1 ? -4 : 0, transition: { type: "spring", stiffness: 160, damping: 14 } });
  }, [lift, waving]);
  // The leaves nearest the water (the right side) dip the most; the rest feel it a little.
  const lastHit = useRef(hit);
  const lastShake = useRef(shake);
  useEffect(() => {
    if (shake !== lastShake.current) {
      lastShake.current = shake;
      lastHit.current = hit;
      reacting.start({ rotate: [0, -6, 6, -5, 3, -1, 0], transition: { duration: 0.5, ease: "easeInOut", delay: (phase % 3) * 0.03 } });
      return;
    }
    if (hit === lastHit.current) return;
    lastHit.current = hit;
    const amp = side === "r" ? 7 : 2.5;
    reacting.start({ rotate: [0, amp, -amp * 0.4, amp * 0.15, 0], transition: { duration: 0.45, ease: "easeOut", delay: phase * 0.015 } });
  }, [hit, shake, reacting, side, phase]);

  const s = pose.len / 31;
  const shape = SHAPES[pose.v] ?? SHAPES[0];
  const rotate = side === "r" ? -pose.elev : pose.elev;
  // A new leaf starts folded up against the stem, small, then opens out.
  const folded = side === "r" ? -85 : 85;
  return (
    <motion.g
      style={PIVOT_STYLE}
      initial={{ x: pose.x, y: pose.y, rotate: folded, scale: 0.05, opacity: 0 }}
      animate={{ x: pose.x, y: pose.y, rotate, scale: 1, opacity: 1 }}
      exit={{ rotate: folded, scale: 0.05, opacity: 0, transition: { duration: reduce ? 0 : 0.4 } }}
      transition={transition}
    >
      <Pivot r={60} />
      <motion.g
        style={PIVOT_STYLE}
        animate={idle ? { rotate: [0, 2, 0, -1.4, 0] } : { rotate: 0 }}
        transition={idle ? { duration: 4.2 + (phase % 3) * 0.7, repeat: Infinity, ease: "easeInOut", delay: phase * 0.35 } : { duration: 0 }}
      >
        <Pivot r={60} />
        <g transform={side === "l" ? "scale(-1 1)" : undefined}>
          {/* Waves, dips, and shakes from the leaf's base, where it meets the stem. */}
          <motion.g animate={waving} style={PIVOT_STYLE}>
            <Pivot r={80} />
            <motion.g animate={reacting} style={PIVOT_STYLE}>
              <Pivot r={80} />
              <path d={`M0,0 Q${pose.pet / 2},-0.8 ${pose.pet + 0.6},0`} stroke={C.stem} strokeWidth="1.6" strokeLinecap="round" fill="none" />
              {/* Matte: a soft darker underside, a pale midrib, faint side veins, and a hairline edge. No gloss. */}
              <g transform={`translate(${pose.pet} 0) rotate(${pose.bend ?? 0}) scale(${s} ${s * (pose.w ?? 1)})`}>
                <path d={shape.d} fill={fill} stroke={C.leafLine} strokeOpacity="0.3" strokeWidth={0.5 / s} strokeLinejoin="round" />
                <path d={shape.shade} fill={C.leafDark} opacity="0.2" />
                <path d={shape.rib} stroke={C.vein} strokeOpacity="0.8" strokeWidth={0.75 / s} fill="none" strokeLinecap="round" />
                <path d={shape.veins} stroke={C.vein} strokeOpacity="0.45" strokeWidth={0.5 / s} fill="none" strokeLinecap="round" />
              </g>
            </motion.g>
          </motion.g>
        </g>
      </motion.g>
    </motion.g>
  );
}

/** The seed of stage 1, sitting half in the soil, split at the top where the shoot comes out. */
function Seed() {
  return (
    <g transform="translate(50.8 69.2) rotate(-18)">
      <ellipse cx="0" cy="0" rx="7.4" ry="5.4" fill={C.seed} stroke={C.seedDark} strokeOpacity="0.5" strokeWidth="0.6" />
      <path d="M-7.2,1 C-6.6,4.2 -3,5.6 0,5.4 C3.4,5.2 6.6,3.6 7.2,0.8 C4.2,2.8 -4,3 -7.2,1 Z" fill={C.seedDark} opacity="0.4" />
      <path d="M-4.8,-2.8 C-3,-4.4 0,-4.9 2.4,-4.4" stroke={C.seedLight} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {/* The split the shoot came through */}
      <path d="M-1.8,-5.1 L-0.4,-3 L1,-4.9" stroke={C.seedDark} strokeWidth="0.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
}

/** A small white five-petal flower with a yellow heart. */
function Flower({ at, petal, heart, delay, reduce }: { at: Spot; petal: string; heart: string; delay: number; reduce: boolean }) {
  const open = (i: number) => ({ duration: reduce ? 0 : 0.7, ease: EASE, delay: reduce ? 0 : delay + 0.2 + i * 0.06 });
  return (
    <motion.g
      initial={{ x: at.x, y: at.y + 3, scale: 0.2, opacity: 0 }}
      animate={{ x: at.x, y: at.y, scale: at.s, opacity: 1 }}
      exit={{ scale: 0.2, opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.55, ease: EASE, delay: reduce ? 0 : delay }}
      style={PIVOT_STYLE}
    >
      <Pivot r={12} />
      <g transform="rotate(-10)">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`rotate(${i * 72 - 90})`}>
            <motion.g style={PIVOT_STYLE} initial={{ scale: 0.15, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={open(i)}>
              <Pivot r={10} />
              <ellipse cx="4.6" cy="0" rx="4.8" ry="4.2" fill={petal} stroke={C.petalShade} strokeWidth="0.4" />
            </motion.g>
          </g>
        ))}
        <circle r="2.8" fill={heart} />
        <circle cx="-0.8" cy="-0.8" r="0.9" fill="#fff3c4" />
        <g fill={C.heartDark} opacity="0.6">
          <circle cx="1" cy="0.9" r="0.35" />
          <circle cx="-0.9" cy="1" r="0.3" />
        </g>
      </g>
    </motion.g>
  );
}
