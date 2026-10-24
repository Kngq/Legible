# Requirements Document

## Introduction

Nine is a place where a Massachusetts resident sees the public decisions being made around them, at town and state level, sorted by where those decisions meet their own life. A person builds a short life profile once: their town, a few everyday facts, and the subjects they follow. From then on the home feed shows every document in the catalog for their state and town, each with how many measures touch them, and the open questions still worth answering. Opening a document shows its measures as cards, with a cited explanation of what changes for this person.

The 9 questions on the Nov 3, 2026 state ballot are the first document, built from hand-reviewed content in the official Information for Voters booklet. Town documents, such as a town meeting warrant, enter the same catalog either pre-analyzed by the team or uploaded by the person as a text PDF, drafted into measures by AI, with every quote verified word for word.

A reliability layer makes every sentence traceable: sentence to quote, quote to page, page to a fingerprinted source, with a visible trust level. A chat dock answers questions from the official text only, with a citation on every sentence. Nine never recommends a vote, and the profile never leaves the browser.

Out of scope for this build: any 3D map; accounts or server-side storage of profiles; voting recommendations, scores, or party framing; computed dollar impacts; OCR of scanned PDFs; retrieval over many documents (RAG); languages other than English; sending messages on the user's behalf; a shareable avatar image; notifications or email.

## Glossary

- **Document:** an official source split into measures, for example the 2026 state ballot or one town warrant.
- **Measure:** one item in a document, such as a ballot question or a warrant article.
- **Life fact:** a factual answer about the person, such as renting or owning a firearm. Drives "Touches you."
- **Topic:** a subject the person cares about, such as open space. Drives "On your list."
- **Direction:** one of expands, restricts, rule_change, who_decides, none.
- **Verified quote:** a quote whose normalized text appears exactly in the source page text.
- **Life profile:** the town, answered facts, skipped facts, and topics, stored only in the browser. Never called a political profile.
- **Catalog:** the public list of documents Nine knows about, each tagged with its place (state, or one town) and trust level.
- **Feed:** the home screen list of catalog documents for the person's state and town, with locally computed counts.
- **Trust level:** reviewed, verified, AI draft, or flagged. See Requirement 21.

## Requirements

### Requirement 1: Onboarding and life profile

**User Story:** As a resident, I want to tell the app about my life once, in under a minute, so that every document I open is already sorted for me.

#### Acceptance Criteria

1. WHEN the user enters a Massachusetts ZIP code THE SYSTEM SHALL resolve it to a town in the browser, offer a choice when the ZIP spans towns, and keep only the town. THE SYSTEM SHALL also offer a town type-ahead over all 351 municipalities, including common aliases such as "Manchester-by-the-Sea" and "North Attleborough."
2. WHEN the user completes or skips onboarding THE SYSTEM SHALL show the home feed immediately, with no further form.
3. IF the user cannot find their town THEN THE SYSTEM SHALL let them continue without one and show state documents only.
4. THE SYSTEM SHALL run onboarding one question per screen with a progress bar, back, and Skip: ZIP; one screen per everyday fact with Yes, No, and Prefer not to say; topics; a "Keep on this device" choice that defaults to not kept; and a done screen showing how many measures touch the user. Onboarding SHALL NOT include sign-in, account creation, or a name.
5. THE SYSTEM SHALL ask only everyday facts in onboarding, and only those that at least one document in the user's feed reads. Sensitive facts (owns_firearm, buys_cannabis, public_defender_contact) SHALL be asked only inside the card that depends on them.
6. THE SYSTEM SHALL record skipped facts so that a fact skipped in onboarding is asked at most once more, inside a card, and a fact declined there is not asked again.
7. THE SYSTEM SHALL let the user reopen and edit the profile from the home feed and from any because chip or avatar badge.
8. THE SYSTEM SHALL name this a life profile in all copy and SHALL NOT collect name, email, age, party, income, or free text about the person.
9. THE SYSTEM SHALL show a personalization meter counting the town, the topics step, and each fact a feed document reads, with all items weighted equally. A fact answered Yes, No, or Prefer not to say SHALL count as done; the remember toggle SHALL NOT count.

### Requirement 2: Reviewed ballot content

**User Story:** As a voter, I want to read exactly what the official booklet says, so that I can trust what I see.

#### Acceptance Criteria

