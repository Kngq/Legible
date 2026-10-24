"use client";

// The Legible magnifying glass as a small cursor companion on clickable decision
// cards: it fades and scales in just below-right of the pointer, follows with a
// light spring, tilts a few degrees with sideways movement, and squeezes on
// press. Decorative only (aria-hidden, pointer-events none); every card keeps
// its visible links and buttons, so nothing depends on it.
// It shows over the card's own surface (the card, or an element marked
// data-cursor-surface such as a row's stretched title link) and hides over any
// nested button or link. With onOpen, a click on that surface opens the card.
// Mouse only: touch and pen never see it. Reduced motion keeps a plain fade.
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { LegibleMark } from "./LegibleMark";

const SIZE = 38;
const OFFSET = 18;
const EDGE = 6;
const FOLLOW = { stiffness: 600, damping: 40, mass: 0.35 };
const TILT = { stiffness: 260, damping: 22 };
const PRESS = { stiffness: 700, damping: 22 };
const INTERACTIVE = "a, button, summary, input, textarea, select, label, [role=button]";

export function useCursorCta(onOpen?: () => void) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const x = useSpring(0, FOLLOW);
  const y = useSpring(0, FOLLOW);
  // Sideways speed becomes a small lean, settling back to upright when still.
  const rotate = useSpring(useTransform(useVelocity(x), [-1500, 0, 1500], [-7, 0, 7]), TILT);
  const scale = useSpring(1, PRESS);
  const card = useRef<HTMLElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Below-right of the pointer, flipped to the other side near a viewport edge.
  const place = (clientX: number, clientY: number, jump: boolean) => {
    const r = card.current?.getBoundingClientRect();
    if (!r) return;
    last.current = { x: clientX, y: clientY };
    let left = clientX + OFFSET;
    let top = clientY + OFFSET;
    if (left + SIZE > window.innerWidth - EDGE) left = clientX - OFFSET - SIZE;
    if (top + SIZE > window.innerHeight - EDGE) top = clientY - OFFSET - SIZE;
    if (jump || reduce) {
      x.jump(left - r.left);
      y.jump(top - r.top);
    } else {
      x.set(left - r.left);
      y.set(top - r.top);
    }
  };

  // The page can scroll under a still cursor; keep the mark beside it.
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
      scale.jump(1);
      setVisible(false);
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && !reduce) scale.set(0.82);
    },
    onPointerUp: () => scale.set(1),
    onClick: (e: MouseEvent<HTMLElement>) => {
      // Only while the mark is showing, so touch taps on the card body do nothing new.
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
          <motion.span
            initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: reduce ? 0.12 : 0.18, ease: [0.2, 0.8, 0.2, 1] } }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.8, transition: { duration: 0.12, ease: "easeIn" } }}
            className="block"
          >
            <motion.span style={reduce ? undefined : { rotate, scale }} className="block origin-[40%_40%]">
              <LegibleMark size={SIZE} />
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return { handlers, mark, cursorClass: visible ? "cursor-pointer" : "" };
}
