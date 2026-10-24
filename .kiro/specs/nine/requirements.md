# Requirements Document

## Introduction

Nine helps a Massachusetts resident understand an official civic document by sorting it around their own life. The first document is the 9 questions on the Nov 3, 2026 state ballot, using hand-reviewed content from the official Information for Voters booklet. The same engine also accepts an uploaded text PDF, such as a town meeting warrant, drafts measures from it with AI, and verifies every quote word for word.

Personalization uses three inputs: the person's town, a few life facts asked only when a measure depends on them, and topics the person cares about. A line-drawn avatar reflects those inputs. Nine never recommends a vote, and the profile never leaves the browser.

Out of scope for this build: any 3D map; accounts or server-side storage of profiles; voting recommendations, scores, or party framing; computed dollar impacts; OCR of scanned PDFs; retrieval over many documents (RAG); languages other than English; sending messages on the user's behalf; a shareable avatar image.

## Glossary

- **Document:** an official source split into measures, for example the 2026 state ballot or one town warrant.
- **Measure:** one item in a document, such as a ballot question or a warrant article.
- **Life fact:** a factual answer about the person, such as renting or owning a firearm. Drives "Touches you."
- **Topic:** a subject the person cares about, such as open space. Drives "On your list."
- **Direction:** one of expands, restricts, rule_change, who_decides, none.
- **Verified quote:** a quote whose normalized text appears exactly in the source page text.

## Requirements

### Requirement 1: Town selection

**User Story:** As a resident, I want to pick my town quickly, so that the ballot reflects where I live.

#### Acceptance Criteria

1. WHEN the user types in the town field THE SYSTEM SHALL suggest matches from all 351 Massachusetts municipalities, including common aliases such as "Manchester-by-the-Sea" and "North Attleborough."
2. WHEN the user selects a town THE SYSTEM SHALL show the document's measures immediately, with no further form.
3. IF the user cannot find their town THEN THE SYSTEM SHALL let them continue without one.

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
