> **Revision, night of Oct 24, 2026.** Working name is now **Nine**. See DECISIONS.md for scope changes: PDF is the data source (HTML pages are bot-walled), map demoted to a card-level figure for Q7/Q4, two grounded AI routes, "booklet + highlighter" visual direction, direction pictograms. Timeboxes in §9 are superseded by the two-person split in DECISIONS.md.

# SPEC — "Nine" (formerly BallotLens)

Hackachusetts · Oct 24, 2026 · Civic action track · 12-hour build
Status: DRAFT for approval. No implementation until approved.

## 1. One-liner

Enter your Massachusetts town and a few facts about your life; get, for each of the 9 questions on the Nov 3, 2026 ballot, a plain-language card saying whether it touches you, in which direction, and why, with every sentence tied to the Attorney General's official summary or the full text.

## 2. Problem and root cause

- Voters receive a 9-question ballot plus a dense official booklet. Most read neither.
- News summaries disagree with each other and sometimes with the official text (e.g., what a YES vote on Question 9 does: one outlet says "repeals the law," the Secretary of State says "the law remains in place"). Confusion is real and current.
- Root cause addressed: **a long official document with no link to the reader's own situation.** The product closes that link without adding opinion.

## 3. Scope (in)

1. **Profile intake** (no account, nothing stored server-side): town; housing (rent / own / with family); optional flags: registered to vote, works for the state, uses public defender services, owns or wants a single-family lot, cannabis consumer, firearm owner, cares about open space, primary-voter.
2. **Impact cards**, one per ballot question (9):
   - Title in plain English; the official question number.
   - Relevance badge: **Touches you / Probably not / Everyone**.
   - Direction: one of *expands something you use · restricts something you use · changes a rule that applies to you · changes who decides · no personal effect*. Never "good/bad," never "vote yes/no."
   - Two-sentence "why," referencing the profile fields that triggered it.
   - "What YES does / What NO does," copied verbatim from the AG summary.
   - Expandable **Source** panel: the exact AG summary paragraph and a deep link to the official full-text page.
3. **Impact Board** (2.5D map, time-boxed to 2.5 h): deck.gl extruded choropleth of MA towns. Default layer: a neutral, factual town metric relevant to the selected question (e.g., Q7: share of single-family zoning or housing units; Q4: 2024 turnout; Q6: protected open space %). User's town highlighted. Hover shows the number and its source. **Fallback at hour 8:** flat 2D choropleth if 3D is not stable.
4. **"Send to my legislator / election office" draft**: 80-word neutral email that lists the questions the user flagged and asks a factual question; user edits and copies. No sending from the app.
5. **Official-only numbers**: any figure shown (turnout, housing %, acreage) comes from a state or municipal source with the URL displayed.

## 4. Non-goals (out)

- No voting recommendations, scores, or party framing. No "most voters in your town think…"
- No computed dollar impacts. No modeling of tax revenue (Q5) or fund allocations (Q6) beyond quoting the official summary.
- No candidates, no races, no polling, no registration logistics (link out to sec.state.ma.us instead).
- No accounts, no analytics on individual profiles, no server-side storage of profile answers.
- No second document (energy bill, proxy votes) in the 12-hour build. It is a slide, not a feature.
- No true 3D buildings, no camera fly-throughs, no animation beyond hover/select.
- No multilingual UI in v0 (English only; Spanish copy of cards is a stretch only if cards are done by hour 7).

## 5. UX

**Screen 1 — Who you are (≤20 s).** Town picker (type-ahead over 351 municipalities). Three housing radio buttons. Checkboxes for the optional flags, each one plain sentence ("I rent," "I own a gun," "I've used a public defender"). Button: *Show my ballot*. Footer: "Nothing you enter leaves your browser."

**Screen 2 — Your ballot.** Header: "9 questions · Nov 3 · [Town]". Cards sorted: *Touches you* first, then *Everyone*, then *Probably not* (collapsed group). Each card as in §3.2. A persistent banner: "We quote the Attorney General's summary. We don't tell you how to vote." Toggle: *Show full text*.

**Screen 3 — Your town on the map.** Question selector (defaults to the first *Touches you* card). Extruded town map with legend and source line. Side panel: user's town value vs. state median, both with sources. Button: *Draft a message* → modal with the 80-word draft and a Copy button.

**Navigation:** three tabs across the top; profile is editable at any time and cards recompute instantly (client-side).

**Tone:** short sentences, no adjectives of judgment, every claim followed by a citation chip.

## 6. Data model

All static JSON shipped with the front end; precomputed before/early in the day. No database.

```
Question {
  id: 1..9,
  short_title: string,             // "Public records," "Same-day registration"
  official_title: string,
  ag_summary: string,              // verbatim from sec.state.ma.us
  yes_means: string,               // verbatim from AG summary
  no_means: string,                // verbatim
  full_text_url: string,
  type: "initiative" | "referendum",
  tags: Tag[],                     // populations/behaviors it touches
  direction_by_tag: { [Tag]: Direction },
  why_templates: { [Tag]: string },// 2-sentence template with slots
  board_metric: MetricRef | null
}

Tag = "renter" | "owner" | "with_family" | "registered_voter" | "unregistered" |
      "state_employee" | "public_defender_user" | "single_family_interest" |
      "cannabis_consumer" | "firearm_owner" | "open_space" | "primary_voter" |
      "everyone"

Direction = "expands" | "restricts" | "rule_change" | "who_decides" | "none"

Profile { town_id, housing, flags: Tag[] }        // browser memory only

TownMetric {
  town_id, metric_id, value, unit, year, source_name, source_url
}

Card (derived) {
  question_id, relevance: "touches"|"everyone"|"probably_not",
  direction, why: string, triggered_by: Tag[], citations: Citation[]
}

Citation { quote: string, source_url: string, locator: string }  // locator = "AG summary, para 2"
```

