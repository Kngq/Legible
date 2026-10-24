# Implementation Plan

Owner hints: A is content and logic, B is screens. Stretch tasks are marked optional and are cut first.

- [ ] 1. Foundations
  - [x] 1.1 Add Vitest with an `npm test` script and a sample passing test
    - _Requirements: 7.3, 12.1_
  - [x] 1.2 Create `src/lib/vocab` with directions, life facts (question text, avatar part), topics (label, avatar part, word list), and banned words
    - _Requirements: 3.5, 4.1, 4.2, 7.1_
  - [x] 1.3 Write `npm run lint:words` to scan app strings, `src/data`, and `public/demo`, skipping verbatim quote fields
    - _Requirements: 7.3, 13.2, 15.3_
  - [x] 1.4 Add the bundled list of 351 municipalities with aliases
    - _Requirements: 1.1_
  - [x] 1.5 Extend the vocab with town facts (kids_in_schools, runs_business_here) and topics (schools, roads_transit), and mark which facts onboarding asks
    - _Requirements: 1.5, 4.1_

- [ ] 2. Reviewed ballot data (A)
  - [x] 2.1 Write a script converting `data/questions.json` into `src/data/ballot-2026.json` in the Document format
    - _Requirements: 2.1_
  - [x] 2.2 Fill short titles, rules, why sentences with quote ids, ask facts, and topics using the draft rule table in design.md
    - _Requirements: 3.1, 6.3, 8.1_
  - [ ] 2.3 Check every quote against the official PDF and mark it reviewed
    - _Requirements: 2.2_
  - [x] 2.4 Add data tests: every why sentence cites an existing quote; Question 9 YES says the law stays in place
    - _Requirements: 2.3, 8.1_

- [ ] 3. Personalization engine (A)
  - [x] 3.1 Implement `buildCards` with relevance, direction, why, because, pending questions, and sort order
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 4.3, 6.1_
  - [x] 3.2 Test the three personas, the empty profile, contradictory facts, and topics without facts
    - _Requirements: 3.6, 3.7, 9.1_

- [ ] 4. Visual system and shell (B)
  - [ ] 4.1 Define design tokens, fonts, type scale, easing, and reduced-motion handling
    - _Requirements: 16.3_
  - [x] 4.2 Build the start screen with the town picker and continue-without-town
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 4.3 Build the ballot layout with header, card list, collapsed "Probably not you" group, and 375 px layout
    - _Requirements: 3.4, 16.1_

- [ ] 5. Cards (B)
  - [x] 5.1 Build the card with labels, verbatim YES and NO, official link, and cached-quote fallback
    - _Requirements: 2.1, 2.3, 2.4, 3.3_
  - [x] 5.2 Add the inline life-fact question and live re-sort with position animation
    - _Requirements: 3.1, 3.2, 3.5_
  - [ ] 5.3 Add because chips that open the fact or topic for editing
    - _Requirements: 6.1, 6.2_
  - [ ] 5.4 Draw the five direction pictograms and the legend
    - _Requirements: 7.1, 7.2_

- [ ] 6. Topics and avatar (B)
  - [ ] 6.1 Add topic chips and typed topic matching in the browser
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 6.2 Build the layered SVG avatar and put it in the header and inside each pictogram
    - _Requirements: 5.1, 5.2, 5.4_
  - [ ] 6.3 Make avatar badges editable and removable with keyboard support
    - _Requirements: 5.3, 16.2_

- [ ] 7. Citations (B)
  - [ ] 7.1 Link why sentences to quotes with highlighter hover and focus states
    - _Requirements: 8.1, 8.2_
  - [ ] 7.2 Add quote badges and the source view with the sentence highlighted
    - _Requirements: 8.3, 8.4_

- [ ] 8. Personas and privacy (A)
  - [ ] 8.1 Add the persona switcher that never overwrites the user's own profile
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ] 8.2 Add the `apiFetch` wrapper and the "What left your browser" panel
    - _Requirements: 10.1, 10.2_
  - [x] 8.3 Add "Remember on this device" with guarded storage and "Forget me" (now "Clear my information" in the profile sheet, task 17.12)
    - _Requirements: 10.4, 10.5_
  - [ ] 8.4 Verify offline re-sort and that no request contains profile data
    - _Requirements: 10.1, 10.3_

