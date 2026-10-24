# Feature Specification (as built)

This document specifies every feature Legible has today, in EARS form, as the code behaves on `main` (October 24, 2026). It is written from the source, not from the plan.

How it relates to the other spec files:

- `requirements.md` is the original plan. Some of it was built differently (the first run has three steps, not a ZIP code and five areas), some was replaced (the avatar became the plant companion), and some is not built (uploads, personas, the privacy panel). Each feature below lists the planned requirements it traces to.
- `design.md` explains how things work. `tasks.md` tracks the work.
- `.kiro/specs/ballot-wrapped/` is the full spec for Your ballot, wrapped. F13 summarizes it.
- `docs/USER_JOURNEY.md` is the plain-language tour of the same features.

**Status** is one of: **Production** (on in production), **Development only** (behind a flag that is on only when `NODE_ENV` is `development`), or **Planned** (in the plan, not built).

When a change alters a feature, update its section here in the same commit.

## Contents

- F1 Navigation and app shell
- F2 First run
- F3 Civic Profile
- F4 Personalization engine
- F5 For you (home)
- F6 Coming up
- F7 Explore
- F8 Ballot guide
- F9 Ballot question page
- F10 Civic items and bill pages
- F11 Trust, verification, and the content pipeline
- F12 Ask Kiro
- F13 Your ballot, wrapped
- F14 Plant companion and Growth Story
- F15 Privacy
- F16 Devices, access, and the installable app
- F17 Neutral language
- Known gaps
- Planned, not built

## Glossary

- **Life fact:** an answer about the person (`FACT_IDS` in `src/lib/vocab/index.ts`), such as `rents` or `owns_firearm`. Facts decide "Touches you".
- **Topic:** a subject the person follows (14 fixed topics). Topics decide "On your list".
- **Sensitive fact:** `owns_firearm`, `buys_cannabis`, or `public_defender_contact`. Asked only on a page that depends on it.
- **Settled fact:** a fact that is answered, or declined (skipped twice, or "Prefer not to say").
- **Card:** the engine's per-measure result from `buildCards`: relevance, direction, why sentences, whether it is on the person's list, and pending questions.
- **Civic item:** a deadline, voting window, election, meeting, or bill (`src/data/civic-ma.json`).
- **Verified sentence:** a sentence Legible wrote, citing a quote that was found word for word in the official text.

---

## F1 Navigation and app shell

**Status:** Production. **Code:** `src/components/LegibleApp.tsx`, `src/lib/nav/route.ts`, `src/components/SiteHeader.tsx`. **Tests:** `src/lib/nav/route.test.ts`.

**User Story:** As a resident, I want every screen to have a link and the back button to work, so that I can move around and share a page.

#### Acceptance Criteria

1. THE SYSTEM SHALL route by URL hash: `#/` For you, `#/explore` Explore, `#/doc/<docId>` ballot guide, `#/measure/<docId>/<measureId>` ballot question page, `#/item/<itemId>` civic item or bill page, and `#/wrapped` (F13). Any other hash SHALL show For you.
2. IF a `doc` or `measure` route names a document or measure that is not in the person's feed THEN THE SYSTEM SHALL show For you. A civic item SHALL open even when it belongs to another town, because items are public.
3. Routes SHALL carry only public ids, never the town, a fact, or a topic.
4. WHEN the person moves within the app THE SYSTEM SHALL push a history entry. The in-page Back button SHALL go back in history when this session pushed the entry, and otherwise SHALL replace the URL with the parent screen (a question page goes to its guide, everything else to For you).
5. THE SYSTEM SHALL open a new screen at the top and SHALL restore the previous scroll position when the browser goes back.
6. THE SYSTEM SHALL render nothing until browser storage has been read, and SHALL show only the first run (F2) until onboarding is done, whatever the hash.
7. THE SYSTEM SHALL show a sticky header with:
   - the Legible mark, which opens a menu with "Who we are" and "Our mission" (closes on Escape or an outside click);
   - two tabs, "For you" and "Explore", with `aria-current="page"` on the active one. Tapping the active tab scrolls to the top. Detail pages have no active tab;
   - the avatar ("Your profile"), which shows the plant (F14) and always opens the Civic Profile overview. A "!" badge SHALL show while no topics are set and topics were never confirmed.
8. THE SYSTEM SHALL keep the "Login" and "Sign up" header buttons hidden (`SHOW_ACCOUNT_BUTTONS = false`). There are no accounts (see `docs/accounts-review.md`).
9. On the first-run start screen the header SHALL show only the brand menu.

## F2 First run

**Status:** Production. **Code:** `src/components/FirstRun.tsx`, `src/lib/engine/onboarding.ts`, `src/components/profile-steps.tsx`, `src/data/towns.json`. **Tests:** `onboarding.test.ts`, `profile.test.ts`. **Traces to:** 1.1 to 1.6 (built differently, see below).

**User Story:** As a resident with ten minutes, I want to tell Legible a little about myself in under a minute, or nothing at all, so that what I see is sorted for me.

#### Acceptance Criteria

1. THE SYSTEM SHALL open with a start screen ("Legible", the mission line, "Get started"), then a welcome screen ("See what's being decided near you") that says there are 3 short steps, every step is optional, and answers stay in this browser.
2. THE SYSTEM SHALL offer "Just show me everything" on the welcome screen, which ends the first run at once and records nothing.
3. THE SYSTEM SHALL ask three questions, one per screen, with Back, step dots, "N of 3", and Skip:
   1. **Where do you live?** A town picker. Continue SHALL stay disabled until a town is picked. A note SHALL say that without a town the person sees statewide decisions.
   2. **Which best describes your home?** One choice, which can be tapped again to clear: "I rent", "I own my home", "I live with family", "Something else".
   3. **What matters to you?** The 14 topic chips, with no typed field. Continue is always enabled.
