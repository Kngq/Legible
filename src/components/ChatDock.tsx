"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { asksHowToVote, VOTE_FIXED_RESPONSE } from "@/lib/vocab";

interface QuoteRef {
  id: string;
  text: string;
  page?: number;
  locator: string;
}

interface AnswerSentence {
  text: string;
  quoteId: string;
  quote: QuoteRef;
}

interface ChatMessage {
  role: "user" | "assistant";
  text?: string;
  sentences?: AnswerSentence[];
  sent?: { documentId: string; measureId: string | null; question: string };
}

const SUGGESTED_QUESTIONS = [
  "What does Question 7 change about single-family homes?",
  "What happens under a NO vote on Question 9?",
  "Does Question 5 change my taxes?",
];

export function ChatDock() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  function openPanel() {
    setClosing(false);
    setOpen(true);
  }

  function closePanel() {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOpen(false);
      setClosing(false);
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 400);
  }

  function toggle() {
    if (open) closePanel();
    else openPanel();
  }

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");

    if (asksHowToVote(trimmed)) {
      setMessages((prev) => [...prev, { role: "assistant", text: VOTE_FIXED_RESPONSE }]);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "You're offline, so Kiro can't ask the model anything right now. The official text for each measure is still on its card.",
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Something went wrong asking that. Try again in a moment." },
        ]);
        return;
      }

      if (data.fixed) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.message, sent: data.sent }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", sentences: data.sentences, sent: data.sent },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Kiro couldn't reach the server. Check your connection and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-sans">
      {open && (
        <div
          className={`flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-xl border border-[#9046FF]/20 bg-white text-[#171717] shadow-xl ${
            closing ? "animate-dock-out" : "animate-dock-in"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#9046FF]/15 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#9046FF]">Ask Kiro</p>
              <p className="text-xs text-black/60">Answers come from the official text only.</p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close chat"
              className="rounded p-1 text-black/50 transition-colors hover:bg-[#9046FF]/10 hover:text-[#9046FF]"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-black/60">
                  Ask about any document in your catalog. Kiro never says how to vote.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void ask(q)}
                      style={{ animationDelay: `${i * 80}ms` }}
                      className="animate-fade-in rounded-full border border-[#9046FF]/30 bg-[#9046FF]/5 px-3 py-1.5 text-left text-sm text-[#5b2bb0] transition-colors duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-[#9046FF]/10"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`animate-fade-in ${m.role === "user" ? "flex justify-end" : "flex justify-start"}`}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-lg bg-[#9046FF] px-3 py-2 text-sm text-white"
                      : "max-w-[85%] rounded-lg border border-[#9046FF]/15 bg-[#9046FF]/5 px-3 py-2 text-sm"
                  }
                >
                  {m.text && <p>{m.text}</p>}
                  {m.sentences && (
                    <div className="space-y-1.5">
                      {m.sentences.map((s, j) => (
                        <p key={j}>
                          {s.text}{" "}
                          <button
                            type="button"
                            onClick={() => setOpenQuoteId(openQuoteId === s.quoteId ? null : s.quoteId)}
                            className="ml-0.5 rounded border border-[#9046FF]/40 bg-[#9046FF]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#5b2bb0] align-middle transition-colors duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-[#9046FF]/20"
                            aria-expanded={openQuoteId === s.quoteId}
                          >
                            {s.quote.locator}
                            {s.quote.page ? `, p.${s.quote.page}` : ""}
                          </button>
                          {openQuoteId === s.quoteId && (
                            <span className="mt-1 block animate-fade-in rounded bg-[#9046FF]/10 p-2 text-xs italic">
                              “{s.quote.text}”
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                  {m.sent && (
                    <p className="mt-1.5 text-[10px] text-black/40">
                      Sent: {m.sent.documentId}, your question.
                    </p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex animate-fade-in items-center gap-1.5 text-sm text-black/50">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9046FF] [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9046FF] [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9046FF]" />
                </span>
                Checking the official text…
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-[#9046FF]/15 p-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about a measure…"
              maxLength={300}
              className="flex-1 rounded-md border-2 border-[#9046FF]/30 bg-white px-3 py-2 text-sm text-black outline-none transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] focus:border-[#9046FF] focus:ring-2 focus:ring-[#9046FF]/40"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="rounded-md bg-[#9046FF] px-3 py-2 text-sm font-medium text-white transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-[#7d35e6] active:scale-95 disabled:opacity-40 disabled:active:scale-100"
            >
              Ask
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Ask Kiro a question"}
        className="relative flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-[#9046FF] text-xl text-white shadow-lg transition-transform duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:scale-105 active:scale-95"
      >
        <span
          className={`absolute transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            open && !closing ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0"
          }`}
        >
          ✕
        </span>
        <span
          className={`transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            open && !closing ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/kiro-ghost.svg" alt="" className="h-8 w-8" />
        </span>
        {!(open && !closing) && (
          <span
            aria-hidden="true"
            className="absolute -bottom-1 right-3 h-3 w-3 rotate-45 rounded-[2px] bg-[#9046FF]"
          />
        )}
      </button>
    </div>
  );
}