- [ ] 9. Upload and verification (A builds logic, B builds panel)
  - [ ] 9.1 Implement `verifyMeasures` with normalization and page correction, with tests
    - _Requirements: 12.1, 12.2, 12.3_
  - [ ] 9.2 Add `pdfjs-dist` extraction per page with scanned-PDF and size checks
    - _Requirements: 11.1, 11.2, 11.3_
  - [ ] 9.3 Add `@anthropic-ai/sdk` and the `/api/analyze` route with the JSON schema, system prompt, limits, and verification; add `ANTHROPIC_API_KEY` to `.env.local` and Vercel
    - _Requirements: 11.4, 11.5, 11.8_
  - [ ] 9.4 Build the upload panel with progress, cancel, counter, flagged list, and AI-draft labels
    - _Requirements: 11.6, 12.4, 13.1, 13.2_
  - [ ] 9.5 Pre-run the 2026 booklet and save it in `public/demo` as the sample fallback; compare against the reviewed cards
    - _Requirements: 11.7_

- [ ] 10. Ask the official text (A)
  - [ ] 10.1 Add the browser how-to-vote check with its fixed response
    - _Requirements: 14.3_
  - [ ] 10.2 Add the `/api/ask` route answering only from the measure's quotes with per-sentence citations
    - _Requirements: 14.1, 14.2_
  - [ ] 10.3 Add the ask box to cards
    - _Requirements: 14.1_

- [ ] 11. Draft a message (B)
  - [ ] 11.1 Build the template draft, edit, and copy, with a word-count and lint check
    - _Requirements: 15.1, 15.2, 15.3_

- [ ] 16. Onboarding (B)
  - [x] 16.0 Profile schema with answer sources, skip counts, topic provenance, storage parsing, and tests (`src/lib/engine/profile.ts`)
    - _Requirements: 1.5, 1.6, 10.4_
  - [x] 16.1 Build first-run onboarding (hello, ZIP, then optional home, work, and voting questions with Skip and a keep prompt; see 17.14) and the profile sheet (avatar ring, checklist, life area and subjects screens, remember prompt)
    - _Requirements: 1.2, 1.4, 1.5_
  - [ ] 16.6 Bundle the Massachusetts ZIP-to-town table from the Census ZCTA relationship file, with a lookup and tests
    - _Requirements: 1.1_
  - [x] 16.7 Build the onboarding avatar that gains one part per answer
    - _Requirements: 1.2, 1.4, 1.5_
  - [ ] 16.2 Store skipped facts and enforce ask-once-more inside cards
    - _Requirements: 1.6_
  - [x] 16.4 Personalization meter logic: life areas, Prefer not to say, topics confirmation, and tests (`src/lib/engine/personalization.ts`)
    - _Requirements: 1.5, 1.9_
  - [x] 16.5 Build the avatar ring in the feed header and profile sheet, and the profile prompts (now inside For you, task 17.11)
    - _Requirements: 1.9_
  - [ ] 16.3 Make the profile editable from the feed header, because chips, and avatar badges
    - _Requirements: 1.7, 6.2_
  - [x] 16.8 Profile navigation: the header avatar (and every general profile link) always opens the overview, never an editor; contextual Add details opens its own editor (registration deadline → voting, housing bills → housing, schools bill → household); every editor has Back, Close, Escape, and Not now (leaves without saving); interests read "What interests you?" with a check on chosen chips and a sticky Not now | Save interests footer; the overview says details are optional with a small "Make Legible yours" line. Verified in Chrome at desktop and 375 px (`ProfileSheet.tsx`, `profile-steps.tsx`, `SiteHeader.tsx`, `ComingUp.tsx`)
    - _Requirements: 1.7_

