---
inclusion: always
---

# Tech

- **Framework:** Next.js 16 App Router with Turbopack, React 19, TypeScript, Tailwind CSS 4. `cacheComponents` is on. Next.js 16 differs from older versions; read `node_modules/next/dist/docs/` before using an unfamiliar API.
- **Hosting:** Vercel, project `nine` (the app is now Legible; the Vercel project keeps its old name until renamed there). Production deploys from `main`.
- **AI:** Anthropic TypeScript SDK (`@anthropic-ai/sdk`), model `claude-opus-5`, called only from server route handlers. Structured JSON output via `output_config.format`. Claude's built-in citations cannot be combined with structured output, so quotes come back as JSON fields and the app verifies them itself.
- **PDF:** text extraction in the browser with `pdfjs-dist`. Text-based PDFs only; no OCR.
- **Tests:** Vitest for pure logic (engine, quote verification, lint).

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build
npm run lint       # eslint
npm test           # vitest
npm run lint:words # banned-word check over app strings and data
```

## Secrets

- `ANTHROPIC_API_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`. Add it locally in `.env.local` and on Vercel with `vercel env add`.
- `.env.example` holds names only. Never commit real values.

## Platform limits to respect

- Vercel function request bodies are capped at about 4.5 MB, so uploads send extracted page text, never the PDF bytes.
- Long model calls stream and use the SDK's final-message helper. The analyze route sets a long `maxDuration`.

## Working agreement

After every meaningful change that works, commit with a descriptive message.
