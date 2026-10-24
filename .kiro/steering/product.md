---
inclusion: always
---

# Product: Nine

Nine is where a Massachusetts resident sees the public decisions being made around them, at town and state level, sorted by where those decisions meet their life. The 9 questions on the Nov 3, 2026 state ballot are the first document. Town documents, such as a town meeting warrant, enter the same catalog pre-analyzed or uploaded.

A person builds a life profile once: town, a few everyday facts, and the subjects they follow. The home feed then shows every document for their state and town with how many measures touch them. Opening one shows the measures as cards, explains in two sentences what changes for this person, and ties every sentence to the official text. A chat dock answers questions from that text only.

Mission line: local decisions, made legible to the people they are about.

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

"Official booklet plus highlighter," minimal and friendly. Paper background with white cards, bold geometric sans (Figtree) for display and body, soft grey pill buttons, large rounded corners, generous white space. One highlighter-yellow accent for what touches you; muted green and amber appear only on trust badges. Single-line-weight pictograms. One easing curve around 400 ms, at most four type sizes, no gradients, no red or blue. Tokens live in `src/app/globals.css`.
