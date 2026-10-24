"use client";

// The little plant: a layered SVG companion drawn from
// design-references/civic-plant.png. Pot, soil, stem, leaves, face, and flower
// are separate layers so each can move on its own. Every stage shares one pot,
// one face, and one coordinate system (the plant grows from the soil at 50,74).
//
// Motion: an idle sway with blinking, a lean toward the cursor, a soft squash on
// tap, leaves that unfold as the stage rises, and a flower with a few sparkles
// at the milestone. Under reduced motion every change still happens, instantly.
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion, useSpring, useTransform } from "motion/react";
import { GROWTH_STAGES, type GrowthStage } from "@/lib/growth";
import { EASE } from "@/lib/motion";

/** The stage type and names come from the shared growth definitions. */
export type PlantStage = GrowthStage;
export const STAGES = GROWTH_STAGES;

// Colours sampled from the reference sheet. They live here, not in globals.css:
// the plant is an illustration, and its greens are not part of the UI palette.
const C = {
  potLight: "#fcc9a6",
  potMid: "#f3ad87",
  potDark: "#de916c",
  lipLight: "#fdd9bd",
  lipDark: "#f0b38f",
  innerWall: "#c27d5c",
  soilLight: "#8e5e36",
  soilMid: "#6c4426",
  soilDark: "#4f2f18",
  leafLight: "#9cc86a",
  leafMid: "#6fa547",
  leafDark: "#4f8435",
  vein: "#c4dd98",
  stem: "#5f9a3f",
  stemLight: "#86bb5c",
  petal: "#fff8ef",
  petalShade: "#f6cfac",
  petalEdge: "#efd8c2",
  heart: "#f3a23a",
  heartLight: "#fcc65e",
  sparkle: "#f5c46a",
  ink: "#2c211b",
  blush: "#f29a83",
  seedLight: "#97963f",
  seedDark: "#5a4520",
};

// One leaf pointing right, base at the origin, about 31 units long.
const LEAF = "M0,0 C1.5,-7 9,-11.5 17.5,-10.6 C24.5,-9.8 29.5,-5 31,-0.4 C28,4.6 21,8.6 13.5,8.2 C6,7.8 1.2,4 0,0 Z";
const LEAF_UNDER = "M0,0 C9,-0.6 21,-1.2 31,-0.4 C28,4.6 21,8.6 13.5,8.2 C6,7.8 1.2,4 0,0 Z";
const MIDRIB = "M1.5,-0.1 C10,-0.9 20,-1.4 29.5,-0.7";
const VEINS = "M8.5,-0.5 Q11.5,-4 15,-6.4 M15.5,-0.9 Q18.6,-4.4 22.4,-6.2 M8.5,-0.5 Q11.5,2.4 14.4,4 M15.5,-0.9 Q18.6,2 21.6,3.4";
const SPARKLE = "M0,-4 C0.5,-1.1 1.1,-0.5 4,0 C1.1,0.5 0.5,1.1 0,4 C-0.5,1.1 -1.1,0.5 -4,0 C-1.1,-0.5 -0.5,-1.1 0,-4 Z";

type Side = "l" | "r";
/** Where a leaf meets the stem, its angle above horizontal, blade length, and stalk length. */
type LeafPose = { x: number; y: number; elev: number; len: number; pet: number };
const SIDE: Record<string, Side> = { a: "l", b: "r", c: "l", d: "r", e: "l", f: "r", g: "r" };

// Stems share one command shape so Motion can morph between stages.
const STEM: Record<PlantStage, string> = {
  1: "M50,74 C50,74 50,74 50,74",
  2: "M50,74 C49,66 49.2,59 50.2,54",
  3: "M50,74 C48.6,63 51.6,46 50.8,33",
  4: "M50,74 C48.4,60 52,42 50.8,25",
  5: "M50,74 C48.4,56 52.4,30 50.4,0",
};

