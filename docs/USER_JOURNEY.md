# Legible: user journey and features

This page walks through Legible the way a resident uses it, then lists every feature by area. Scope lives in [`.kiro/specs/legible/`](../.kiro/specs/legible/), and the acceptance criteria for every feature as built are in [`features.md`](../.kiro/specs/legible/features.md); this is the plain-language tour.

Features marked **(dev only)** run in `npm run dev` builds behind a flag and are not yet in production.

---

## Who it is for

A Massachusetts resident with about ten minutes and no background, preparing for the **November 3, 2026** election (or a town meeting). They want to know which of the 9 ballot questions, upcoming deadlines, local meetings, and state bills actually reach their life, in the state's own words, without being told how to vote.

Example people the app is tested with:

- A BC student who rents in Cambridge and is not registered at their current address
- A Dorchester homeowner who owns a firearm
- A Lowell resident living with family who works for the state and buys cannabis

---

## The journey

### 1. Arrive

The person opens Legible (in a browser, or from their phone's home screen if they installed it). There is no sign-up, no account, and no email. A start screen and one welcome screen state the mission: *local decisions, made legible to the people they are about*.

A person who chose **Remember on this device** before skips straight to step 3.

### 2. First run: three optional questions

One question per screen, with a light step indicator. Every step has **Skip**, and Skip records nothing.

1. **Where do you live?** Their town, matched against all 351 Massachusetts municipalities and their aliases. They can continue without a town.
2. **Which best describes your home?** I rent / I own my home / I live with family / Something else ("Something else" writes no facts).
3. **What matters to you?** Topic chips such as Housing costs, Schools, Voting access, Taxes, Gun policy, Cannabis policy. Topics name subjects, never sides.

If anything was answered, a final screen offers to keep it on this device. Then **Show my Legible** (or **Explore Legible**) opens the home page.

Nothing they entered has left the browser.

### 3. For you (home)

The page is personal from the first line: **"Your corner of Cambridge."** and a quiet note on what the sorting is based on.

- **Your ballot**: the main content. All 9 questions on the November 3 ballot, ranked for this person: questions their answers touch come first, then questions on a subject they follow (a question that is both comes first, then the one more answers match). The first is featured, the rest are compact rows, each saying why it is there ("Why this matters to you: You rent."). The other questions follow as a short list in ballot order with where each stands ("Applies to every voter", "May apply to you · Applies if you own a firearm."). Nothing is pinned: with no profile, all 9 show in ballot order. A link opens the ballot guide to compare them side by side.
- **Coming up**: a time ribbon from today to Election Day. Pins mark deadlines (last day to register, Vote by Mail applications), a band marks the early voting window, and Election Day closes it. The most urgent date is selected, with its one action shown below ("In 3 days", stated as a fact, never as pressure). On a phone the ribbon becomes swipeable date cards.
- **Also near you**: other decisions that relate to the person (meetings, the election), as compact rows. Proposed bills live on Explore in their own **Proposed legislation** section; Home only says how many relate to the person's answers, with a link.
- **Why you're seeing this** opens on any card and names the exact answers that put it there ("Because you rent").
- Every card carries an **Official text** line linking to its saved original.

Relevance comes in kinds that never stand in for each other:

| Label | Comes from |
|---|---|
| May affect you | Life facts the person answered |
| You follow this | Topics the person picked |
| Applies to everyone | The measure itself |

### 4. Open the ballot

Tapping the Election Day entry or the ballot opens the **ballot guide**: all 9 questions, ranked for this person (or in ballot order), filterable. Each question shows:

- a plain one-line summary, marked as Legible's own words
- the official **YES** and **NO** statements side by side, verbatim, with page numbers
- the official **Cost** line
- an **If you …** box describing how it reaches them (for example "If you are not registered at your address" on Question 4)
- **Full law** (booklet pages) and **Ask Kiro about this question**

The 9 questions: public records for the Legislature and Governor; public defender union; single all-candidate primary; Election Day registration; state revenue limit and rebate; conservation fund; single-family homes on 5,000 sq ft lots; end retail adult-use marijuana; keep the 2024 firearms law (a referendum, where YES keeps the law in place).

### 5. Read one question closely

Opening a question from For you lands at the top of its page, which continues the recommendation in the same words. The **measure page** goes in this order:

- the title and a short summary (Legible's first plain line, with its official words one tap away)
- **1. How could this affect you?** The reason it was put forward, then **Direct impact** (what could change for someone in their situation, only when an answer touches it), **When it would reach you**, **Possible indirect impact** (the town line and the official fiscal statement: budgets, local aid, revenue), and **What's uncertain** (only where the official text itself says something is not known: Questions 2, 5, 6, and 7). A group with nothing official behind it is left out. Then **Based on** (which answers, each changeable) and the trust line
- **2. What would change?** the remaining plain lines, the kind of change, the official summary on demand, and the cost (first sentence, the full fiscal statement on demand)
- **3. What happens if YES or NO wins?** the official YES and NO statements side by side, verbatim, with a plain line under each, and no suggested vote
- **4. How do we know?** how the lines were checked; on demand, the source, page, and **The full law, word for word** (the official PDF at the exact page, or "Read it here")
- **5. Ask Kiro** neutral starter questions and **Ask about your situation**; the person's answers go only if they switch sharing on in the chat
- **Show the words** under any sentence opens the official quote it rests on, in place; **How do we know this?** walks the chain from the sentence to the quote, the page, and the fingerprinted (SHA-256) booklet file
- at the end, **Next** (the next question for this person) and **All your ballot questions** (back to the ballot on For you)

Answers already in the Civic Profile are reused and never asked again. If an answer would sharpen the page, it asks for that one detail in context, with **Not now** to skip.

### 6. Ask a question

**Ask Kiro**, a floating button scoped to the open page, answers questions from the official text only:

- Starter questions per measure, checked in advance
- **Highlight** any official passage to get a small menu: **Explain this** plus two or three questions about the highlight. The passage and its source go along automatically.
- Every sentence in an answer cites a quote; answers with an unknown quote or a banned word are replaced
- Asking how to vote gets a fixed, neutral reply that never comes from the model
- The person can opt in to send a matching phrase like "you rent"; the reply shows exactly what was sent
- With no API key or no connection, it falls back to the official passage and its source

### 7. Explore beyond the ballot

**Explore** (Home · Explore tabs) lists everything coming up near the person and across Massachusetts, in the same ranked order, plus decided items and how Legible works.

- **Deadlines and voting windows**: registration, Vote by Mail, early voting, Election Day, each with its official text and one real action
- **Local meetings**: Cambridge City Council and School Committee meetings, with the posted agenda when one exists, or "No agenda posted yet"
- **State bills**: S.2581 (school cellphone policy), S.2836 (zoning for duplexes and small apartment buildings), H.4699 (single-stair apartment study), H.1482 (accessory dwelling unit trust fund)

A **bill page** reads as an annotated reader in four parts: **What it proposes**, **What would change**, **Who it could affect** (direct effects kept apart from possible ones), and **Where it stands** (the official history verbatim). On wide screens the bill's own words sit in a pane beside each line; on phones they open in place. **Read the bill text** opens the saved copy. Explainers drafted by a model are labelled "AI draft, not yet reviewed by a person".

### 8. Tune the profile

Tapping the header avatar opens **Your profile**: an overview that says every detail is optional and stored only in this browser.

- Areas: Your town, Your housing situation, Your household, Your voting information, Your interests, plus name, school, getting around, and work
- Each editor has Back, Close, Escape, and **Not now** (leaves without saving)
- Contextual **Add details** links open the matching editor directly (the registration deadline opens voting; housing bills open housing)
- **Prefer not to say** counts as done
- **Clear my information**, with a confirm step, erases everything

Changing an answer re-sorts the feed instantly, in the browser, with no network call.

### 9. Share and come back (dev only)

- **Your ballot, wrapped**: a six-slide story about the ballot told through the person's own profile (Opening, Your world, What connects to you, On your radar, One decision to explore, Your shareable moment). It ends with an image saved on the device; the town and topics appear on it only if the person turns them on.
- **Civic plant**: a companion that grows through five stages (Seed to Blooming) as the person explores decisions and opens official sources, never from personal answers. **Your journey** shows the dated stages reached.

---

## All features

### Onboarding and profile

- No account, sign-in, email, or password
- First run: welcome, then town, home, and topics, each optional with Skip
- Town picker over 351 municipalities with aliases; continue without a town
- Keep-on-device prompt; nothing stored unless **Remember on this device** is on (one key, `legible.profile.v1`)
- Remembered profiles skip first run; Skip undoes only that run's picks
- Profile sheet with an overview, completion line, and one-question editors
- Optional first name or nickname, used only to greet, never sent anywhere
- Contextual detail requests on item pages, with Not now
- Prefer not to say on sensitive questions
- Clear my information with confirmation
- Sensitive facts never count toward completion

### Personalization

- Pure, deterministic engine (`buildCards`) in the browser, no model involved
- Life facts drive "May affect you"; topics drive "You follow this"; never mixed
- Five neutral directions only: expands, restricts, rule change, who decides, none, shown as pictograms
- Ranking by relevance and urgency together
- "Why you're seeing this" with the exact answers behind each card
- Instant re-sort when an answer changes, offline

### Home and Explore

- Personal header with the person's town (and name, if given)
- Coming up time ribbon (desktop) and snapping date cards (phone)
- Featured decision plus compact rows
- Official text line on every card
- Explore tab with everything statewide, decided items, and how Legible works
- Hash routes for every screen, so links work and the back button works; routes carry only public ids

### Ballot

- All 9 questions from the official 2026 Information for Voters booklet
- Ballot guide ranked or in ballot order, filterable
- Verbatim YES and NO, side by side, with page numbers
- Official cost line and an "If you …" line per question
- Measure page with For you card (If YES, If NO, When, Based on)
- Full law opened at the exact booklet page, or loaded as text on demand
- Question 9 correctly framed as a referendum

### Civic items and bills

- Election deadlines and voting windows from the booklet
- Local meetings with agendas when posted
- Four state bills saved from the Legislature API with text, pinslip, and history
- Four-part bill explainers as an annotated reader
- Version notes tied to official history entries; stale-status warnings
- AI-drafted explainers shipped only where no hand-written one exists, only supported lines, labelled as drafts

### Trust and verification

- Every quote located word for word in the official text at build time; the build fails otherwise
- Measures with a failed quote are flagged, not shown
- SHA-256 fingerprints and saved dates on the booklet and every original
- Show the words and How do we know this? on every cited line
- Review status labelled: reviewed, verified, or AI draft
- Banned-word lint (should, recommend, good, bad, support, oppose) over app strings and generated text
- Second model call checks that every bill explainer line follows from its quote

### Ask Kiro

- Floating, page-scoped assistant backed by Claude
- Checked starter questions per measure
- Highlight official text to Explain this or ask about it
- One cited quote per answer sentence; unknown quotes and banned words rejected
- Fixed local reply to how-to-vote questions
- Opt-in, visible sharing of a single matching phrase
- Graceful fallback to the official passage without a key or connection

### Privacy

- Life facts, topics, name, and town never leave the browser
- Server routes (`/api/ask`, `/api/suggest`) receive only public text, ids, the question, and verified quotes
- No analytics on profile data, no service worker caching

### Devices and access

- Works at 375 px and up; phone layout for every screen
- Installable web app: manifest, icons, standalone window, safe areas
- Reduced motion respected everywhere
- Keyboard support: Escape closes sheets and readers, focus returns to the opener
- Notebook visual direction: plum only for what relates to the person, apricot for time; colour never encodes a side or a vote

### In development

- Your ballot, wrapped (`WRAPPED_ENABLED`)
- Growth Story and changing plant stages (`GROWTH_TRACKING_ENABLED`); the plant itself shows in production as a fixed companion; real growth tracking still to be agreed (task 23.7)
- Planned, not built: document upload with AI analysis, persona switcher, "What left your browser" panel, draft a message to a legislator
