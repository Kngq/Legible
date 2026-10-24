---
inclusion: always
---

# Structure

```
src/app/                  App Router pages and route handlers
src/app/api/analyze/      POST: page text of an uploaded document -> draft measures
src/app/api/ask/          POST: question about one measure's official text -> cited answer
src/components/           UI: cards, avatar, pictograms, source view, panels
src/lib/engine/           Pure personalization: profile + document -> sorted cards
src/lib/verify/           Pure quote verification against page text
src/lib/vocab/            Fixed vocabularies: directions, life facts, topics, banned words
src/data/                 Shipped documents in the Document format (ballot-2026.json)
public/demo/              Pre-run analyses for demo fallback
data/                     Raw sources and extraction scripts (not shipped)
docs/                     Original spec, decisions log, pitch
.kiro/specs/legible/         Requirements, design, tasks (source of truth for scope)
```

Rules:

- Anything in `src/lib/engine`, `src/lib/verify`, and `src/lib/vocab` is pure TypeScript with no React and no network, so it runs in tests and in the browser.
- Profile state lives only in client components.
- Route handlers never receive or log profile data.