const LEAVES: Record<PlantStage, Record<string, LeafPose>> = {
  1: {},
  2: {
    a: { x: 50, y: 54.4, elev: 24, len: 35, pet: 3 },
    b: { x: 50.4, y: 54, elev: 30, len: 37, pet: 3 },
  },
  3: {
    a: { x: 49.6, y: 61, elev: 12, len: 28, pet: 4 },
    b: { x: 50.4, y: 55, elev: 18, len: 30, pet: 5 },
    c: { x: 50.4, y: 45, elev: 34, len: 30, pet: 5 },
    d: { x: 51, y: 40.5, elev: 40, len: 30, pet: 5 },
    g: { x: 50.8, y: 34, elev: 70, len: 24, pet: 3 },
  },
  4: {
    a: { x: 49.6, y: 63, elev: 10, len: 37, pet: 6 },
    b: { x: 50.4, y: 57, elev: 4, len: 39, pet: 8 },
    c: { x: 50.2, y: 47, elev: 30, len: 37, pet: 7 },
    d: { x: 51.2, y: 41, elev: 36, len: 37, pet: 6 },
    e: { x: 50.8, y: 32, elev: 46, len: 31, pet: 5 },
    f: { x: 51, y: 28, elev: 52, len: 31, pet: 5 },
  },
  5: {
    a: { x: 49.6, y: 65, elev: 6, len: 40, pet: 6 },
    b: { x: 50.4, y: 59, elev: 14, len: 42, pet: 6 },
    c: { x: 50, y: 46, elev: 24, len: 39, pet: 6 },
    d: { x: 51.4, y: 39, elev: 28, len: 42, pet: 6 },
    e: { x: 50.6, y: 22, elev: 40, len: 20, pet: 4 },
  },
};

const FLOWER = { x: 50.4, y: -4 };
const STEADY_SPARKLES = [
  { x: 88, y: -10, s: 1 },
  { x: 12, y: 18, s: 0.8 },
  { x: 94, y: 44, s: 0.75 },
];
const BURST_SPARKLES = [
  { x: 22, y: -8, s: 0.9 },
  { x: 84, y: -12, s: 1.1 },
  { x: 96, y: 18, s: 0.8 },
  { x: 6, y: 40, s: 0.75 },
  { x: 92, y: 60, s: 0.7 },
];

/** A transparent square centred on the local origin, so fill-box transforms pivot there. */
function Pivot({ r }: { r: number }) {
  return <rect x={-r} y={-r} width={2 * r} height={2 * r} fill="none" />;
}

const PIVOT_STYLE = { transformBox: "fill-box", originX: 0.5, originY: 0.5 } as const;

