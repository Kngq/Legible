# Implementation Plan

Owner hints: A is content and logic, B is screens. Stretch tasks are marked optional and are cut first.

- [ ] 1. Foundations
  - [ ] 1.1 Add Vitest with an `npm test` script and a sample passing test
    - _Requirements: 7.3, 12.1_
  - [ ] 1.2 Create `src/lib/vocab` with directions, life facts (question text, avatar part), topics (label, avatar part, word list), and banned words
    - _Requirements: 3.5, 4.1, 4.2, 7.1_
  - [ ] 1.3 Write `npm run lint:words` to scan app strings, `src/data`, and `public/demo`, skipping verbatim quote fields
    - _Requirements: 7.3, 13.2, 15.3_
  - [ ] 1.4 Add the bundled list of 351 municipalities with aliases
    - _Requirements: 1.1_

- [ ] 2. Reviewed ballot data (A)
  - [ ] 2.1 Write a script converting `data/questions.json` into `src/data/ballot-2026.json` in the Document format
    - _Requirements: 2.1_
  - [ ] 2.2 Fill short titles, rules, why sentences with quote ids, ask facts, and topics using the draft rule table in design.md
    - _Requirements: 3.1, 6.3, 8.1_
  - [ ] 2.3 Check every quote against the official PDF and mark it reviewed
    - _Requirements: 2.2_
  - [ ] 2.4 Add data tests: every why sentence cites an existing quote; Question 9 YES says the law stays in place
    - _Requirements: 2.3, 8.1_

- [ ] 3. Personalization engine (A)
  - [ ] 3.1 Implement `buildCards` with relevance, direction, why, because, pending questions, and sort order
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 4.3, 6.1_
  - [ ] 3.2 Test the three personas, the empty profile, contradictory facts, and topics without facts
    - _Requirements: 3.6, 3.7, 9.1_

- [ ] 4. Visual system and shell (B)
  - [ ] 4.1 Define design tokens, fonts, type scale, easing, and reduced-motion handling
    - _Requirements: 16.3_
  - [ ] 4.2 Build the start screen with the town picker and continue-without-town
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 4.3 Build the ballot layout with header, card list, collapsed "Probably not you" group, and 375 px layout
    - _Requirements: 3.4, 16.1_

- [ ] 5. Cards (B)
  - [ ] 5.1 Build the card with labels, verbatim YES and NO, official link, and cached-quote fallback
    - _Requirements: 2.1, 2.3, 2.4, 3.3_
  - [ ] 5.2 Add the inline life-fact question and live re-sort with position animation
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
  - [ ] 8.3 Add "Remember on this device" with guarded storage and "Forget me"
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

- [ ] 12. Acceptance and demo
  - [ ] 12.1 Run lint, lint:words, tests, and build; fix failures
  - [ ] 12.2 Do a keyboard pass and a 375 px pass
    - _Requirements: 16.1, 16.2_
  - [ ] 12.3 Save screenshots of the three personas and the upload flow with one flagged item
  - [ ] 12.4 Rehearse the 90-second demo: town, inline answer, because chip, persona switch, quote badge, upload, offline change, how-to-vote refusal

- [ ]* 13. Stretch: YES and NO flip on two cards
  - _Requirements: 17.1_
- [ ]* 14. Stretch: one real town document, analyzed and checked by a team member
  - _Requirements: 18.1_
- [ ]* 15. Stretch: sourced town statistic on Q7 and Q4, and a flat map of towns named in an upload
  - _Requirements: 19.1, 19.2_