1. THE SYSTEM SHALL show all 9 ballot questions with official title, Attorney General summary, and verbatim "What YES does" and "What NO does" text.
2. THE SYSTEM SHALL label ballot content as reviewed only after a person has checked it against the official booklet and recorded that in the data.
3. THE SYSTEM SHALL render Question 9 as a referendum in which YES keeps the existing law in place and NO repeals it.
4. THE SYSTEM SHALL link each question to its official page on sec.state.ma.us, and SHALL still show the cached quote if that page is unavailable.

### Requirement 3: Life facts asked in place

**User Story:** As a voter, I want to answer only the questions that matter, so that personalization does not feel like a survey.

#### Acceptance Criteria

1. WHEN a measure depends on a life fact the user has not answered THE SYSTEM SHALL show that one question inside the measure's card.
2. WHEN the user answers or changes a life fact THE SYSTEM SHALL recompute and re-sort all cards in the browser in under 200 ms with no network request.
3. THE SYSTEM SHALL give each card one relevance label: "Touches you," "Applies to everyone," or "Probably not you."
4. THE SYSTEM SHALL sort cards in this order: touches you, on your list, applies to everyone, probably not you, with the last group collapsed.
5. THE SYSTEM SHALL make every life-fact question optional, including firearm ownership, cannabis purchase, and public defender contact.
6. IF the user answers no life facts THEN THE SYSTEM SHALL label each measure "Applies to everyone" or "Probably not you" and say that nothing in their answers is targeted.
7. IF the user gives contradictory facts, such as rent and own THEN THE SYSTEM SHALL accept both and name both in the explanation.

### Requirement 4: Topics the user cares about

**User Story:** As a voter, I want to mark subjects I care about, so that measures on those subjects stand out even if they do not affect me directly.

#### Acceptance Criteria

1. THE SYSTEM SHALL offer a fixed set of about twelve topic chips named as subjects, never as positions.
2. WHEN the user types a topic THE SYSTEM SHALL match it to a fixed topic using a word list in the browser, and SHALL NOT send the typed text anywhere.
3. WHEN a measure matches a selected topic THE SYSTEM SHALL show an "On your list" label that is visually distinct from "Touches you."
4. THE SYSTEM SHALL never infer or display a party, ideology, or score from the user's topics or facts.

### Requirement 5: Avatar

**User Story:** As a voter, I want to see myself in the ballot, so that personalization feels concrete and playful.

#### Acceptance Criteria

1. THE SYSTEM SHALL draw a line-style avatar assembled from the user's life facts and topics, for example a key for renting or a tree badge for open space.
2. THE SYSTEM SHALL show the avatar at the top of the ballot and as the figure inside each card's direction pictogram.
3. WHEN the user taps a badge on the avatar THE SYSTEM SHALL let them remove or change that fact or topic, and SHALL re-sort the cards.
4. THE SYSTEM SHALL use no red or blue in the avatar or its badges.

### Requirement 6: Explanations the user can edit

**User Story:** As a voter, I want to see why a card is marked for me, so that I can correct it if it is wrong.

#### Acceptance Criteria

1. WHEN a card is marked "Touches you" or "On your list" THE SYSTEM SHALL show a chip naming each fact or topic that caused it, such as "because you rent."
2. WHEN the user taps such a chip THE SYSTEM SHALL open that fact or topic for editing in place.
3. THE SYSTEM SHALL show a "why" of at most two sentences for each card marked for the user.

### Requirement 7: Fixed neutral vocabulary

**User Story:** As a judge or skeptical voter, I want to see that the app cannot editorialize, so that I can trust its neutrality.

#### Acceptance Criteria

1. THE SYSTEM SHALL describe impact using only the five directions, each with a pictogram.
2. THE SYSTEM SHALL show a legend stating that Nine can only say one of these five things.
3. THE SYSTEM SHALL fail the build check if any app-authored string or generated explanation contains a banned word.

### Requirement 8: Highlighter citations

**User Story:** As a voter, I want to see exactly where each claim comes from, so that I do not have to take the app's word for it.

#### Acceptance Criteria

1. THE SYSTEM SHALL link every sentence of a card's "why" to a quote from the official text.
2. WHEN the user hovers over or taps a "why" sentence THE SYSTEM SHALL highlight the linked quote in highlighter yellow.
3. THE SYSTEM SHALL show a badge on each quote with its verification status and page, such as "Found word for word, page 12."
4. WHEN the user opens a quote badge THE SYSTEM SHALL show the source page text with the quoted sentence highlighted.

### Requirement 9: See it as someone else

**User Story:** As a voter or a demo audience, I want to view the ballot as another person, so that I can understand neighbors without disclosing my own facts.

#### Acceptance Criteria