export function CivicPlant({
  stage,
  size = 120,
  signal,
  label,
  still = false,
  tapOnClick = true,
  className,
}: {
  stage: PlantStage;
  /** Width in px; height follows the 112:144 artboard. */
  size?: number;
  /** Bump a counter to replay a tap or the milestone from outside (the dev preview). */
  signal?: { tap: number; milestone: number };
  /** Accessible name. Defaults to the stage name; "" hides the plant from assistive tech (e.g. inside a labelled button). */
  label?: string;
  /** No idle sway, blink, lean, or tap: for small illustrations such as the Growth Story. */
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
  const lean = useSpring(0, { stiffness: 70, damping: 16 });
  const look = useTransform(lean, (v) => v * 0.14);

  // Events: growth (stage went up), milestone (reached bloom), and cheer (happy
  // eyes for a moment). Tracked by counters, using React's "previous prop" pattern.
  const [prev, setPrev] = useState({ stage, tap: signal?.tap ?? 0, milestone: signal?.milestone ?? 0 });
  const [grew, setGrew] = useState(false);
  const [milestone, setMilestone] = useState(0);
  const [cheer, setCheer] = useState(0);
  const [settled, setSettled] = useState(0);
  const [tapReq, setTapReq] = useState(0);
  if (stage !== prev.stage || (signal && (signal.tap !== prev.tap || signal.milestone !== prev.milestone))) {
    if (stage > prev.stage) {
      setGrew(true);
      setCheer((n) => n + 1);
      if (stage === 5) setMilestone((n) => n + 1);
    } else if (stage < prev.stage) {
      setGrew(false);
    }
    if (signal && signal.tap !== prev.tap) {
      setTapReq((n) => n + 1);
      setCheer((n) => n + 1);
    }
    if (signal && signal.milestone !== prev.milestone) {
      setMilestone((n) => n + 1);
      setCheer((n) => n + 1);
    }
    setPrev({ stage, tap: signal?.tap ?? 0, milestone: signal?.milestone ?? 0 });
  }
  const happy = stage === 5 || cheer !== settled;

  useEffect(() => {
    if (cheer === settled) return;
    const t = setTimeout(() => setSettled(cheer), 1400);
    return () => clearTimeout(t);
  }, [cheer, settled]);

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
    setCheer((n) => n + 1);
  };

  const lastTap = useRef(tapReq);
  useEffect(() => {
    if (tapReq === lastTap.current) return;
    lastTap.current = tapReq;
    squash();
    // squash only starts an animation; it does not set state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapReq]);

  // Blink every few seconds while the eyes are open.
  useEffect(() => {
    if (calm || happy) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        eyes.start({ scaleY: [1, 0.12, 1], transition: { duration: 0.22, ease: "easeInOut" } });
        loop();
      }, 2600 + Math.random() * 3400);
    };
    loop();
    return () => clearTimeout(t);
  }, [calm, happy, eyes]);

  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (calm || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    lean.set(Math.max(-1, Math.min(1, dx)) * 6);
  };

  const unfold = (i: number) => ({ duration: reduce ? 0 : 0.9, ease: EASE, delay: reduce ? 0 : 0.15 + i * 0.12 });
  const move = { duration: reduce ? 0 : 0.9, ease: EASE };
  const leaves = Object.entries(LEAVES[stage]);
  const before = grew ? LEAVES[(stage - 1) as PlantStage] : LEAVES[stage];
  let newIndex = 0;

  return (
    <span
      className={className}
      // content-box: padding from className widens the hover area without shrinking the plant.
      style={{ display: "block", width: size, boxSizing: "content-box", touchAction: "manipulation" }}
      onPointerMove={onMove}
      onPointerLeave={() => lean.set(0)}
      onClick={tapOnClick ? tap : undefined}
    >
      <svg viewBox="-6 -24 112 144" width={size} height={(size * 144) / 112} {...(label === "" ? { "aria-hidden": true } : { role: "img", "aria-label": label ?? `Your plant: ${STAGES[stage - 1].name.toLowerCase()}` })} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id={id("pot")} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={C.potLight} />
            <stop offset="0.45" stopColor={C.potMid} />
            <stop offset="1" stopColor={C.potDark} />
          </linearGradient>
          <linearGradient id={id("rim")} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={C.lipLight} />
            <stop offset="0.5" stopColor={C.potLight} />
            <stop offset="1" stopColor={C.potMid} />
          </linearGradient>
          <linearGradient id={id("lip")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.lipDark} />
            <stop offset="1" stopColor={C.lipLight} />
          </linearGradient>
          <linearGradient id={id("rimShadow")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#a8583a" stopOpacity="0.3" />
            <stop offset="1" stopColor="#a8583a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id("potBase")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#b9694a" stopOpacity="0" />
            <stop offset="1" stopColor="#b9694a" stopOpacity="0.22" />
          </linearGradient>
          <radialGradient id={id("soil")} gradientUnits="userSpaceOnUse" cx="46" cy="71" r="32">
            <stop offset="0" stopColor={C.soilLight} />
            <stop offset="0.55" stopColor={C.soilMid} />
            <stop offset="1" stopColor={C.soilDark} />
          </radialGradient>
          <linearGradient id={id("leaf")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.leafLight} />
            <stop offset="0.55" stopColor={C.leafMid} />
            <stop offset="1" stopColor={C.leafDark} />
          </linearGradient>
          <linearGradient id={id("stem")} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={C.stemLight} />
            <stop offset="1" stopColor={C.stem} />
          </linearGradient>
          <radialGradient id={id("petal")} cx="0.05" cy="0.5" r="0.95">
            <stop offset="0" stopColor={C.petalShade} />
            <stop offset="0.5" stopColor="#fdeedd" />
            <stop offset="1" stopColor={C.petal} />
          </radialGradient>
          <radialGradient id={id("heart")} cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor={C.heartLight} />
            <stop offset="1" stopColor={C.heart} />
          </radialGradient>
          <radialGradient id={id("seed")} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor={C.seedLight} />
            <stop offset="1" stopColor={C.seedDark} />
          </radialGradient>
          <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <clipPath id={id("opening")}>
            <path d="M21.6,77.8 A28.4,4.3 0 0 0 78.4,77.8 L78.4,40 L21.6,40 Z" />
          </clipPath>
          <clipPath id={id("body")}>
            <path d="M22.6,84 L27.2,110.5 C27.9,115 30.4,116.8 34.5,117 L65.5,117 C69.6,116.8 72.1,115 72.8,110.5 L77.4,84 Z" />
          </clipPath>
        </defs>

        {/* Ground shadow stays put while the body squashes. */}
        <ellipse cx="50" cy="117.6" rx="25" ry="2.6" fill="#6b4a3a" opacity="0.16" filter={url("soft")} />

        <g transform="translate(50 118)">
          <motion.g animate={body} style={PIVOT_STYLE}>
            <Pivot r={140} />
            <g transform="translate(-50 -118)">
              {/* Pot body */}
              <g id={id("potLayer")}>
                <path d="M22.6,84 L27.2,110.5 C27.9,115 30.4,116.8 34.5,117 L65.5,117 C69.6,116.8 72.1,115 72.8,110.5 L77.4,84 Z" fill={url("pot")} />
                <g clipPath={url("body")}>
                  <rect x="20" y="84" width="60" height="10" fill={url("rimShadow")} />
                  <rect x="20" y="104" width="60" height="14" fill={url("potBase")} />
                  <ellipse cx="31" cy="101" rx="2.6" ry="9" fill="#fff" opacity="0.28" filter={url("soft")} />
                </g>
              </g>

              {/* Rim, back half: the lip, the inner wall, the soil */}
              <ellipse cx="50" cy="78" rx="32" ry="5.6" fill={url("lip")} />
              <ellipse cx="50" cy="77.8" rx="28.4" ry="4.3" fill={C.innerWall} />
              <g clipPath={url("opening")}>
                <path
                  d="M20,82 C22,76 27,73.6 32,73.8 C35,71.8 40,71.4 44,72.2 C47,70.6 53,70.4 56.5,71.8 C61,71 66,72 69,73.6 C74,73.4 78,76 80,82 Z"
                  fill={url("soil")}
                />
                <g fill={C.soilLight} opacity="0.55">
                  <ellipse cx="35" cy="74.6" rx="3.2" ry="1.5" />
                  <ellipse cx="58.5" cy="73.4" rx="3.6" ry="1.6" />
                  <ellipse cx="44" cy="76.4" rx="2.6" ry="1.2" />
                  <ellipse cx="67" cy="76" rx="2.8" ry="1.2" />
                  <ellipse cx="27" cy="77" rx="2.2" ry="1" />
                </g>
                <g fill={C.soilDark} opacity="0.5">
                  <circle cx="39" cy="77.4" r="0.7" />
                  <circle cx="62" cy="77.8" r="0.6" />
                  <circle cx="53" cy="76.6" r="0.5" />
                  <circle cx="30.5" cy="75.6" r="0.5" />
                  <circle cx="71" cy="78" r="0.5" />
                </g>
              </g>

              {/* Seed */}
              <AnimatePresence initial={false}>
                {stage === 1 && (
                  <motion.g
                    key="seed"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 3 }}
                    transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                  >
                    <ellipse cx="50" cy="67" rx="10.4" ry="8.8" fill={url("seed")} />
                    <path d="M43.4,63.4 C46,60.4 51,59.8 54.8,61.4" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                    <path d="M49.6,58.6 C50.2,57.6 51.4,57.4 52.2,58" stroke={C.seedDark} strokeWidth="1.1" fill="none" strokeLinecap="round" />
                    <path d="M41.5,72.4 C46,75.6 54,75.6 58.5,72.4 C55,74 45,74 41.5,72.4 Z" fill={C.soilMid} opacity="0.6" />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Plant: lean toward the cursor, then a slow idle sway, pivoting on the soil */}
              <g transform="translate(50 74)">
                <motion.g style={{ ...PIVOT_STYLE, rotate: lean }}>
                  <Pivot r={130} />
                  <motion.g
                    style={PIVOT_STYLE}
                    animate={calm || stage === 1 ? { rotate: 0 } : { rotate: [-1.1, 1.1, -1.1] }}
                    transition={calm || stage === 1 ? { duration: 0 } : { duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Pivot r={130} />
                    <g transform="translate(-50 -74)">
                      <motion.path
                        initial={false}
                        animate={{ d: STEM[stage], opacity: stage === 1 ? 0 : 1 }}
                        transition={move}
                        stroke={url("stem")}
                        strokeWidth={stage >= 4 ? 3.4 : 3}
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
                              side={SIDE[key]}
                              pose={pose}
                              fill={url("leaf")}
                              stem={C.stem}
                              idle={!calm}
                              phase={i}
                              transition={isNew ? unfold(order) : move}
                              reduce={reduce}
                            />
                          );
                        })}
                      </AnimatePresence>
                      <AnimatePresence initial={false}>
                        {stage === 5 && (
                          <Flower key={`flower-${milestone}`} at={FLOWER} petal={url("petal")} heart={url("heart")} reduce={reduce} />
                        )}
                      </AnimatePresence>
                    </g>
                  </motion.g>
                </motion.g>
              </g>

              {/* Soil in front of the stem base */}
              {stage > 1 && (
                <g clipPath={url("opening")}>
                  <path d="M43.6,77 C44.6,74 47.2,72.8 50,73 C53,72.8 55.6,74 56.6,77 Z" fill={url("soil")} />
                  <ellipse cx="47" cy="74.8" rx="1.8" ry="0.8" fill={C.soilLight} opacity="0.5" />
                </g>
              )}

              {/* Rim, front half */}
              <path
                d="M18,78 A32,5.6 0 0 0 82,78 L81.3,86.4 C81.1,88.4 79.6,89.4 77.6,89.8 Q50,94.6 22.4,89.8 C20.4,89.4 18.9,88.4 18.7,86.4 Z"
                fill={url("rim")}
              />
              <path d="M19.6,80 A30.6,4.9 0 0 0 80.4,80" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              <path d="M22.4,89.8 Q50,94.6 77.6,89.8" stroke="#c67a58" strokeOpacity="0.35" strokeWidth="0.7" fill="none" />
              <ellipse cx="26" cy="85" rx="2" ry="3" fill="#fff" opacity="0.3" filter={url("soft")} />

              {/* Face */}
              <g fill={C.blush} opacity="0.5" filter={url("soft")}>
                <ellipse cx="36.6" cy="106.2" rx="3.6" ry="2.2" />
                <ellipse cx="63.4" cy="106.2" rx="3.6" ry="2.2" />
              </g>
              <motion.g style={{ x: look }}>
                {happy ? (
                  <g stroke={C.ink} strokeWidth="1.25" strokeLinecap="round" fill="none">
                    <path d="M38.2,102.6 Q40.6,99.8 43,102.6" />
                    <path d="M57,102.6 Q59.4,99.8 61.8,102.6" />
                  </g>
                ) : (
                  <motion.g animate={eyes} style={PIVOT_STYLE}>
                    <ellipse cx="40.6" cy="101.6" rx="2.2" ry="2.5" fill={C.ink} />
                    <ellipse cx="59.4" cy="101.6" rx="2.2" ry="2.5" fill={C.ink} />
                    <circle cx="41.3" cy="100.7" r="0.65" fill="#fff" />
                    <circle cx="60.1" cy="100.7" r="0.65" fill="#fff" />
                  </motion.g>
                )}
                <path d="M46.6,105.4 Q50,108.6 53.4,105.4" stroke={C.ink} strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </motion.g>
            </g>
          </motion.g>
        </g>

        {/* Sparkles: a quiet twinkle while blooming, a short burst at the milestone */}
        {stage === 5 &&
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
        {!reduce && milestone > 0 && (
          <g key={`burst-${milestone}`}>
            {BURST_SPARKLES.map((s, i) => (
              <g key={i} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
                <motion.path
                  d={SPARKLE}
                  fill={C.sparkle}
                  style={PIVOT_STYLE}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.1, 0.4], rotate: [0, 30] }}
                  transition={{ duration: 1.5, delay: 0.7 + i * 0.12, ease: "easeOut" }}
                />
              </g>
            ))}
          </g>
        )}

        {/* "Look at me" ticks over the seed, and briefly after growth */}
        <AnimatePresence>
          {(stage === 1 || (grew && cheer !== settled)) && (
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
              <Ticks y={stage === 1 ? 54 : STAGE_TOP[stage]} />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </span>
  );
}

