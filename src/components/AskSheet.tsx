"use client";

// Ask, three ways in: the floating button (scoped to the page you are on), an
// "Ask about this question" button on each question, and highlighting text,
// which shows an "Ask about this" chip. All open one bottom sheet with checked
// starter questions. Only the document id, measure id, the question, and
// highlighted text found word for word in an official quote are sent; text that
// exists because of the person's answers never is.
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { publicExcerpt } from "@/lib/engine/ask-context";
import { ASK_SUGGESTIONS, BALLOT_SUGGESTIONS } from "@/lib/engine/ask-suggestions";
import type { DocumentData } from "@/lib/engine/types";
import { asksHowToVote, VOTE_FIXED_RESPONSE } from "@/lib/vocab";
import { Glyph } from "./icons";
import { READ, Reader } from "./Reader";
import { FOCUS } from "./ui";

interface QuoteRef {
  id: string;
  text: string;
  page?: number;
  locator: string;
}

interface Message {
  role: "user" | "assistant";
  text?: string;
  sentences?: { text: string; quoteId: string; quote: QuoteRef }[];
  sent?: string;
}

/** What the sheet is about: a question, optionally an official excerpt, or a personal highlight that is not sent. */
interface AskTarget {
  measureId?: string;
  excerpt?: string;
  personal?: boolean;
}

const SERIF = "font-[family-name:var(--font-serif)]";
const MAX_QUESTION = 300;
const ORB = "flex items-center justify-center rounded-full bg-ai text-accent-foreground";

const AskContext = createContext<(t?: AskTarget) => void>(() => {});

export function AskProvider({ doc, scopeMeasureId, children }: { doc: DocumentData; scopeMeasureId?: string; children: ReactNode }) {
  const [target, setTarget] = useState<AskTarget | null>(null);
  const [chip, setChip] = useState<{ x: number; y: number; target: AskTarget } | null>(null);
  const open = (t: AskTarget = { measureId: scopeMeasureId }) => {
    setChip(null);
    window.getSelection()?.removeAllRanges();
    setTarget(t);
  };

  // Highlight anything on the page: offer "Ask about this" just under the selection.
  useEffect(() => {
    const check = () =>
      window.setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString() ?? "";
        if (!sel || sel.isCollapsed || sel.rangeCount === 0 || text.trim().length < 3) return setChip(null);
        const node = sel.anchorNode;
        const el = node instanceof Element ? node : node?.parentElement;
        if (!el || el.closest("[data-ask-ignore], input, textarea")) return setChip(null);
        const measureId = el.closest("[data-ask-measure]")?.getAttribute("data-ask-measure") ?? scopeMeasureId;
        const pub = publicExcerpt(text, doc, measureId);
        const r = sel.getRangeAt(0).getBoundingClientRect();
        setChip({
          x: Math.min(Math.max(r.left + r.width / 2, 90), window.innerWidth - 90),
          y: Math.min(r.bottom + 10, window.innerHeight - 64),
          target: pub ? { measureId: pub.measureId, excerpt: pub.text } : { measureId, personal: true },
        });
      }, 0);
    const clear = () => {
      if (window.getSelection()?.isCollapsed) setChip(null);
    };
    document.addEventListener("mouseup", check);
    document.addEventListener("touchend", check);
    document.addEventListener("keyup", check);
    document.addEventListener("selectionchange", clear);
    window.addEventListener("scroll", clear, { passive: true });
    return () => {
      document.removeEventListener("mouseup", check);
      document.removeEventListener("touchend", check);
      document.removeEventListener("keyup", check);
      document.removeEventListener("selectionchange", clear);
      window.removeEventListener("scroll", clear);
    };
  }, [doc, scopeMeasureId]);

  return (
    <AskContext.Provider value={open}>
      {children}

      {chip && !target && (
        <button
          type="button"
          data-ask-ignore
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => open(chip.target)}
          style={{ left: chip.x, top: chip.y }}
          className={`fixed z-40 inline-flex min-h-11 -translate-x-1/2 animate-fade-in items-center gap-2 rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground shadow-card ${FOCUS}`}
        >
          <span aria-hidden="true" className={`${ORB} size-6`}>
            <Glyph name="quote" size={12} />
          </span>
          Ask about this
        </button>
      )}

      {!target && (
        <button
          type="button"
          data-ask-ignore
          onClick={() => open()}
          aria-label={scopeMeasureId ? "Ask about this question" : "Ask about the ballot"}
          className={`${ORB} fixed bottom-5 right-5 z-30 size-14 shadow-card transition-transform duration-(--duration) ease-legible hover:scale-105 ${FOCUS}`}
        >
          <Glyph name="quote" size={22} />
        </button>
      )}

      {target && <AskSheet doc={doc} target={target} onClose={() => setTarget(null)} />}
    </AskContext.Provider>
  );
}