1. THE SYSTEM SHALL offer the three demo personas as one-click profiles.
2. WHEN the user switches persona THE SYSTEM SHALL re-sort the cards and update the avatar without saving the persona as the user's own profile.
3. WHEN the user leaves persona view THE SYSTEM SHALL restore their own profile.

### Requirement 10: Privacy the user can see

**User Story:** As a voter, I want proof that my answers stay private, so that I feel safe answering sensitive questions.

#### Acceptance Criteria

1. THE SYSTEM SHALL never send life facts, topics, typed topic text, or the selected town to any server.
2. THE SYSTEM SHALL show a "What left your browser" panel listing each request made in the session and its contents by category, and listing that answers were not sent.
3. WHEN the device is offline after a document has loaded THE SYSTEM SHALL still recompute and re-sort cards when answers change.
4. THE SYSTEM SHALL clear the profile on refresh unless the user opts into "Remember on this device," which uses browser storage wrapped in error handling.
5. THE SYSTEM SHALL provide a one-tap "Forget me" control that clears all stored profile data.

### Requirement 11: Upload and analyze a document

**User Story:** As a resident, I want to upload an official PDF, such as a town meeting warrant, so that I can get the same personal view of it.

#### Acceptance Criteria

1. WHEN the user selects a PDF THE SYSTEM SHALL extract its text page by page in the browser.
2. IF the PDF has too little text to analyze THEN THE SYSTEM SHALL explain that scanned documents are not supported.
3. IF the extracted text exceeds the size limit THEN THE SYSTEM SHALL say so before any request is made.
4. WHEN text extraction succeeds THE SYSTEM SHALL send only the page text and the document title to the analyze route.
5. THE SYSTEM SHALL return measures in the same format as the ballot, with quotes, page numbers, life facts, topics, directions, and explanations limited to the fixed vocabularies.
6. WHILE analysis runs THE SYSTEM SHALL show progress and allow cancel.
7. IF analysis fails or times out THEN THE SYSTEM SHALL offer a pre-run sample analysis for demo documents.
8. THE SYSTEM SHALL treat document content as data and ignore any instructions inside it.

### Requirement 12: Quote verification

**User Story:** As a voter, I want generated content checked against the source, so that the AI cannot invent official language.

#### Acceptance Criteria

1. THE SYSTEM SHALL verify every quote in a generated measure against the page text after normalizing whitespace, line-break hyphens, quotation marks, and dashes.
2. IF a quote is not found on its stated page but is found on another page THEN THE SYSTEM SHALL correct the page number.
3. IF any quote in a measure is not found THEN THE SYSTEM SHALL hide that measure from the sorted view and list it under "Flagged, quote not found in source."
4. THE SYSTEM SHALL show a counter of verified quotes out of total quotes for each uploaded document.

### Requirement 13: Labeling AI drafts

**User Story:** As a voter, I want to know what a person reviewed and what the AI drafted, so that I can calibrate my trust.

#### Acceptance Criteria

1. THE SYSTEM SHALL label every measure from an upload "AI draft, quotes verified, not human reviewed."
2. IF a generated explanation contains a banned word THEN THE SYSTEM SHALL flag that measure the same way as a failed quote.

### Requirement 14: Ask the official text

**User Story:** As a voter, I want to ask a question about one measure, so that I can understand it without reading the whole booklet.

#### Acceptance Criteria

1. WHEN the user asks a question on a card THE SYSTEM SHALL send only the measure id, the question, and, for uploaded documents, that measure's verified quotes.
2. THE SYSTEM SHALL answer only from that measure's official text, cite a quote for every sentence, and say when the text does not answer the question.
3. IF the question asks how to vote or which side to take THEN THE SYSTEM SHALL return a fixed response pointing to the official summary, without calling the model.

### Requirement 15: Draft a message

**User Story:** As a voter, I want a short neutral message to my legislator or election office, so that I can ask a factual question easily.

#### Acceptance Criteria

1. THE SYSTEM SHALL build a draft of at most 80 words from a template, naming the measures the user selected and one factual question.
2. THE SYSTEM SHALL let the user edit and copy the draft, and SHALL never send it.
3. THE SYSTEM SHALL keep the draft free of banned words and of the user's life facts.

### Requirement 16: Access and devices

**User Story:** As any resident, I want the app to work on my phone and with assistive technology.

#### Acceptance Criteria

