"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { ASK_EVENT, sourceKey, type AskRequest, type AskSource } from "@/lib/ask/context";
import { PART_LABEL, type Part } from "@/lib/ask/prompt";
import { ASK_SUGGESTIONS } from "@/lib/engine/ask-suggestions";
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
  /** Explain answers are grouped: what it means, why it matters, how it could affect you. */
  part?: Part;
}

/** What the conversation is about: an official source and, if highlighted, its words. */
interface ActiveContext {
  source: AskSource;
  passage?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "context";
  text?: string;
  sentences?: AnswerSentence[];
  /** One line saying exactly what was sent, under each answer. */
  sent?: string;
  /** On a user message: the highlighted passage it asks about. */
  passage?: { text: string; source: AskSource };
  /** On a context divider: the document now being discussed. */
  source?: AskSource;
  /** No model on the server: show the official passage and its source instead of an answer. */
  fallback?: ActiveContext;
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
  // Highlight-to-ask: the source and passage Kiro is answering about, so follow-ups
  // need no repeating; personal context is offered but sent only if switched on.
  const [active, setActive] = useState<ActiveContext | null>(null);
  const [personal, setPersonal] = useState<string[]>([]);
  const [share, setShare] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const askRef = useRef<(q: string, ctx?: ActiveContext | null, mode?: "explain" | "ask") => void>(() => {});
  const activeRef = useRef<ActiveContext | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // The highlight menu and "Ask Kiro about this question" open the dock with context.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const req = (e as CustomEvent<AskRequest>).detail;
      openPanel();
      const ctx: ActiveContext | null = req.source ? { source: req.source, passage: req.passage } : null;
      if (sourceKey(ctx?.source) !== sourceKey(activeRef.current?.source)) {
        // A different document: start a fresh context so the two are never mixed. The
        // divider goes into the ref now, so the question asked next carries no old turns.
        const divider: ChatMessage = { role: "context", source: ctx?.source };
        messagesRef.current = [...messagesRef.current, divider];
        setMessages((prev) => [...prev, divider]);
        setPersonal(req.personal ?? []);
        setShare(false);
      }
      setActive(ctx);
      activeRef.current = ctx;
      if (req.question) askRef.current(req.question, ctx, req.mode);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

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

  /** Earlier question and answer pairs about the current document, for follow-ups. */
  function historyFor(): { question: string; answer: string }[] {
    const msgs = messagesRef.current;
    const start = msgs.map((m) => m.role).lastIndexOf("context") + 1;
    const turns: { question: string; answer: string }[] = [];
    for (let i = start; i < msgs.length - 1; i++) {
      const a = msgs[i + 1];
      if (msgs[i].role === "user" && a.role === "assistant") {
        turns.push({ question: msgs[i].text ?? "", answer: a.sentences ? a.sentences.map((x) => x.text).join(" ") : (a.text ?? "") });
      }
    }
    return turns.slice(-4);
  }

