"use client";

// A "Read more" pill that follows the mouse across a card with a light spring,
// fading in on enter and out on leave. Clicking the card's empty space opens it;
// buttons and links inside keep their own clicks, and the pill hides over them.
// Mouse only: touch devices get a standard visible CTA on the card instead, and
// keyboard and screen-reader users keep the card's existing buttons.
import { AnimatePresence, motion, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Glyph } from "./icons";

const SPRING = { stiffness: 380, damping: 32, mass: 0.5 };
const INTERACTIVE = "a, button, summary, input, textarea, select, label, [role=button]";

export function useCursorCta(onOpen: () => void) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);
  const card = useRef<HTMLElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  const place = (clientX: number, clientY: number, jump: boolean) => {
    const r = card.current?.getBoundingClientRect();
    if (!r) return;
    last.current = { x: clientX, y: clientY };
    if (jump || reduce) {
      x.jump(clientX - r.left);
      y.jump(clientY - r.top);
    } else {
      x.set(clientX - r.left);
      y.set(clientY - r.top);
    }
  };

  // The page can scroll under a still cursor; keep the pill under it.
  useEffect(() => {
    if (!visible) return;
    const onScroll = () => last.current && place(last.current.x, last.current.y, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  });

  const overInteractive = (t: EventTarget) => t instanceof Element && t.closest(INTERACTIVE) !== null && t.closest(INTERACTIVE) !== card.current;

  const handlers = {
    ref: (el: HTMLElement | null) => {
      card.current = el;
    },
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      place(e.clientX, e.clientY, true);
      setVisible(!overInteractive(e.target));
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      place(e.clientX, e.clientY, false);
      const show = !overInteractive(e.target);
      if (show !== visible) setVisible(show);
    },
    onPointerLeave: () => {
      last.current = null;
      setVisible(false);
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      // Only while the pill is showing, so touch taps on the card body do nothing new.
      if (!visible || overInteractive(e.target)) return;
      if (window.getSelection()?.toString()) return;
      onOpen();
    },
  };

  const pill = (
    <motion.div aria-hidden="true" style={{ x, y }} className="pointer-events-none absolute left-0 top-0 z-10">
      <AnimatePresence>
        {visible && (
          <motion.span
            initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute flex min-h-9 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground shadow-card"
          >
            Read more
            <span className="-rotate-90">
              <Glyph name="chevron" size={14} />
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return { handlers, pill, cursorClass: visible ? "cursor-pointer" : "" };
}

