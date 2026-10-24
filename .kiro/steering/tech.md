---
inclusion: always
---

# Tech

- **Framework:** Next.js 16 App Router with Turbopack, React 19, TypeScript, Tailwind CSS 4. `cacheComponents` is on. Next.js 16 differs from older versions; read `node_modules/next/dist/docs/` before using an unfamiliar API.
- **Hosting:** Vercel, project `nine` (the app is now Legible; the Vercel project keeps its old name until renamed there). Production deploys from `main`.
- **AI:** Anthropic TypeScript SDK (`@anthropic-ai/sdk`), called only from server route handlers and build scripts, never from the browser. `/api/ask` and `/api/suggest` use `claude-sonnet-5`; `npm run data:draft` (bill explainer drafts and the support check) uses `claude-opus-5`. Ask Kiro is the in-app assistant's name; its answers come from Claude. With no API key both routes answer 503 and the app falls back to rule-based questions. Structured JSON output via `output_config.format`. Claude's built-in citations cannot be combined with structured output, so quotes come back as JSON fields and the app verifies them itself.
- **PDF:** the 2026 booklet's page text is extracted ahead of time by `data/extract_questions.py` into `data/official/`. Browser extraction of uploads with `pdfjs-dist` is planned (task 9.2), text-based PDFs only, no OCR.
- **Motion:** the `motion` package, only where CSS cannot do it; tokens in `src/lib/motion.ts`.
- **Tests:** Vitest for pure logic (engine, quote verification, lint).
- **Installable web app:** `src/app/manifest.ts`, icons in `public/icons/` and `src/app/apple-icon.png`, theme colours in `src/lib/theme-color.ts` (keep in step with `globals.css`). No service worker: the app never opens from a cache. See "Installable web app (PWA)" in the design.

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build
npm run lint       # eslint
npm test           # vitest
npm run lint:words # banned-word check over app strings and data
npm run data:build # rebuild the ballot JSON; fails on any quote not found word for word
npm run data:bills # save bill text and history from the Legislature API
npm run data:civic # rebuild civic items and bill explainers; fails on any unverified quote
npm run data:draft -- <bill>  # model-drafted bill explainer, verified and support-checked
```

## Secrets

- `ANTHROPIC_API_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`. Add it locally in `.env.local` and on Vercel with `vercel env add`.
- `.env.example` holds names only. Never commit real values.

## Platform limits to respect

- Vercel function request bodies are capped at about 4.5 MB, so uploads send extracted page text, never the PDF bytes.
- Long model calls stream and use the SDK's final-message helper. The planned analyze route will set a long `maxDuration`.

## Working agreement

After every meaningful change that works, commit with a descriptive message.
