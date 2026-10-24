# Legible (formerly Nine): decisions log

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
The Kiro spec in `.kiro/specs/legible/` is now the source of truth for scope. It supersedes the scope sections above where they differ.

1. **Engine, not just a ballot.** Documents and measures share one format. The 2026 ballot is the first, hand-reviewed document. An uploaded text PDF, such as a town meeting warrant, is analyzed by AI into the same format.
2. **No 3D map.** Dropped entirely. Town context is a stretch: a sourced number on a card, or a flat map of towns named in an upload.
3. **No intake form.** Town first, then cards immediately. Each card asks its one deciding life fact inline.
4. **Facts and topics are separate.** Life facts drive "Touches you." Topics the person cares about drive "On your list." Topics name subjects, never sides.
5. **Avatar.** A line-drawn figure built from facts and topics. It is also the figure inside each direction pictogram. No red or blue. No shareable image.
6. **Visible trust features.** Quote badges with page numbers, a verified-quote counter, a flagged list for quotes not found, an AI-draft label on uploads, a "What left your browser" panel, offline re-sorting, and a fixed how-to-vote refusal.
7. **Uploads send text, not PDF bytes.** Extraction happens in the browser. The model returns quotes as JSON and the app verifies them itself, because the API's built-in citations cannot be combined with structured output.
8. **No RAG.** Every document fits in one model call. Retrieval is a post-hackathon idea.
9. **Persona switcher** ("see it as someone else") doubles as the demo path.

## Oct 24 afternoon: first screens (onboarding, avatar, home)
Smallest choices made where the spec was silent. Revisit any of them freely.

1. **No DESIGN.md existed.** Visual direction comes from `.kiro/specs/legible/design.md` and the tokens in `globals.css` (the violet, periwinkle, coral, green reference palette). Flat fills only, no glass or blur.
2. **Town by name, not ZIP.** The ZIP table (task 16.6) is not built, so screen 1 is a type-ahead over `towns.json`, matching neighborhood aliases ("Dorchester is in Boston"). Swap in the ZIP field when 16.6 lands.
3. **Catalog is bundled.** Home imports `src/data/ballot-2026.json` directly until `public/catalog/ma.json` (task 17) exists.
4. **Town scope without town documents.** "In {town}" shows an honest empty state for town documents, plus the state questions with a town-level effect. Those sentences live in `LOCAL_REACH` (`src/lib/engine/next-steps.ts`) and each cites an existing quote id; a test checks this.
5. **Next steps are civic actions, never a vote:** answer the card's question, look up registration (Q4 when not registered), read YES and NO, or draft a factual question to a legislator (template, at most 80 words, never sent, no life facts). The registration URL is the Secretary's lookup page and needs a manual check, since the site is bot-walled for scripts.
6. **Event hero.** The ballot's `date` drives a "N days until Election Day" card; the dot chart shows the nine questions, taller columns for the ones that touch you.
7. **Scope switch.** All, Statewide, {town}: a filter in the browser only.
8. **Because chips** open an inline Yes/No/Remove editor on the card instead of reopening onboarding at that screen.
9. **Re-sort animation** uses the View Transitions API when present and motion is allowed; otherwise the list jumps.

## Oct 24: first run and the profile sheet (tasks 16.1, 16.5)
1. **Town picker stands in for ZIP** on the second first-run screen until task 16.6. Skip there continues with no town (requirement 1.3).
2. **Nudge copy** is built from the area's heading and `why` line: "Add {heading, lowercased} to sort {why without 'depend on this'}." The town and subjects items use fixed lines. Session-only dismissal.
3. **Because chips** for life-area facts open the sheet on that area; card-only facts (sensitive or narrow) keep the inline editor on the card. Topic chips and topic badges open Subjects.
4. **Ring fill** uses the Web Animations API, reading `--duration` and `--ease` from the theme, instead of a CSS transition. A transition needs one painted frame at the old value, which was unreliable when the save and re-render happen in the same click.
5. **Sheet saves record `{ kind: "edit" }`** as the answer source, since the sheet is the profile page in the AnswerSource list.
6. **Remember prompt** shows after the first Save of an area or Subjects in the session, and only when storage works. Keep and Not now both hide it for the session; the meter never counts it.

## Oct 24: Home as a feed of decisions (tasks 17.1, 17.3-17.5)
1. **17.3 is checked off for the pure part only.** `buildFeed` filters, counts touches, picks the preview, sets status, orders, and picks Up next, with tests. Fetching the catalog through `apiFetch` belongs with 17.2; until then `NineApp` passes `DOCS = [bundled ballot]`, and the catalog replaces that one constant.
2. **Open questions use life areas.** The feed lists the life areas that hold an unsettled `askFacts` fact and opens the same Pick-all screen in the profile sheet. Sensitive and narrow facts stay on their cards, so they never appear cold in the feed.
3. **Decide-by wording** lives in `src/lib/engine/decide-by.ts` with tests: people "decide" ("Voters decide Nov 3"), a body "votes" ("Town Meeting votes May 4"), comment periods "close". Relative form for Up next: "in N days", "tomorrow", "today". No urgency words.
4. **Upload button is disabled** in the empty-town card until the upload panel (task 9.4) exists; `Home` takes an optional `onUpload` and enables it when passed.
5. **Scope switch filters the list and Decided group**; Up next stays the most pressing item overall. The empty-town card shows under All and the town tab, never under State.
6. **DocumentView** keeps the countdown hero, stat cards, "Decided statewide, felt in {town}", and the card groups. Back restores the feed's scroll position. No URL change yet; deep links can come with the catalog.

