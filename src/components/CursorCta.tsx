"use client";

// A small "Read more" capsule in warm glass, carrying the Legible magnifying
// glass, that follows the mouse across a clickable decision card. It fades and
// scales in just below-right of the pointer, follows with a responsive spring,
// stretches a touch and tilts with sideways speed, settles back when the mouse
// stops, and gives a little on press. Decorative only (aria-hidden, pointer-
// events none); every card keeps its visible links and buttons.
// It shows over the card's own surface (the card, or an element marked
// data-cursor-surface such as a row's stretched title link) and hides over any
// nested button or link. With onOpen, a click on that surface opens the card.
// Off for cards that leave Legible (enabled: false), for touch and pen, and
// reduced to a plain fade under reduced motion.
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { LegibleMark } from "./LegibleMark";

const OFFSET = 16;
const EDGE = 8;
const FOLLOW = { stiffness: 520, damping: 42, mass: 0.4 };
// Softer than the follow, so shape changes trail position slightly, like a liquid.
const FLUID = { stiffness: 220, damping: 26, mass: 0.6 };
const PRESS = { stiffness: 520, damping: 28 };
const SPEED = [0, 1800];
const INTERACTIVE = "a, button, summary, input, textarea, select, label, [role=button]";

export function useCursorCta(onOpen?: () => void, { enabled = true }: { enabled?: boolean } = {}) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const x = useSpring(0, FOLLOW);
  const y = useSpring(0, FOLLOW);
  const vx = useVelocity(x);
  // Sideways speed: a slight lean and a slight horizontal stretch, volume kept.
  const rotate = useSpring(useTransform(vx, [-SPEED[1], 0, SPEED[1]], [-4, 0, 4]), FLUID);
  const stretch = useSpring(useTransform(vx, (v) => Math.min(Math.abs(v) / SPEED[1], 1)), FLUID);
  const press = useSpring(1, PRESS);
  const scaleX = useTransform(() => (1 + stretch.get() * 0.1) * press.get());
  const scaleY = useTransform(() => (1 - stretch.get() * 0.05) * (1 - (1 - press.get()) * 1.4));
  const card = useRef<HTMLElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const size = useRef({ w: 120, h: 34 });

  // Below-right of the pointer, flipped to the other side near a viewport edge.
  const place = (clientX: number, clientY: number, jump: boolean) => {
    const r = card.current?.getBoundingClientRect();
    if (!r) return;
    last.current = { x: clientX, y: clientY };
    const { w, h } = size.current;
    let left = clientX + OFFSET;
    let top = clientY + OFFSET;
    if (left + w > window.innerWidth - EDGE) left = clientX - OFFSET - w;
    if (top + h > window.innerHeight - EDGE) top = clientY - OFFSET - h;
    if (jump || reduce) {
      x.jump(left - r.left);
      y.jump(top - r.top);
    } else {
      x.set(left - r.left);
      y.set(top - r.top);
    }
  };

  // The page can scroll under a still cursor; keep the capsule beside it.
  useEffect(() => {
    if (!visible) return;
    const onScroll = () => last.current && place(last.current.x, last.current.y, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      place(e.clientX, e.clientY, true);
      setVisible(onSurface(e.target));
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      place(e.clientX, e.clientY, false);
      const show = onSurface(e.target);
      if (show !== visible) setVisible(show);
    },
    onPointerLeave: () => {
      last.current = null;
      press.jump(1);
      setVisible(false);
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

  const mark = (
    <motion.div aria-hidden="true" style={{ x, y }} className="pointer-events-none absolute left-0 top-0 z-20">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.8, filter: reduce ? "none" : "blur(2px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: reduce ? 0.12 : 0.2, ease: [0.2, 0.8, 0.2, 1] } }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.9, transition: { duration: 0.12, ease: "easeIn" } }}
            className="origin-top-left"
          >
            <motion.div
              ref={(el: HTMLDivElement | null) => {
                if (el) size.current = { w: el.offsetWidth, h: el.offsetHeight };
              }}
              style={reduce ? undefined : { rotate, scaleX, scaleY }}
              className="cursor-glass flex h-[34px] origin-left items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-3.5 text-small font-semibold leading-none"
            >
              <LegibleMark size={20} />
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
