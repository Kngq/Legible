# Implementation Plan: Your Ballot, Wrapped

Development only behind `WRAPPED_ENABLED` until the visual design is approved. Built on branch `feature/ballot-wrapped` from main; Layla's `f20bfe8` is the source of the reused logic and tests.

- [ ] 1. Spec
  - [x] 1.1 Requirements, design, and tasks for the six-slide story
  - [ ] 1.2 Product owner approves the visual design (screenshots of all six slides)

- [x] 2. Pure logic (reused from `f20bfe8` where still correct)
  - [x] 2.1 `computeWrapped` and `topicMeasureCount` kept; `wrappedEntry` dropped (the story needs no topics)
    - _Requirements: W2.1, W2.2_
  - [x] 2.2 `buildStory`: six slide models with every visible string, fallbacks, status, links, verified sentences only
    - _Requirements: W1.1, W2.3-W2.7, W3.1-W3.4, W8_
  - [x] 2.3 `storyReducer` (reader-paced, no timer), tap, swipe, keys, focus trap
    - _Requirements: W6, W7.3_
  - [x] 2.4 `countUpValue` kept; `storyMotion`; constellation positions
    - _Requirements: W7.6_
  - [x] 2.5 Share content and layout: town and topics opt-in (both off by default), sensitive topics unchecked, never the name; `wrapText` and `withTimeout` kept
    - _Requirements: W5.2-W5.5_
  - [x] 2.6 Vocabulary: strings, sensitive topics, identity and side words; civic personalities and slide colours removed
    - _Requirements: W2.8, W3.2_
  - [x] 2.7 Demo persona and `?demo=true` on `useLegible`, with no storage calls
    - _Requirements: W9_

- [x] 3. Story UI
  - [x] 3.1 `StoryPlayer`: dialog, progress segments, tap and swipe zones, Next and Back, Escape, live region, focus trap and return, inert page, Ask Kiro hidden, scroll lock
    - _Requirements: W6, W7_
  - [x] 3.2 The six slide compositions in Notebook tokens
    - _Requirements: W1, W3.5_
  - [x] 3.3 Share preview and canvas image
    - _Requirements: W5_
  - [x] 3.4 `#/wrapped` route in `LegibleApp`, before and after first run
    - _Requirements: W6.5, W10.3_
  - [x] 3.5 For you module (`WrappedInvite`)
    - _Requirements: W10_

- [ ] 4. Verification (4.5 open)
  - [x] 4.1 Unit and property tests listed in design.md
    - _Requirements: W12.1_
  - [x] 4.2 `npm test`, `npm run lint`, `npm run lint:words`, TypeScript check
    - _Requirements: W12.2_
  - [x] 4.3 Browser pass at 320, 375, 390, tablet, desktop, light and dark, keyboard only; screenshots of all six slides
    - _Requirements: W12.3_
  - [x] 4.4 Production build checked: no invite, `#/wrapped` and `?demo=true` ignored
  - [ ] 4.5 Save image tested end to end on a real phone (download and the Files or Photos hand-off); the preview and drawing were checked in the browser, the download click was not

- [ ] 5. Later (needs approval or other work first)
  - [ ] 5.1 Turn `WRAPPED_ENABLED` on in production after sign-off
  - [ ] 5.2 Category C ("decisions you explored") once real exploration tracking lands (`.kiro/specs/legible/tasks.md` 23.7)
  - [ ] 5.3 Web Share with the image on phones that support files, as an alternative to download
  - [ ] 5.4 Town documents in the story once the catalog has them