- [ ] 17. Catalog and home feed (A builds catalog and counts, B builds the screen)
  - [x] 17.1 Add `docType` and `decideBy` to the document and catalog types; set them on the 2026 ballot (Voters, vote, 2026-11-03)
    - _Requirements: 20.1_
  - [ ] 17.2 Write the catalog builder that regenerates `public/catalog/ma.json` from `public/docs/` and the bundled ballot
    - _Requirements: 20.1, 23.5_
  - [x] 17.3 Fetch the catalog whole through `apiFetch`, filter by state and town in the browser, and compute touches, preview, status, and order, with tests
    - _Requirements: 20.2, 20.4_
  - [x] 17.4 Rebuild Home as the decisions feed: header with ring, nudge, Up next card, scope switch, feed cards, open questions, Decided group, empty-town state
    - _Requirements: 20.3, 20.5, 20.6, 20.7, 20.9_
  - [x] 17.5 Move the current ballot page into a DocumentView opened from a feed card
    - _Requirements: 20.3_
  - [x] 17.7 Rebuild the Legible seed into checked civic items (`npm run data:civic`) with `civicFeed` ranking and tests
    - _Requirements: 20.9_
  - [x] 17.8 Render civic cards in the feed and let Up next consider them
  - [x] 17.9 Replace the feed sections (Up next, scope switch, carousels, Coming up, Documents) with one timeline: name, due, what it is, how it reaches you; ballot folded into Election Day
  - [x] 17.10 Rank the timeline by relevance and time together (`score = 0.65 relevance + 0.35 urgency`), with tests
  - [x] 17.11 Move the profile prompts into For you (cards when nothing matches, a dismissible pill row after), drop the upload card from Home, and keep the empty-town notice as one footer line
  - [x] 17.12 Redesign Home around three questions: welcome, Coming up (top three), What matters to you (home, work, elections with Added/Edit), Happening near you (with local meetings and bills), How Legible works; update cards with plain dates, why, and real actions; "Clear my information" with a confirm step in the profile sheet
  - [x] 17.13 Split Home and Explore: Home is the welcome, What matters to you, and For you; Explore (`#/explore`, Home · Explore tabs) holds every update, decided items, and How Legible works
  - [x] 17.14 Add three optional Duolingo-style questions after the town in first run (progress bar, Skip records nothing, Finish later) and a keep-on-device screen when anything was answered
  - [x] 17.15 Pace first run like language-app onboarding without copying its look: one welcome screen with the mission and a placeholder logo, one question per screen with a progress bar and percentage, the app's own buttons and option cards
  - [x] 17.16 Make the ballot page a ranked, filterable guide: plain line, official YES and NO side by side, Cost, and "If you …" per question
  - [x] 17.17 Replace the floating ChatDock with a contextual Ask sheet on ballot cards and measure pages, with checked starter questions per measure; rename Nine to Legible in the ask route and vote check
  - [x] 17.18 Bring back the floating ask button (scoped to the open page) and add Ask about this on any highlight, sending highlighted text only when it is official wording
  - [x] 17.19 Rework Home's For you into one list, dates coming up soon first, then decisions that could affect you (everything else is on Explore); cards read category and date, headline, explanation, why it matters (direct, potential, interest), "Why you're seeing this", and named actions (home-copy.ts, with tests); rename profile areas to Your housing situation, Your household, Your voting information, Your interests
  - [x] 17.20 Compact Home feed cards: header with subject, number, and status chip; short description without committee history; small "Why this may matter to you" box only when supported, grey line when an answer is missing; Explore proposal and Read original bill
    - _Requirements: 20.5, 20.9_
  - [x] 17.21 Progressive profiling: first run is three optional steps (town, home, subjects) with a light step indicator and "Show my Legible" / "Explore Legible"; name, school, getting around, work, and voting move to the profile sheet; civic item pages invite one missing detail in context (open fact, Add details, Not now as a skip). Remembered profiles skip first run; Skip undoes only that run's picks
  - [x] 17.22 Phone Coming up as snapping date cards sharing the ribbon's entries, selection, and panel; ribbon labels lean away from a busy neighbouring day; Ask Kiro hidden during first run and behind phone-width sheets (kept mounted), clear of safe areas; "Something else" on the home step writes no facts and every first-run step restores the pre-run profile (onboarding.ts, with tests)
  - [ ] 17.6 Add uploaded and sample documents to the feed in memory, tagged by town
    - _Requirements: 20.8_

- [ ] 20. Content pipeline (A)
  - [ ] 20.1 Move the analyze prompt, schema, and call into `src/lib/analyze`, shared by the route and the script
    - _Requirements: 23.2_
  - [ ] 20.2 Write `scripts/ingest.ts` and `npm run ingest`: download, hash, extract, analyze, verify, write `public/docs/<id>.json`, rebuild the catalog
    - _Requirements: 23.2, 23.3, 23.4, 23.5_
  - [ ] 20.3 Demo towns Cambridge and Newton: sources listed in `data/sources/ma.json`; save the Newton PDFs by hand, find a text source for Cambridge, then run ingest
    - _Requirements: 23.1_
  - [ ] 20.4 Review one ingested document by hand and record it in `data/reviews/`
    - _Requirements: 23.3_

