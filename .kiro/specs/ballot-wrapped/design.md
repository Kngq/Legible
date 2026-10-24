# Design Document: Your Ballot, Wrapped

## Overview

An illustrated mini-magazine about the ballot, in six full-screen slides. Pure modules build every slide's content from `buildCards`; one client component plays it; one canvas function draws the share image. Nothing new is sent or stored.

What changed from Layla's eight-slide branch (`f20bfe8`), and why:

| Layla's branch | This design | Why |
| --- | --- | --- |
| 8 slides, 5 s auto-advance | 6 slides, reader-paced | Civic text needs reading time (W6.3) |
| Civic personality per top topic ("The Commuter Champion") | Removed | Assigns an identity from a topic (W3.2) |
| Topic colours from the full palette (plum on transit) | Neutral surfaces; plum only for supported relevance, apricot only for the date | Notebook colour roles (W3.5) |
| Hex values copied in `SLIDE_COLOUR_HEX` | CSS tokens; the canvas reads raw palette tokens | One source of colour |
| Share image always lists town, topics, personality | Preview first; town and topics opt-in; sensitive topics unchecked; never the name | W5 |
| Plum full-width button on home | Quiet editorial module | W10.1 |
| `NineApp`, `useNine`, "Nine" | `LegibleApp`, `useLegible`, "Legible" | Current shell |
| Overlay state only | `#/wrapped` hash route | Browser back closes it; opens before first run |

Kept from the branch: `computeWrapped` and its topic ranking, `topicMeasureCount`, the tap split, the count-up curve, text wrapping and the timeout for the share image, the canvas drawing approach, the demo persona and `?demo=true`, the fast-check generators, and the property tests that still apply.

## Architecture

```
src/lib/wrapped/flag.ts            WRAPPED_ENABLED (development only)
src/lib/engine/wrapped.ts          computeWrapped(doc, profile): one buildCards call -> summary
src/lib/engine/wrapped-slides.ts   buildStory(doc, summary, profile, towns) -> 6 SlideModels
src/lib/engine/wrapped-playback.ts storyReducer, tapAction, swipeAction, keyAction, trapFocusIndex
src/lib/engine/wrapped-layout.ts   countUpValue, storyMotion(reduce), constellation positions
src/lib/engine/wrapped-share-layout.ts shareContent(options) -> items; layoutShareImage; wrapText; withTimeout
src/lib/engine/demo.ts             isDemoQuery, demoPersona
src/lib/vocab/wrapped.ts           WRAPPED_STRINGS, SENSITIVE_TOPICS, IDENTITY_WORDS
src/components/wrapped/StoryPlayer.tsx   dialog, progress, tap zones, keys, focus trap, live region
src/components/wrapped/slides.tsx        the six slide compositions
src/components/wrapped/SharePreview.tsx  preview sheet: switches, the drawn PNG, Save image
src/components/wrapped/share-image.ts    canvas drawing and download (browser only)
src/components/wrapped/WrappedInvite.tsx For you module
src/components/wrapped/wrapped.module.css keyframes for paper, constellation drift, stat rise
```

The `lib` modules are pure TypeScript with no React or DOM, so they run in tests.

`LegibleApp` adds route kind `wrapped`. The page underneath is Home (or first run); the screen key and scroll handling treat `#/wrapped` as `#/`, so opening and closing the story never remounts or scrolls the page beneath it. Close: `history.back()` when this session pushed the entry, otherwise replace with `#/`. "Explore this decision" replaces `#/wrapped` with the measure route.

## Story model

`buildStory` returns six `SlideModel`s. Each has `id`, `heading`, `texts` (every visible string, for tests), and a typed body:

