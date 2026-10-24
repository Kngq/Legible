# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Nine**: a Next.js app for the 9 questions on the Nov 3, 2026 Massachusetts ballot. The user enters their town and a few facts about their life; the app re-sorts the questions by which ones touch them, quoting only the Attorney General's official text and never saying how to vote. Built for Hackachusetts (Oct 24, 2026). Read `docs/DECISIONS.md` first; it supersedes `docs/spec.md` where they differ.

## Commands

```bash
npm run dev      # dev server at http://localhost:3000 (Turbopack)
npm run build    # production build; also generates Next's global types (LayoutProps etc.)
npm run lint     # eslint
```

No test runner is set up yet. `npx tsc --noEmit` fails on `LayoutProps` until `npm run build` or `next dev` has run once.

Next.js 16 differs from older versions. Check `node_modules/next/dist/docs/` before using an API you are not sure about (see `AGENTS.md`).

## Workflow

- After every meaningful change that works, commit with a descriptive message.
- Never commit real secrets. Public config uses the NEXT_PUBLIC_ prefix; secret keys stay server-side only. `.env.example` lists variable names only; real values go in `.env.local`.

## Structure

- `src/app/` App Router. `page.tsx` is intentionally blank so far; `layout.tsx` loads Geist fonts.
- `data/questions.json` is machine-extracted from the official booklet by `data/extract_questions.py` (source text in `data/official/`). Review before shipping; the sec.state.ma.us HTML pages are bot-walled, so the PDF is the source of truth.
- `docs/` spec, decisions log, teammate pitch.

## Product rules (from DECISIONS.md)

- Relevance sorting is a hand-written tag → direction table, not AI. Directions: expands / restricts / rule_change / who_decides / none. Never "good/bad" or "vote yes/no".
- "What YES does / What NO does" is copied verbatim from the AG summary. Q9 is a referendum: YES keeps the law in place.
- The profile never leaves the browser. Server routes may receive only question ids, user questions and quoted citations.
- Two grounded AI routes (Ask the official text, Draft a message) may use only the text passed in and must cite paragraphs; "how should I vote" gets a fixed refusal.
- Banned-word lint (should, recommend, good, bad, support, oppose) applies to app-authored strings only, not verbatim quotes.
- Visual direction: "official booklet + highlighter". Paper tones, serif display, sans body, one highlighter-yellow accent, no gradients.
