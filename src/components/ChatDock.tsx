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
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [openQuoteId, setOpenQuoteId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

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
          text: "You're offline, so Nine can't ask the model anything right now. The official text for each question is still on its card.",
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
        { role: "assistant", text: "Nine couldn't reach the server. Check your connection and try again." },
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
        <div className="flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-black/10 bg-[#fdfbf6] text-[#171717] shadow-xl">
          <div className="flex items-center justify-between border-b border-black/10 bg-[#fdfbf6] px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Ask Nine</p>
              <p className="text-xs text-black/60">Answers come from the official ballot text only.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded p-1 text-black/60 hover:bg-black/5 hover:text-black"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-black/60">
                  Ask about any of the 9 questions on the Nov 3, 2026 Massachusetts ballot. Nine
                  never says how to vote.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void ask(q)}
                      className="rounded-full border border-[#d4c68a] bg-[#fff6c9] px-3 py-1.5 text-left text-sm hover:bg-[#ffee9e]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-lg bg-[#171717] px-3 py-2 text-sm text-white"
                      : "max-w-[85%] rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
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
                            className="ml-0.5 rounded border border-[#d4c68a] bg-[#fff6c9] px-1.5 py-0.5 text-[10px] font-medium align-middle hover:bg-[#ffee9e]"
                            aria-expanded={openQuoteId === s.quoteId}
                          >
                            {s.quote.locator}
                            {s.quote.page ? `, p.${s.quote.page}` : ""}
                          </button>
                          {openQuoteId === s.quoteId && (
                            <span className="mt-1 block rounded bg-black/5 p-2 text-xs italic">
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

            {loading && <p className="text-sm text-black/50">Checking the official text…</p>}
          </div>

          <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-black/10 p-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about a ballot question…"
              maxLength={300}
              className="flex-1 rounded-md border-2 border-black bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-black/50"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="rounded-md bg-[#171717] px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-40"
            >
              Ask
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Ask Nine a question"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#171717] text-xl text-white shadow-lg hover:scale-105 transition-transform"
      >
        {open ? (
          "✕"
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/icons/kiro-ghost.svg" alt="" className="h-7 w-7" />
        )}
      </button>
    </div>
  );
}
