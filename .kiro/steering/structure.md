---
inclusion: always
---

# Structure

```
src/app/                  App Router: page.tsx mounts the single-page app (LegibleApp, hash routes)
src/app/manifest.ts       Web app manifest (installable to a phone's home screen; icons in public/icons/)
src/app/api/ask/          POST: question about official text (ballot, bill, civic date) -> cited answer
src/app/api/suggest/      POST: highlighted official passage -> three suggested questions
src/app/dev/plant/        Development-only plant preview (404 in production)
src/components/           UI: For you, Explore, ballot guide, measure and bill pages, reader, profile sheet, chat dock
src/components/plant/     Plant companion (everywhere) and Growth Story (growth tracking development only, GROWTH_TRACKING_ENABLED)
src/lib/engine/           Pure personalization: profile, cards, timeline ranking, copy helpers
src/lib/verify/           Pure quote normalization and verification against page text
src/lib/explain/          Bill explainer verification, model prompt, and support check
src/lib/ask/              Ask route grounding, prompt, and answer checks
src/lib/vocab/            Fixed vocabularies: directions, life facts, topics, banned words
src/lib/nav/, src/lib/ui/ Hash routing and small UI helpers
src/data/                 Shipped data: ballot-2026.json, civic-ma.json, towns.json
public/official/          Official booklet PDF, per-question page text, bill reader copies
scripts/                  Content builds (data:build, data:bills, data:civic, data:draft) and hand-written content
data/                     Raw sources, saved official text, model drafts, reviews (not shipped)
docs/                     Original spec, decisions log, accounts review, pitch, README screenshots
.kiro/steering/           Product, tech, structure, and development rules (always included)
.kiro/specs/legible/      Requirements, design, tasks (source of truth for scope)
.kiro/specs/ballot-wrapped/  Ballot, Wrapped share feature: requirements, design, tasks
```

Planned, not built yet: `src/app/api/analyze/` (uploads, task 9.3), `src/lib/analyze/` (task 20.1), `public/catalog/` and `public/docs/` (tasks 17.2, 20.2), `public/demo/` (task 9.5).

Rules:

- Anything in `src/lib/engine`, `src/lib/verify`, `src/lib/explain`, and `src/lib/vocab` is pure TypeScript with no React and no network, so it runs in tests and in the browser.
- Profile state lives only in client components.
- Route handlers never receive or log profile data.