const STAGE_TOP: Record<PlantStage, number> = { 1: 54, 2: 22, 3: 8, 4: 2, 5: -20 };

function Ticks({ y }: { y: number }) {
  return (
    <g transform={`translate(50 ${y})`}>
      <path d="M0,-3 L0,-8" />
      <path d="M-7,-1 L-10,-5" />
      <path d="M7,-1 L10,-5" />
    </g>
  );
}

function Leaf({
  side,
  pose,
  fill,
  stem,
  idle,
  phase,
  transition,
  reduce,
}: {
  side: Side;
  pose: LeafPose;
  fill: string;
  stem: string;
  idle: boolean;
  phase: number;
  /** Unfold timing for a new leaf, move timing for one that was already there. */
  transition: object;
  reduce: boolean;
}) {
  const s = pose.len / 31;
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
          <path d={`M0,0 Q${pose.pet / 2},-0.8 ${pose.pet + 0.6},0`} stroke={stem} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <g transform={`translate(${pose.pet} 0) scale(${s})`}>
            <path d={LEAF} fill={fill} />
            <path d={LEAF_UNDER} fill={C.leafDark} opacity="0.3" />
            <path d={VEINS} stroke={C.vein} strokeOpacity="0.22" strokeWidth="0.45" fill="none" strokeLinecap="round" />
            <path d={MIDRIB} stroke={C.vein} strokeOpacity="0.55" strokeWidth="0.7" fill="none" strokeLinecap="round" />
            <ellipse cx="13" cy="-5.6" rx="7" ry="2" transform="rotate(-12 13 -5.6)" fill="#fff" opacity="0.14" />
          </g>
        </g>
      </motion.g>
    </motion.g>
  );
}

