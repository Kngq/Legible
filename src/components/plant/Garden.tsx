"use client";

// The garden: the one place to water, grow, and dress up the plant, laid out
// after design-references/garden-concept.png: the plant large on a soft card,
// set in a patch of textured soil (no scenery), with a blue watering can; the
// water ready in a pill; one big "Water your plant" button; a simple growth
// indicator; and a row of accessories to wear.
//
// Watering is the highlight: press and hold the button (or Space or Enter) and
// drops keep pouring, faster as you hold, until you let go, the water runs out,
// or the plant grows. A quick tap pours one drop; "Pour all" pours everything
// for anyone who prefers not to hold. Every drop counts toward the next stage,
// and every change is said in words as well as shown.
//
// It plays as one movement, cause before effect: the can lifts from beside the
// pot and swings over the leaves (the plant looks up), water falls, and only
// when a drop lands is it poured: the leaves dip, the soil darkens, the plant
// says "ahh". Letting go, the last drop lands, the plant shakes the water off,
// and the can goes home. A drop that grows the plant stops the pour; the plant
// holds its breath for a moment, then grows.
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue, type Transition } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  ACCESSORIES,
  accessoryUnlocked,
  dropsLabel,
  gardenStage,
  introSteps,
  progress,
  progressLine,
  REWARD_DROPS,
  unlockedBetween,
  type AccessoryId,
  type PourResult,
} from "@/lib/garden";
import { stageDef, type GrowthStage } from "@/lib/growth";
import { EASE, EASE_IN_OUT } from "@/lib/motion";
import { hideChatDock } from "@/lib/ui/chat-dock";
import { Glyph } from "../icons";
import { FOCUS } from "../ui";
import { AccessoryIcon, CivicPlant, type PlantSignal } from "./CivicPlant";
import { GrowthStory } from "./GrowthStory";
import { finishGardenIntro, gardenNow, useGarden, waterGarden, wearAccessory } from "./useGarden";
import { WATER, WaterDrop } from "./WaterDrop";

/** What the plant says, briefly, after something happens. Warm, short, and never about coming back. Idle, it says nothing: its face does the talking. */
const AFTER_POUR = ["Ahh, that's nice.", "We're growing together!", "Thank you! I feel taller already.", "Mmm, just right."];
/** What it says when it puts something on (or takes it off). */
const WEAR_LINE: Record<AccessoryId, string> = {
  none: "Feeling light and leafy.",
  glasses: "Now I can read the fine print!",
  bow: "A bow! Do you like it?",
  hat: "Ready for a sunny day.",
  scarf: "So cosy!",
};

/** The plant's width in the garden, and how many pixels one unit of its drawing is. */
const SIZE = 210;
const U = SIZE / 112;
/** Plant units to pixels inside the plant's box (its drawing starts at -6, -24). */
const px = (u: number) => (u + 6) * U;
const py = (v: number) => (v + 24) * U;
const BOX_H = (SIZE * 144) / 112;
/** The plant sits left of centre so the plant and its can, together, are centred. */
const SHIFT = 22 * U;
/**
 * A gentle camera: the small early plant is seen a little closer, and the view
 * eases back as it grows, so the scene keeps one size at every stage without
 * the seedling lost at the bottom of it. It zooms about the middle of the plant
 * and can, at ground level, so the soil never moves.
 */
const ZOOM: Record<GrowthStage, number> = { 1: 1.16, 2: 1.08, 3: 1, 4: 1, 5: 1 };
const ORIGIN = { x: px(72), y: py(127) };
/** Where a point of the drawing lands in the plant's box under a zoom, as left and bottom offsets. */
const placed = (u: number, v: number, z: number) => ({ left: ORIGIN.x + (px(u) - ORIGIN.x) * z, bottom: BOX_H - (ORIGIN.y + (py(v) - ORIGIN.y) * z) });

/** Seconds a drop takes from the spout to the leaves. */
const FALL = 0.13;
/** Milliseconds between drops: starts gentle and speeds up while holding; Pour all runs a little quicker. */
const gap = (n: number, all: boolean) => (all ? Math.max(70, 220 - n * 25) : Math.max(90, 300 - n * 30));

/**
 * The can rests on the ground beside the pot. Poses are in the plant's own
 * coordinates, at the spout's tip, so the can turns about the spout and the
 * water always leaves from the same point.
 */
const CAN_REST = { x: 90, y: 99, rotate: 0 };
const CAN_POUR = -36;
/**
 * The top of the foliage across the crown, per stage, every 2 units of the
 * plant's drawing from `from`: water lands here, on the leaf or flower under
 * the spout. Measured from CivicPlant's leaves at rest (the first leaf, petal,
 * or stem met scanning down), so remeasure at all five stages whenever the
 * leaves are redrawn or moved.
 */