- [x] 21. Original text for every feed item (each item carries its saved, fingerprinted original or it does not appear)
  - [x] 21.1 Ballot: page range and label of each question's full law in the booklet (build checks every page's heading), the official PDF served at /official/, per-question page text loaded on demand, "The full law, word for word" on the measure page and a "Full law" link on ballot cards
  - [x] 21.2 Fingerprints: SHA-256 and saved date on the ballot (source.hash, pagesHash, savedOn) and on every civic original; shown on the full law, in How do we know this?, and in Official text
  - [x] 21.3 Election dates: CivicItem.original (kind, label, verbatim text, saved file, official url, hash, savedOn) built from the booklet quote; "Official text" section on the item page (OriginalText)
  - [x] 21.4 Bills: npm run data:bills saves each bill from the Legislature API (full text, pinslip, history) to data/official/bills/ with its fetch date; build-civic fingerprints it, takes lastAction from the official history, warns when status may be stale, and publishes a reader copy; "Read the bill text" on the item page
  - [x] 21.5 Meetings: a posted agenda saved as data/official/agendas/<id>.pdf is fingerprinted and served; until then original is "none" with "No agenda posted yet". Checked Oct 24, 2026: neither Cambridge portal (IQM2 through Jul 2026, Granicus through Jan 2026) has Oct–Dec agendas. The build fails if any item has no original record
  - [x] 21.6 Every Home and Explore card carries an "Official text" line (OriginalLine) to its original; detail pages show it in full (OriginalText, FullText)
  - [x] 21.7 Bill explainers, pilot S.2836: `src/lib/explain` (ExplainerDraft → verifyExplainer → Explainer) checks every quote word for word against the saved bill text, labels its section, and requires "would/could" wording, banned-word-free lines, and searched "does not mention" sentences; `scripts/bills.content.ts` holds the S.2836 draft; the item page shows What it proposes, What would change, Who it could affect (direct effects apart from possible ones, inline question), and Where it stands (official history verbatim), with "Show the words" and How do we know this? shared with ballot questions (`Citation.tsx`)
  - [x] 21.8 Explainers for S.2581, H.4699, and H.1482; version notes tied to official history entries (S.2581 is the Senate text; the House passed a different version) and dates in the saved text flagged once passed
  - [x] 21.9 Generate explainer drafts from the saved text with a model: `npm run data:draft -- <bill>` (`scripts/draft-bill.ts`, prompt in `src/lib/explain/prompt.ts`, structured output with `EXPLAINER_DRAFT_SCHEMA`) writes `data/drafts/<bill>.json`; `verifyExplainer` prune mode drops failing lines and lists them; build-civic ships a model draft as ai_draft only where no hand-written explainer exists (`--prefer-drafts` previews them); the page labels it "AI draft, not yet reviewed by a person"
  - [x] 21.10 Support check: `src/lib/explain/support.ts` pairs every claim with its evidence (line and quote, "does not mention" sentence and searched words, version note and history entry); a separate model call judges each supported, partly, or unsupported. `npm run data:draft` stores the judgments in the draft and the build ships only supported claims (no judgments, no AI draft); `--check` re-checks a saved draft; `--hand` writes a second opinion on a hand-written explainer to `data/reviews/` (all four now 73 of 73 supported, after fixing lines that said more than their quote)

- [ ] 18. Reliability layer (A builds data and checks, B builds panels)
  - [ ] 18.1 Add `source.hash` and `pagesHash` to shipped and uploaded documents
    - _Requirements: 21.1_
  - [ ] 18.2 Build the TrustPanel per document
    - _Requirements: 21.4_
  - [x] 18.3 Build the ChainView opened from "How do we know this?" on each card (measure page: `ChainSheet` in `ForYou.tsx`)
    - _Requirements: 21.5_
  - [ ] 18.4 Verify chat answer citations and banned words in the browser before render
    - _Requirements: 21.3, 21.6, 22.3_
  - [x] 18.5 Rebuild MeasureView per design "Measure page": For you card with If YES / If NO / When / Based on rows, evidence in place under each sentence, trust summary
    - _Requirements: 21.5_
  - [ ] 18.6 Move the ballot lines in `PAGE_LINES` (`src/lib/engine/measure-page.ts`, tested now) into `Measure` fields (`outcomeLines`, `takesEffect`, `notAnswered`) so uploads can carry them, cited and linted by `npm run data:build`
    - _Requirements: 21.1_

