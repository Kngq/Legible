---
inclusion: always
---

# Product: Nine

Nine sorts an official Massachusetts civic document by what touches one person. The first document is the 9 questions on the Nov 3, 2026 state ballot. The same engine takes an uploaded official PDF, such as a town meeting warrant, and does the same for it.

A person picks their town, answers only the questions that matter, and adds topics they care about. Nine re-sorts the measures, explains in two sentences why each one touches them, and ties every sentence to the official text.

## Principles (non-negotiable)

- **Never tell anyone how to vote.** No recommendations, scores, party framing, or "people like you" comparisons.
- **Official text only.** "What YES does" and "What NO does" are verbatim. Every generated sentence links to a quote, and every quote is verified word for word against its source.
- **The profile never leaves the browser.** Only public documents, measure ids, and user questions about the official text may go to the server. Life facts and topics never do.
- **Fixed neutral vocabulary.** Five directions only: expands, restricts, rule_change, who_decides, none. Topics name subjects, never sides ("gun policy", not "gun rights").
- **Life facts and topics stay separate.** Facts decide "Touches you." Topics decide "On your list." One never stands in for the other.
- **Say what was reviewed.** Hand-reviewed ballot content is labeled reviewed. Content generated from an upload is labeled "AI draft, quotes verified, not human reviewed."

## Banned words in app-authored text

should, recommend, good, bad, support, oppose. The lint covers app strings and generated explanations, not verbatim official quotes.

## Users

Massachusetts residents preparing for an election or a town meeting, with ten minutes and no background. Demo personas: a BC student who rents and is not registered; a Dorchester homeowner who owns a firearm; a Lowell resident living with family who works for the state and buys cannabis.

## Visual direction

"Official booklet plus highlighter." Paper-toned background, serif display type, sans body, one highlighter-yellow accent for what touches you, single-line-weight pictograms. One easing curve around 400 ms, at most four type sizes, no gradients, no red or blue.
