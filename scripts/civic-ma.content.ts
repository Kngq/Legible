// Hand-authored civic items for Massachusetts, built from the Legible seed
// (data/legible_ma_seed.json) after checking each one against an official source.
// `npm run data:civic` turns this into src/data/civic-ma.json, verifying every
// booklet quote word for word. Summaries are neutral and lint-checked.
import type { CivicAction, CivicItem } from "@/lib/engine/civic";

const IFV = {
  name: "Information for Voters 2026, Secretary of the Commonwealth",
  url: "https://www.sec.state.ma.us/divisions/elections/research-and-statistics/2026-information-for-voters/guide.htm",
};
const VOTE_IN_MA = "https://www.VoteInMA.com";
const CHECKED = "2026-10-24";

/** A booklet quote, verified by the build. `page` is a hint; the build finds the real page. */
export interface BookletQuote {
  text: string;
  page: number;
  locator: string;
}

export type CivicContent = Omit<CivicItem, "check"> & {
  /** Seed id this item came from, or null for an item the seed missed. */
  seedId: string | null;
  check:
    | { kind: "booklet"; quote: BookletQuote }
    | { kind: "page"; checkedOn: string }
    | { kind: "schedule"; checkedOn: string; rule: string };
};

const state = { kind: "state" as const, name: "Massachusetts" };
const cambridge = { kind: "town" as const, name: "Cambridge", townId: "cambridge" };

const councilActions: CivicAction[] = [
  { label: "Sign up for public comment", url: "https://www.cambridgema.gov/publiccomment" },
  { label: "Council meeting information", url: "https://www.cambridgema.gov/citycouncil" },
];
const legislatorActions = (bill: string): CivicAction[] => [
  { label: "Read the bill and its history", url: `https://malegislature.gov/Bills/194/${bill}` },
  { label: "Find your legislators", url: "https://malegislature.gov/Search/FindMyLegislator" },
];

