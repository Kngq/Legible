# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Nine**: a Next.js app for the 9 questions on the Nov 3, 2026 Massachusetts ballot. The user enters their town and a few facts about their life; the app re-sorts the questions by which ones touch them, quoting only the Attorney General's official text and never saying how to vote. Built for Hackachusetts (Oct 24, 2026). Scope lives in `.kiro/specs/nine/` (requirements, design, tasks) and `.kiro/steering/`. Read those first; they supersede `docs/spec.md` and the earlier parts of `docs/DECISIONS.md`. Check off tasks in `tasks.md` as they land.

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

- `src/app/` App Router. `page.tsx` is intentionally blank so far. Planned layout is in `.kiro/steering/structure.md`.
- `data/questions.json` is machine-extracted from the official booklet by `data/extract_questions.py` (source text in `data/official/`). Review before shipping; the sec.state.ma.us HTML pages are bot-walled, so the PDF is the source of truth.
- `docs/` original spec, decisions log, teammate pitch.
- `.kiro/` Kiro steering and spec. Kiro is required by the event, so keep these current.

## Product rules

Full list in `.kiro/steering/product.md`. The ones code most often breaks:

- Never recommend a vote. Five directions only: expands, restricts, rule_change, who_decides, none.
- Life facts, topics, and the town never leave the browser. Server routes receive only public document text, measure ids, user questions, and verified quotes.
- YES and NO text is verbatim. Q9 is a referendum: YES keeps the law in place.
- Every generated quote is verified word for word against page text; measures with failed quotes are flagged, not shown.
- Banned words (should, recommend, good, bad, support, oppose) are linted in app strings and generated explanations, not in verbatim quotes.
