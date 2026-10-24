---
inclusion: always
---

# Development

How to set up, run, and change Legible. Scope lives in `.kiro/specs/legible/` (requirements, design, tasks) and in the other steering files; they supersede `docs/spec.md` and the earlier parts of `docs/DECISIONS.md`.

## Setup

Node.js 20.9 or later (developed on Node 24) and npm.

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to enable Ask Kiro and bill drafts
npm run dev                  # http://localhost:3000 (Turbopack)
```

The app runs without an API key: `/api/ask` and `/api/suggest` answer 503 and Ask Kiro falls back to the official passage and rule-based questions.

## Checks

```bash
npx tsc --noEmit     # type check
npm run lint         # eslint
npm test             # vitest (pure logic and data checks)
npm run lint:words   # banned-word check over app strings and src/data
npm run build        # production build
```

`npx tsc --noEmit` fails on `LayoutProps` until `npm run build` or `npm run dev` has run once, because Next generates those global types.

## Working agreement

- Work from the spec. Before building, find the task in `.kiro/specs/<feature>/tasks.md`; check it off when it lands. If a change alters scope, update requirements or design first.
- After every meaningful change that works, commit with a descriptive message.
- Run only one `next dev` per checkout (Next refuses a second). Browser tests that touch the profile use an origin of their own on the shared dev server, such as `http://test-1.localhost:3000`: localStorage is per origin, so it starts empty and never overwrites the profile saved at `localhost:3000`. Do not clear or restore `localhost:3000` storage.
- Never commit real secrets. Public config uses the `NEXT_PUBLIC_` prefix; secret keys stay server-side. `.env.example` lists variable names only; real values go in `.env.local`.

## Content pipeline

- `data/questions.json` is machine-extracted from the official booklet by `data/extract_questions.py` (source text in `data/official/`; `IFV_2026_English.pages.json` is the per-page text used to locate quotes). The sec.state.ma.us HTML pages are bot-walled, so the PDF is the source of truth.
- `scripts/ballot-2026.content.ts` holds the hand-authored short titles, rules, why sentences, and extra quotes. `npm run data:build` regenerates `src/data/ballot-2026.json`, locates every quote word for word in the page text, and fails if one is missing. Quotes stay `verified` until a person sets `reviewedBy` on the measure, which flips them to `reviewed`.
- `scripts/bills.content.ts` holds hand-written bill explainers (what it proposes, what would change, who it could affect). `npm run data:bills` saves bill text from the Legislature API; `npm run data:civic` checks each explainer against it with `src/lib/explain/verify.ts` and fails on any quote not found word for word.
- `npm run data:draft -- <bill>` asks the model (Anthropic API, needs `ANTHROPIC_API_KEY` in `.env.local`) to draft an explainer from the saved bill into `data/drafts/<bill>.json`, then runs a support check (a second model call judging whether every line follows from its quote). The build ships a draft only for a bill with no hand-written explainer, labeled as an AI draft, keeping only lines that pass verification and the support check. `--check` re-checks a saved draft; `--hand` reviews a hand-written explainer into `data/reviews/` without changing it. `npm run data:civic -- --prefer-drafts` previews drafts; never commit that build.

## Rules code most often breaks

Full list in `product.md`.

- Never recommend a vote. Five directions only: expands, restricts, rule_change, who_decides, none.
- Life facts, topics, and the town never leave the browser. Server routes receive only public document text, measure ids, user questions, and verified quotes.
- YES and NO text is verbatim. Q9 is a referendum: YES keeps the law in place.
- Every generated quote is verified word for word against page text; measures with failed quotes are flagged, not shown.
- Banned words (should, recommend, good, bad, support, oppose) are linted in app strings and generated explanations, not in verbatim quotes.
