// Hand-authored content for the 2026 ballot: short titles, rules, why sentences,
// facts to ask, topics, and extra quotes. Every quote here must be found word for
// word in the official booklet; scripts/build-ballot.ts fails otherwise.
//
// Set `reviewedBy` on a measure only after a person has checked every quote
// against data/official/IFV_2026_English.pdf.
import type { Direction, FactId, TopicId } from "@/lib/vocab";

export interface ExtraQuote {
  id: string; // short id, prefixed with q<N>- by the build script
  text: string;
  locator: string;
}

export interface RuleContent {
  fact: FactId;
  when?: boolean;
  direction: Direction;
  why: { text: string; quote: string }[]; // quote = "summary" | "yes" | "no" | "fiscal" | extra id
}

export interface MeasureContent {
  number: number;
  title: string;
  appliesToEveryone: boolean;
  everyoneDirection?: Direction;
  overview: { text: string; quote: string }[];
  rules: RuleContent[];
  askFacts: FactId[];
  topics: TopicId[];
  quotes: ExtraQuote[];
  reviewedBy?: string;
}

export const CONTENT: MeasureContent[] = [
  {
    number: 1,
    title: "Public records for the Legislature and Governor",
    appliesToEveryone: true,
    everyoneDirection: "who_decides",
    overview: [
      {
        text: "Most records of the Legislature and the Governor's office would become public records.",
        quote: "c1",
      },
      {
        text: "Policy drafts and constituent requests for help with benefits or agencies would stay exempt.",
        quote: "c2",
      },
    ],
    rules: [],
    askFacts: [],
    topics: ["government_transparency"],
    quotes: [
      {
        id: "c1",
        text: "make most records held by the Legislature and the Office of the Governor public records under the Massachusetts Public Records Law",
        locator: "AG summary",
      },
      {
        id: "c2",
        text: "exempt documents related to the development of public policy and communications between legislators and their constituents",
        locator: "AG summary",
      },
    ],
  },
  {
    number: 2,
    title: "Public defender union",
    appliesToEveryone: false,
    overview: [
      {
        text: "Staff of the Committee for Public Counsel Services, the state's public defender agency, could bargain collectively.",
        quote: "c1",
      },
    ],
    rules: [
      {
        fact: "public_defender_contact",
        direction: "rule_change",
        why: [
          {
            text: "The lawyers and staff who represent people through the Committee for Public Counsel Services could form a union.",
            quote: "yes",
          },
          {
            text: "After a contract is signed, the agency would have to ask the Governor for the money to fund it.",
            quote: "c2",
          },
        ],
      },
      {
        fact: "state_employee",
        direction: "rule_change",
        why: [
          {
            text: "This changes the labor rules for one group of state employees, the staff of the public defender agency.",
            quote: "no",
          },
        ],
      },
    ],
    askFacts: ["public_defender_contact", "state_employee"],
    topics: ["labor", "criminal_justice"],
    quotes: [
      {
        id: "c1",
        text: 'employees of the Committee for Public Counsel Services ("CPCS") are permitted to engage in collective bargaining with their employer',
        locator: "AG summary",
      },
      {
        id: "c2",
        text: "require CPCS, after executing a collective bargaining agreement, to request the appropriation necessary to fund such agreement from the Governor",
        locator: "AG summary",
      },
    ],
  },
  {
    number: 3,
    title: "Single all-candidate primary",
    appliesToEveryone: true,
    everyoneDirection: "who_decides",
    overview: [
      {
        text: "Which candidates reach the November ballot would be decided in one shared primary instead of party primaries.",
        quote: "c1",
      },
    ],
    rules: [
      {
        fact: "votes_in_primaries",
        direction: "rule_change",
        why: [
          {
            text: "Instead of a party primary ballot, you would see one ballot listing every candidate.",
            quote: "c1",
          },
          {
            text: "The two candidates with the most primary votes would advance to the general election.",
            quote: "c2",
          },
        ],
      },
    ],
    askFacts: ["votes_in_primaries"],
    topics: ["elections"],
    quotes: [
      {
        id: "c1",
        text: "a single, all-party primary in which all candidates, regardless of their party affiliation, would be listed on one ballot, and voters could vote for any candidate on the ballot",
        locator: "AG summary",
      },
      {
        id: "c2",
        text: "The two candidates receiving the most votes in the primary would advance to the general election ballot.",
        locator: "AG summary",
      },
    ],
  },
  {
    number: 4,
    title: "Election Day registration",
    appliesToEveryone: true,
    everyoneDirection: "rule_change",
    overview: [
      {
        text: "Eligible residents could register or update their address at the polls on Election Day, starting in 2028.",
        quote: "c1",
      },
    ],
    rules: [
      {
        fact: "registered_here",
        when: false,
        direction: "expands",
        why: [
          {
            text: "You could register, or fix your address, at your polling place on Election Day with proof of residency.",
            quote: "c1",
          },
          {
            text: "It would take effect on January 1, 2028, so it applies to later elections, not this one.",
            quote: "c2",
          },
        ],
      },
    ],
    askFacts: ["registered_here"],
    topics: ["voting_access"],
    quotes: [
      {
        id: "c1",
        text: "permit eligible individuals to register to vote or update their voter registration address on Election Day",
        locator: "AG summary",
      },
      {
        id: "c2",
        text: "The proposed law would take effect on January 1, 2028.",
        locator: "AG summary",
      },
    ],
  },
  {
    number: 5,
    title: "State revenue limit and rebate",
    appliesToEveryone: true,
    everyoneDirection: "rule_change",
    overview: [
      {
        text: "The state's yearly revenue limit would be tied to last year's revenue plus average wage growth.",
        quote: "c1",
      },
      {
        text: "Revenue above the limit would be refunded to taxpayers the following year.",
        quote: "c2",
      },
    ],
    rules: [],
    askFacts: [],
    topics: ["taxes"],
    quotes: [
      {
        id: "c1",
        text: "limit state revenue in a given year to the net amount of state revenue from the year before, increased by a rate equal to the average growth of wages and salaries in Massachusetts over the most recent three years",
        locator: "AG summary",
      },
      {
        id: "c2",
        text: "the excess amount would be refunded to taxpayers the following year",
        locator: "AG summary",
      },
    ],
  },
  {
    number: 6,
    title: "Conservation fund",
    appliesToEveryone: false,
    overview: [
      {
        text: "A Nature for All Fund would receive part of the sales tax on sporting goods, recreational vehicles, and golf for conservation.",
        quote: "c1",
      },
      {
        text: "Cities and towns, state agencies, tribal governments, and conservation charities could receive money from it.",
        quote: "c2",
      },
    ],
    rules: [],
    askFacts: [],
    topics: ["open_space"],
    quotes: [
      {
        id: "c1",
        text: "receive 50% of state taxes collected from the sale and use of sporting goods, recreational vehicles, and golf courses for the first year of its operation",
        locator: "AG summary",
      },
      {
        id: "c2",
        text: "allow state agencies, municipalities, public charities involved in natural resource conservation, tribal governments, and other regional public entities to receive money from the Nature for All Fund",
        locator: "AG summary",
      },
    ],
  },
  {
    number: 7,
    title: "Single-family homes on 5,000 sq ft lots",
    appliesToEveryone: false,
    overview: [
      {
        text: "Single-family homes could be built on residential lots of 5,000 square feet or more with sewer and water.",
        quote: "yes",
      },
    ],
    rules: [
      {
        fact: "wants_single_family",
        direction: "expands",
        why: [
          {
            text: "A single-family home could be built in any residential zone on a lot of at least 5,000 square feet.",
            quote: "c1",
          },
          {
            text: "The lot would also need 50 feet of street frontage and public sewer and water.",
            quote: "c2",
          },
        ],
      },
      {
        fact: "owns",
        direction: "rule_change",
        why: [
          {
            text: "Lots of 5,000 square feet or more in your residential zone could get a single-family home.",
            quote: "yes",
          },
          {
            text: "Your city or town would keep the power to regulate height, setbacks, open space, parking, and short-term rentals.",
            quote: "c3",
          },
        ],
      },
      {
        fact: "rents",
        direction: "rule_change",
        why: [
          {
            text: "Where you rent, residential lots of 5,000 square feet or more could get new single-family homes.",
            quote: "yes",
          },
          {
            text: "Whether those homes can be rented short-term would stay up to the city or town.",
            quote: "c3",
          },
        ],
      },
    ],
    askFacts: ["rents", "owns", "wants_single_family"],
    topics: ["housing_costs", "local_control"],
    quotes: [
      {
        id: "c1",
        text: "allow single-family homes to be built in a residentially zoned area as long as the land on which it is to be constructed is at least 5,000 square feet",
        locator: "AG summary",
      },
      {
        id: "c2",
        text: "has at least 50 feet of land bordering the street, road, or public way that it faces, and has access to public sewer and water services",
        locator: "AG summary",
      },
      {
        id: "c3",
        text: "allow cities and towns to reasonably regulate certain aspects of those single-family homes, including their height, distance from neighboring buildings, open space, parking requirements, and whether they can be rented out on a short-term basis",
        locator: "AG summary",
      },
    ],
  },
  {
    number: 8,
    title: "End retail adult-use marijuana",
    appliesToEveryone: false,
    overview: [
      {
        text: "Retail sale of adult-use marijuana would end, and the Cannabis Control Commission would regulate only the medical market.",
        quote: "c3",
      },
    ],
    rules: [
      {
        fact: "buys_cannabis",
        direction: "restricts",
        why: [
          {
            text: "The laws that legalize, regulate, and tax retail sale of adult-use marijuana would be repealed.",
            quote: "c1",
          },
          {
            text: "Adults 21 and older could still possess one ounce or less, including up to 5 grams of concentrate.",
            quote: "c2",
          },
        ],
      },
    ],
    askFacts: ["buys_cannabis"],
    topics: ["cannabis_policy"],
    quotes: [
      {
        id: "c1",
        text: "repealing the laws that legalize, regulate, and tax the retail sale of adult recreational use marijuana in Massachusetts",
        locator: "AG summary",
      },
      {
        id: "c2",
        text: "permit persons 21 years of age and older to possess 1 ounce or less of marijuana including no more than 5 grams in the form of concentrate",
        locator: "AG summary",
      },
      {
        id: "c3",
        text: "retain the Cannabis Control Commission but modify its authority so it would regulate only the medical marijuana market",
        locator: "AG summary",
      },
    ],
  },
  {
    number: 9,
    title: "Keep the 2024 firearms law",
    appliesToEveryone: false,
    overview: [
      {
        text: "This is a referendum on a law already in effect: a YES vote keeps it and a NO vote repeals it.",
        quote: "no",
      },
    ],
    rules: [
      {
        fact: "owns_firearm",
        direction: "rule_change",
        why: [
          {
            text: "A YES vote keeps the 2024 firearms law in place; a NO vote repeals it.",
            quote: "yes",
          },
          {
            text: "The law requires serial numbers on all firearms except antiques and relics.",
            quote: "c1",
          },
        ],
      },
    ],
    askFacts: ["owns_firearm"],
    topics: ["gun_policy", "public_safety"],
    quotes: [
      {
        id: "c1",
        text: "requires all firearms except antiques and relics, including unfinished frames and receivers that can be readily made into a finished product, to have serial numbers",
        locator: "AG summary",
      },
      {
        id: "c2",
        text: "require an individual to be 21 years of age to own semiautomatic rifles or shotguns",
        locator: "AG summary",
      },
    ],
  },
];