function Flower({ at, petal, heart, reduce }: { at: { x: number; y: number }; petal: string; heart: string; reduce: boolean }) {
  const open = (i: number) => ({ duration: reduce ? 0 : 0.8, ease: EASE, delay: reduce ? 0 : 0.35 + i * 0.08 });
  return (
    <motion.g
      initial={{ x: at.x, y: at.y + 4, scale: 0.3, opacity: 0 }}
      animate={{ x: at.x, y: at.y, scale: 1, opacity: 1 }}
      exit={{ scale: 0.3, opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
      style={PIVOT_STYLE}
    >
      <Pivot r={26} />
      <g transform="rotate(-8)">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`rotate(${i * 72 - 90})`}>
            <motion.g
              style={PIVOT_STYLE}
              initial={{ scale: 0.15, rotate: -35, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={open(i)}
            >
              <Pivot r={20} />
              <ellipse cx="9" cy="0" rx="10.2" ry="9.2" fill={petal} stroke={C.petalEdge} strokeWidth="0.35" />
            </motion.g>
          </g>
        ))}
        <motion.g style={PIVOT_STYLE} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 0.8 }}>
          <Pivot r={5} />
          <circle r="4.4" fill={heart} />
          <g fill="#d9822a" opacity="0.55">
            <circle cx="-1.6" cy="1.2" r="0.45" />
            <circle cx="1.4" cy="1.6" r="0.45" />
            <circle cx="0.2" cy="-1.4" r="0.45" />
            <circle cx="1.9" cy="-0.6" r="0.4" />
            <circle cx="-1.8" cy="-0.8" r="0.4" />
          </g>
        </motion.g>
      </g>
    </motion.g>
  );
}