const CROWN_TOP: Record<GrowthStage, { from: number; y: number[] }> = {
  1: { from: 44, y: [58.5, 59, 60, 59.5, 56, 54.5] },
  2: { from: 24, y: [45, 44, 43.5, 43.5, 43, 43.5, 43.5, 44, 44.5, 45.5, 46.5, 48, 50.5, 52, 43.5, 40.5, 38, 36.5, 35, 34, 33, 32.5, 32, 32, 32.5] },
  3: {
    from: 12,
    y: [
      32.5, 32, 31.5, 31.5, 31.5, 32, 32.5, 33.5, 34.5, 35.5, 37.5, 40, 36.5, 21.5, 22, 23, 24.5, 26, 18, 12.5, 10, 12.5, 39, 32.5, 29.5, 28, 47, 32, 29, 27, 25.5, 24.5, 23, 22.5,
      21.5, 21.5, 21, 21,
    ],
  },
  4: {
    from: 12,
    y: [
      9, 9, 9, 9.5, 10, 10.5, 11.5, 12.5, 14, 15.5, 17.5, 15.5, 13, 12.5, 9, 4.5, 4.5, 6, 5, 0.5, -1.5, 3, 10, 19.5, 12.5, 10, 9.5, 9.5, 7, 5, 3.5, 2.5, 1.5, 1, 0.5, 0.5, 0.5, 1,
    ],
  },
  5: {
    from: 10,
    y: [6, 6, 6, 6.5, 7, 7.5, 8.5, 9.5, 10.5, 10.5, 9.5, 6.5, 5.5, 6, 5.5, 3, -2.5, -1.5, -3.5, -4.5, -7, -5.5, -2, -1, -1, 0, 6, 3, 2, 2.5, 2, 0.5, -1, -2, -3, -3.5, -4, -4],
  },
};
/** Where the button pours, per stage: a spot on the crown with room above it for the tipped can. */
const AIM: Record<GrowthStage, number> = { 1: 54, 2: 66, 3: 62, 4: 58, 5: 62 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Where water from a spout at `x` lands: the measured crown point just below and inside of it. */
const landing = (stage: GrowthStage, x: number) => {
  const c = CROWN_TOP[stage];
  const i = clamp(Math.round((x - 5 - c.from) / 2), 0, c.y.length - 1);
  return { x: c.from + i * 2, y: c.y[i] };
};
/** The button's pour: the spout 20 units above its aim, a little to the right. */
const pourPose = (stage: GrowthStage) => {
  const l = landing(stage, AIM[stage] + 5);
  return { x: l.x + 5, y: l.y - 20 };
};
/** The watering zone, forgiving: the spout anywhere over the plant, above its leaves. */
const overPlant = (stage: GrowthStage, x: number, y: number) => x >= 6 && x <= 110 && y >= -50 && y <= landing(stage, x).y - 6;
/** How low a dragged can may go (just above the ground) and how high, in the plant's coordinates. */
const DRAG_Y = [-54, 104] as const;

type Phase = "idle" | "coming" | "pouring" | "returning" | "carrying";
type Drop = { k: number; x: number; y: number; lx: number; ly: number };

export function Garden({
  onBack,
  backLabel = "Back",
  onExplore,
  remember,
  canStore,
  onRemember,
}: {
  onBack: () => void;
  backLabel?: string;
  onExplore: () => void;
  /** "Remember on this device" is on, so the garden is kept between visits. */
  remember: boolean;
  /** This browser can store things at all. */
  canStore: boolean;
  /** Turns "Remember on this device" on. Absent hides the offer (demo mode). */
  onRemember?: () => void;
}) {
  const g = useGarden();
  const s = g.state;
  const p = progress(s);
  const reduce = useReducedMotion() ?? false;
  const [signal, setSignal] = useState<Required<PlantSignal>>({ tap: 0, milestone: 0, drop: 0, surprise: 0, shake: 0, brace: 0 });
  const [phase, setPhase] = useState<Phase>("idle");
  // While the plant braces to grow, it still shows the stage it is leaving.
  const [held, setHeld] = useState<GrowthStage | null>(null);
  // The stream is on, and the stage it pours onto; its path follows the can.
  const [stream, setStream] = useState<GrowthStage | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [splash, setSplash] = useState({ n: 0, x: 0, y: 0 });
  const [wet, setWet] = useState(0);
  // What the plant is saying right now, for a moment; null most of the time.
  const [line, setLine] = useState<string | null>(null);
  const sayTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The drag hint is put away for this visit once the can is picked up or a pour starts, and for good
  // once the plant has been watered at all, by the can or the button (poured is kept with the garden).
  const [hinted, setHinted] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [fresh, setFresh] = useState<AccessoryId[]>([]);
  const [announce, setAnnounce] = useState("");
  // The can's spout position and tilt, in the plant's coordinates: animated for a pour, set directly while dragged.
  const canX = useMotionValue(CAN_REST.x);
  const canY = useMotionValue(CAN_REST.y);
  const canR = useMotionValue(CAN_REST.rotate);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const later = useRef<ReturnType<typeof setTimeout>[]>([]);
  // One pour: holding (pointer, key, or a can over the plant), pouring all, drops landed so far, a drop in the air, and an id so a newer pour wins.
  const run = useRef({ active: false, holding: false, all: false, n: 0, id: 0, falling: false });
  // The can in hand: the grab point relative to the spout, how far the can reaches around the grab point on screen
  // (so it stays in view), whether it is over the plant, and the last move (for its sway).
  const drag = useRef({ on: false, dx: 0, dy: 0, reach: { l: 0, r: 0, t: 0 }, over: false, lx: 0, lt: 0 });
  const dropKey = useRef(0);
  const keyHeld = useRef(false);
  // A finger or key is down on the button: it keeps its label until let go.
  const [pressed, setPressed] = useState(false);

  const after = (ms: number, f: () => void) => later.current.push(setTimeout(f, reduce ? 0 : ms));
  /** The plant says something for a moment, then goes quiet again. */
  const say = (text: string | null, ms = 2600) => {
    clearTimeout(sayTimer.current);
    setLine(text);
    if (text) sayTimer.current = setTimeout(() => setLine(null), ms);
  };
  useEffect(
    () => () => {
      run.current.active = false;
      run.current.id++;
      clearTimeout(timer.current);
      clearTimeout(sayTimer.current);
      later.current.forEach(clearTimeout);
    },
    [],
  );
  // On a phone the Ask Kiro launcher would sit on the scene; the garden has nothing to ask about.
  useEffect(() => hideChatDock("narrow"), []);

  const t = (d: number) => (reduce ? 0 : d);
  type Pose = Partial<Record<"x" | "y" | "rotate", number | number[]>>;
  /** Moves the can; resolves when every part has arrived (or been interrupted). */
  const moveCan = (to: Pose, tr: Transition | Partial<Record<keyof Pose, Transition>>) =>
    Promise.all(
      (Object.keys(to) as (keyof Pose)[]).map((k) => {
        const mv = k === "x" ? canX : k === "y" ? canY : canR;
        const each = (tr as Record<string, Transition>)[k] ?? (tr as Transition);
        return animate(mv, to[k] as number, { ...each, ...(reduce ? { duration: 0 } : {}) });
      }),
    );

  /** The can goes back to the ground: up past level, then down. A newer pour or a grab cancels the rest. */
  const canHome = async (id: number, lastDrops: boolean) => {
    if (lastDrops) await moveCan({ rotate: [CAN_POUR, -46, -34, -44, CAN_POUR] }, { duration: 0.45, ease: "easeInOut" });
    if (run.current.id !== id || drag.current.on) return;
    await moveCan({ x: CAN_REST.x, y: CAN_REST.y - 4, rotate: 6 }, { duration: 0.26, ease: EASE_IN_OUT });
    if (run.current.id !== id || drag.current.on) return;
    await moveCan(CAN_REST, { duration: 0.16, ease: "easeOut" });
    if (run.current.id === id) setPhase("idle");
  };

  /** The stream stops. A can still in hand straightens up and stays there; otherwise it goes home. */
  const endStream = (id: number, lastDrops: boolean) => {
    setStream(null);
    if (drag.current.on) {
      setPhase("carrying");
      void moveCan({ rotate: 0 }, { duration: 0.2, ease: "easeOut" });
    } else {
      setPhase("returning");
      void canHome(id, lastDrops);
    }
  };

  /** The pour ends: the plant shakes the water off and says something about it. */
  const finish = (reason: "release" | "empty") => {
    const r = run.current;
    if (!r.active) return;
    r.active = false;
    clearTimeout(timer.current);
    const { n, id } = r;
    endStream(id, reason === "empty");
    if (!n) return;
    const now = gardenNow();
    setAnnounce(`Poured ${dropsLabel(n)}. ${progressLine(progress(now))}`);
    after(150, () => setSignal((v) => ({ ...v, shake: v.shake + 1 })));
    after(400, () =>
      say(reason === "empty" ? "That was the last drop. Ready for another discovery?" : AFTER_POUR[now.poured % AFTER_POUR.length], reason === "empty" ? 3600 : 2400),
    );
    // A small surprise when this pour passed a multiple of five, after the shake, never on a growing pour.
    if (Math.floor(now.poured / 5) > Math.floor((now.poured - n) / 5)) after(1100, () => setSignal((v) => ({ ...v, surprise: v.surprise + 1 })));
  };

  /** A drop crossed into a new stage: the pour stops, the plant holds its breath, then grows. */
  const grow = (r: PourResult) => {
    const run_ = run.current;
    run_.active = false;
    clearTimeout(timer.current);
    endStream(run_.id, false);
    setHeld(r.from);
    setSignal((v) => ({ ...v, brace: v.brace + 1 }));
    const def = stageDef(r.to);
    const unlocked = unlockedBetween(r.from, r.to);
    const gift = unlocked.length ? ` You unlocked ${unlocked.map((a) => `the ${a.name.toLowerCase()}`).join(" and ")}!` : "";
    setAnnounce(`Your plant grew to stage ${r.to} of 5: ${def.name}. ${def.cheer}${gift} ${progressLine(progress(r.state))}`);
    // Only what this stage unlocked is new; marked now, so a quick next pour can't lose it.
    setFresh(unlocked.map((a) => a.id));
    after(340, () => {
      setHeld(null);
      say(`${def.cheer}${gift}`, 4200);
    });
  };

  /** A drop reaches the leaves: only now is it poured, and only now does the plant feel it. */
  const land = (d: Drop) => {
    const r = run.current;
    r.falling = false;
    if (!r.active) return;
    const res = waterGarden(1);
    if (!res.poured) return finish("empty");
    r.n++;
    setPhase("pouring");
    setWet((w) => w + 1);
    setSplash((v) => ({ n: v.n + 1, x: d.lx, y: d.ly }));
    setSignal((v) => ({ ...v, drop: v.drop + 1 }));
    if (res.to > res.from) return grow(res);
    if (res.state.water === 0) return finish("empty");
    if (!r.holding && !r.all) return finish("release");
    timer.current = setTimeout(pourDrop, gap(r.n, r.all));
  };

  /** One drop leaves the spout. A tap always gets one; after that, only while held or pouring all. */
  const pourDrop = () => {
    const r = run.current;
    if (!r.active) return;
    if (r.n > 0 && !r.holding && !r.all) return finish("release");
    const x = canX.get();
    const y = canY.get();
    const l = landing(gardenStage(gardenNow()), x);
    const d = { k: ++dropKey.current, x, y, lx: l.x, ly: l.y };
    setDrops((ds) => [...ds.slice(-3), d]);
    r.falling = true;
    timer.current = setTimeout(() => land(d), t(FALL * 1000));
  };

  /** Starts a pour, cancelling any can still on its way home. */
  const begin = (mode: "hold" | "all" | "drag") => {
    const id = run.current.id + 1;
    run.current = { active: true, holding: mode !== "all", all: mode === "all", n: 0, id, falling: false };
    later.current.forEach(clearTimeout);
    later.current = [];
    setHeld(null);
    say(null);
    setHinted(true);
    setPhase("coming");
    return id;
  };

  /** The button: the can lifts, swings over the plant, and tips; the first drop follows. */
  const start = async (mode: "hold" | "all") => {
    if (run.current.active || drag.current.on || gardenNow().water === 0) return;
    const id = begin(mode);
    const stage = gardenStage(gardenNow());
    const at = pourPose(stage);
    await moveCan({ y: canY.get() - 5, rotate: 8 }, { duration: 0.1, ease: "easeOut" });
    if (run.current.id !== id || !run.current.active) return;
    await moveCan(
      { x: at.x, y: at.y, rotate: [8, -42, CAN_POUR] },
      { x: { duration: 0.26, ease: EASE_IN_OUT }, y: { duration: 0.26, ease: EASE }, rotate: { duration: 0.3, times: [0, 0.7, 1], ease: "easeOut" } },
    );
    if (run.current.id !== id || !run.current.active) return;
    setStream(stage);
    pourDrop();
  };

  /** Letting go: the drop in the air still lands, then the pour ends. */
  const release = () => {
    run.current.holding = false;
    setPressed(false);
  };

  // Dragging the can: pick it up, carry it over the plant and it tips and pours on its own; let go and it goes home.
  const toPlant = (e: PointerEvent<SVGGElement>, cx = e.clientX, cy = e.clientY) => {
    const m = e.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(cx, cy).matrixTransform(m.inverse());
  };
  /** The can comes over the plant: it tips, and water follows. With no water, it tips and shakes, empty. */
  const overStart = async () => {
    if (gardenNow().water === 0) {
      say(gardenNow().poured ? "All out of water. Explore to earn more!" : "No water yet. Explore to earn some!", 3200);
      await moveCan({ rotate: [0, -30, -22, -32, -24, 0] }, { duration: 0.7, ease: "easeInOut" });
      return;
    }
    const id = begin("drag");
    await moveCan({ rotate: CAN_POUR }, { duration: 0.18, ease: "easeOut" });
    if (run.current.id !== id || !run.current.active) return;
    setStream(gardenStage(gardenNow()));
    pourDrop();
  };
  /** The can leaves the plant: a pour that never got a drop out is called off; otherwise the last drop lands. */
  const overEnd = () => {
    const r = run.current;
    if (!r.active) return void moveCan({ rotate: 0 }, { duration: 0.2, ease: "easeOut" });
    r.holding = false;
    if (r.n === 0) {
      r.active = false;
      r.falling = false;
      clearTimeout(timer.current);
      endStream(r.id, false);
    } else if (!r.falling) {
      clearTimeout(timer.current);
      finish("release");
    }
  };
  const onCanDown = (e: PointerEvent<SVGGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // The plant's own tap is for the plant, not the can.
    e.stopPropagation();
    if (run.current.active) return;
    const pt = toPlant(e);
    if (!pt) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    run.current.id++;
    canX.stop();
    canY.stop();
    canR.stop();
    // Lifted a little off the ground, held where it was grabbed.
    const art = (e.currentTarget.lastElementChild ?? e.currentTarget).getBoundingClientRect();
    const reach = { l: e.clientX - art.left, r: art.right - e.clientX + 18, t: e.clientY - art.top + 12 };
    drag.current = { on: true, dx: pt.x - canX.get(), dy: pt.y - (canY.get() - 6), reach, over: false, lx: pt.x, lt: e.timeStamp };
    setPhase("carrying");
    setHinted(true);
    say(null);
    void moveCan({ y: canY.get() - 6, rotate: 0 }, { duration: 0.12, ease: "easeOut" });
  };
  const onCanMove = (e: PointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d.on) return;
    // The plant stays upright under a carried can (no leaning toward the pointer), so the water meets its leaves where expected.
    e.stopPropagation();
    // Kept on screen: the pointer may wander off the edge, the can stops at it.
    const cx = clamp(e.clientX, d.reach.l + 4, window.innerWidth - d.reach.r - 4);
    const cy = Math.max(e.clientY, (navRef.current?.getBoundingClientRect().bottom ?? 0) + d.reach.t);
    const pt = toPlant(e, cx, cy);
    if (!pt) return;
    const x = pt.x - d.dx;
    const y = clamp(pt.y - d.dy, ...DRAG_Y);
    canY.stop();
    canX.set(x);
    canY.set(y);
    // While carried and not pouring, it swings a little against the direction it moves.
    if (!run.current.active && !reduce) {
      const v = (pt.x - d.lx) / Math.max(8, e.timeStamp - d.lt);
      void moveCan({ rotate: clamp(-v * 40, -14, 14) }, { type: "spring", stiffness: 300, damping: 20 });
    }
    d.lx = pt.x;
    d.lt = e.timeStamp;
    const over = overPlant(gardenStage(gardenNow()), x, y);
    if (over === d.over) return;
    d.over = over;
    if (over) void overStart();
    else overEnd();
  };
  const onCanUp = () => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    const r = run.current;
    if (r.active) {
      // Letting go mid-pour: the drop in the air lands, then the stream stops and the can goes home.
      r.holding = false;
      if (r.n === 0) {
        r.active = false;
        clearTimeout(timer.current);
        endStream(r.id, false);
      } else if (!r.falling) {
        clearTimeout(timer.current);
        finish("release");
      }
      return;
    }
    const id = ++run.current.id;
    setPhase("returning");
    void canHome(id, false);
  };
  /** A mouse over the resting can: it lifts a touch, to say it can be picked up. */
  const onCanHover = (on: boolean) => {
    if (drag.current.on || phase !== "idle") return;
    void moveCan(on ? { y: CAN_REST.y - 3, rotate: 4 } : { y: CAN_REST.y, rotate: 0 }, { type: "spring", stiffness: 260, damping: 18 });
  };

  // First visit: the can gives a small nudge now and then, as if it wants to be picked up.
  const hint = s.poured === 0 && !hinted && s.water > 0 && phase === "idle" && !line;
  useEffect(() => {
    if (!hint || reduce) return;
    const nudge = () => void moveCan({ rotate: [0, -4, 3, -1.5, 0], y: [CAN_REST.y, CAN_REST.y - 2, CAN_REST.y] }, { duration: 0.8, ease: "easeInOut" });
    const first = setTimeout(nudge, 1500);
    const again = setInterval(nudge, 7000);
    return () => {
      clearTimeout(first);
      clearInterval(again);
    };
    // moveCan only starts animations on the can's motion values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint, reduce]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    // Keep receiving the release even if the finger slides off the button.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setPressed(true);
    void start("hold");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (e.repeat || keyHeld.current) return;
    keyHeld.current = true;
    setPressed(true);
    void start("hold");
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
    keyHeld.current = false;
    release();
  };

  const busy = phase !== "idle";
  const pouringNow = phase === "coming" || phase === "pouring";
  const empty = s.water === 0;
  const steps = introSteps(s);
  const allDone = steps.every((x) => x.done);
  useEffect(() => {
    if (s.introDone || !allDone) return;
    const t = setTimeout(finishGardenIntro, 6000);
    return () => clearTimeout(t);
  }, [s.introDone, allDone]);

  const pct = p.span ? Math.round((p.into / p.span) * 100) : 100;
  // The plant speaks only once the can is out of the way.
  const speaking = line !== null && phase !== "coming" && phase !== "pouring";
  const zoom = ZOOM[held ?? p.stage];

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 sm:px-6">
      <nav ref={navRef} className="sticky top-16 z-20 -mx-4 flex h-16 items-center gap-3 bg-background/95 px-3 backdrop-blur sm:-mx-6 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className={`flex size-12 items-center justify-center rounded-full bg-surface shadow-card hover:bg-surface-muted ${FOCUS}`}
        >
          <Glyph name="back" />
        </button>
        <h1 className="type-page">Your garden</h1>
      </nav>

      {/*
        The scene, on the page itself: no card, no glow. A fixed height, so the
        page never shifts as the plant grows; the plant grows up from its soil
        inside it, with its can resting on the same ground.
      */}
      {/* While the can is up it may rise past the page's sticky title row, so the scene draws over it for that moment. */}
      <section aria-label="Your plant" className={`relative mt-4 h-[256px] ${phase === "idle" ? "" : "z-30"}`}>
        <div className="absolute left-1/2" style={{ bottom: 17, width: SIZE, height: BOX_H, transform: `translateX(calc(-50% - ${SHIFT}px))` }}>
          <motion.div initial={false} animate={{ scale: zoom }} transition={{ duration: reduce ? 0 : 0.9, ease: EASE }} style={{ transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px` }}>
            <CivicPlant
              stage={held ?? p.stage}
              size={SIZE}
              signal={signal}
              pouring={phase === "pouring"}
              expecting={phase === "coming" || phase === "carrying"}
              wet={wet}
              scene={
                <WateringScene
                  x={canX}
                  y={canY}
                  rotate={canR}
                  stream={stream}
                  drops={drops}
                  splash={splash}
                  resting={phase === "idle"}
                  carrying={phase === "carrying"}
                  reduce={reduce}
                  onDown={onCanDown}
                  onMove={onCanMove}
                  onUp={onCanUp}
                  onHover={onCanHover}
                />
              }
              accessory={s.accessory}
              ground
              lively
              label={`Your plant: ${p.def.name.toLowerCase()}, stage ${p.stage} of 5${s.accessory !== "none" ? `, wearing the ${s.accessory}` : ""}`}
              className="cursor-pointer select-none"
            />
          </motion.div>
          {/* A word from the plant, for a moment, just right of its face and above the can. */}
          <AnimatePresence>
            {speaking && (
              <motion.p
                key={line}
                aria-hidden="true"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.2 } }}
                transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
                className="pointer-events-none absolute w-max max-w-[9.5rem] origin-bottom-left rounded-2xl rounded-bl-md bg-surface px-3 py-1.5 text-small leading-snug shadow-card sm:max-w-[12rem]"
                style={placed(88, 90, zoom)}
              >
                {line}
              </motion.p>
            )}
          </AnimatePresence>
          {/* First visit: a quiet note over the can that it can be picked up. */}
          <AnimatePresence>
            {hint && (
              <motion.p
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.2 } }}
                transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.6 }}
                className="pointer-events-none absolute flex w-[6.5rem] -translate-x-1/2 flex-col items-center text-center text-small font-semibold leading-tight text-muted-foreground"
                style={placed(118, 91, zoom)}
              >
                <span>
                  Drag the can
                  <br />
                  to water
                </span>
                <svg viewBox="0 0 16 12" width={14} height={10} aria-hidden="true" className="mt-0.5">
                  <path d="M8,1 V10 M3.5,6 L8,10.5 L12.5,6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {announce}
        </p>
        {/* What the plant says, heard on its own (the bubble is hidden from assistive tech), unless the announcement already said it. */}
        <p role="status" aria-live="polite" className="sr-only">
          {line && !announce.includes(line) ? line : ""}
        </p>
      </section>

      {/*
        The care row: growth on the left, a thin bar; watering on the right, one
        small soft button that holds the only count of water on the page, and
        Pour all. Tap for a drop, hold to keep pouring (or hold Space or Enter),
        or drag the can.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-[11rem] flex-1">
          {/* One line at every stage, so nothing below moves as the plant grows. */}
          <p className="truncate whitespace-nowrap text-small">
            <span className="font-semibold">{p.def.name}</span>
            <span className="text-muted-foreground"> · {p.next ? `${dropsLabel(p.toNext)} to go` : "fully grown"}</span>
          </p>
          <div
            role="progressbar"
            aria-label={`Growth: stage ${p.stage} of 5, ${p.def.name}`}
            aria-valuemin={0}
            aria-valuemax={p.span || 1}
            aria-valuenow={p.span ? p.into : 1}
            aria-valuetext={progressLine(p)}
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted"
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${WATER.light}, var(--plant-leaf))` }}
              initial={false}
              animate={{ width: `${Math.max(pct, 4)}%` }}
              transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* The button stays put until the can is home and the finger is lifted, so nothing changes under it. */}
          {empty && !busy && !pressed ? (
            <button type="button" onClick={onExplore} className={`${CARE_BUTTON} bg-accent-soft hover:bg-accent/15 ${FOCUS}`}>
              Earn water <span aria-hidden="true">→</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onPointerDown={onPointerDown}
                onPointerUp={release}
                onPointerCancel={release}
                onKeyDown={onKeyDown}
                onKeyUp={onKeyUp}
                onBlur={release}
                onContextMenu={(e) => e.preventDefault()}
                aria-label={`${pouringNow ? "Pouring" : "Water your plant"}, ${dropsLabel(s.water)} ready`}
                aria-describedby="water-how"
                title="Tap for a drop, hold to keep pouring, or drag the can onto your plant"
                className={`${CARE_BUTTON} touch-none select-none ${pouringNow ? "scale-95 bg-accent/20" : "bg-accent-soft hover:bg-accent/15"} ${FOCUS}`}
              >
                <WaterDrop size={14} />
                <span className="tabular-nums">{s.water}</span>
                <span aria-hidden="true" className="text-accent/40">
                  ·
                </span>
                {pouringNow ? "Pouring" : "Water"}
              </button>
              <button
                type="button"
                onClick={() => void start("all")}
                disabled={busy}
                className={`min-h-11 rounded-md px-1 text-small font-semibold text-primary underline underline-offset-4 disabled:opacity-50 ${FOCUS}`}
              >
                Pour all
              </button>
            </>
          )}
        </div>
      </div>
      <p id="water-how" className="sr-only">
        Tap for a drop, hold to keep pouring, or drag the watering can onto your plant.
      </p>

      <DressUp stage={p.stage} wearing={s.accessory} fresh={fresh} onWear={(id) => say(WEAR_LINE[id], 2400)} onSeen={(id) => setFresh((f) => f.filter((x) => x !== id))} />

      {/* First visit: three short steps, under the plant and the button. */}
      {!s.introDone && <Intro steps={steps} water={s.water} onDone={finishGardenIntro} />}

      <HowToEarn />

      <section aria-labelledby="journey-h" className="mt-8">
        <h2 id="journey-h" className="type-section">
          Your journey
        </h2>
        <p className="mb-4 mt-1 type-secondary text-muted-foreground">Every drop counts. Your plant never wilts, and it waits for you as long as you like.</p>
        <GrowthStory milestones={s.milestones} stage={p.stage} />
      </section>

      <KeepNote remember={remember} canStore={canStore} onRemember={onRemember} />
    </div>
  );
}

