"use client";

// Ask, in context: a button on a ballot question (or the ballot) opens a bottom
// sheet scoped to it, with checked starter questions. Answers come from /api/ask,
// cite a quote per sentence, and open the official words in place. Only the
// document id, measure id, and the question are sent; never the profile.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ASK_SUGGESTIONS, BALLOT_SUGGESTIONS } from "@/lib/engine/ask-suggestions";
import type { Measure } from "@/lib/engine/types";
import { asksHowToVote, VOTE_FIXED_RESPONSE } from "@/lib/vocab";
import { Glyph } from "./icons";
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
  sent?: boolean;
}

const SERIF = "font-[family-name:var(--font-serif)]";

export function AskButton({
  documentId,
  measure,
  label,
  variant = "link",
}: {
  documentId: string;
  /** Scope to one question; absent means the whole ballot. */
  measure?: Measure;
  label?: string;
  variant?: "link" | "pill";
}) {
  const [open, setOpen] = useState(false);
  const text = label ?? (measure ? "Ask about this question" : "Ask about the ballot");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={
          variant === "pill"
            ? `inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-small font-semibold shadow-card hover:bg-surface-muted ${FOCUS}`
            : `inline-flex min-h-11 items-center gap-2 text-small font-semibold ${FOCUS}`
        }
      >
        <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-ai text-accent-foreground">
          <Glyph name="quote" size={12} />
        </span>
        {text}
      </button>
      {open && <AskSheet documentId={documentId} measure={measure} onClose={() => setOpen(false)} />}
    </>
  );
}

function AskSheet({ documentId, measure, onClose }: { documentId: string; measure?: Measure; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [openQuote, setOpenQuote] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const scope = measure ? `Question ${measure.number}` : "the ballot";
  const suggestions = measure ? (ASK_SUGGESTIONS[measure.id] ?? []).map((s) => s.q) : BALLOT_SUGGESTIONS.map((s) => s.q);

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
        body: JSON.stringify({ documentId, measureId: measure?.id, question: trimmed }),
      });
      const data = await res.json();
      if (res.status === 503) say({ role: "assistant", text: "Asking isn't set up on this server yet. The official text is still on this page." });
      else if (!res.ok || data.error) say({ role: "assistant", text: "Something went wrong asking that. Try again in a moment." });
      else if (data.fixed) say({ role: "assistant", text: data.message, sent: true });
      else say({ role: "assistant", sentences: data.sentences, sent: true });
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
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
          {messages.length === 0 && (
            <>
              <p className="text-small text-muted-foreground">
                Answers come only from the official text, with the words to check. Legible never says how to vote.
              </p>
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
                {m.sent && <p className="mt-2 text-small text-muted-foreground">Sent: {scope} and your question. Nothing from your profile.</p>}
              </div>
            ),
          )}
          {loading && <p className="text-small text-muted-foreground">Checking the official text…</p>}
        </div>

        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <label htmlFor="ask-input" className="sr-only">
            Your question about {scope}
          </label>
          <input
            id="ask-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask about ${scope}…`}
            maxLength={300}
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