1. **opening**: heading "Your ballot, wrapped.", line "Big decisions. Your corner of Massachusetts.", hint "Tap to begin".
2. **world**: `place` ("Cambridge, MA" or "Massachusetts"), `placeKnown`, `questionCount` (`doc.measures.length`), `dateLabel` ("Decided Tuesday, November 3"), line "Let's see which ones connect to your world." Statewide ballot, so the count is the same for every town; no local claim is made.
3. **connects**: `mode` `personal` (cards with relevance `touches`, at most 3) or `general` (first three measures in ballot order). Each item: number, title, status, `reasons` (fact chips only), and one verified sentence (`why[0]` when verified).
4. **radar**: `mode` `followed` (topics with a ballot question, in `computeWrapped().topicRank` order, each with `topicMeasureCount`; followed topics without one in the `also` aside before the closing note; when none has one, all of them without counts and an intro that says so) or `examples` (distinct topics of the ballot's measures in ballot order, at most 6, captioned as examples).
5. **closer**: the decision: number, title, `status`, `basis` label, up to two verified sentences each with its source ("Attorney General's summary, page 12"), and the measure route.
6. **closing**: heading "A little more informed about your corner of the world.", the default share image itself (drawn by `renderShareImage` from `shareItems(storyShareBase(...), defaultShareChoices(...))`), the note "This is the image you can save. Your town and topics stay off unless you add them.", actions "Save my story" and "Explore decisions". The requested "Curiosity looks good on you" contains a banned word, so the image's line is "Curiosity suits you."

Status from `measure.kind` and `doc.decideBy`:

| kind | label | detail |
| --- | --- | --- |
| initiative | Proposed law | Not law today. Voters decide on November 3, 2026. |
| referendum | Law in effect | Already law. Voters decide on November 3, 2026 whether to keep it. |
| article, other | Proposed | `<who>` decide on `<date>`. |

## Visual direction

Notebook, made immersive. Each slide is a full-bleed composition on its own neutral or semantic surface. Variety comes from scale, layout, and illustration, not hue:

| Slide | Surface | Composition |
| --- | --- | --- |
| Opening | `surface-muted` | Oversized Fraunces headline over three layered paper sheets (surface, hairline, small rotation); a nine-box ballot sketch in line weight; "Tap to begin" with a soft pulse |
| Your world | `background` | Contour-line map motif with a pin (plum only when the town is known), the count rising to 9 in display type, the date on an apricot tint |
| What connects | `accent-soft` when personal; `background` otherwise | Stacked paper slips, one per decision, slight offsets; fact chips on `surface` |
| On your radar | `info-soft` (lilac: "on your list") | Topic labels in Fraunces at varied sizes around a centre, joined by hairline arcs to small dots, each with its pictogram; slow drift |
| One decision | `surface` | Magazine page: kicker, large Fraunces title, Source Serif sentences with citation, status stamp in ink outline |
| Shareable | `positive-soft` (cream paper) | A postcard of the share card, slightly rotated, over a second sheet; two actions |

Dark mode uses the same tokens, which already have dark values. On phones the story fills `100dvh` with safe-area padding. From 640 px it sits in a centred portrait frame (9:16, at most 880 px tall, radius-xl, card shadow) over a scrim of the page ink.

Motion: slide entry uses the existing `slide-next` and `slide-back` keyframes at 320 ms; items inside stagger by 50 ms; the count rises over 900 ms; constellation labels drift by 2-4 px over 6-9 s. `storyMotion(true)` sets every duration to 0 and the count to its final value; the CSS drift is turned off under `prefers-reduced-motion`.

## Share image

`shareContent({ place?, questionCount, dateLabel, topics })` returns the ordered items; the preview lists exactly these items, and `renderShareImage` draws exactly these items via `layoutShareImage`. The preview shows the PNG itself (an object URL of the same blob that Save downloads). 1080 by 1920; paper `--lilac-100`, ink `--purple-800`, a plum rule (raw palette tokens, so the image looks the same in both themes). Fraunces and Figtree are used when `document.fonts.check` says they are loaded, otherwise the system stacks. Drawing is wrapped in `withTimeout(…, 4000)`.

Switch defaults: "Show my town" off (offered only when the town is known); "Add topics I follow" off; when switched on, every followed topic is checked except `SENSITIVE_TOPICS` (gun_policy, cannabis_policy, criminal_justice).

## Navigation and focus

`storyReducer` holds `{ index, dir }` with `next`, `prev`, `goto`; it clamps at both ends. `tapAction(x, width)` gives prev under 30%. `swipeAction(dx, dy)` needs `|dx| > 48` and `|dx| > |dy|`. `keyAction(key, inField)` maps arrows (not inside a field) and Escape. Pointer handling ignores events whose target is inside `a, button, input, label, [data-story-ignore]`. `trapFocusIndex(i, n, shift)` cycles Tab within the dialog. The opener is remembered at open and focused after close if still connected.

## Demo mode

`useLegible` checks `WRAPPED_ENABLED && isDemoQuery(location.search)` once after mount. In demo mode it never touches `localStorage` (no read, no probe, no write, no remove), forces `remember` off, sets `onboardingDone`, and returns `demo: true`; `LegibleApp` shows an "Example profile" strip under the header and the story shows the same label.

## Testing

Pure modules carry the tests (`vitest`, `fast-check`, 100 runs each):

- `wrapped.test.ts` (Layla's properties 1-2 kept): the summary is a view of `buildCards`; topic rank.
- `wrapped-slides.test.ts`: six slides in order; counts equal ballot data; A/B separation; general fallbacks; verified sentences only; links; status; no banned, identity, or side words in any `texts` for any profile; personas and empty profile.
- `wrapped-playback.test.ts`: clamping, tap, swipe, keys, focus trap.
- `wrapped-layout.test.ts`: count-up monotonic; reduced motion is instant; constellation positions stay in bounds.
- `wrapped-share-layout.test.ts`: defaults, opt-in topics, sensitive topics unchecked, no fact text, lines only from content items, fits the canvas.
- `demo.test.ts`: the persona; with a fake `localStorage`, demo mode makes no storage calls.

Browser: 320, 375, 390, tablet, desktop; light and dark; keyboard-only pass; screenshots of all six slides.
