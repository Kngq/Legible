"use client";

// Highlight official text, get a small menu: "Explain this" and two or three
// questions about the highlight. Choosing one opens Ask Kiro (ChatDock, the one
// assistant) with the passage and its source attached; nothing to copy or paste.
// Only text inside [data-ask-official] counts; other selections are left alone.
// The source comes from data-ask-* attributes on the page: kind, id, title,
// locator, page, url (data-ask-measure is shorthand for a ballot question).
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { askKiro, EXPLAIN_QUESTION, type AskRequest, type AskSource } from "@/lib/ask/context";
import { officialExcerpt } from "@/lib/engine/ask-context";
import { highlightQuestions } from "@/lib/engine/highlight-questions";
import { FOCUS } from "./ui";

type PersonalFor = (source?: AskSource) => string[];
const PersonalContext = createContext<PersonalFor>(() => []);

interface Menu {
  x: number;
  y: number;
  below: boolean;
  source: AskSource;
  passage: string;
  questions: string[];
  ai: boolean;
}

const attr = (el: Element, name: string) => el.closest(`[${name}]`)?.getAttribute(name) ?? undefined;

/** The official source a highlighted element sits in, from data-ask-* attributes. */
function sourceOf(el: Element): AskSource | null {
  const measure = attr(el, "data-ask-measure");
  const kind = (attr(el, "data-ask-kind") ?? (measure ? "ballot" : undefined)) as AskSource["kind"] | undefined;
  const id = attr(el, "data-ask-id") ?? measure;
  if (!kind || !id) return null;
  const page = Number(attr(el, "data-ask-page"));
  return {
    kind,
    id,
    title: attr(el, "data-ask-title") ?? id,
    locator: attr(el, "data-ask-locator"),
    page: Number.isFinite(page) && page > 0 ? page : undefined,
    url: attr(el, "data-ask-url"),
  };
}

function Sparkle() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2" />
    </svg>
  );
}

export function HighlightAskProvider({ personalFor, children }: { personalFor: PersonalFor; children: ReactNode }) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let timer = 0;
    const check = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString() ?? "";
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return setMenu(null);
        const node = sel.anchorNode;
        const el = node instanceof Element ? node : node?.parentElement;
        // Only official text: headings, Legible's own lines, and controls are ordinary selections.
        if (!el || !el.closest("[data-ask-official]") || el.closest("[data-ask-ignore], input, textarea, button, a")) return setMenu(null);
        const source = sourceOf(el);
        const passage = officialExcerpt(text);
        if (!source || !passage) return setMenu(null);
        const r = sel.getRangeAt(0).getBoundingClientRect();
        // Phones show their own copy/paste bar above a selection, so the menu goes below
        // there when it fits; it never sits on top of the highlighted words.
        const MENU_H = 250;
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        const roomBelow = window.innerHeight - r.bottom > MENU_H;
        const roomAbove = r.top > MENU_H;
        const below = coarse ? roomBelow || !roomAbove : !roomAbove && roomBelow;
        setMenu({
          x: Math.min(Math.max(r.left + r.width / 2, 156), window.innerWidth - 156),
          y: below ? r.bottom + 12 : r.top - 12,
          below,
          source,
          passage,
          questions: highlightQuestions(passage),
          ai: false,
        });
        // Better questions from the model when one is configured; the rule-based ones stay otherwise.
        abort.current?.abort();
        const ctrl = new AbortController();
        abort.current = ctrl;
        fetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, passage }), signal: ctrl.signal })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { questions?: string[] } | null) => {
            if (data?.questions?.length) setMenu((m) => (m && m.passage === passage ? { ...m, questions: data.questions!, ai: true } : m));
          })
          .catch(() => {});
      }, 300);
    };
    const dismiss = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    const onScroll = () => setMenu(null);
    document.addEventListener("mouseup", check);
    document.addEventListener("touchend", check);
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      window.clearTimeout(timer);
      abort.current?.abort();
      document.removeEventListener("mouseup", check);
      document.removeEventListener("touchend", check);
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  const send = (req: AskRequest) => {
    setMenu(null);
    window.getSelection()?.removeAllRanges();
    askKiro({ ...req, personal: personalFor(req.source) });
  };

  return (
    <PersonalContext.Provider value={personalFor}>
      {children}
      {menu && (
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Ask Kiro about this passage"
          data-ask-ignore
          style={{ left: menu.x, top: menu.y }}
          className={`fixed z-[80] w-[18.5rem] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 animate-fade-in rounded-lg border border-border bg-surface p-2 shadow-card ${menu.below ? "" : "-translate-y-full"}`}
        >
          <button
            type="button"
            onClick={() => send({ source: menu.source, passage: menu.passage, mode: "explain", question: EXPLAIN_QUESTION })}
            className={`flex min-h-11 w-full items-center gap-2 rounded-md bg-primary px-3 text-left text-small font-semibold text-primary-foreground ${FOCUS}`}
          >
            <Sparkle />
            Explain this
          </button>
          <p className="px-2 pb-1 pt-2 text-small text-muted-foreground">{menu.ai ? "Questions about this passage" : "You could also ask"}</p>
          <ul>
            {menu.questions.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => send({ source: menu.source, passage: menu.passage, mode: "ask", question: q })}
                  className={`min-h-11 w-full rounded-md px-2 py-2 text-left text-small hover:bg-surface-muted ${FOCUS}`}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PersonalContext.Provider>
  );
}

/** "Ask Kiro about this question": opens Ask Kiro scoped to one ballot question or bill, no passage. */
export function AskButton({ source, variant = "link", label = "Ask Kiro about this question" }: { source: AskSource; variant?: "link" | "pill"; label?: string }) {
  const personalFor = useContext(PersonalContext);
  return (
    <button
      type="button"
      onClick={() => askKiro({ source, mode: "ask", personal: personalFor(source) })}
      className={
        variant === "pill"
          ? `inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-small font-semibold shadow-card hover:bg-surface-muted ${FOCUS}`
          : `inline-flex min-h-11 items-center gap-2 text-small font-semibold ${FOCUS}`
      }
    >
      <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkle />
      </span>
      {label}
    </button>
  );
}