  async function ask(q: string, ctx: ActiveContext | null = activeRef.current, mode: "explain" | "ask" = "ask") {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    const isNewPassage = Boolean(ctx?.passage) && !messagesRef.current.some((m) => m.passage?.text === ctx?.passage);
    setMessages((prev) => [...prev, { role: "user", text: trimmed, passage: ctx?.passage && isNewPassage ? { text: ctx.passage, source: ctx.source } : undefined }]);
    setQuestion("");
    const shared = share ? personal : [];
    const sentLine = `Sent: ${ctx ? ctx.source.title : "the 2026 ballot"}${ctx?.passage ? ", the highlighted words" : ""}, your question${shared.length ? `, and that ${shared.join(" and ")}` : ""}. Nothing else from your profile.`;

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
        body: JSON.stringify({
          question: trimmed,
          mode,
          source: ctx?.source,
          measureId: ctx?.source.kind === "ballot" ? ctx.source.id : undefined,
          passage: ctx?.passage,
          history: historyFor(),
          personal: shared,
        }),
      });
      const data = await res.json();

      if (res.status === 503) {
        // No model configured: say so, and show what the official text says instead of pretending.
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Kiro isn't connected to an AI model on this server yet, so it can't explain this.", fallback: ctx ?? undefined, sent: sentLine },
        ]);
        return;
      }

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Something went wrong asking that. Try again in a moment." },
        ]);
        return;
      }

      if (data.fixed) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.message, sent: sentLine }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", sentences: data.sentences, sent: sentLine },
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

  useEffect(() => {
    askRef.current = (q, ctx, mode) => void ask(q, ctx, mode);
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[75] flex flex-col items-end gap-2 font-sans">
      {open && (
        <div
          className={`flex h-[32rem] max-h-[calc(100dvh-6rem)] w-[22rem] max-w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-xl border border-[#9046FF]/20 bg-white text-[#171717] shadow-xl ${
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

          {active && (
            <div className="border-b border-[#9046FF]/15 bg-[#9046FF]/5 px-4 py-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0">
                  <span className="text-black/50">Reading: </span>
                  <span className="font-semibold text-[#5b2bb0]">{active.source.title}</span>
                  {active.source.locator && (
                    <span className="text-black/50">
                      {" "}
                      · {active.source.locator}
                      {active.source.page ? `, p.${active.source.page}` : ""}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const divider: ChatMessage = { role: "context" };
                    messagesRef.current = [...messagesRef.current, divider];
                    setMessages((prev) => [...prev, divider]);
                    setActive(null);
                    activeRef.current = null;
                    setPersonal([]);
                    setShare(false);
                  }}
                  className="shrink-0 rounded px-1 text-black/50 hover:bg-[#9046FF]/10 hover:text-[#9046FF]"
                >
                  Clear
                </button>
              </div>
              {active.source.url && (
                <a href={active.source.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-[#5b2bb0] underline underline-offset-2">
                  Official source ↗
                </a>
              )}
              {personal.length > 0 && (
                <label className="mt-1.5 flex cursor-pointer items-start gap-2 text-black/70">
                  <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-0.5 accent-[#9046FF]" />
                  <span>
                    Use what I told Legible: <strong>{personal.join(", ")}</strong>. Only these words are sent with your question.
                  </span>
                </label>
              )}
            </div>
          )}

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-black/60">
                  Ask about any document in your catalog. Kiro never says how to vote.
                </p>
                <div className="flex flex-col gap-1.5">
                  {(active?.source.kind === "ballot" && ASK_SUGGESTIONS[active.source.id] ? ASK_SUGGESTIONS[active.source.id].map((x) => x.q) : SUGGESTED_QUESTIONS).map((q, i) => (
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

            {messages.map((m, i) =>
              m.role === "context" ? (
                <p key={i} className="animate-fade-in border-t border-[#9046FF]/15 pt-2 text-center text-xs text-black/50">
                  Now asking about <span className="font-semibold text-[#5b2bb0]">{m.source?.title ?? "the 2026 ballot"}</span>
                </p>
              ) : (
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
                  {m.passage && (
                    <blockquote className="mb-1.5 border-l-2 border-white/60 pl-2 text-xs italic text-white/90">
                      <span className="line-clamp-3">“{m.passage.text}”</span>
                      <span className="mt-0.5 block not-italic text-white/70">
                        {m.passage.source.locator ?? m.passage.source.title}
                        {m.passage.source.page ? `, p.${m.passage.source.page}` : ""}
                      </span>
                    </blockquote>
                  )}
                  {m.text && <p>{m.text}</p>}
                  {m.fallback?.passage && (
                    <div className="mt-1.5 rounded bg-white p-2 text-xs">
                      <p className="italic">“{m.fallback.passage}”</p>
                      <p className="mt-1 text-black/50">
                        {m.fallback.source.title}
                        {m.fallback.source.locator ? ` · ${m.fallback.source.locator}` : ""}
                        {m.fallback.source.page ? `, p.${m.fallback.source.page}` : ""}
                      </p>
                      {m.fallback.source.url && (
                        <a href={m.fallback.source.url} target="_blank" rel="noreferrer" className="text-[#5b2bb0] underline underline-offset-2">
                          Read it in the official source ↗
                        </a>
                      )}
                    </div>
                  )}
                  {m.sentences && (
                    <div className="space-y-1.5">
                      {m.sentences.map((s, j) => (
                        <p key={j}>
                          {s.part && s.part !== "answer" && s.part !== m.sentences![j - 1]?.part && (
                            <span className="mb-0.5 mt-1 block text-[11px] font-semibold uppercase tracking-wide text-[#5b2bb0]">{PART_LABEL[s.part]}</span>
                          )}
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
                  {m.sent && <p className="mt-1.5 text-[10px] text-black/40">{m.sent}</p>}
                </div>
              </div>
              ),
            )}

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
              placeholder={active ? (active.passage ? "Ask a follow-up about this passage…" : `Ask about ${active.source.title}…`) : "Ask about a measure…"}
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