1. THE SYSTEM SHALL work at 375 px width with no horizontal scrolling.
2. THE SYSTEM SHALL support keyboard operation for every control, including the avatar badges and citation highlights.
3. WHEN the user prefers reduced motion THE SYSTEM SHALL re-sort cards without animation.

### Requirement 20: Home feed from a public catalog

**User Story:** As a resident, I want the app to bring me the decisions being made around me, so that I do not have to know which documents exist.

#### Acceptance Criteria

1. THE SYSTEM SHALL keep a public catalog of documents, each with an id, title, place (state, or one town), date, trust level, and the URL of its document JSON.
2. WHEN the home feed loads THE SYSTEM SHALL fetch the whole catalog for Massachusetts and filter it in the browser to state documents plus documents whose town matches the profile, so that the chosen town is never sent to a server.
3. THE SYSTEM SHALL show each feed entry with its title, date, trust level, and a locally computed line such as "3 of 9 touch you," and SHALL order entries by touches, then date.
4. THE SYSTEM SHALL show an "Open questions for you" section listing facts that any feed document asks and the profile has not answered, answerable in place, and SHALL re-sort the feed when they change.
5. THE SYSTEM SHALL list uploaded and sample documents in the same feed, tagged by town and labeled AI draft, kept in the browser only.
6. THE SYSTEM SHALL phrase the feed as where the person's life meets what is being decided, and SHALL NOT phrase it as what the person ought to care about.

### Requirement 21: Trust and traceability

**User Story:** As a skeptical voter or a judge, I want to follow any sentence back to its source, so that I never have to take the app's word for it.

#### Acceptance Criteria

1. THE SYSTEM SHALL make every app-authored sentence about a measure traceable through a chain: sentence, quote id, quote with page and locator, page text, source document with a SHA-256 fingerprint and URL.
2. THE SYSTEM SHALL assign every quote one trust level: reviewed (a named person checked it against the source), verified (located word for word by code, page known), AI draft (from an upload, quotes verified, not human reviewed), or flagged (not found; the measure is hidden and listed).
3. THE SYSTEM SHALL check quotes at three points: at build time for shipped documents, failing the build on any miss; at upload time on the server and again in the browser; and at chat time on every answer sentence before it renders.
4. THE SYSTEM SHALL show a trust panel per document with verified quotes out of total, reviewer and date when reviewed, source fingerprint, and source link.
5. WHEN the user opens "How do we know this?" on a card THE SYSTEM SHALL show that card's chain with each link clickable down to the highlighted page text.
6. THE SYSTEM SHALL run the banned-word check on every app-authored and generated sentence at the same three points.

### Requirement 22: Chat dock

**User Story:** As a resident with a question, I want to ask it right where I am, so that I get an answer from the official text without leaving the page.

#### Acceptance Criteria

1. THE SYSTEM SHALL show a chat button in the bottom corner of every screen that opens a panel scoped to the open document, or to one measure when a card is open.
2. THE SYSTEM SHALL send only the document id, measure id when scoped, the question, and, for uploads, that measure's verified quotes. The profile SHALL never be sent.
3. THE SYSTEM SHALL cite a quote on every answer sentence, verify each citation before rendering, and replace any answer with a failed citation or a banned word with the fixed "the official text does not answer this" response.
4. IF the question asks how to vote or which side to take THEN THE SYSTEM SHALL show the fixed response locally without any request.
5. THE SYSTEM SHALL offer three suggested questions per measure and SHALL show under each answer what was sent, linked to the privacy panel.
6. WHILE offline THE SYSTEM SHALL say so and point to the official text on the card.

### Requirement 17 (stretch): YES and NO flip

**User Story:** As a voter, I want to compare outcomes side by side, so that I can see what changes for me either way.

#### Acceptance Criteria

1. WHEN the user flips a card between YES and NO THE SYSTEM SHALL show that outcome's verbatim text and update the direction pictogram, without implying a preferred outcome.

### Requirement 18 (stretch): One town document example

**User Story:** As a judge, I want to see the engine work on a local document, so that I believe it generalizes.

#### Acceptance Criteria

1. THE SYSTEM SHALL include one real town document, analyzed and checked by a team member, available from the start screen.

### Requirement 19 (stretch): Town context

**User Story:** As a voter, I want a local number where it explains impact, so that I understand my town's situation.

#### Acceptance Criteria

1. WHERE a sourced town statistic exists for a measure THE SYSTEM SHALL show it on the card with unit, year, and source link, and SHALL show "no data" rather than zero when missing.
2. WHERE an uploaded document names Massachusetts towns THE SYSTEM SHALL list or highlight them on a flat map.