**LLM use:** offline only, to draft `why_templates` and `tags` from the AG summaries, then **human-reviewed** before shipping. At runtime, card text is assembled from templates + profile; no live LLM call is required for cards. (Optional live call: the 80-word legislator draft, with the card citations passed in and the instruction "quote only from provided text.")

## 7. Edge cases

1. **Official vs. news disagreement** (Q9 YES/NO wording): always render the Secretary of State text; never ingest news summaries into `yes_means` / `no_means`. Add a unit check that `yes_means` for referendum questions mentions the law "remaining in place."
2. **Empty profile** (town only, no flags): every card shows *Everyone* or *Probably not*; the "why" says "This question changes a statewide rule; we found nothing in your answers that it targets."
3. **Town not found / unincorporated spelling** (e.g., "Manchester-by-the-Sea," "North Attleborough"): type-ahead with aliases; if still no match, allow proceeding without a town; board tab shows state view only.
4. **Metric missing for a town** (small towns absent from a dataset): show "no data" with the source line, never zero.
5. **Contradictory flags** (rent + own): allow; cards union the tags; "why" names both.
6. **Question with no personal angle for anyone** (Q1 public records, Q3 primaries): relevance = *Everyone*, direction = *who_decides*; do not force a personal "why."
7. **3D board fails on a device** (no WebGL): detect and render the 2D fallback automatically.
8. **User asks "how should I vote?"** (in the legislator-draft modal or any free text): fixed response pointing to the AG summary and the official Information for Voters booklet; no recommendation.
9. **Deep link to official page breaks**: cache the AG summary text locally so the quote still renders; mark the link as "source page unavailable."
10. **Profile persistence**: refresh clears it; a "remember on this device" checkbox uses localStorage only, wrapped in try/catch.

## 8. Acceptance criteria

- [ ] All 9 questions render cards with verbatim AG `yes_means` / `no_means` and a working link to the official full text.
- [ ] Changing any profile field recomputes cards client-side in under 200 ms with no network call.
- [ ] Every sentence in a card's "why" has at least one visible citation chip that opens the quoted source paragraph.
- [ ] No card, banner, or draft contains the words *should*, *recommend*, *good*, *bad*, *support*, or *oppose* (checked by a lint script over the shipped JSON).
- [ ] Three test personas produce distinct, plausible card sets: (a) BC student, renter, unregistered; (b) Dorchester homeowner, firearm owner; (c) Lowell family, state employee, cannabis consumer. Screenshots saved.
- [ ] Impact Board shows the user's town highlighted with a metric, unit, year, and source URL for at least 3 questions; 2D fallback verified by disabling WebGL.
- [ ] Legislator draft is ≤ 80 words, cites at least one question number, contains no recommendation language, and is copyable.
- [ ] Q9 renders the referendum wording correctly (YES = law remains).
- [ ] Nothing from the profile is sent to any server (verified in the network tab).
- [ ] App loads from a static host; demo runs offline except for optional map tiles and the optional draft call.
- [ ] Submitted via Kiro per event rules, with a `.kiro` spec checked in.

## 9. Timeboxes (12 h, team unknown)

| Hours | Work | Done when |
|---|---|---|
| 0–1.5 | Scrape 9 official pages → `questions.json`; verify Q9 | JSON passes lint |
| 1.5–3.5 | Tags, directions, why-templates (LLM draft, human review) | 3 personas look right in a console |
| 3.5–6 | Screens 1–2 | Cards + citations working |
| 6–8.5 | Impact Board (deck.gl); fallback decision at 8.0 | Town highlighted, metric sourced |
| 8.5–9.5 | Legislator draft + lint script | Criteria 4, 7 pass |
| 9.5–11 | Persona run-through, screenshots, bug fixes | All criteria checked |
| 11–12 | Pitch (2 min), `.kiro` spec, submit | Submitted |

## 10. Open questions for approval

1. Keep the 2.5D board in scope (2.5 h) or cut to 2D and spend the time on Spanish cards?
2. Live LLM call for the legislator draft, or a template with slots (zero API dependency)?
3. Working name: Nine, or something else?

## 11. Sources for content

- Secretary of State, 2026 ballot questions: https://www.sec.state.ma.us/divisions/elections/research-and-statistics/2026-Information-for-voters/2026-ballot-questions.htm (per-question pages from …/2026-ballot-question1.htm)
- Information for Voters 2026 (PDF): https://www.sec.state.ma.us/divisions/elections/download/information-for-voters/archive/IFV_2026%20English.pdf
- Question list as reported: https://www.boston.com/news/politics/2026/07/21/there-9-ballot-questions-will-be-up-for-a-vote-in-november/ (news; not a source for card text)
- Town boundaries: MassGIS municipalities layer
- Town metrics: Secretary of State election statistics (turnout), MassGIS / EOHLC housing and open-space datasets (to be selected per question during hour 6)
