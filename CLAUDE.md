# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Legible**: a Next.js app for the 9 questions on the Nov 3, 2026 Massachusetts ballot. The user enters their town and a few facts about their life; the app re-sorts the questions by which ones touch them, quoting only the Attorney General's official text and never saying how to vote. Built for Hackachusetts (Oct 24, 2026). Scope lives in `.kiro/specs/legible/` (requirements, design, tasks) and `.kiro/steering/`. Read those first; they supersede `docs/spec.md` and the earlier parts of `docs/DECISIONS.md`. Check off tasks in `tasks.md` as they land.

## Commands

```bash
npm run dev      # dev server at http://localhost:3000 (Turbopack)
npm run build    # production build; also generates Next's global types (LayoutProps etc.)
npm run lint     # eslint
npm test         # vitest (pure logic and data checks)
npm run lint:words  # banned-word check over app strings and src/data
npm run data:build  # regenerate src/data/ballot-2026.json from data/questions.json + scripts/ballot-2026.content.ts
```

`npx tsc --noEmit` fails on `LayoutProps` until `npm run build` or `next dev` has run once.

Next.js 16 differs from older versions. Check `node_modules/next/dist/docs/` before using an API you are not sure about (see `AGENTS.md`).

## Workflow

- After every meaningful change that works, commit with a descriptive message.
- Browser tests that touch the profile run on an origin of their own, named for the session (e.g. `http://claude-d285.localhost:3000`) against the shared dev server: localStorage is per origin, so it starts empty and never overwrites the profile saved at `localhost:3000`. Sessions share the browser pane, so never reuse another session's origin or tab. Do not start a second `next dev` in this folder (Next refuses), and do not clear or restore `localhost:3000` storage.
- Never commit real secrets. Public config uses the NEXT_PUBLIC_ prefix; secret keys stay server-side only. `.env.example` lists variable names only; real values go in `.env.local`.

## Structure

- `src/app/` App Router. `page.tsx` is intentionally blank so far. Planned layout is in `.kiro/steering/structure.md`.
- `data/questions.json` is machine-extracted from the official booklet by `data/extract_questions.py` (source text in `data/official/`; `IFV_2026_English.pages.json` is the per-page text used to locate quotes). The sec.state.ma.us HTML pages are bot-walled, so the PDF is the source of truth.
- `scripts/ballot-2026.content.ts` holds the hand-authored short titles, rules, why sentences, and extra quotes. `npm run data:build` locates every quote word for word in the page text and fails if one is missing. Quotes stay `verified` until a person sets `reviewedBy` on the measure, which flips them to `reviewed`.
- `scripts/bills.content.ts` holds hand-written bill explainers (what it proposes, what would change, who it could affect). `npm run data:civic` checks each against the bill text saved by `npm run data:bills` with `src/lib/explain/verify.ts` and fails on any quote not found word for word.
- `npm run data:draft -- <bill>` asks Claude to draft an explainer from the saved bill (`data/drafts/<bill>.json`, needs `ANTHROPIC_API_KEY` in `.env.local`). The build ships it as an AI draft only for a bill with no hand-written explainer, after dropping lines that fail verification; `npm run data:civic -- --prefer-drafts` previews drafts (never commit that build). Each draft also gets a support check (a second model call judging whether every line follows from its quote); only supported claims ship. `--check` re-checks a saved draft; `--hand` reviews a hand-written explainer into `data/reviews/` without changing it.
- `docs/` original spec, decisions log, teammate pitch.
- `.kiro/` Kiro steering and spec. Kiro is required by the event, so keep these current.

## Product rules

Full list in `.kiro/steering/product.md`. The ones code most often breaks:

- Never recommend a vote. Five directions only: expands, restricts, rule_change, who_decides, none.
- Life facts, topics, and the town never leave the browser. Server routes receive only public document text, measure ids, user questions, and verified quotes.
- YES and NO text is verbatim. Q9 is a referendum: YES keeps the law in place.
- Every generated quote is verified word for word against page text; measures with failed quotes are flagged, not shown.
- Banned words (should, recommend, good, bad, support, oppose) are linted in app strings and generated explanations, not in verbatim quotes.