- [ ] 19. Chat dock (B, using A's ask route)
  - [ ] 19.1 Build the ChatDock with document and measure scoping, suggested questions, and the "Sent" chip
    - _Requirements: 22.1, 22.2, 22.5_
  - [ ] 19.2 Wire the local how-to-vote check and the offline notice
    - _Requirements: 22.4, 22.6_

- [ ] 22. Visual direction "Notebook" (see the Visual direction section of `.kiro/steering/product.md`)
  - [x] 22.1 Tokens: Notebook palette (light and dark), Fraunces for editorial headlines, headline size, spacing roles, smaller radii, motion speeds and stagger, CSS press and hover utilities, `src/lib/motion.ts`
  - [x] 22.2 For you: featured decision (relevance emphasis only when supported), compact secondary decisions, Coming up as a time ribbon
  - [x] 22.3 Review desktop and phone screenshots before continuing
  - [x] 22.4 Expandable sections with Motion (`Reveal`): why you're seeing this, citations ("Show the words"), official summary, YES and NO text, the legislator draft. The bill page's "Show N more changes" waits for BillExplainer to be free
  - [x] 22.5 Route transitions (`ScreenIn`), profile save feedback (`SavedNote`, the For you dot pulse), the bill page as an annotated reader (the bill's words in a pane beside each line on wide screens, inline on phones), and one header (`SiteHeader`; placeholder links and accounts kept behind `SHOW_PLACEHOLDERS`)
  - [ ] 22.6 Next: the ballot question page as an annotated reader, Explore in the Notebook style, dark mode pass

- [ ] 23. Plant companion and Growth Story (the plant shows everywhere as a companion; growth tracking is development only: `GROWTH_TRACKING_ENABLED` in `src/components/plant/useGrowth.ts`)
  - [x] 23.1 The plant: `CivicPlant`, a layered SVG drawn from `design-references/civic-plant.png` with five stages (Seed, Sprout, Growing, Flourishing, Blooming); idle sway and blink, lean toward a nearby mouse (never on touch), soft squash on tap, leaves that unfold as the stage rises, a flower with a few sparkles at bloom, a still mode for small illustrations, and reduced motion applied instantly; dev preview at `/dev/plant` (404 in production)
  - [x] 23.2 One growth model: `src/lib/growth.ts` (stage definitions; growth from decisions explored and official sources opened only, never profile completion, interests, or personal answers; a browser-only history shape of aggregate totals plus the date each stage was reached) with tests; `useGrowth` is the single source every plant reads; development uses clearly labelled preview data with dev-only controls for an empty story and stages 1 to 5
  - [x] 23.3 The header avatar is the same plant at the same stage (`SiteHeader`)
  - [x] 23.4 Civic Profile: the plant replaces the person avatar and completion ring as the centrepiece; the saved name sits under it with inline Edit (no separate name card) or "Your civic journey" with an optional Add your name; compact totals tagged Preview data; completion as a small "Your profile details" line, calculated as before
  - [x] 23.5 Growth Story ("Your journey") inside the profile sheet: a timeline of reached stages with miniature plants, dates, and aggregate totals, then a faint look at the next stage or a closing note at bloom; a welcome when there is no history; a line on what grows the plant and a privacy note
  - [x] 23.6 For you hero: "Your corner of <town>." (the profile's town only; the person's name added while the line stays short) beside the plant (`HomePlant`), which leans toward a nearby mouse and opens the Growth Story on click or Enter, with "See your journey →"; checked at desktop, 320, 375, 390, and 430 px
  - [ ] 23.7 Real growth tracking: agree the data model first; then count decisions explored and official sources opened in the browser only (when Remember on this device is on), record dated milestones with `withTotals`, define what counts as "explored" and as an "official source", and confirm the stage thresholds (now 1, 3, 6, 9 decisions and 0, 1, 3, 5 sources)
  - [x] 23.8a The plant as a visual companion in production (header avatar, For you hero, Civic Profile layout) at one fixed look (`COMPANION_STAGE`), announced as "Your plant", with no stage names, totals, journey link, Growth Story, or preview data; the hero link opens Civic Profile. Growth tracking stays development only (`GROWTH_TRACKING_ENABLED` in `useGrowth.ts`)
  - [ ] 23.8 Turn growth tracking on in production after 23.7, and retire the ring layout and the old hero
  - [ ] 23.9 Decide the header avatar's "!" badge for unset interests (keep, soften to a dot, or remove)

- [ ] 24. Installable web app (see "Installable web app (PWA)" in `design.md`)
  - [x] 24.1 Manifest (`src/app/manifest.ts`), icons from the Legible mark (192, 512, maskable 512, Apple 180), theme colour from the Notebook tokens (`src/lib/theme-color.ts`), standalone display, `viewport` with `viewport-fit=cover` and `appleWebApp` metadata
    - _Requirements: 16.4_
  - [x] 24.2 Mobile pass at 375 and 390 px: no sideways scroll during slide-ins, safe areas for the onboarding footer and the citation sheet, 16 px Ask Kiro field on phones, larger tap area for the compact Details toggle; desktop unchanged
    - _Requirements: 16.1, 16.5, 16.7_
  - [x] 24.3 No service worker or caching; document what needs the internet and the limitations
    - _Requirements: 16.6_
  - [ ] 24.4 Device check before the election: install on an iPhone (Safari) and an Android phone (Chrome); check the icon, the standalone window, the status bar in light and dark, the home indicator gap, keyboard over Ask Kiro, and landscape
  - [ ] 24.5 Capacitor wrapper: waits for approval (see the Capacitor audit)

- [ ] 25. Your ballot, wrapped (development only: `WRAPPED_ENABLED` in `src/lib/wrapped/flag.ts`; spec in `.kiro/specs/ballot-wrapped/`, rebuilt from Layla's `f20bfe8`)
  - [x] 25.1 Six-slide story, share preview, For you invite, `#/wrapped`, `?demo=true`; tasks tracked in `.kiro/specs/ballot-wrapped/tasks.md`
  - [x] 25.2 Design approved after the second iteration (closing slide shows the real share image; town and topics opt-in)
  - [ ] 25.3 Turn `WRAPPED_ENABLED` on in production (not approved yet)

- [x] 26. Ballot questions first (personal impact as the main journey)
  - [x] 26.1 `ballotPicks` and `ballotReason` (`src/lib/engine/ballot-picks.ts`, tested): every ballot question ranked from buildCards with two tie-breaks, one shared reason per question, `nextPick`; no question pinned
  - [x] 26.2 For you: "Your ballot" as the main section (`BallotForYou`), featured and rows for put-forward questions, compact rows for the others, a link to the ballot guide; Coming up after it; "Also near you" without bills
  - [x] 26.3 Explore: proposed bills in their own "Proposed legislation" section
  - [x] 26.4 Measure page reordered: summary, 1 How could this affect you? (reason, Direct impact, Possible indirect impact, What's uncertain), 2 What would change?, 3 What happens if YES or NO wins?, 4 How do we know? (on demand), 5 Ask Kiro; Next and All your ballot questions at the end
  - [x] 26.5 `PAGE_LINES.indirect` and `PAGE_LINES.uncertain`, cited to the fiscal statements with marked words, checked by the PAGE_LINES tests; `impactFor`

- [ ] 12. Acceptance and demo
  - [ ] 12.1 Run lint, lint:words, tests, and build; fix failures
  - [ ] 12.2 Do a keyboard pass and a 375 px pass
    - _Requirements: 16.1, 16.2_
  - [ ] 12.3 Save screenshots of the three personas and the upload flow with one flagged item
  - [ ] 12.4 Rehearse the 90-second demo: onboarding, feed with touch counts, open a document, inline answer, because chip, persona switch, quote badge and chain view, chat question with citations, upload, offline change, how-to-vote refusal

- [ ]* 13. Stretch: YES and NO flip on two cards
  - _Requirements: 17.1_
- [ ]* 14. Stretch: one real town document, analyzed and checked by a team member, listed in the catalog
  - _Requirements: 18.1, 20.1_
- [ ]* 15. Stretch: sourced town statistic on Q7 and Q4, and a flat map of towns named in an upload
  - _Requirements: 19.1, 19.2_