/** "Dress up your plant": tap to wear, tap None to take it off. Locked ones say how they unlock. */
function DressUp({
  stage,
  wearing,
  fresh,
  onWear,
  onSeen,
}: {
  stage: GrowthStage;
  wearing: AccessoryId;
  /** Unlocked by the latest growth, until tapped. */
  fresh: AccessoryId[];
  onWear: (id: AccessoryId) => void;
  onSeen: (id: AccessoryId) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <section aria-labelledby="dress-h" className="mt-5">
      <h2 id="dress-h" className="text-small font-semibold text-muted-foreground">
        Dress up
      </h2>
      <div role="radiogroup" aria-labelledby="dress-h" className="mt-2 grid grid-cols-5 gap-2">
        {ACCESSORIES.map((a) => {
          const open = accessoryUnlocked(a.id, stage);
          const on = wearing === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={!open}
              aria-label={open ? a.name : `${a.name}, locked. ${a.locked}`}
              onClick={() => {
                if (!open) return setNote(a.locked);
                setNote("");
                onSeen(a.id);
                if (a.id !== wearing) onWear(a.id);
                wearAccessory(a.id);
              }}
              className={`relative flex flex-col items-center gap-0.5 rounded-2xl px-1 pb-1.5 pt-2 text-small interactive ${on ? "bg-accent-soft ring-2 ring-accent" : "bg-surface ring-1 ring-border hover:ring-muted-foreground"} ${FOCUS}`}
            >
              <span className={`flex h-8 items-center justify-center ${open ? "" : "opacity-35 grayscale"}`}>
                <AccessoryIcon id={a.id} size={a.id === "none" ? 22 : 34} />
              </span>
              <span className={open ? "font-semibold" : "text-muted-foreground"}>{a.name}</span>
              {!open && (
                <span aria-hidden="true" className="absolute right-1.5 top-1.5 text-muted-foreground">
                  <LockIcon />
                </span>
              )}
              {open && fresh.includes(a.id) && !on && (
                <span aria-hidden="true" className="absolute right-1 top-1 rounded-full bg-attention px-1.5 text-[10px] font-bold leading-4 text-attention-foreground">
                  New
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-1.5 min-h-5 text-small text-muted-foreground">
        {note}
      </p>
    </section>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="3" y="7" width="10" height="7" rx="2" />
      <path d="M5.5,7 V5 a2.5,2.5 0 0 1 5,0 V7" />
    </svg>
  );
}

const STEP_TEXT: Record<"water" | "explore" | "grow", (water: number) => [string, string]> = {
  water: (w) => ["Water your seedling", w > 0 ? `${dropsLabel(w)} to start, just above.` : "Thank you for the drink!"],
  explore: () => ["Explore to earn more", "Ballot questions, meetings, official sources."],
  grow: () => ["Grow and dress up", "Five stages, and a little wardrobe to unlock."],
};

function Intro({ steps, water, onDone }: { steps: ReturnType<typeof introSteps>; water: number; onDone: () => void }) {
  const done = steps.every((s) => s.done);
  return (
    <section aria-labelledby="intro-h" className="mt-4 rounded-2xl bg-accent-soft px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <h2 id="intro-h" className="type-section">
          {done ? "You've got it! 🌱" : "How your garden works"}
        </h2>
        <button type="button" onClick={onDone} className={`-m-1 min-h-9 shrink-0 rounded-md px-2 text-small font-semibold text-primary ${FOCUS}`}>
          {done ? "Close" : "Got it"}
        </button>
      </div>
      <ol className="mt-2 grid gap-2 sm:grid-cols-3 sm:gap-3">
        {steps.map((st, i) => {
          const [title, body] = STEP_TEXT[st.id](water);
          return (
            <li key={st.id} className="flex gap-2.5 sm:flex-col sm:gap-1.5">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-small font-bold transition-colors duration-(--dur-base) ${st.done ? "bg-plant-detail text-background" : "bg-background text-foreground"}`}
              >
                {st.done ? "✓" : i + 1}
              </span>
              <p className="text-small leading-snug">
                <span className="block font-semibold">
                  {title}
                  <span className="sr-only">{st.done ? " (done)" : ""}</span>
                </span>
                <span className="text-muted-foreground">{body}</span>
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function HowToEarn() {
  const rows: [string, number][] = [
    ["Open a ballot question", REWARD_DROPS.question],
    ["Open a meeting, deadline, or bill", REWARD_DROPS.item],
    ["Read the full voter guide", REWARD_DROPS.guide],
    ["Open an official source", REWARD_DROPS.source],
  ];
  return (
    <section aria-labelledby="earn-h" className="mt-8">
      <h2 id="earn-h" className="type-section">
        How to earn water
      </h2>
      <ul className="mt-3 divide-y divide-border rounded-2xl bg-surface shadow-card">
        {rows.map(([what, n]) => (
          <li key={what} className="flex items-center justify-between gap-3 px-4 py-3 text-body">
            <span>{what}</span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold">
              +{n} <WaterDrop size={13} />
              <span className="sr-only">{n === 1 ? "drop" : "drops"}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 type-secondary text-muted-foreground">Each page gives water once. Your answers, the subjects you follow, and how you vote never affect your garden.</p>
    </section>
  );
}

function KeepNote({ remember, canStore, onRemember }: { remember: boolean; canStore: boolean; onRemember?: () => void }) {
  if (remember) return <p className="mt-8 border-t border-border pt-4 text-small text-muted-foreground">Your garden is kept in this browser only, never sent anywhere.</p>;
  return (
    <p className="mt-8 border-t border-border pt-4 text-small text-muted-foreground">
      Your garden lasts for this visit.{" "}
      {canStore && onRemember && (
        <button type="button" onClick={onRemember} className={`font-semibold text-primary underline underline-offset-4 ${FOCUS}`}>
          Keep it on this device
        </button>
      )}
      {canStore && onRemember && " (your Civic Profile is kept too)."}
    </p>
  );
}

/** The small, soft watering and earning buttons in the care row. */
const CARE_BUTTON =
  "inline-flex h-11 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-full px-4 text-small font-semibold text-accent transition-[transform,background-color] duration-(--dur-fast)";

const PIVOT = { transformBox: "fill-box", originX: 0.5, originY: 0.5 } as const;
/** A soft enamel blue, a little greyed, lit from the top left like the plant. */
const CAN = { body: "#93b7cb", shade: "#6f98b0", light: "#bcd5e2", inside: "#577f98" };

/**
 * The can, the stream, the drops, and the splash, drawn over the plant in its
 * coordinates so the water always meets the leaves wherever the plant has grown
 * to. The can can be picked up and carried; the stream follows its spout.
 */
function WateringScene({
  x,
  y,
  rotate,
  stream,
  drops,
  splash,
  resting,
  carrying,
  reduce,
  onDown,
  onMove,
  onUp,
  onHover,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  stream: GrowthStage | null;
  drops: Drop[];
  splash: { n: number; x: number; y: number };
  resting: boolean;
  carrying: boolean;
  reduce: boolean;
  onDown: (e: PointerEvent<SVGGElement>) => void;
  onMove: (e: PointerEvent<SVGGElement>) => void;
  onUp: () => void;
  onHover: (on: boolean) => void;
}) {
  // From the spout to where it lands on the crown, bending a little as water falls.
  // The stage is a motion value too, so the path always reads the current one.
  const stage = useMotionValue<GrowthStage>(stream ?? 1);
  useEffect(() => {
    if (stream) stage.set(stream);
  }, [stream, stage]);
  const path = useTransform(() => {
    const sx = x.get();
    const sy = y.get();
    const l = landing(stage.get(), sx);
    return `M${sx},${sy} Q${sx - 3},${sy + (l.y - sy) * 0.35} ${l.x},${l.y}`;
  });
  // Touch: holding the can must never scroll the page. A non-passive listener is the one way to stop it everywhere.
  const grip = useRef<SVGGElement>(null);
  useEffect(() => {
    const el = grip.current;
    if (!el) return;
    const stop = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchstart", stop, { passive: false });
    return () => el.removeEventListener("touchstart", stop);
  }, []);
  return (
    <g>
      {/* The ground runs on under the can, so it rests on the same soil as the plant */}
      <g aria-hidden="true">
        <path
          d="M90,118.6 C94,114.6 104,112.8 116,112.8 C130,112.8 142,114.4 146,117.8 C148.6,120.4 146,124 138,125.2 C126,127 108,126.8 98,125.4 C91,124.4 88.4,121.2 90,118.6 Z"
          fill="#8a5d3b"
        />
        <path
          d="M94,116.4 C102,113.6 114,113 124,113.2 C134,113.4 141,114.6 144,116.6 C136,115.6 126,115.2 118,115.2 C108,115.2 100,115.6 94,116.4 Z"
          fill="#ad7d54"
          opacity="0.85"
        />
        <g fill="#8e6340">
          <circle cx="149" cy="121" r="0.8" />
          <circle cx="144" cy="126.4" r="0.7" />
          <circle cx="128" cy="127.6" r="0.6" />
        </g>
        <g fill="#b48659" opacity="0.75">
          <circle cx="106" cy="121.6" r="0.9" />
          <circle cx="136" cy="122.4" r="1" />
        </g>
      </g>
      {/* The can's shadow on the ground, there only while it rests */}
      <motion.ellipse
        cx="117"
        cy="121.4"
        rx="15"
        ry="2.2"
        fill="#4a2e1a"
        aria-hidden="true"
        animate={{ opacity: resting ? 0.16 : 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
      />
      <AnimatePresence>
        {stream && (
          <motion.g key="stream" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }}>
            {[
              { color: WATER.mid, opacity: 0.45, width: 2.4 },
              { color: "#fff", opacity: 0.55, width: 0.7 },
            ].map((l) => (
              <motion.path
                key={l.width}
                d={path}
                stroke={l.color}
                strokeOpacity={l.opacity}
                strokeWidth={l.width}
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: reduce ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduce ? 0 : FALL, ease: "easeIn" }}
              />
            ))}
            {/* Each drop poured is a bead running down the stream */}
            {!reduce &&
              drops.map((d) => (
                <motion.ellipse
                  key={d.k}
                  rx="1.6"
                  ry="2.1"
                  fill={WATER.mid}
                  initial={{ cx: d.x, cy: d.y, opacity: 0 }}
                  animate={{ cx: [d.x, d.x - 2.4, d.lx], cy: [d.y, d.y + (d.ly - d.y) * 0.45, d.ly], opacity: [0, 1, 1] }}
                  transition={{ duration: FALL, ease: "easeIn" }}
                />
              ))}
          </motion.g>
        )}
      </AnimatePresence>
      {/* Where a drop lands, a few beads bounce off the leaf */}
      {!reduce && splash.n > 0 && (
        <g key={`splash-${splash.n}`} aria-hidden="true">
          {[
            [-6, -5],
            [3, -6],
            [7, -2],
          ].map(([dx, dy], i) => (
            <motion.circle
              key={i}
              r="0.9"
              fill={WATER.mid}
              initial={{ cx: splash.x, cy: splash.y, opacity: 1 }}
              animate={{ cx: splash.x + dx, cy: [splash.y, splash.y + dy, splash.y + dy + 5], opacity: [1, 1, 0] }}
              transition={{ duration: 0.38, ease: "easeOut" }}
            />
          ))}
        </g>
      )}
      {/* The can itself. Decorative for assistive tech: the button below does the same thing. */}
      <motion.g
        ref={grip}
        aria-hidden="true"
        style={{ ...PIVOT, x, y, rotate, touchAction: "none", cursor: carrying ? "grabbing" : "grab" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onLostPointerCapture={onUp}
        onPointerEnter={(e) => e.pointerType === "mouse" && onHover(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && onHover(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <rect x="-60" y="-60" width="120" height="120" fill="none" />
        {/* A grip a little larger than the can, so a finger finds it easily */}
        <rect x="-6" y="-14" width="62" height="42" rx="10" fill="transparent" />
        <CanArt />
      </motion.g>
    </g>
  );
}

/** The watering can, upright, with the spout's tip at the origin: a prop, not a second character. */
function CanArt() {
  return (
    <g>
      <path d="M16,17 L1.6,-0.6 C1,-1.4 1.6,-2.6 2.6,-2.4 L4,-2 L18.6,11 Z" fill={CAN.shade} />
      <ellipse cx="1.8" cy="-1.6" rx="3.2" ry="1.5" transform="rotate(-48 1.8 -1.6)" fill={CAN.body} />
      <path d="M37,-1 C50,-5 52,13 40.4,16" stroke={CAN.shade} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M17,-4 H37 C38.6,-4 39.4,-3 39.6,-1.6 L41.4,18.6 C41.6,20.8 40.2,22 38,22 H16 C13.8,22 12.4,20.8 12.6,18.6 L14.4,-1.6 C14.6,-3 15.4,-4 17,-4 Z" fill={CAN.body} />
      <path d="M33,-4 H37 C38.6,-4 39.4,-3 39.6,-1.6 L41.4,18.6 C41.6,20.8 40.2,22 38,22 H34 Z" fill={CAN.shade} opacity="0.45" />
      <path d="M16.6,1 Q16.2,10 16.8,17" stroke={CAN.light} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M13.4,9 Q27,10.6 40.6,9" stroke={CAN.shade} strokeWidth="0.9" fill="none" opacity="0.6" />
      <ellipse cx="27" cy="-4" rx="12.6" ry="2.6" fill={CAN.light} />
      <ellipse cx="27" cy="-3.8" rx="9.4" ry="1.7" fill={CAN.inside} />
    </g>
  );
}
