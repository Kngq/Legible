# Nine — decisions log

Project folder created the night before Hackachusetts (Sat Oct 24, 2026, 8 AM–8 PM, civic action track, submission via Kiro).

## Name
**Nine.** Nine questions on the Nov 3, 2026 Massachusetts ballot. Replaces the working name BallotLens. Alternatives considered: Highlighter, My 9.

## What it is, one sentence
You tell it your town and a few facts about your life, and it re-sorts the 9 Massachusetts ballot questions by which ones touch you, quoting only the Attorney General's official text, never telling you how to vote.

## Scope changes vs spec.md (original draft)
1. **Source of truth is the official PDF**, not the sec.state.ma.us HTML pages. Those pages sit behind Incapsula bot protection and cannot be scraped. The PDF downloads cleanly and contains everything. See data/official/. The HTML URLs are kept only as human-clickable deep links.
2. **Map demoted.** No separate map tab. A small town-level figure appears only on cards where a town number helps explain "why this touches you" (Q7 lot sizes / single-family share, Q4 turnout). Tap to expand; the expanded view may be the deck.gl 3D town map if time allows. Statewide comparison for its own sake was rejected: it answers "where does my town rank," not "does this touch me."
3. **Legislator draft uses a template, not a live LLM call**, unless the grounded route below is built. The banner "Nothing you enter leaves your browser" must stay true: never send the profile; only question numbers and quoted citations may leave the browser.
4. **Two grounded AI features** (Maven course lecture 8 pattern: buttons call routes, routes call models, results get stored):
   - *Ask the official text*: per-card box; server route receives question id + user question, loads that question's AG summary + full text from questions.json, model may use only that text, every sentence cites a paragraph, "how should I vote" gets a fixed refusal.
   - *Draft a message*: 80 words from flagged question numbers + citations; user edits and copies; app never sends.
   The relevance sorting itself is a hand-written rules table (tags → direction), not AI.
5. **Visual direction: "official booklet + highlighter."** Paper-toned background, serif display, clean sans body, one accent (highlighter yellow) for "touches you," single-line-weight pictograms. One easing curve, ~400 ms, max four type sizes, no gradients.
6. **Non-text explanation of impact:** (a) a "life strip" across the top (home, money, vote, work, neighborhood, personal freedom) lit where the user's 9 questions land; (b) five direction pictograms with the user as the figure: expands / restricts / rule_change / who_decides / none. Drawn once, reused across 9 questions. "Two yous: today vs if YES" is a stretch for two demo questions only.
7. **Banned-word lint applies to app-authored strings only**, not to verbatim AG quotes or booklet arguments (which legitimately contain "support").
8. **Tag matrix is small.** Q1, Q3, Q5 are "Everyone." Roughly 15 why-templates total, not 9×13.

## Verified facts (tonight)
- 9 questions; Q1–Q8 initiative petitions, Q9 referendum. Q9: "A YES VOTE would keep in place the law…", "A NO VOTE would repeal this law." (edge case 1 in spec confirmed)
- Q2 is the public defender (CPCS) union question; Q7 is single-family on lots ≥ 5,000 sq ft; Q8 prohibits retail adult-use marijuana; Q4 is Election Day registration.
- Nearest existing products: MyBallot (Tufts cSPA, MA, no personalization), Voter's Digest (open source, CA, situation chips, no MA), maballotguide.com (MA, no personalization), Lawglass (per-line citation UI). None does MA + personal + town-level + per-sentence citation.

## Two-person split (8 h)
- **A — content & logic:** questions.json review (0:00–0:45) → tag table (–1:30) → relevance function + 3 persona tests (–2:30) → two AI routes, key server-side via `vercel env add` (–4:30) → lint + persona screenshots (6:00–7:00).
- **B — screens:** scaffold Next.js + Tailwind + shadcn, push, deploy once (0:00–0:30) → intake with town type-ahead (–1:30) → card, badges, YES/NO box, citation chip (–3:30) → card-level town figure, 3D only if cheap (–6:00) → Kiro spec + 2-min pitch (7:00–8:00).

## Personas for acceptance
(a) BC student, renter, unregistered. (b) Dorchester homeowner, firearm owner. (c) Lowell family, state employee, cannabis consumer.

## Files
- docs/spec.md — original spec with a revision note at top
- docs/pitch.html — one-page teammate pitch (also published as a private Claude artifact)
- data/questions.json — machine-extracted; **review before shipping**
- data/extract_questions.py — regenerates questions.json from the booklet text
- data/official/ — the official PDF and its text extraction

## Morning of Oct 24: scope reset
The Kiro spec in `.kiro/specs/nine/` is now the source of truth for scope. It supersedes the scope sections above where they differ.

1. **Engine, not just a ballot.** Documents and measures share one format. The 2026 ballot is the first, hand-reviewed document. An uploaded text PDF, such as a town meeting warrant, is analyzed by AI into the same format.
2. **No 3D map.** Dropped entirely. Town context is a stretch: a sourced number on a card, or a flat map of towns named in an upload.
3. **No intake form.** Town first, then cards immediately. Each card asks its one deciding life fact inline.
4. **Facts and topics are separate.** Life facts drive "Touches you." Topics the person cares about drive "On your list." Topics name subjects, never sides.
5. **Avatar.** A line-drawn figure built from facts and topics. It is also the figure inside each direction pictogram. No red or blue. No shareable image.
6. **Visible trust features.** Quote badges with page numbers, a verified-quote counter, a flagged list for quotes not found, an AI-draft label on uploads, a "What left your browser" panel, offline re-sorting, and a fixed how-to-vote refusal.
7. **Uploads send text, not PDF bytes.** Extraction happens in the browser. The model returns quotes as JSON and the app verifies them itself, because the API's built-in citations cannot be combined with structured output.
8. **No RAG.** Every document fits in one model call. Retrieval is a post-hackathon idea.
9. **Persona switcher** ("see it as someone else") doubles as the demo path.
