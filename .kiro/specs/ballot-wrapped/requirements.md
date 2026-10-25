# Requirements Document: Your Ballot, Wrapped

## Introduction

"Your ballot, wrapped" is a six-slide story about the 2026 Massachusetts ballot, told through the person's own profile: where they live, the facts they have shared, and the subjects they follow. It plays full screen like a phone story, at the reader's own pace, and ends with an image the person can choose to save.

It is an invitation to explore, not a recap of behaviour. It never says how to vote, never assigns a political identity, and never claims to know what the person has read. Everything it says about a decision comes from the existing engine (`buildCards`) and the existing verified sentences; it adds no relevance model and writes no new claims about any measure.

The idea and the pure logic come from Layla's branch (`origin/layla_branch`, commit `f20bfe8`, an eight-slide "Ballot, Wrapped"). This spec replaces that design: six slides, the Notebook colour roles, no civic personality, opt-in sharing, and the current Legible shell.

This feature is on in production since Oct 24, 2026 (`WRAPPED_ENABLED`, Requirement W11). On Oct 24, 2026 it was renamed **Ballot stories** in the interface and moved from the bottom of For you to a featured section near the top of Explore, with a quiet link on For you (W10, W13). "Wrapped" survives only on the share image.

Out of scope for this build: what the person has explored or read (category C below); comparisons with other people; achievements, streaks, or scores; auto-advancing slides; uploading or hosting the share image; social network integrations; town documents other than the bundled ballot.

## Glossary

- **Story (Ballot stories):** the six-story player, with progress segments, opened from Explore, the For you link, `#/stories`, `#/explore/stories`, or the old `#/wrapped`.
- **Slide:** one full-screen page of the story with one idea.
- **May affect you (category A):** measures whose rules fire on the person's answered life facts (`relevance === "touches"`). Comes only from facts.
- **On your radar (category B):** topics the person picked. Comes only from topics.
- **Explored (category C):** decisions the person has opened or read. Not tracked yet (see `.kiro/specs/legible/tasks.md` 23.7); the story SHALL NOT use or imply it.
- **Verified sentence:** a `WhySentence` whose `quoteId` names a quote in `measure.quotes` whose status is not `failed`.
- **Share image:** a PNG drawn on the device from the share preview's content.
- **Demo mode:** the app loaded with `?demo=true`: a fixed example profile, labelled, with storage untouched.

## Requirements

### Requirement W1: User goals

**User Story:** As a resident with ten minutes, I want a short, beautiful story about my ballot, so that I see how these decisions reach my world and want to read further.

#### Acceptance Criteria

1. THE SYSTEM SHALL tell the story in exactly six slides, in this order: Opening, Your world, What connects to you, On your radar, One decision to explore, Your shareable moment.
2. THE SYSTEM SHALL give each slide one idea and at most one primary action.
3. THE SYSTEM SHALL end the story with ways to keep exploring (the chosen decision, Explore, the topics editor) and never with a score.
4. THE SYSTEM SHALL open the story without onboarding: an empty profile, a profile with a town only, or a profile with topics only all produce a complete story.

### Requirement W2: Story generation rules

**User Story:** As a voter, I want every number and sentence in the story to be true of the ballot, so that I can trust a playful format.

#### Acceptance Criteria

1. THE SYSTEM SHALL build every slide from one call to `buildCards` for the ballot and the person's profile, in a pure function with no clock, storage, or network.
2. THE SYSTEM SHALL show only counts taken from the ballot data: the number of measures, the number of measures that may affect the person, the number of followed topics, and per topic the number of measures that list it.
3. THE SYSTEM SHALL show at most three decisions on "What connects to you", taken from the cards with relevance `touches`, in engine order.
4. THE SYSTEM SHALL choose the decision on "One decision to explore" as the first card in engine order (touches, then on your list, then applies to everyone, then the rest; ballot order within each), and SHALL label why it was chosen: "Connected to your answers", "On your list", or "First on the ballot".
5. THE SYSTEM SHALL show a sentence about a decision only if it is a verified sentence, and SHALL show at most two. IF no verified sentence exists THEN THE SYSTEM SHALL show the plain-English title and a link to the decision, and no summary.
6. THE SYSTEM SHALL state each decision's status from its kind: an initiative is "Proposed law", not yet law; a referendum is "Law in effect" that voters decide whether to keep; with the decision date from the document.
7. THE SYSTEM SHALL link each decision to its existing measure page (`#/measure/<docId>/<measureId>`).
8. THE SYSTEM SHALL NOT use any banned word (should, recommend, good, bad, support, oppose) in story copy, and SHALL NOT use vote, yes, no, for, against, pro, or anti in any label about the person.

### Requirement W3: Personalization boundaries

**User Story:** As a person who shared a few facts, I want the story to say only what those facts support, so that it never guesses about me.

#### Acceptance Criteria