## Oct 24: reading-app layout (carousels, measure reader, profile-style pages)
Inspired by a reading app's Discover, article, queue, and author screens; not copied.
1. **Covers instead of photos.** Each decision gets a cover: the subject's line pictogram on a flat token fill with a dot pattern (`src/components/covers.tsx`). Stock photos of real places or people could mislead and carry rights issues; a `cover` image field can come later with the catalog. Fill follows the first topic, never a side.
2. **Home** after "Where your life meets what is being decided." shows horizontal carousels of decisions (Touches you, On your list; Applies to everyone when neither has any), then documents as reading-list rows with a type tile. The header is centered like a profile page: avatar ring, town, "Your profile".
3. **Measure reader** (`MeasureView`): tapping a decision opens it as an article: kicker, title, meta with reading time, cover, why it reaches you, inline question, then the AG summary, YES/NO, and fiscal text verbatim in Source Serif 4. Share uses the official page URL. Back returns to where the person came from, with scroll restored.
4. **DocumentView** lists measures as rows (cover thumbnail, title, first sentence in the serif face, tags) that open the reader; the countdown hero and town reach stay. The old inline `MeasureCard` is no longer rendered; its pieces (sentences, fact question, YES/NO, draft) are reused by the reader.
5. The serif is loaded in `layout.tsx` as `--font-serif` and used with `font-[family-name:var(--font-serif)]`, so `globals.css` is unchanged. Type stays within the four size tokens.

## Oct 24: linking every screen (task 17.8 and hash routes)
1. **Hash routes** (`src/lib/nav/route.ts`): `#/`, `#/doc/<id>`, `#/measure/<doc>/<measure>`, `#/item/<id>`. Only public ids, never the town or a fact. In-app taps push history, so browser back and forward work; the in-page back button steps back, or goes up one level from a pasted link. Scroll is restored on back.
2. **Civic items in the feed**: a "Coming up" list of deadlines, meetings, and bills from `civicFeed`, filtered by the scope switch, each opening `CivicView` (when, summary, because chips, official actions, how it was checked, related decisions, source).
3. **Up next** goes to a civic item when it touches the person and comes no later than the document Up next (`civicUpNext`): today the registration deadline outranks the vote in 10 days for someone not registered.
4. **Cross-links** (`src/lib/engine/related.ts`): measure ↔ civic item when they share a life fact (ranked first) or a subject. MeasureView gets an optional "Related near you" section only; its props are otherwise unchanged so the legislation-page redesign can drop in.
5. A pasted link to another town's item still opens (items are public); a pasted link with no profile goes through first run, then lands on the linked screen.

## Oct 24: renamed Nine to Legible
The app is now **Legible**. Brand text, the page title, code names (`LegibleApp`, `useLegible`, `ease-legible`), the spec folder (`.kiro/specs/legible/`), and the package name changed. The word "nine" is kept where it counts ballot questions. Saved profiles move from `nine.profile.v1` to `legible.profile.v1` on first load. Entries above this one keep the old name as history. Not changed here: the Vercel project, the GitHub repo, and the local folder name.

## Oct 24: feed photos from Pixabay
Revisits "Covers instead of photos" above for update cards on Home and Explore only. Measures keep their covers.
1. **Fetch photos** on Home calls `POST /api/photos`. It takes no body and works over the whole catalog (every town), so the server never learns which town a person sees. Items that already have a photo are skipped.
2. **Neutral searches.** Each item gets a fixed query by kind (`src/lib/photos/pick.ts`): ballot box, polling station, empty meeting room chairs, Massachusetts State House dome (bills keep only photos tagged exactly "state house", since the search also returns City Hall and the Old State House). Never the item's title or town, so a stock photo can't pass for a real local scene. "Council chamber" and "town hall" were dropped: they returned real foreign halls (Hamburg, the Swiss parliament). Results tagged with protests, campaigns, flags, or party names are skipped. The first landscape result at least 1280 px wide is picked, preferring one no other item uses.
3. **Our copy, our URL.** The server downloads the image, uploads it to the Supabase bucket as `pixabay/<id>.<ext>` (no item or town in the path), and saves our public URL, alt text from the tags, contributor, Pixabay page URL, and `fetched_at` in `item_photos`. Every photo shows "Photo: <contributor> on Pixabay" linking to its page.
4. **Caching.** Search responses are cached 24 hours, in memory and in `photo_search_cache`, as Pixabay's terms require. A 429 stops the run and reports when to try again; no-result items keep the plain card.
5. **No broken images.** A card shows a photo only when a row exists and the file loads; on error the image is removed. Images load straight from the bucket (`unoptimized`), not through a Legible route.
6. **Tags required where searches drift.** "ballot box" also returns gift boxes and chocolates, so deadlines and the ballot card need the exact tag "ballot box"; early voting and Election Day use "i voted sticker" with the tag "i voted". Few photos pass, so cards share (three bills, one State House photo). Side-taking tags match whole words and plurals ("riot" no longer drops "patriotic").
7. **A person reviews the picks.** Tags miss foreign ballots, signs, and emblems (a German "Kommunalwahl" ballot, Israel's emblem on a ballot box). `REJECTED_IDS` in `pick.ts` lists photos turned down by eye; to reject one, add its id, delete its row, and fetch again.
8. **Local store for development.** `PHOTO_STORE=local` keeps files and rows in `.photos/` (git-ignored) and serves them from `/api/photos/file/<id>.jpg`, so photos work with only a Pixabay key. Production still needs the Supabase variables.
