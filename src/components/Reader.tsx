"use client";

// A full-screen reading view for long official text and full answers: a close
// button, a big title, and roomy serif paragraphs on a plain page. Escape closes
// it and focus returns to what opened it.
import { useEffect, useRef, type ReactNode } from "react";
import { Glyph } from "./icons";
import { FOCUS } from "./ui";

export const READ = "font-[family-name:var(--font-serif)] text-body leading-[1.8] text-foreground/90";

export function Reader({
  kicker,
  title,
  meta,
  onClose,
  children,
  footer,
}: {
  kicker?: string;
  title: string;
  /** One quiet line under the title: source, page, fingerprint. */
  meta?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const close = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="reader-h" data-ask-ignore className="fixed inset-0 z-[60] animate-fade-in overflow-y-auto bg-surface">
      <div className="mx-auto w-full max-w-2xl px-6 pb-24 pt-5">
        <button ref={close} type="button" onClick={onClose} aria-label="Close" className={`flex size-12 items-center justify-center rounded-full bg-surface-muted hover:bg-border ${FOCUS}`}>
          <Glyph name="close" />
        </button>
        {kicker && <p className="mt-8 text-small font-semibold uppercase tracking-wider text-muted-foreground">{kicker}</p>}
        <h1 id="reader-h" className={`${kicker ? "mt-2" : "mt-8"} text-title font-bold leading-tight tracking-tight`}>
          {title}
        </h1>
        {meta && <div className="mt-3 text-small text-muted-foreground">{meta}</div>}
        <div className="mt-8 space-y-6">{children}</div>
        {footer && <div className="mt-12 border-t border-border pt-6">{footer}</div>}
      </div>
    </div>
  );
}
