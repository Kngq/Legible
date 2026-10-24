"use client";

// A small "Read more" capsule of liquid glass, carrying the Legible magnifying
// glass, that follows the mouse across a clickable decision card. Three layers:
// a translucent shell (blur, luminous edge, upper highlight), a thin rim that
// bends the light at the edge (a CSS stand-in for refraction), and the logo and
// label suspended inside. Moving pulls the shell out in the direction of travel
// with a little lag and give; the content stretches far less and drifts
// slightly behind, and the logo leans on its own softer spring. A press gives.
// Decorative only (aria-hidden, pointer-events none); every card keeps its
// visible links and buttons.
// It shows over the card's own surface (the card, or an element marked
// data-cursor-surface such as a row's stretched title link), never while the
// pointer is on a nested button or link, and never where its own box would
// cover one: it moves to another corner of the cursor, or hides if none fits.
// Button boxes are measured on enter and when the card resizes, not per move.
// With onOpen, a click on the card's surface opens it.
// Off for cards that leave Legible (enabled: false), for touch and pen, and
// reduced to a plain fade under reduced motion.
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform, useVelocity, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { LegibleMark } from "./LegibleMark";

const OFFSET = 16;
const EDGE = 8;
const GAP = 6;
const SPEED = 1600;
const FOLLOW = { stiffness: 520, damping: 42, mass: 0.4 };
// Under-damped a touch, so the shell overshoots its rest shape by a hair.
const ELASTIC = { stiffness: 240, damping: 17, mass: 0.5 };
const SOFT = { stiffness: 160, damping: 20, mass: 0.6 };
const PRESS = { stiffness: 520, damping: 28 };
const INTERACTIVE = "a, button, summary, input, textarea, select, label, [role=button]";

type Box = { l: number; t: number; r: number; b: number };
// Capsule corners around the cursor, as offsets of its top-left; below-right first.
const corners = (w: number, h: number) => [
  [OFFSET, OFFSET],
  [-OFFSET - w, OFFSET],
  [OFFSET, -OFFSET - h],
  [-OFFSET - w, -OFFSET - h],
];

/** 0 at rest, 1 at full speed. */
const useSpeed = (v: MotionValue<number>) => useTransform(v, (s) => Math.min(Math.abs(s) / SPEED, 1));