1. THE SYSTEM SHALL keep categories A and B apart: "What connects to you" SHALL use life facts only, and its reasons SHALL be fact chips ("Because you rent"); "On your radar" SHALL use followed topics only.
2. THE SYSTEM SHALL NOT present a topic as something the person agrees with, and SHALL NOT name the person with a label derived from topics or facts (no "civic personality", no "Housing Advocate").
3. IF no measure may affect the person THEN THE SYSTEM SHALL title slide 3 "Decisions worth knowing about", show three questions in ballot order, and say that they are in ballot order, not chosen for the person.
4. THE SYSTEM SHALL place only followed topics that have a ballot question in the "On your radar" constellation; followed topics without one SHALL appear in a quiet aside ("Also on your radar, without a question on this ballot"), never as the slide's last line. IF no followed topic has a ballot question THEN THE SYSTEM SHALL say so once in the intro and show the topics without counts.
5. IF the person follows no topics THEN THE SYSTEM SHALL title slide 4 "There's a lot to explore.", show subjects from this ballot labelled as examples, and offer to choose topics after the story.
6. THE SYSTEM SHALL use the plum accent only for what relates to the person and is supported by the data (a known town, a decision that may affect them); apricot only for the decision date; and neither terracotta nor any colour for a topic, a side, a direction, YES, or NO.
7. THE SYSTEM SHALL NOT use or imply category C: no "you read", "you explored", "your year", or totals of activity.

### Requirement W4: Privacy

**User Story:** As a resident, I want the story to stay on my device, so that playing it reveals nothing.

#### Acceptance Criteria

1. THE SYSTEM SHALL compute the story and draw the share image in the browser, and SHALL make no network request with profile data or the image.
2. THE SYSTEM SHALL put no town, fact, or topic in the URL; `#/wrapped` carries nothing else.
3. THE SYSTEM SHALL NOT write the story, its slide position, or share choices to storage.

### Requirement W5: Sharing

**User Story:** As a person who enjoyed the story, I want to save a picture of it, and I want to decide exactly what it shows.

#### Acceptance Criteria

1. WHEN the person chooses "Save my story" THE SYSTEM SHALL open a share preview showing the exact image that will be saved, drawn by the same code that saves it, and a plain list of what it contains.
2. THE SYSTEM SHALL include by default only: the Legible name, "My ballot, wrapped", the year, the number of ballot questions, the decision date, and a neutral closing line.
3. THE SYSTEM SHALL leave the town out by default and include it as "Town, MA" only after the person switches "Show my town" on (offered only when the town is known).
4. THE SYSTEM SHALL leave followed topics out by default, include them only after the person switches "Add topics I follow" on, and then preselect only topics that are not sensitive (gun policy, cannabis policy, criminal justice stay unchecked until picked).
5. THE SYSTEM SHALL NEVER include life facts, the person's name, decisions that may affect the person, voting plans, party, or any inferred belief in the share image.
6. THE SYSTEM SHALL show the default share image itself, drawn by the same code that saves it, on the closing slide, so the person sees what they would share; the closing slide SHALL NOT show the town, topics, name, or life facts.
7. THE SYSTEM SHALL compose the share image as a balanced poster: the title with the Legible rule, the question count beside a ballot sketch of numbered boxes, the decision date, any opted-in topics as pills, and, resting on the bottom margin, the closing line and an invitation to read the questions on Legible.
8. WHEN the person chooses "Save image" THE SYSTEM SHALL save the PNG through a download on the device. IF drawing fails or takes longer than 4 seconds THEN THE SYSTEM SHALL say so in place and keep the story open.

### Requirement W6: Story navigation

**User Story:** As a phone user, I want the story to move like the stories I know, at my own pace.

#### Acceptance Criteria

1. THE SYSTEM SHALL show one thin progress segment per slide at the top, and "Ballot stories · N of 6" in words beside them; segments before the current slide are full, the current one fills, later ones are empty.
2. THE SYSTEM SHALL advance only when the person asks. Labelled "Previous" and "Next" buttons are always visible and are the primary way to move; on the last story "Next" becomes "Done", which closes. Tap on the right 70% or swipe left also goes forward; tap on the left 30% or swipe right goes back; nothing requires a tap zone or a swipe.
3. THE SYSTEM SHALL NOT auto-advance, so no information disappears before it is read.
4. THE SYSTEM SHALL ignore taps and swipes that start on a button, link, or form control.
5. THE SYSTEM SHALL close the story with a labelled "Close" button, with Escape, with "Done", with a click on the scrim around the frame on wide screens, and with the browser back button, and SHALL return to the page that opened it (For you or Explore).
7. WHEN the person leaves a story for a question page THE SYSTEM SHALL keep the story on its own history entry with the story it was on, label the question page's back button "Back to stories" in words, and reopen that same story on back.
6. WHEN the person is on the last slide THE SYSTEM SHALL keep forward taps on that slide.

### Requirement W7: Accessibility

**User Story:** As a keyboard or screen reader user, I want the story to be as usable as the rest of Legible.

#### Acceptance Criteria