4. THE SYSTEM SHALL map the home answer to facts: "I rent" sets rents yes and owns no; "I own my home" sets owns yes and rents no; "I live with family" sets lives_with_family yes; "Something else" writes nothing. Changing the choice SHALL restore the state from before the run first, so nothing stale is left.
5. WHEN the person presses Skip THE SYSTEM SHALL undo only what this run changed in that step, and SHALL NOT record a "no" or a skip count.
6. THE SYSTEM SHALL record topics as confirmed only when Continue is pressed with at least one topic selected.
7. THE SYSTEM SHALL label the last button "Show my Legible →" if the run collected anything, and "Explore Legible →" otherwise.
8. IF the run collected anything, storage works, and Remember is off THEN THE SYSTEM SHALL ask "Keep your answers on this device?" with "Keep on this device" (turns Remember on) and "Not now" (keeps the answers for this session only).
9. The town picker SHALL search all 351 Massachusetts municipalities and their aliases (for example Boston's neighborhoods) from 2 characters, case-insensitive prefix match on the name then the aliases, at most 6 results, each showing "{Alias} is in {Town}" or "{County} County". It SHALL show "✓ {Name}, {County} County" once picked and "No Massachusetts city or town starts with that." when nothing matches. Typing again SHALL clear the pick.
10. THE SYSTEM SHALL NOT ask for a name, email, password, account, or any sensitive fact during the first run.
11. WHEN Remember is on and a profile is saved THE SYSTEM SHALL skip the first run on the next visit.

Differences from the plan: no ZIP code lookup (1.1); three steps instead of town plus three life areas with a percentage bar (1.4); work and voting are asked later, in context (F3).

## F3 Civic Profile

**Status:** Production. **Code:** `src/components/ProfileSheet.tsx`, `src/components/profile-steps.tsx`, `src/components/plant/PlantCompanion.tsx`, `src/lib/engine/profile.ts`, `src/lib/engine/personalization.ts`, `src/components/useLegible.ts`. **Tests:** `profile.test.ts`, `personalization.test.ts`. **Traces to:** 1.6 to 1.9, 3.1, 3.5, 4.1, 4.2, 6.1, 6.2, 10.4, 10.5.

**User Story:** As a resident, I want to add, change, or remove what Legible knows about me at any time, and to know it stays on my device, so that I am in control.

#### Acceptance Criteria

1. THE SYSTEM SHALL open "Your profile" as a bottom-sheet dialog that closes with Escape, the backdrop, or the close button. Every editor SHALL have "Back to your profile".
2. THE SYSTEM SHALL show an overview with the plant and the person's optional name (F14), a completion line, an interests card, a checklist, and "Your information".
3. THE SYSTEM SHALL count completion over 7 equal items: the town, the five life areas (housing, household, work, getting around, voting), and topics. An area SHALL count as done when every fact in it is settled; topics SHALL count when confirmed or when any topic is on. Sensitive facts and the Remember setting SHALL NOT count. The line SHALL read "{done} of {total} details added, all optional." or "All details added."
4. Before anything is saved and while an item is open, THE SYSTEM SHALL show "Make Legible yours." with "Add details →", which opens the first open item. After a save it SHALL confirm the save and name the next open item.
5. THE SYSTEM SHALL let the person set an optional first name or nickname, at most 40 characters, stored only in the browser and used only to greet them on their own screens.
6. Each life-area editor SHALL list the area's facts as first-person statements ("I rent my home") plus "None of these", with:
   - **Save** (disabled until something is picked): picked facts become yes, the rest no;
   - **Prefer not to say**: removes the answers and settles the area for good, so it is never asked again, and counts it as done;
   - **Not now**: leaves without saving.
7. The town and topics editors SHALL work on a draft and save only on "Save" / "Save interests". The topics editor SHALL also accept a typed subject, matched to a fixed topic in the browser ("Add {Label}"); the typed text SHALL NOT be kept or sent.
8. THE SYSTEM SHALL open the matching editor directly from: "Add your location" and "Edit profile" on For you; "Add details" on decision rows, featured cards, and Coming up; a "Because …" chip (that fact's area, or an inline editor for a fact outside any area); and a "You follow …" chip (topics).
9. On a page that depends on an unanswered fact, THE SYSTEM SHALL ask that one fact in place, at most once more after a skip, with Yes, No, "Skip for now" (counts one skip), and "Prefer not to say" (settles it). A fact that is answered or settled SHALL NOT be asked again. Sensitive facts SHALL be asked only this way, with "Asked only here, because this decision depends on it. Your answer stays in this browser."
10. WHEN the person changes an answer from a chip THE SYSTEM SHALL offer Yes, No, and "Remove this answer", and SHALL re-sort everything right away.
11. THE SYSTEM SHALL keep the profile in memory only unless Remember is on. With Remember on it SHALL write one key, `legible.profile.v1` (moving an old `nine.profile.v1` once). IF storage is unavailable THEN THE SYSTEM SHALL keep working in memory and SHALL NOT offer Remember.
12. THE SYSTEM SHALL offer "Keep this on this device?" in the profile when storage works, Remember is off, something beyond the town was saved this session, and the person has not chosen "Not now" this session.
13. WHEN the person chooses "Clear my information" and confirms ("Clear your information? … This cannot be undone.") THE SYSTEM SHALL delete both storage keys, reset the profile and preferences, turn Remember off, and return to the first run.

## F4 Personalization engine

**Status:** Production. **Code:** `src/lib/engine/` (`cards.ts`, `ballot-picks.ts`, `ballot-guide.ts`, `timeline.ts`, `feed.ts`, `civic.ts`, `home-copy.ts`, `update-copy.ts`, `measure-page.ts`, `next-steps.ts`, `related.ts`). **Tests:** one test file per module under `src/lib/engine/`. **Traces to:** 3.2 to 3.7, 4.3, 4.4, 6.3, 7.1, 7.2, 20.4.

**User Story:** As a resident, I want Legible to sort decisions by where they meet my life, using only what I told it, and to show me why.

#### Acceptance Criteria

1. THE SYSTEM SHALL compute all personalization in the browser with pure functions (no React, no network, no model). Changing an answer SHALL re-sort every screen with no network request.
2. For each measure `buildCards` SHALL:
   - mark it **touches** WHEN any of its rules matches a life fact, take the direction from the first matching rule, and show up to two distinct why sentences from the matching rules;
   - otherwise mark it **everyone** if it applies to everyone, else **probably not** with direction `none`, and show up to two overview sentences;
   - mark it **on your list** WHEN any of its topics is followed;
   - list its unanswered `askFacts` as pending questions.
3. THE SYSTEM SHALL sort cards: touches, then on your list, then everyone, then probably not, with ties in document order.
4. Life facts SHALL decide "Touches you" and topics SHALL decide "On your list". One SHALL never stand in for the other.
5. THE SYSTEM SHALL describe impact with exactly five directions, each with a pictogram: "Expands what you can do", "Restricts what you can do", "Changes a rule you live under", "Changes who decides", "No direct change for you", with the legend "Legible can only say one of these five things about a measure."
6. **Ballot picks:** THE SYSTEM SHALL give each ballot question one reason and the same words on every screen: "Touches you" (Because …), "On your list" (Because …), "May apply to you" (Applies if …), "Applies to every voter", or "Not matched to your answers". Questions that touch the person or are on their list SHALL be put forward, sorted direct first, then on your list, then more matching facts, then ballot order; the rest SHALL follow in ballot order. No question SHALL be pinned.
7. **Timeline:** THE SYSTEM SHALL rank For you entries by `score = 0.65 × relevance + 0.35 × urgency`, where relevance is touches 1 (plus 0.05 per extra match, up to 1.2), on your list 0.6, might apply 0.45, everyone 0.35, other 0.15, and urgency is `1 / (1 + days / 7)` to the deadline or the end of an open window (0.1 if undated). A ballot SHALL be folded into the election on its date.
8. **Civic items:** an item SHALL touch the person WHEN a fact matches one of its rules (for example the registration deadline matches "not registered at your address"). Past items SHALL be dropped. Items SHALL sort by relevance, then timing (today, open, upcoming, undated), then date.
9. **Feed:** THE SYSTEM SHALL keep state documents plus documents for the person's town, mark a document decided once its decide-by date has passed, and list open questions only for facts that are not settled.
10. **Related decisions:** THE SYSTEM SHALL score a shared fact 2 and a shared topic 1, and show at most 3.
11. IF the person answered nothing THEN THE SYSTEM SHALL show every ballot question in ballot order and say that nothing in their answers points to a question yet.

## F5 For you (home)

**Status:** Production. **Code:** `src/components/Home.tsx`, `BallotForYou.tsx`, `BriefCard.tsx`, `OriginalText.tsx`, `CursorCta.tsx`. **Tests:** `home-copy.test.ts`, `ballot-picks.test.ts`, `timeline.test.ts`. **Traces to:** 20.3 to 20.6, 20.10.

**User Story:** As a resident, I want my home page to lead with my ballot, sorted for me, and then what is coming up, so that I know what to read first.

#### Acceptance Criteria

1. THE SYSTEM SHALL title the page "Your corner of {town}." ("the world" without a town), adding the person's name only when the line stays at most 32 characters, with "Understand what's happening around you, one decision at a time." and the plant (F14).
2. THE SYSTEM SHALL show a profile line: the town (or an "Add your location" button), the housing label when known, and "Edit profile →". It SHALL never invent a town.
3. THE SYSTEM SHALL show, in order: **Your ballot**, **Coming up** (F6), **Also near you**, the Wrapped invite (development only, F13), and "Explore everything happening near you".
4. **Your ballot** SHALL show "{N} questions · Voters decide {date}" and either "{k} of {N} connect to your Civic Profile, closest to your life first." or "Nothing in your Civic Profile points to a question yet, so here are all {N} in ballot order." It SHALL show the first put-forward question as the featured decision, the other put-forward questions as rows, then "The other {n} questions" as compact rows with their reason, then "Compare all {N} side by side in the ballot guide".
5. The featured decision SHALL be the one raised surface on the page: meta "Ballot question {n} · {official title}", "Voters decide {date}", the headline, a short "what", the relevance note when supported, "See how it could affect you", and "Read official text".
6. Each row SHALL stretch its headline over the row and show "{label}: {reason}" with a compact "Details" toggle that names the exact answers behind it, one line on the kind of connection ("Directly related to your situation.", "A possible connection, not a certain effect.", "Matches a subject you follow; nothing says it changes your situation.", "Depends on something you haven't told Legible yet."), and "Update your profile".
7. THE SYSTEM SHALL use the plum accent for a relevance note only when the person's answers support it, and lilac for "On your list".
8. **Also near you** SHALL show other decisions that relate to the person (meetings, the election), not bills and not the ballot. It SHALL say how many proposed bills relate to the person's answers, with a link to Explore, and SHALL be left out when empty.
9. Every card SHALL carry an "Official text" line naming its saved original ("found word for word" or "saved copy").
10. On a mouse device THE SYSTEM SHALL show a decorative "Read more" capsule that follows the pointer over a card. It SHALL be hidden from assistive technology, off on touch screens, and reduced to a fade under reduced motion.

## F6 Coming up

**Status:** Production. **Code:** `src/components/ComingUp.tsx`. **Traces to:** 20.3, 20.10.

**User Story:** As a voter, I want to see the dates between now and Election Day, so that I do not miss a deadline.

#### Acceptance Criteria

1. THE SYSTEM SHALL show "Coming up" with "Dates from official sources", and SHALL leave the section out when nothing is dated.
2. At 640 px and wider THE SYSTEM SHALL draw a ribbon with one column per day from today to the last date: today marked (and announced "(today)"), a square pin for an election, an apricot pin for other dates, and a band for an open window. Pins SHALL be toggle buttons labelled "{headline}, {date}, {when}".
3. Below 640 px THE SYSTEM SHALL show swipeable date cards that snap, scroll to the selected card on load, and scroll a focused card into view (instantly under reduced motion).
4. THE SYSTEM SHALL select the first urgent date, else the first dated one, and SHALL show its panel in a polite live region: status, headline, relevance line ("Add details" when a fact is missing), and one primary action.
5. THE SYSTEM SHALL state time as a fact ("In 3 days", "Tomorrow", "Today", "Last day") and SHALL NOT phrase it as pressure.

## F7 Explore

**Status:** Production. **Code:** `src/components/Explore.tsx`, `src/components/updates.tsx`. **Traces to:** 20.4, 20.7, 20.9.

**User Story:** As a resident, I want one place for everything coming up near me and across Massachusetts, including bills, so that I can look beyond my ballot.

#### Acceptance Criteria

1. THE SYSTEM SHALL show "Explore" with "Deadlines, meetings, and proposals in {town} and across Massachusetts. Updates that may affect you come first, then the soonest."
2. THE SYSTEM SHALL list updates that are not bills, 8 at first, with "Show all {n} updates" / "Show fewer". Each card SHALL show its kind, a tag ("May affect you", "You follow this", "Might apply"), title, when, explanation, "Why you're seeing this", the "Official text" line, and actions.
3. THE SYSTEM SHALL list bills under "Proposed legislation {count}", saying "Bills the Legislature is considering. None of them is law. Ones that relate to your answers come first."
4. IF a town is set and no town documents exist THEN THE SYSTEM SHALL say "More {town} updates are coming." in one short note.
5. THE SYSTEM SHALL show decided items collapsed under "Already decided {n}".
6. THE SYSTEM SHALL end with "How Legible works": "Your details stay with you" (with "Manage or clear them"), "Official sources", and "You decide" ("It never tells you how to vote.").

## F8 Ballot guide

**Status:** Production. **Code:** `src/components/DocumentView.tsx`, `src/components/MeasureParts.tsx`, `src/lib/engine/ballot-guide.ts`. **Tests:** `ballot-guide.test.ts`, `src/data/ballot-2026.test.ts`. **Traces to:** 2.1 to 2.4.

**User Story:** As a voter, I want all 9 questions side by side in the official words, so that I can compare them.

#### Acceptance Criteria

1. THE SYSTEM SHALL show all 9 questions of the November 3, 2026 ballot from the official Information for Voters booklet.
2. THE SYSTEM SHALL offer two sorts, "Most relevant to you" (engine order) and "Ballot order", and filter chips "All", "May affect you · n" and "You follow · n" (each only when n > 0), plus one chip per topic. An empty filter SHALL say "Nothing matches this filter. Try All."
3. Each question SHALL show: its number, "#{rank} for you" under the relevance sort, "You follow this" when it applies, the title, how it reached the ballot ("Referendum on a law already in effect" or "Placed on the ballot by voter petition"), a plain one-line summary marked as Legible's words, the official YES and NO statements side by side, verbatim, with page numbers, the first sentence of the official cost, an "If you …" box, "Ask Kiro about this question", and "Full law, page(s) …".
4. THE SYSTEM SHALL present Question 9 as a referendum: YES keeps the 2024 firearms law in place, NO repeals it.

## F9 Ballot question page

**Status:** Production. **Code:** `src/components/MeasureView.tsx`, `ForYou.tsx`, `MeasureParts.tsx`, `Citation.tsx`, `FullText.tsx`, `Reader.tsx`, `MeasureCard.tsx` (`FactQuestion`, `Draft`), `src/lib/engine/measure-page.ts`, `next-steps.ts`. **Tests:** `measure-page.test.ts`, `ballot-picks.test.ts`. **Traces to:** 2.1, 2.3, 3.1, 6.1 to 6.3, 8.1 to 8.4, 15.1 to 15.3, 21.1, 21.5. Task 26.

**User Story:** As a voter, I want one question explained from how it could affect me to what the law says word for word, so that I can understand it in my own terms and check every claim.

#### Acceptance Criteria

1. THE SYSTEM SHALL show a sticky bar with Back, Share (the system share sheet, else copy the official link and announce "Official link copied"), and "Open the official page".
2. THE SYSTEM SHALL show the kicker "Massachusetts ballot · Question {n}", the title, "{locator} · Voters decide {date} · {m} min read" (words ÷ 220, at least 1), and the first plain line with its source.
3. **1 How could this affect you?** SHALL open with the same reason For you gave (left out for "applies to every voter" and no match), then, each left out when empty:
   - **Direct impact**: the cited lines for the person's situation when an answer touches the question, otherwise one line saying nothing in their answers points to a direct change; the in-place fact question (F3.9) when an unanswered fact decides relevance;
   - **When it would reach you**: Jan 1, 2028 (Q4, Q8), Jul 1, 2027 (Q5, Q6), "In effect now" (Q9);
   - **Possible indirect impact**: a town line and the official fiscal statement;
   - **What's uncertain**: only where the official text says something is not known (Q2, Q5, Q6, Q7);
   - **Based on what you told Legible**: changeable chips, "Your answers stay in this browser.", and the trust line ("{n} lines, {m} quotes." with the review state).
4. WHEN the person is not registered at their address THE SYSTEM SHALL show a registration card with "Open the state lookup" on Question 4.
5. **2 What would change?** SHALL show the remaining plain lines, the direction, "Read the official summary" on demand, and "Cost, from the official fiscal statement" (first sentence, then "Read the full fiscal statement").
6. **3 What happens if YES or NO wins?** SHALL show "If YES wins" and "If NO wins" in two equal boxes with the verbatim statement and a plain line under each, and "Legible explains both and never suggests a vote." For Question 9 the headers SHALL add "· law stays" and "· law ends".
7. **4 How do we know?** SHALL say how the lines were checked and whether a person reviewed them, and on demand ("Show sources and checks") show the source, the starting page, what happens on a failed match, and **The full law, word for word**.
8. **The full law** SHALL offer "Open the official PDF at page N" and "Read it here", which loads the page text into a full-screen reader on demand, and SHALL show the saved date and a shortened SHA-256 file ID with an explanation. IF the text fails to load THEN THE SYSTEM SHALL say so and point to the PDF.
9. **5 Ask Kiro** SHALL show the question's three starter questions and "Ask about your situation", and SHALL say the person's answers are seen only if they switch on sharing in the chat.
10. THE SYSTEM SHALL offer "Ask your legislator a factual question": a template draft of at most 80 words with a live word count, "Legible never sends it and leaves your answers out.", and Copy. It SHALL never send the draft.
11. THE SYSTEM SHALL show "Related near you" when there are related items, then "Next · Question {n} · {reason}" (the next question in For you's order) and "All your ballot questions".
12. **Show the words:** under every Legible sentence THE SYSTEM SHALL show "{locator}, page N" with "Show the words", which opens the quote in place, the cited words marked, a "Found word for word" or "Reviewed" tag, and "How do we know this?".
13. **How do we know this?** SHALL open a sheet with four links ("Legible's sentence", "The quote it cites", "Where it appears", "The official file" with its fingerprint), then "Machine check" and "Human review" kept apart.
14. WHEN the profile changes on this page THE SYSTEM SHALL animate the change with a view transition, skipped under reduced motion.

## F10 Civic items and bill pages

**Status:** Production. **Code:** `src/components/CivicView.tsx`, `BillExplainer.tsx`, `OriginalText.tsx`, `src/data/civic-ma.json`, `scripts/civic-ma.content.ts`, `scripts/bills.content.ts`. **Tests:** `civic.test.ts`, `src/data/civic-ma.test.ts`, `src/lib/explain/verify.test.ts`. **Traces to:** 20.9, 21.1, 21.2, Task 21.

**User Story:** As a resident, I want deadlines, meetings, and bills explained with their official source, so that I can take part before each is decided.

#### Acceptance Criteria

1. THE SYSTEM SHALL ship 14 civic items:
   - deadlines: last day to register (Oct 24), Vote by Mail applications (Oct 27, 5 p.m.);
   - window: early voting (Oct 17 to 30);
   - election: Election Day (Nov 3);
   - bills: S.2581 school cellphone policy, S.2836 zoning for duplexes and small apartment buildings, H.4699 single-stair apartment study, H.1482 accessory dwelling unit trust fund;
   - meetings: four Cambridge City Council meetings and two Cambridge School Committee meetings.
2. Each item SHALL say how it was checked: "Found word for word, page N" (booklet dates), "Checked against the official page on {date}" (bills, council), or "Usual schedule: … Check the posted agenda." (School Committee).
3. A deadline, window, election, or meeting page SHALL show the place and kind, a "When" block, relevance tags and "Because …" chips, a summary, at most one invite for a missing fact ("Have children in public school?", "Registered to vote at your current address?") with "Not now" (counts a skip), official actions with the first as the primary one, the official text, "How this was checked", and related decisions.
4. A meeting SHALL NOT list agenda items unless a posted agenda was saved; otherwise it SHALL say no agenda is posted yet.
5. A bill page SHALL show "Proposed, not law", "On your list" when it applies, and "Ask Kiro about this bill", then an annotated reader in four parts:
   1. **What it proposes**;
   2. **What would change**: version notes, the first two change groups, and "Show {n} more changes";
   3. **Who it could affect**: direct lines ("What the bill text would change for you") kept apart from possible ones ("What could reach you indirectly", with a note that the bill does not name the person's situation), "When it would start" (marked "Already passed" once the date in the saved text has passed), the in-place fact question, and the trust line;
   4. **Where it stands**: the status, how a bill becomes law, version notes, and the official history newest first (3 shown, then "Show all {n} actions").
6. At 1024 px and wider THE SYSTEM SHALL show the bill's own words in a pane beside the cited line ("The bill's words"); narrower, it SHALL open them in place.
7. Each version note SHALL match an official history entry, or it SHALL be dropped at build time.
8. THE SYSTEM SHALL offer "Read the bill text" (the saved copy, in the reader) and the official page.
9. A bill explainer drafted by a model SHALL ship only where no hand-written one exists, keep only lines that passed verification and the support check (F11), and be labelled "AI draft, not yet reviewed by a person". All four shipped explainers are hand-written and verified, not yet reviewed.

## F11 Trust, verification, and the content pipeline

**Status:** Production. **Code:** `src/lib/verify/`, `src/lib/explain/`, `scripts/build-ballot.ts`, `scripts/build-civic.ts`, `scripts/fetch-bills.ts`, `scripts/draft-bill.ts`, `scripts/lint-words.ts`. **Tests:** `normalize.test.ts`, `verify.test.ts`, `support.test.ts`, `src/lib/explain/prompt.test.ts`, `src/data/*.test.ts`. **Traces to:** 2.2, 12.1, 12.2, 13.1, 21.1 to 21.3, 21.6, 23 (built as hand-authored content, not ingest).

**User Story:** As a skeptical voter, I want every sentence traceable to the official text and checked by code, so that I never have to take Legible's word for it.

#### Acceptance Criteria

1. THE SYSTEM SHALL tie every sentence Legible writes about a decision to a quote, every quote to a page, and every page to a saved source with a SHA-256 fingerprint and a URL.
2. Before comparing, THE SYSTEM SHALL normalize text: NFKC, curly quotes to straight, dashes to `-`, words hyphenated across a line break joined, whitespace collapsed.
3. THE SYSTEM SHALL look for a quote on its stated page first, then on every page, and SHALL store the page where it was found.
4. `npm run data:build` SHALL rebuild `src/data/ballot-2026.json` from `scripts/ballot-2026.content.ts` and the booklet page text, publish each question's full law, record the booklet and page-text hashes, and exit with an error if any quote is not found word for word, any title or sentence has a banned word, or a measure has more than two overview or why sentences per rule.
5. Quote status SHALL be **reviewed** only when a person set `reviewedBy` on the measure, **verified** when found by code, and the build SHALL fail rather than ship a quote not found.
6. `npm run data:bills` SHALL save bill text, description, and history from the Legislature API. `npm run data:civic` SHALL rebuild civic items and explainers and fail if a booklet quote is not found, a source is not on an official domain, a banned word appears, an explainer line has no matching quote, or a seed item is neither used nor listed as excluded with a reason. It SHALL warn when the latest official action differs from the content.
7. Explainer lines SHALL use conditional words (would, could, might, may, if); a "not stated" claim SHALL be checked by searching the saved bill.
8. `npm run data:draft -- <bill>` SHALL ask a model (`claude-opus-5`) to draft an explainer from public bill text only, verify it (failing lines dropped), run a support check (a second model call judging each claim against its quote, keeping only "backed" claims), and save it to `data/drafts/`. `--check` re-checks a saved draft; `--hand` reviews a hand-written explainer into `data/reviews/` without changing it; `data:civic -- --prefer-drafts` previews drafts and SHALL NOT be committed.
9. THE SYSTEM SHALL show the review state wherever it shows a line: "Each one found word for word and reviewed by a person.", "Each one found word for word in the official text. Human review pending.", or "AI draft, quotes verified, not human reviewed."

## F12 Ask Kiro

**Status:** Production (needs `ANTHROPIC_API_KEY`; without it, falls back as in 12.10). **Code:** `src/components/ChatDock.tsx`, `HighlightMenu.tsx`, `src/app/api/ask/route.ts`, `src/app/api/suggest/route.ts`, `src/lib/ask/`, `src/lib/vocab/vote-check.ts`, `src/lib/engine/ask-suggestions.ts`, `highlight-questions.ts`. **Tests:** `ground.test.ts`, `prompt.test.ts`, `ask-context.test.ts`, `ask-suggestions.test.ts`, `highlight-questions.test.ts`, `chat-dock.test.ts`. **Traces to:** 14.1 to 14.3, 22.1 to 22.6.

**User Story:** As a resident with a question, I want to ask it where I am and get an answer from the official text only, so that I understand without reading the whole booklet.

#### Acceptance Criteria

1. THE SYSTEM SHALL show one floating "Ask Kiro" assistant ("Answers come from the official text only.") scoped to the open page. Every ask control in the app SHALL open it.
2. **Highlight to ask:** WHEN the person selects at least 12 characters of official text (marked `data-ask-official`) THE SYSTEM SHALL show a menu with "Explain this" and up to three questions about the passage: rule-based at first, replaced by `/api/suggest` questions when a model is configured. The menu SHALL ignore controls and Legible's own lines, prefer a spot below the selection on touch screens, never cover the highlight, and close on Escape, scroll, or an outside click.
3. THE SYSTEM SHALL pass the source (kind, id, title, locator, page, official URL) and the passage (up to 240 characters in the menu) automatically, show "Reading: …" with the official link, and add "Now asking about …" and a fresh context when the source changes.
4. THE SYSTEM SHALL send only the question (at most 300 characters), the mode, the source, the measure id, the passage (at most 1,200), up to four earlier turns, and the personal phrases the person switched on. It SHALL never send the profile.
5. **Grounding:** the server SHALL find the highlighted words in the official text it holds (the question's quotes or saved full law, the saved bill, or the booklet quote) and add about 700 characters around them. IF the words are not found THEN it SHALL reply "Kiro can only explain the official wording…".
6. THE SYSTEM SHALL ask `claude-sonnet-5` for structured output in which every sentence cites a quote id. Explain answers SHALL use the parts "What it means", "Why it matters", and, only when something personal was shared, "How it could affect you".
7. THE SYSTEM SHALL check every answer sentence for a known quote, an allowed part, and banned words. IF any sentence fails, or the model says the text does not answer THEN THE SYSTEM SHALL show "The official text does not answer this."
8. IF the question asks how to vote or which side to take THEN THE SYSTEM SHALL show the fixed reply ("Legible doesn't say how to vote or which side to take. …") in the browser without a request; the server SHALL check again.
9. **Personal context is opt-in:** THE SYSTEM SHALL offer "Use what I told Legible: {phrases}" listing only the answers that matched this item, off by default and reset when the source changes. The server SHALL accept only Legible's own fact phrases (at most 4). Under every answer it SHALL say exactly what was sent ("Sent: … Nothing else from your profile.").
10. IF no API key is configured THEN both routes SHALL answer 503 and the dock SHALL say Kiro isn't connected and show the official passage and source. WHILE offline THE SYSTEM SHALL say so without a request and point to the official text.
11. THE SYSTEM SHALL offer three checked starter questions per ballot question, and three general ones when no question is open.

## F13 Your ballot, wrapped

**Status:** Development only (`WRAPPED_ENABLED`, `src/lib/wrapped/flag.ts`). **Full spec:** `.kiro/specs/ballot-wrapped/`. **Code:** `src/components/wrapped/`, `src/lib/engine/wrapped*.ts`, `src/lib/vocab/wrapped.ts`, `src/lib/engine/demo.ts`.

**User Story:** As a resident, I want a short, playful story about my ballot told through my own profile, ending with an image I choose to save.

#### Acceptance Criteria (summary; W1 to W12 govern)

1. THE SYSTEM SHALL tell the story in six slides (Opening, Your world, What connects to you, On your radar, One decision to explore, Your shareable moment), advanced only by the person (tap right 70% or swipe left for next, left 30% or swipe right for back, arrow keys, buttons), never automatically.
2. THE SYSTEM SHALL build every slide from one `buildCards` call, use only counts from the ballot data and verified sentences, keep facts (slide 3) and topics (slide 4) apart, and never use or imply what the person has read.
3. THE SYSTEM SHALL draw a 1080 × 1920 share image on the device with the town and topics off by default, sensitive topics unchecked even after topics are switched on, and never the name or life facts. IF drawing fails or takes over 4 seconds THEN it SHALL say so in place.
4. THE SYSTEM SHALL open from the For you invite or `#/wrapped`, as a modal dialog with focus trapped, Ask Kiro hidden, "Slide N of 6. {heading}" announced, and focus returned on close.
5. WHEN loaded with `?demo=true` THE SYSTEM SHALL use a fixed, labelled example profile (a Cambridge renter who rides transit) and SHALL NOT touch storage.
6. In production THE SYSTEM SHALL show no invite and SHALL treat `#/wrapped` and `?demo=true` as not present.

## F14 Plant companion and Growth Story

**Status:** Plant companion in production at a fixed look; growth tracking and Growth Story development only (`GROWTH_TRACKING_ENABLED` in `src/components/plant/useGrowth.ts`). **Code:** `src/components/plant/`, `src/lib/growth.ts`, `src/app/dev/plant/`. **Tests:** `src/lib/growth.test.ts`. **Replaces:** Requirement 5 (avatar) and the meter ring in 1.9.

**User Story:** As a resident, I want a calm companion that grows as I explore decisions, never from what I tell Legible about myself.

#### Acceptance Criteria

1. THE SYSTEM SHALL show the same plant in the header avatar, beside the For you title, and at the top of the Civic Profile with the optional name under it.
2. In production THE SYSTEM SHALL show one fixed look (`COMPANION_STAGE = 3`) announced as "Your plant", with no stage name, totals, journey link, or Growth Story; the For you plant SHALL open the Civic Profile.
3. THE SYSTEM SHALL define five stages: Seed (0 decisions, 0 sources), Sprout (1, 0), Growing (3, 1), Flourishing (6, 3), Blooming (9, 5). Growth SHALL come only from decisions explored and official sources opened, never from profile answers, topics, or completion, and a stage SHALL never go down.
4. In development THE SYSTEM SHALL use labelled preview data ("Development only. Dates and totals are illustrative.") with controls for an empty story and stages 1 to 5, and SHALL show "Your journey": reached stages with dates, a faint next stage or "Your plant is in full bloom.", and a privacy note.
5. The plant SHALL sway and blink, lean toward a nearby mouse (never on touch), squash softly on tap, and change instantly under reduced motion.
6. `/dev/plant` SHALL return 404 in production.
7. Real tracking is not built (task 23.7).

## F15 Privacy

**Status:** Production. **Traces to:** 10.1, 10.3 to 10.5. Applies across F2 to F14.

**User Story:** As a resident, I want proof that my answers stay on my device, so that I feel safe answering.

#### Acceptance Criteria

1. THE SYSTEM SHALL never send life facts, topics, typed topic text, the name, or the town to any server. `/api/ask` and `/api/suggest` SHALL receive only public text, ids, the question, and the personal phrases the person switched on for that question.
2. Route handlers SHALL never log profile data.
3. THE SYSTEM SHALL ask for no account, email, password, age, party, income, address beyond the town, or free text about the person.
4. THE SYSTEM SHALL have no analytics on profile data and no service worker cache.
5. WHEN the connection drops after the page loads THE SYSTEM SHALL keep sorting and showing everything already loaded.

## F16 Devices, access, and the installable app

**Status:** Production (device check 24.4 open). **Code:** `src/app/manifest.ts`, `src/app/layout.tsx`, `src/lib/theme-color.ts`, `src/app/globals.css`, `src/lib/motion.ts`. **Traces to:** 16.1 to 16.7.

**User Story:** As any resident, I want Legible to work on my phone, from my home screen, with a keyboard, and with reduced motion.

#### Acceptance Criteria

1. THE SYSTEM SHALL work at 375 and 390 px wide with no horizontal scroll, including during screen transitions.
2. THE SYSTEM SHALL be installable: a manifest named Legible, standalone display, start URL and scope `/`, the Notebook page colour as background and theme colour (light `#f8f5f6`, dark `#141016`), and 192, 512, maskable 512, and Apple 180 px icons from the Legible mark.
3. THE SYSTEM SHALL register no service worker, so an offline launch never shows old civic information as current.
4. THE SYSTEM SHALL keep content and bottom controls clear of the notch and home indicator (`viewport-fit=cover`, safe-area insets on the first-run footer, sheets, Ask Kiro, and the story), size text fields at 16 px or more on phones, and give small toggles a larger tap area on touch screens.
5. WHEN the person prefers reduced motion THE SYSTEM SHALL make every transition and animation instant.
6. THE SYSTEM SHALL close sheets, readers, and menus with Escape and return focus to the control that opened them.
7. THE SYSTEM SHALL follow the Notebook direction (`.kiro/steering/product.md`): plum only for what relates to the person (when the data supports it) and the primary action, apricot for time, and no colour for a side, a vote, YES, NO, or a direction.

## F17 Neutral language

**Status:** Production. **Code:** `src/lib/vocab/banned.ts`, `scripts/lint-words.ts`. **Traces to:** 7.3, 13.2, 21.6.

**User Story:** As a skeptical voter, I want proof that Legible cannot editorialize.

#### Acceptance Criteria

1. THE SYSTEM SHALL never recommend a vote, score a person, or use party framing or comparisons with other people.
2. `npm run lint:words` SHALL fail on should, recommend, good, bad, support, or oppose (and their forms) in app strings, JSX text, `src/data/*.json`, and `public/demo/*.json`, skipping verbatim quote fields and tests.
3. THE SYSTEM SHALL apply the same check to generated text at build time (explainers) and at answer time (Ask Kiro, suggested questions).
4. Topics SHALL name subjects, never sides ("Gun policy", not "gun rights").

---

## Known gaps

Found while writing this spec. Each is a small fix or a decision.

| Area | Gap | Where |
|---|---|---|
| F11 | The "every item has an original" check runs after the build has decided whether to fail, so it can never stop the build. | `scripts/build-civic.ts:199-204` |
| F13 | A comment says the town is on by default in the share image; the code (correctly, per W5.3) has it off. | `src/components/wrapped/SharePreview.tsx:5` |
| F12 | `/api/suggest` does not cap `source.title` length the way `/api/ask` does. Neither route is rate limited. | `src/app/api/suggest/route.ts` |
| F16 | The profile sheet focuses its panel on open but does not return focus to the opener on close. | `src/components/ProfileSheet.tsx:90-100` |
| F10 | The bill status line is hand-written and only warned about at build time; there is no on-page stale-status notice. | `scripts/build-civic.ts:65-66` |
| F11 | "Flagged" exists only as copy. No runtime list of flagged measures, because the build fails instead (fine for shipped data; uploads will need it). | `ForYou.tsx:40` |
| F1 | "Who we are" and "Our mission" are placeholder links. | `SiteHeader.tsx:22-25` |
| F9 | `MeasureCard` itself is no longer rendered; only `FactQuestion` and `Draft` from that file are used. | `src/components/MeasureCard.tsx` |
| F14 | The header "!" badge for unset interests is undecided (task 23.9). | `LegibleApp.tsx` |

## Planned, not built

| Feature | Plan | Tasks |
|---|---|---|
| Upload and analyze a town PDF, labelled AI draft | Requirements 11, 12.3, 12.4, 13.1 | 9.x, 20.1 |
| Public catalog and ingest of town documents | Requirements 20.1, 20.2, 20.8, 23 | 17.2, 20.2 |
| See it as someone else (persona switcher) | Requirement 9 | 8.x |
| "What left your browser" panel | Requirement 10.2 | 8.x |
| ZIP code to town | Requirement 1.1 | — |
| Real growth tracking in production | F14 | 23.7, 23.8 |
| Wrapped in production | F13 | 25.3 |
| YES and NO flip, a town document example, town statistics | Requirements 17 to 19 (stretch) | 13 to 15 |
| Capacitor wrapper | design.md, "Toward Capacitor" | 24.5 |