export const CIVIC: CivicContent[] = [
  // Election dates: every one is quoted from the official booklet.
  {
    seedId: "ma-2026-voter-registration-deadline",
    id: "ma-2026-registration-deadline",
    kind: "deadline",
    place: state,
    body: "Voters",
    title: "Last day to register to vote for November 3",
    summary: "Registration for the November 3 election closes today. Online registration stays open until 11:59 p.m.",
    at: "2026-10-24T23:59:00-04:00",
    source: IFV,
    check: { kind: "booklet", quote: { text: "You must be registered to vote by Saturday, October 24, 2026, in order to vote in this election.", page: 4, locator: "Your 2026 Voting Options" } },
    everyone: false,
    topics: ["voting_access"],
    touches: [{ fact: "registered_here", when: false }],
    actions: [{ label: "Register or update your address", url: VOTE_IN_MA }],
  },
  {
    seedId: "ma-2026-mail-ballot-request-deadline",
    id: "ma-2026-mail-ballot-deadline",
    kind: "deadline",
    place: state,
    body: "Voters",
    title: "Vote by Mail applications due",
    summary: "A Vote by Mail application counts if it reaches your local election office by 5 p.m. on October 27.",
    at: "2026-10-27T17:00:00-04:00",
    location: "Your city or town election office",
    source: IFV,
    check: { kind: "booklet", quote: { text: "Your Vote by Mail application will be honored as long as it reaches your local election office by 5 p.m. on Tuesday, October 27, 2026", page: 4, locator: "Voting by Mail" } },
    everyone: true,
    topics: ["voting_access"],
    touches: [],
    actions: [{ label: "Apply to vote by mail", url: VOTE_IN_MA }],
  },
  {
    seedId: "ma-2026-early-voting",
    id: "ma-2026-early-voting",
    kind: "window",
    place: state,
    body: "Voters",
    title: "Early voting in person",
    summary: "Every city and town offers early voting from October 17 to October 30, including hours on both weekends.",
    at: "2026-10-17T00:00:00-04:00",
    until: "2026-10-30T23:59:00-04:00",
    location: "Your city or town's early voting sites",
    source: IFV,
    check: { kind: "booklet", quote: { text: "In-person early voting will begin on Saturday, October 17 and end on Friday, October 30.", page: 4, locator: "Voting Early" } },
    everyone: true,
    topics: ["voting_access"],
    touches: [],
    actions: [{ label: "Find early voting hours", url: VOTE_IN_MA }],
  },
  {
    seedId: "ma-2026-general-election",
    id: "ma-2026-election-day",
    kind: "election",
    place: state,
    body: "Voters",
    title: "Election Day",
    summary: "Polls are open from 7 a.m. to 8 p.m. The ballot has nine statewide questions.",
    at: "2026-11-03T07:00:00-05:00",
    location: "Your assigned polling place",
    source: IFV,
    check: { kind: "booklet", quote: { text: "On Election Day, all polling places will be open from 7 a.m. until 8 p.m.", page: 2, locator: "Letter to voters" } },
    everyone: true,
    topics: ["voting_access", "elections"],
    touches: [],
    actions: [{ label: "Find your polling place", url: VOTE_IN_MA }],
  },

  // Bills: status and dates from malegislature.gov, checked by hand.
  {
    seedId: "ma-194-s2581",
    id: "ma-194-s2581",
    kind: "bill",
    place: state,
    body: "Massachusetts Legislature",
    title: "School cellphone policy (S.2581)",
    summary: "Would have each public school or district adopt a policy on student use of personal electronic devices during the school day, with a way for families to reach students in an emergency. The Senate and House passed different versions, and a conference committee is working out the differences.",
    status: "In conference committee",
    lastAction: { date: "2026-05-20", text: "House: Committee of conference appointed" },
    source: { name: "Massachusetts Legislature, S.2581", url: "https://malegislature.gov/Bills/194/S2581" },
    check: { kind: "page", checkedOn: CHECKED },
    everyone: false,
    topics: ["schools"],
    touches: [{ fact: "kids_in_schools", when: true }],
    actions: legislatorActions("S2581"),
  },
  {
    seedId: "ma-194-yimby",
    id: "ma-194-s2836",
    kind: "bill",
    place: state,
    body: "Massachusetts Legislature",
    title: "Zoning for duplexes and small apartment buildings (S.2836)",
    summary: "Would limit local zoning rules that prohibit duplexes and small multifamily housing where public water and sewer exist, and would change minimum lot size and parking rules. The Housing committee reported it in December 2025, and it is in Senate Ways and Means.",
    status: "In Senate Ways and Means",
    lastAction: { date: "2025-12-11", text: "Senate: Reported favorably and referred to Senate Ways and Means" },
    source: { name: "Massachusetts Legislature, S.2836", url: "https://malegislature.gov/Bills/194/S2836" },
    check: { kind: "page", checkedOn: CHECKED },
    everyone: false,
    topics: ["housing_costs", "local_control"],
    touches: [
      { fact: "owns", when: true },
      { fact: "rents", when: true },
    ],
    actions: legislatorActions("S2836"),
  },
  {
    seedId: "ma-194-single-stair",
    id: "ma-194-h4699",
    kind: "bill",
    place: state,
    body: "Massachusetts Legislature",
    title: "Study of single-stair apartment buildings (H.4699)",
    summary: "Would set up a study of residential buildings served by a single stairway. The Housing committee reported it in November 2025, and it is in House Ways and Means.",
    status: "In House Ways and Means",
    lastAction: { date: "2025-11-06", text: "House: Reported favorably and referred to House Ways and Means" },
    source: { name: "Massachusetts Legislature, H.4699", url: "https://malegislature.gov/Bills/194/H4699" },
    check: { kind: "page", checkedOn: CHECKED },
    everyone: false,
    topics: ["housing_costs", "public_safety"],
    touches: [],
    actions: legislatorActions("H4699"),
  },
  {
    seedId: "ma-194-adu-trust",
    id: "ma-194-h1482",
    kind: "bill",
    place: state,
    body: "Massachusetts Legislature",
    title: "Accessory dwelling unit trust fund (H.1482)",
    summary: "Would create a state trust fund for accessory dwelling units, such as in-law or backyard apartments. The Housing committee reported it in November 2025, and it is in House Ways and Means.",
    status: "In House Ways and Means",
    lastAction: { date: "2025-11-06", text: "House: Reported favorably and referred to House Ways and Means" },
    source: { name: "Massachusetts Legislature, H.1482", url: "https://malegislature.gov/Bills/194/H1482" },
    check: { kind: "page", checkedOn: CHECKED },
    everyone: false,
    topics: ["housing_costs"],
    touches: [{ fact: "owns", when: true }],
    actions: legislatorActions("H1482"),
  },

  // Cambridge City Council: dates listed on the council's official page.
  ...["2026-10-26T17:30:00-04:00", "2026-11-02T17:30:00-05:00", "2026-11-09T17:30:00-05:00", "2026-11-16T17:30:00-05:00"].map(
    (at): CivicContent => ({
      seedId: at.startsWith("2026-11-02") ? null : `cam-council-${at.slice(0, 10)}`,
      id: `cam-council-${at.slice(0, 10)}`,
      kind: "meeting",
      place: cambridge,
      body: "Cambridge City Council",
      title: "City Council meeting",
      summary: "The council's regular Monday meeting. Residents can speak during public comment by signing up by phone, online, or at the meeting.",
      at,
      location: "Sullivan Chamber, City Hall, 795 Massachusetts Ave",
      source: { name: "Cambridge City Council", url: "https://www.cambridgema.gov/citycouncil" },
      check: { kind: "page", checkedOn: CHECKED },
      everyone: false,
      topics: ["local_control"],
      touches: [],
      actions: councilActions,
    }),
  ),

  // Cambridge School Committee: no dates posted yet, so these follow the published schedule.
  ...["2026-11-17T18:00:00-05:00", "2026-12-01T18:00:00-05:00"].map(
    (at): CivicContent => ({
      seedId: `cam-school-committee-${at.slice(0, 10)}`,
      id: `cam-school-committee-${at.slice(0, 10)}`,
      kind: "meeting",
      place: cambridge,
      body: "Cambridge School Committee",
      title: "School Committee meeting",
      summary: "The School Committee sets policy and the budget for Cambridge Public Schools. Meetings include public comment.",
      at,
      location: "Dr. Henrietta Attles Meeting Room, Cambridge Rindge and Latin School, 459 Broadway",
      source: { name: "Cambridge School Committee", url: "https://www.cpsd.us/school-committee/overview" },
      check: { kind: "schedule", checkedOn: CHECKED, rule: "first and third Tuesday, 6 p.m., September through June" },
      everyone: false,
      topics: ["schools"],
      touches: [{ fact: "kids_in_schools", when: true }],
      actions: [{ label: "School Committee information", url: "https://www.cpsd.us/school-committee/overview" }],
    }),
  ),
];

/** Seed items left out, with the reason. The build prints these. */
export const EXCLUDED: Record<string, string> = {
  "ma-2026-q1": "Ballot question: Nine ships its own reviewed ballot from the official booklet.",
  "ma-2026-q2": "Ballot question: covered by the reviewed ballot.",
  "ma-2026-q3": "Ballot question: covered by the reviewed ballot.",
  "ma-2026-q4": "Ballot question: covered by the reviewed ballot.",
  "ma-2026-q5": "Ballot question: covered by the reviewed ballot.",
  "ma-2026-q6": "Ballot question: covered by the reviewed ballot.",
  "ma-2026-q7": "Ballot question: covered by the reviewed ballot.",
  "ma-2026-q8": "Ballot question: covered by the reviewed ballot.",
  "ma-2026-q9": "Ballot question: covered by the reviewed ballot.",
  "ma-194-econ-dev": "No bill number in the seed; add the malegislature.gov bill to include it.",
  "ma-194-fy27-variance": "Budget section with no bill or section number; add the official citation to include it.",
  "ma-194-multifamily-sales-tax": "Budget section with no bill or section number; add the official citation to include it.",
  "ma-194-energy": "No bill number in the seed; add the malegislature.gov bill to include it.",
};