export function useCursorCta(onOpen?: () => void, { enabled = true }: { enabled?: boolean } = {}) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const shown = useRef(false);
  const x = useSpring(0, FOLLOW);
  const y = useSpring(0, FOLLOW);
  const vx = useVelocity(x);
  const vy = useVelocity(y);

  // Shell: stretched along the travel, anchored on the trailing side, volume roughly kept.
  const sx = useSpring(useSpeed(vx), ELASTIC);
  const sy = useSpring(useSpeed(vy), ELASTIC);
  const press = useSpring(1, PRESS);
  const shellX = useTransform(() => (1 + sx.get() * 0.14 - sy.get() * 0.04) * press.get());
  const shellY = useTransform(() => (1 + sy.get() * 0.12 - sx.get() * 0.07) * (1 - (1 - press.get()) * 1.4));
  const originX = useSpring(useTransform(vx, [-60, 60], [1, 0]), SOFT);
  const originY = useSpring(useTransform(vy, [-60, 60], [1, 0]), SOFT);
  const tilt = useSpring(useTransform(vx, [-SPEED, 0, SPEED], [-3, 0, 3]), ELASTIC);
  // Content: barely stretched, drifting a couple of pixels behind the travel.
  const inkX = useSpring(useTransform(vx, [-SPEED, SPEED], [2.5, -2.5]), SOFT);
  const inkY = useSpring(useTransform(vy, [-SPEED, SPEED], [1.5, -1.5]), SOFT);
  const inkScale = useTransform(() => 1 + sx.get() * 0.025);
  const lean = useSpring(useTransform(vx, [-SPEED, 0, SPEED], [-8, 0, 8]), SOFT);

  const card = useRef<HTMLElement | null>(null);
  const cardBox = useRef<DOMRect | null>(null);
  const blockers = useRef<Box[]>([]); // card-relative boxes of nested buttons and links
  const corner = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const size = useRef({ w: 120, h: 34 });

  const measure = () => {
    const el = card.current;
    if (!el) return;
    const c = el.getBoundingClientRect();
    cardBox.current = c;
    const boxes: Box[] = [];
    for (const n of el.querySelectorAll(INTERACTIVE)) {
      if (n.hasAttribute("data-cursor-surface")) continue;
      const e = n.getBoundingClientRect();
      if (e.width && e.height) boxes.push({ l: e.left - c.left - GAP, t: e.top - c.top - GAP, r: e.right - c.left + GAP, b: e.bottom - c.top + GAP });
    }
    blockers.current = boxes;
  };

  // Below-right when it fits; otherwise the current corner, then the others. The
  // first that stays in the viewport and clear of every button and link wins;
  // false when none does.
  const place = (clientX: number, clientY: number, jump: boolean) => {
    const c = cardBox.current;
    if (!c) return false;
    last.current = { x: clientX, y: clientY };
    const { w, h } = size.current;
    const offsets = corners(w, h);
    const order = [0, corner.current, 1, 2, 3].filter((v, i, a) => a.indexOf(v) === i);
    for (const i of order) {
      const [dx, dy] = offsets[i];
      const left = clientX + dx;
      const top = clientY + dy;
      if (left < EDGE || top < EDGE || left + w > window.innerWidth - EDGE || top + h > window.innerHeight - EDGE) continue;
      const l = left - c.left;
      const t = top - c.top;
      if (blockers.current.some((b) => l < b.r && l + w > b.l && t < b.b && t + h > b.t)) continue;
      corner.current = i;
      if (jump || reduce) {
        x.jump(l);
        y.jump(t);
      } else {
        x.set(l);
        y.set(t);
      }
      return true;
    }
    return false;
  };

  const show = (next: boolean) => {
    if (next === shown.current) return;
    shown.current = next;
    setVisible(next);
  };

  // While hovered: scrolling moves the card under a still cursor, and opening
  // "Details" or similar reflows it; re-measure then, never per move.
  useEffect(() => {
    const el = card.current;
    if (!visible || !el) return;
    const onScroll = () => {
      measure();
      if (last.current && !place(last.current.x, last.current.y, true)) show(false);
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  });

  const onSurface = (t: EventTarget) => {
    if (!(t instanceof Element)) return false;
    const hit = t.closest(INTERACTIVE);
    return hit === null || hit === card.current || hit.hasAttribute("data-cursor-surface");
  };

  const handlers = {
    ref: (el: HTMLElement | null) => {
      card.current = el;
    },
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      measure();
      show(onSurface(e.target) && place(e.clientX, e.clientY, true));
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      // Coming back into view, start beside the cursor rather than gliding in.
      show(onSurface(e.target) && place(e.clientX, e.clientY, !shown.current));
    },
    onPointerLeave: () => {
      last.current = null;
      press.jump(1);
      show(false);
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && !reduce) press.set(0.94);
    },
    onPointerUp: () => press.set(1),
    onClick: (e: MouseEvent<HTMLElement>) => {
      // Only while the capsule is showing, so touch taps on the card body do nothing new.
      // A nested link or button, a surface link included, handles its own click.
      const hit = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      if (!onOpen || !visible || (hit && hit !== card.current)) return;
      if (window.getSelection()?.toString()) return;
      onOpen();
    },
  };

  // Opacity lives on each glass layer, never on a parent: a translucent parent
  // would cut the blur off from the page behind it while fading.
  const fade = {
    hidden: { opacity: 0, transition: { duration: 0.12, ease: "easeIn" as const } },
    shown: { opacity: 1, transition: { duration: reduce ? 0.12 : 0.2, ease: [0.2, 0.8, 0.2, 1] as const } },
  };
  const fluid = !reduce;

  const mark = (
    <motion.div aria-hidden="true" style={{ x, y }} className="pointer-events-none absolute left-0 top-0 z-20">
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={(el: HTMLDivElement | null) => {
              if (el) size.current = { w: el.offsetWidth, h: el.offsetHeight };
            }}
            initial="hidden"
            animate="shown"
            exit="hidden"
            variants={{
              hidden: { scale: fluid ? 0.82 : 1, transition: { duration: 0.12, ease: "easeIn" } },
              shown: { scale: 1, transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] } },
            }}
            className="relative h-[34px] origin-top-left"
          >
            <motion.div style={fluid ? { scaleX: shellX, scaleY: shellY, rotate: tilt, originX, originY } : undefined} className="absolute inset-0">
              <motion.span variants={fade} className="cursor-glass-shell absolute inset-0 rounded-full" />
              <motion.span variants={fade} className="cursor-glass-rim absolute inset-0 rounded-full" />
            </motion.div>
            <motion.div
              variants={fade}
              style={fluid ? { x: inkX, y: inkY, scaleX: inkScale } : undefined}
              className="cursor-glass-ink relative flex h-full items-center gap-1.5 whitespace-nowrap pl-2 pr-3.5 text-small font-semibold leading-none"
            >
              <motion.span style={fluid ? { rotate: lean } : undefined} className="block origin-[40%_40%]">
                <LegibleMark size={20} />
              </motion.span>
              Read more
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (!enabled) return { handlers: {}, mark: null, cursorClass: "" };
  return { handlers, mark, cursorClass: visible ? "cursor-pointer" : "" };
}