/** "Ask about this question" on a card or page. */
export function AskButton({ measureId, label, variant = "link" }: { measureId?: string; label?: string; variant?: "link" | "pill" }) {
  const open = useContext(AskContext);
  return (
    <button
      type="button"
      onClick={() => open({ measureId })}
      aria-haspopup="dialog"
      className={
        variant === "pill"
          ? `inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-small font-semibold shadow-card hover:bg-surface-muted ${FOCUS}`
          : `inline-flex min-h-11 items-center gap-2 text-small font-semibold ${FOCUS}`
      }
    >
      <span aria-hidden="true" className={`${ORB} size-6`}>
        <Glyph name="quote" size={12} />
      </span>
      {label ?? (measureId ? "Ask about this question" : "Ask about the ballot")}
    </button>
  );
}

/** Puts an official excerpt in front of a question, keeping the whole under the route's limit. */
function withExcerpt(excerpt: string | undefined, q: string): string {
  if (!excerpt) return q;
  const room = MAX_QUESTION - q.length - 12;
  const ex = excerpt.length > room ? `${excerpt.slice(0, Math.max(0, room - 1))}…` : excerpt;
  return `About "${ex}": ${q}`;
}

function AskSheet({ doc, target, onClose }: { doc: DocumentData; target: AskTarget; onClose: () => void }) {
  const measure = target.measureId ? doc.measures.find((m) => m.id === target.measureId) : undefined;
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [openQuote, setOpenQuote] = useState<string | null>(null);
  const [reading, setReading] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const scope = measure ? `Question ${measure.number}` : "the ballot";
  const suggestions = target.excerpt
    ? ["What does this part mean?", "What would change under YES?", "What does a NO vote keep?"]
    : measure
      ? (ASK_SUGGESTIONS[measure.id] ?? []).map((s) => s.q)
      : BALLOT_SUGGESTIONS.map((s) => s.q);

  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  const say = (m: Message) => setMessages((prev) => [...prev, m]);
  const sentLine = `Sent: ${scope}${target.excerpt ? ", the highlighted official words," : ""} and your question. Nothing from your profile.`;

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    say({ role: "user", text: trimmed });
    setQuestion("");
    if (asksHowToVote(trimmed)) return say({ role: "assistant", text: VOTE_FIXED_RESPONSE });
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return say({ role: "assistant", text: "You're offline, so Legible can't ask right now. The official text is still on this page." });
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, measureId: measure?.id, question: withExcerpt(target.excerpt, trimmed) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) say({ role: "assistant", text: "Asking isn't set up on this server yet. The official text is still on this page." });
      else if (!res.ok || data.error) say({ role: "assistant", text: "Something went wrong asking that. Try again in a moment." });
      else if (data.fixed) say({ role: "assistant", text: data.message, sent: sentLine });
      else say({ role: "assistant", sentences: data.sentences, sent: sentLine });
    } catch {
      say({ role: "assistant", text: "Legible couldn't reach the server. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-ask-ignore>
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-foreground/30" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-h"
        className="relative flex max-h-[85dvh] w-full max-w-2xl animate-fade-in flex-col rounded-t-xl bg-background shadow-card"
      >
        <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-border" />
        <header className="flex items-start justify-between gap-3 px-5 pt-3">
          <div className="min-w-0">
            <h2 id="ask-h" className="text-body font-bold">
              Ask about {scope}
            </h2>
            {measure && <p className="truncate text-small text-muted-foreground">{measure.title}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-surface ${FOCUS}`}>
            <Glyph name="close" size={18} />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 pb-3 pt-3">
          {target.excerpt && (
            <figure className="rounded-lg bg-surface p-4 shadow-card">
              <figcaption className="text-small font-semibold text-muted-foreground">You highlighted official text</figcaption>
              <blockquote className={`mt-1 text-body ${SERIF}`}>
                <mark className="bg-accent-soft text-foreground">{target.excerpt}</mark>
              </blockquote>
            </figure>
          )}
          {target.personal && (
            <p className="rounded-md bg-surface-muted px-3 py-2 text-small">
              That part is about your own answers, so Legible won&apos;t send it anywhere. Ask in your own words, or pick a question below.
            </p>
          )}

          {messages.length === 0 && (
            <>
              <p className="text-small text-muted-foreground">Answers come only from the official text, with the words to check. Legible never says how to vote.</p>
              <ul className="overflow-hidden rounded-lg bg-surface shadow-card">
                {suggestions.map((q) => (
                  <li key={q} className="border-b border-border last:border-0">
                    <button type="button" onClick={() => void ask(q)} className={`flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left text-body hover:bg-surface-muted ${FOCUS}`}>
                      {q}
                      <span aria-hidden="true" className="-rotate-90 text-muted-foreground">
                        <Glyph name="chevron" size={16} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <p key={i} className="ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-4 py-2.5 text-body text-primary-foreground">
                {m.text}
              </p>
            ) : (
              <div key={i} className="max-w-[92%] rounded-lg bg-surface p-4 shadow-card">
                {m.text && <p className="text-body">{m.text}</p>}
                {m.sentences?.map((s, j) => {
                  const key = `${i}:${j}`;
                  return (
                    <div key={key} className={j ? "mt-2" : ""}>
                      <p className="text-body">{s.text}</p>
                      <button
                        type="button"
                        aria-expanded={openQuote === key}
                        onClick={() => setOpenQuote(openQuote === key ? null : key)}
                        className={`inline-flex min-h-9 items-center gap-1.5 text-small font-semibold ${FOCUS}`}
                      >
                        <Glyph name="check" size={12} />
                        {s.quote.locator}
                        {s.quote.page ? `, page ${s.quote.page}` : ""}
                        <span className="font-normal text-muted-foreground">{openQuote === key ? "Hide" : "See the official words"}</span>
                      </button>
                      {openQuote === key && (
                        <p className={`rounded-md bg-surface-muted px-3 py-2 text-body ${SERIF}`}>
                          <mark className="bg-accent-soft text-foreground">{s.quote.text}</mark>
                        </p>
                      )}
                    </div>
                  );
                })}
                {m.sentences && m.sentences.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setReading(i)}
                    aria-haspopup="dialog"
                    className={`mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface-muted px-4 text-small font-semibold hover:bg-border ${FOCUS}`}
                  >
                    Read as a page
                  </button>
                )}
                {m.sent && <p className="mt-2 text-small text-muted-foreground">{m.sent}</p>}
              </div>
            ),
          )}
          {loading && <p className="text-small text-muted-foreground">Checking the official text…</p>}
        </div>

        {reading !== null && messages[reading]?.sentences && (
          <Reader
            kicker={`Answer about ${scope}`}
            title={messages[reading - 1]?.text ?? "Your question"}
            meta={<p>{messages[reading].sent}</p>}
            onClose={() => setReading(null)}
          >
            {messages[reading].sentences!.map((s, j) => (
              <div key={j}>
                <p className={READ}>{s.text}</p>
                <blockquote className="mt-3 border-l-2 border-accent pl-4">
                  <p className={`${READ} text-muted-foreground`}>{s.quote.text}</p>
                  <footer className="mt-1 text-small text-muted-foreground">
                    {s.quote.locator}
                    {s.quote.page ? `, page ${s.quote.page}` : ""}, official text
                  </footer>
                </blockquote>
              </div>
            ))}
          </Reader>
        )}

        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <label htmlFor="ask-input" className="sr-only">
            Your question about {scope}
          </label>
          <input
            id="ask-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={target.excerpt ? "Ask about the highlighted words…" : `Ask about ${scope}…`}
            maxLength={200}
            className={`h-12 min-w-0 flex-1 rounded-full border-2 border-border bg-surface px-4 text-body focus:border-foreground ${FOCUS}`}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className={`h-12 shrink-0 rounded-full bg-primary px-5 text-body font-semibold text-primary-foreground disabled:bg-surface-muted disabled:text-muted-foreground ${FOCUS}`}
          >
            Ask
          </button>
        </form>
      </section>
    </div>
  );
}