1. THE SYSTEM SHALL render the story as a modal dialog with an accessible name, make the page behind it inert, trap focus inside it, and hide the Ask Kiro launcher while it is open.
2. WHEN the story closes THE SYSTEM SHALL return focus to the control that opened it, when that control is still on the page.
3. THE SYSTEM SHALL support ArrowRight and ArrowLeft for next and back (except inside a form control) and Escape to close (closing the share preview first when it is open).
4. THE SYSTEM SHALL announce "Story N of 6. <heading>" in a polite live region on every change.
5. THE SYSTEM SHALL give every control an accessible label, describe the navigation keys to assistive technology, show "Tap Next to begin, or swipe" on touch screens and "Press Next or the → key to begin" with a mouse, keep captions at 13 px or larger, keep tap targets at least 44 px, and keep text at WCAG AA contrast in light and dark themes.
6. WHILE the person prefers reduced motion THE SYSTEM SHALL change slides, show counts, and place the topic constellation instantly, with no floating or drifting.

### Requirement W8: Empty and partial states

**User Story:** As a person who skipped every question, I want a story that is honest about that, not one that pretends to know me.

#### Acceptance Criteria

1. WHEN the profile is empty THE SYSTEM SHALL show "Massachusetts", the ballot-order selection on slide 3, the example subjects on slide 4, and the first ballot question on slide 5 labelled "First on the ballot".
2. WHEN only the town is known THE SYSTEM SHALL show it on slides 2 and 6 and SHALL NOT claim that any decision is local to it.
3. WHEN only topics are known THE SYSTEM SHALL show them on slide 4 and SHALL keep slide 3 in its ballot-order form.
4. WHEN a town id is not in the town list THE SYSTEM SHALL fall back to "Massachusetts".

### Requirement W9: Demo mode

**User Story:** As a presenter, I want a full example story without touching anyone's saved profile.

#### Acceptance Criteria

1. WHEN the app loads with `?demo=true` THE SYSTEM SHALL use a fixed example profile (a Cambridge renter who rides transit and follows housing costs and roads and transit), skip first run, and show an "Example profile" label on the page and in the story.
2. WHILE in demo mode THE SYSTEM SHALL NOT read, write, or remove any storage key, SHALL keep "Remember on this device" off and unavailable, and "Clear my information" SHALL reset memory only.
3. THE SYSTEM SHALL honour `?demo=true` only where Wrapped is enabled.

### Requirement W10: Entry points

**User Story:** As a person who doesn't know where to start, I want to find the stories where I go to discover things, and understand what they are before I open them, without them crowding my personal decisions.

#### Acceptance Criteria

1. THE SYSTEM SHALL feature the stories on Explore, after the page header and before the list of updates: kicker "A gentle place to start", heading "Your ballot, in stories", "Explore six short, visual stories about the decisions shaping your community.", the facts "6 short stories · Move at your own pace · From the official voter guide", the primary action "Explore ballot stories →", and a small drawing of fanned story frames (decorative). It SHALL use the page's own surfaces and button, not a promotional banner.
2. THE SYSTEM SHALL NOT show the former "See your ballot, wrapped" module on For you. For you SHALL offer only a text link, "New to these questions? Explore ballot stories →", directly under the featured decision when that decision is the ballot or one of its questions, and otherwise at the end of "Decisions for you".
3. THE SYSTEM SHALL NOT add a navigation tab, and SHALL NOT move or cover Coming up, the decisions, or the Ask Kiro launcher.
4. THE SYSTEM SHALL play the stories over the page that opened them: `#/explore/stories` over Explore, `#/stories` over For you. `#/wrapped` SHALL still open them, over For you. Each works before or after first run.

### Requirement W11: Delivery

**User Story:** As the product owner, I want to approve the design before anyone sees it in production.

#### Acceptance Criteria

1. THE SYSTEM SHALL enable Wrapped, its entry point, `#/wrapped`, and demo mode through one flag (`WRAPPED_ENABLED`). It was development only until Oct 24, 2026 and is now on in production.

### Requirement W12: Testing and acceptance

**User Story:** As the team, we want the rules above checked by tests, not by memory.

#### Acceptance Criteria

1. THE SYSTEM SHALL have unit and property tests (fast-check) for: complete and empty profiles; the A/B separation; ballot counts; no identity labels and no banned or side-taking words in any slide text for any profile; verified sentences only; decision links; status labels; demo isolation (no storage calls); share preview content equal to the drawn content; topics opt-in and sensitive topics unchecked; reduced-motion values; keyboard, tap, and swipe mapping; focus-trap order.
2. THE SYSTEM SHALL pass `npm test`, `npm run lint`, `npm run lint:words`, and a TypeScript check.
3. THE SYSTEM SHALL be checked in the browser at 320, 375, and 390 px, tablet, and desktop, with screenshots of all six slides, before sign-off.

### Requirement W13: Official sources in the story

**User Story:** As a reader, I want to tell the official words from Legible's framing, and reach the source in one step.

#### Acceptance Criteria

1. THE SYSTEM SHALL head the closer story's cited sentences "What the official text says", each with its locator and page.
2. WHEN the data names an official page for the question THE SYSTEM SHALL link "Read the official voter guide page ↗" on the closer story, opening in a new tab so the story stays open.
