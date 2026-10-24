// Hand-authored explanations of bills in the civic feed, keyed by bill number.
// Every quote must be found word for word in the bill text saved by
// `npm run data:bills`; `npm run data:civic` runs verifyExplainer and fails on
// any error. Lines say "would" or "could": a bill is proposed, not law.
//
// Set `reviewedBy` only after a person has checked every quote against
// data/official/bills/<bill>.json. A generated draft has the same shape with
// author "model" (see EXPLAINER_DRAFT_SCHEMA in src/lib/explain/verify.ts).
import type { ExplainerDraft } from "@/lib/explain/types";

export const BILL_EXPLAINERS: Record<string, ExplainerDraft> = {
  S2836: {
    author: "team",
    quotes: [
      {
        id: "up-to-5",
        text: "No zoning ordinance or by-law in areas or for parcels connected to a municipal or centrally managed water and sewer system shall prohibit the use of duplexes or multi-family housing, as those terms are defined in Section 1A, containing up to 5 dwelling units on lots zoned for residential use as of right",
      },
      {
        id: "up-to-3",
        text: "No zoning ordinance or by-law in an area or for parcels not connected to a municipal or centrally managed water and sewer system shall prohibit the use of duplexes or multi-family housing, as those terms are defined in Section 1A, containing up to 3 dwelling units on lots zoned for residential use as of right",
      },
      {
        id: "local-rules",
        text: "may be subject to reasonable regulations, including, but not limited to, 310 CMR 15.000 et seq., if applicable, site plan review and regulations concerning dimensional setbacks and the bulk and height of structures; provided, that regulations concerning the height of a duplex or multi-family housing does not limit height to less than 3 stories",
      },
      {
        id: "short-term",
        text: "Said regulations either individually or cumulatively shall not render the development of land for duplexes and multi-family housing infeasible and may impose restrictions and prohibitions on short-term rentals",
      },
      { id: "lot-size", text: "No zoning ordinance or by-law shall impose a minimum lot size on new residential developments." },
      {
        id: "parking",
        text: "No zoning ordinance or by-law shall impose minimum automobile parking requirements on new residential developments, including developments built under section 3C of chapter 40A, that are located not more than .5 miles from a commuter rail station, ferry terminal or bus station and no more than 1 parking space per unit shall be required for new residential units, including but not limited to multifamily housing, developed on land that is more than .5 miles from a commuter rail station, ferry terminal or bus station",
      },
      {
        id: "transit-density",
        text: "Any zoning regulations adopted pursuant to Chapter 40A shall allow, as of right and with no minimum parking requirements for dwelling units, mixed-use development or multifamily housing with a minimum gross density of 15 units per acre, subject to any further limitations imposed by section 40 of chapter 131 and title 5 of the state environmental code established pursuant to section 13 of chapter 21A, for parcels located not more than 0.5 miles from a commuter rail station, subway station, ferry terminal or bus station",
      },
      {
        id: "transit-affordable",
        text: "Any development permitted pursuant to subsections (a) or (b) that includes 10 or more residential units shall set aside a minimum of 15 per cent of the residential units to households earning at or below 80 per cent of the area median income or a minimum of 10 per cent of the residential units to households earning at or below 50 per cent of the area median income",
      },
      {
        id: "transit-deadline",
        text: "If a municipality fails to adopt new ordinances or by-laws or amend existing ordinances or by-laws to comply with the provisions this section by January 1, 2028, any noncompliant existing regulation shall become null and void",
      },
      {
        id: "religious",
        text: "No zoning ordinance or by-law shall prohibit, unreasonably restrict or require a special permit or other discretionary zoning approval for the use of land owned by a religious sect or denomination for multi-family housing; provided, that 20 per cent of housing units built under this section shall be used as affordable housing",
      },
      {
        id: "adu",
        text: "no zoning ordinance or by-law may prohibit the use of accessory dwelling units as of right on lots where the principal dwelling contains more than 1 dwelling unit",
      },
      {
        id: "plans",
        text: "Each municipality in the commonwealth shall, every 5 years, establish and submit to the executive office of housing and livable communities a housing production plan that sets forth the municipality's strategy to meet its affordable housing needs",
      },
      {
        id: "plans-zoning",
        text: "within 2 years of receiving an approved housing production plan under this section, each municipality shall adopt or update zoning ordinances and bylaws in order to comply with the approved housing production plan",
      },
      {
        id: "subdivision",
        text: "If the plan meets criteria for a by-right subdivision, the board shall, without a public hearing, approve such plan.",
      },
      {
        id: "subdivision-21",
        text: "If the board to which a plan to create a by-right subdivision fails to act upon such a plan or fails to notify the required parties within 21 days after its submission, the plan shall be approved as a by-right subdivision.",
      },
      {
        id: "environmental",
        text: "No city or town may enforce an ordinance or bylaw restricting the construction or development of housing or other work that is primarily residential in nature that exceeds the requirements of this section or of regulations promulgated by the department of environmental protection pursuant to this section",
      },
      {
        id: "septic",
        text: "no regulation or amendment thereto that relates to the minimum requirements for subsurface disposal of sanitary sewage shall exceed the requirements of the state environmental code for the purposes of residential housing development or construction",
      },
      {
        id: "public-land",
        text: "Prior to disposition of publicly owned real property of the commonwealth pursuant to chapter 7C, the commissioner of capital asset management and maintenance in coordination with the secretary of the executive office of housing and livable communities shall determine whether such real property shall be made available for low or moderate income housing",
      },
      { id: "starts", text: "Section 4 shall take effect one year after the effective date of this act" },
    ],

    proposes: [
      {
        text: "Cities and towns could no longer ban duplexes and small apartment buildings of up to 5 homes on residential lots with public water and sewer.",
        quote: "up-to-5",
      },
      {
        text: "Within half a mile of train, subway, ferry, and bus stations, local zoning would have to allow apartment buildings at a density of at least 15 homes per acre, with no parking minimum.",
        quote: "transit-density",
      },
    ],

    changes: [
      {
        heading: "What could be built",
        lines: [
          {
            text: "On residential lots without public water and sewer, buildings of up to 3 homes would be allowed without a special permit.",
            quote: "up-to-3",
          },
          {
            text: "An accessory unit, like an in-law or backyard apartment, could be added on lots where the main building already has more than one home.",
            quote: "adu",
          },
          {
            text: "Religious organizations could build apartment buildings on their land without a special permit, if 20 percent of the homes are affordable housing.",
            quote: "religious",
          },
        ],
      },
      {
        heading: "What your city or town could still decide",
        lines: [
          {
            text: "Local rules on site plans, setbacks, and building size would still apply, but they could not hold these buildings under 3 stories.",
            quote: "local-rules",
          },
          {
            text: "Cities and towns could restrict or ban short-term rentals in these buildings, but their rules together could not make building them unworkable.",
            quote: "short-term",
          },
        ],
      },
      {
        heading: "Lot size and parking",
        lines: [
          { text: "Local zoning could no longer require a minimum lot size for new homes.", quote: "lot-size" },
          {
            text: "Within half a mile of a commuter rail station, ferry terminal, or bus station, no parking minimum could be required for new homes. Elsewhere, no more than 1 space per home could be required.",
            quote: "parking",
          },
        ],
      },
      {
        heading: "Approvals",
        lines: [
          {
            text: "A plan to split a lot into smaller residential lots that meets the bill's criteria would be approved without a public hearing.",
            quote: "subdivision",
          },
          {
            text: "If the planning board did not act within 21 days, the plan would count as approved.",
            quote: "subdivision-21",
          },
          {
            text: "Local environmental rules stricter than the state's could not be used to limit projects that are mostly housing.",
            quote: "environmental",
          },
          {
            text: "Local board of health rules on septic systems could not be stricter than the state code for housing.",
            quote: "septic",
          },
        ],
      },
      {
        heading: "Affordable housing",
        lines: [
          {
            text: "Projects of 10 or more homes built under the near-transit rule would have to set aside at least 15 percent for households at or below 80 percent of the area median income, or 10 percent at or below 50 percent.",
            quote: "transit-affordable",
          },
          {
            text: "Every city and town would have to send the state a plan for its affordable housing needs every 5 years.",
            quote: "plans",
          },
          {
            text: "If its zoning did not allow what the approved plan calls for, it would have 2 years to change it.",
            quote: "plans-zoning",
          },
          {
            text: "Before the state sold or transferred its land, state officials would have to decide whether it could be used for low or moderate income housing.",
            quote: "public-land",
          },
        ],
      },
    ],

    affects: [
      {
        text: "Cities and towns would have to change zoning that does not comply. Near transit, rules still out of line on January 1, 2028 would stop applying.",
        quote: "transit-deadline",
      },
      {
        text: "Owners of residential lots could build a duplex or small apartment building without a special permit, subject to reasonable local rules.",
        quote: "up-to-5",
      },
      {
        text: "Households with lower incomes could qualify for set-aside homes in larger projects near transit.",
        quote: "transit-affordable",
      },
    ],

    personal: [
      {
        fact: "owns",
        when: true,
        effect: "direct",
        lines: [
          {
            text: "If your lot is zoned residential and has public water and sewer, you could build a duplex or a building of up to 5 homes on it without a special permit.",
            quote: "up-to-5",
          },
          { text: "Your city or town could no longer require a minimum lot size for new homes on your land.", quote: "lot-size" },
        ],
      },
      {
        fact: "rents",
        when: true,
        effect: "possible",
        lines: [
          {
            text: "More duplexes and small apartment buildings could be allowed where you live, which could change how many homes are available to rent over time.",
            quote: "up-to-5",
          },
        ],
        notStated: { text: "The bill text does not mention renters, tenants, leases, or rent levels.", terms: ["renter", "tenant", "lease", "rent level", "rent control"] },
      },
      {
        fact: "rides_transit",
        when: true,
        effect: "possible",
        lines: [
          {
            text: "Larger apartment buildings with no parking minimum would have to be allowed near train, subway, ferry, and bus stations, which could add homes near the lines you ride.",
            quote: "transit-density",
          },
        ],
        notStated: { text: "The bill text does not mention transit service, fares, or schedules.", terms: ["fare", "schedule", "service frequency", "MBTA"] },
      },
      {
        fact: "drives",
        when: true,
        effect: "possible",
        lines: [
          {
            text: "New homes within half a mile of commuter rail, ferry, and bus stations could be built with no parking spaces.",
            quote: "parking",
          },
        ],
        notStated: { text: "The bill text does not mention street parking or parking permits.", terms: ["street parking", "parking permit", "resident parking"] },
      },
    ],

    takesEffect: [
      {
        label: "1 year after the effective date",
        line: { text: "If it became law, the rules on duplexes, small apartment buildings, lot size, and parking would start one year after the law's effective date.", quote: "starts" },
      },
      {
        label: "Jan 1, 2028",
        line: {
          text: "If it became law, zoning near transit that did not comply by this date would stop applying.",
          quote: "transit-deadline",
          mark: "by January 1, 2028, any noncompliant existing regulation shall become null and void",
        },
      },
    ],
  },
  S2581: {
    author: "team",
    quotes: [
      {
        id: "policy",
        text: "Each public school or district shall adopt a policy regarding the prohibition of student use of a personal electronic device",
      },
      {
        id: "all-day",
        text: "a prohibition on the use and actual possession, strictly on their person, of a personal electronic device by a student during the school day, which shall include, but not be limited to, recess, a lunch period and time in between classes.",
      },
      {
        id: "devices",
        text: "including, but not limited to, mobile phones, tablets, laptops, smartwatches and bluetooth enabled devices; provided, however personal electronic device shall not include school issued or sanctioned devices that are used for a legitimate educational purpose",
      },
      {
        id: "contact",
        text: "at least 1 method for parents and guardians of students to contact students during the school day, including policies for emergency situations when it is urgent, or for a student to contact their parent or caregiver during the school day",
      },
      {
        id: "no-suspension",
        text: "enforcement shall ensure the prevention of inequitable discipline; and provided further, that the discipline for noncompliance outlined in the provisions shall not include the expulsion or suspension of a student",
      },
      {
        id: "iep",
        text: "used in accordance with an individualized education program or an education plan implemented pursuant to section 504 of the Rehabilitation Act of 1973",
      },
      {
        id: "health",
        text: "a healthcare provider provides in writing that the possession or use of a personal electronic device is necessary to treat a health condition of a student",
      },
      { id: "travel", text: "for time spent off school grounds travelling to or from other learning opportunities" },
      {
        id: "grades",
        text: "A school or district policy may include variations that align with the developmental level of students and the structure of the school day in each grade level and school; provided, however, that nothing shall allow student use and actual possession of a personal electronic device, unless clearly authorized under subsection (b).",
      },
      {
        id: "beyond-day",
        text: "Nothing in this section shall limit a district from setting restrictions or standards for use of personal electronic devices on school grounds or during school-sanctioned activities beyond the school day.",
      },
      {
        id: "public-input",
        text: "approved by the school committee, board or other appropriate governing body prior to taking effect; provided, however, that prior to approval, such local governing body shall solicit public input",
      },
      {
        id: "default",
        text: "if no policy is approved by the school committee, board or other appropriate governing body by September 1, the department's model policy shall go into effect until such time as a local policy is approved",
      },
      {
        id: "notify",
        text: "Annually, not later than September 1, each public school shall notify students and the parents or guardians of students attending the school of the policy and make the policy publicly available on its website.",
      },
      { id: "model", text: "The department shall provide guidance, recommendations and a model policy to assist schools and districts" },
      {
        id: "school-year",
        text: "Each public school or district shall adopt a policy regarding the use of personal electronic devices as required by section 102 of chapter 71 of the General Laws before the start of the 2026-2027 school year.",
      },
      {
        id: "report",
        text: "Not later than December 31, 2027, the department of elementary and secondary education shall report to the senate and house committees on ways and means and the joint committee on education",
      },
    ],

    proposes: [
      {
        text: "Every public school or district would have to adopt a policy barring students from using or carrying personal phones and similar devices during the school day, including lunch, recess, and time between classes.",
        quote: "all-day",
      },
      {
        text: "Each policy would have to give parents and guardians at least one way to reach their child during the school day, including in an emergency.",
        quote: "contact",
      },
    ],

    changes: [
      {
        heading: "What the policy would cover",
        lines: [
          {
            text: "It would cover phones, tablets, laptops, smartwatches, and Bluetooth devices, but not devices the school issues for schoolwork.",
            quote: "devices",
          },
          {
            text: "Breaking the policy could not lead to suspension or expulsion, and enforcement would have to prevent unequal discipline.",
            quote: "no-suspension",
          },
          {
            text: "Schools could set different rules for different grades, as long as students still could not use or carry devices except under the listed exceptions.",
            quote: "grades",
          },
          {
            text: "Districts could still set their own device rules for school grounds or activities outside the school day.",
            quote: "beyond-day",
          },
        ],
      },
      {
        heading: "Exceptions",
        lines: [
          {
            text: "A student could use a device if their IEP or 504 plan calls for it.",
            quote: "iep",
          },
          {
            text: "A student could use a device if a healthcare provider says in writing that it is needed to treat a health condition.",
            quote: "health",
          },
          {
            text: "A student could use a device while traveling off school grounds to programs like early college or vocational sites.",
            quote: "travel",
          },
        ],
      },
      {
        heading: "How each policy would be made",
        lines: [
          {
            text: "The school committee or other local board would have to ask for public input before approving the policy.",
            quote: "public-input",
          },
          {
            text: "If no local policy was approved by September 1, the state's model policy would apply until one was.",
            quote: "default",
          },
          {
            text: "The state education department would write guidance and a model policy to help schools.",
            quote: "model",
          },
          {
            text: "Every September, each school would have to tell students and families about the policy and post it online.",
            quote: "notify",
          },
        ],
      },
    ],

    affects: [
      {
        text: "Students in Massachusetts public schools would be covered by a policy barring personal devices during the school day.",
        quote: "policy",
      },
      {
        text: "Students with an IEP, a 504 plan, or a written medical need could be allowed to use a device.",
        quote: "iep",
      },
      {
        text: "School committees would have to approve a policy and ask the public for input first.",
        quote: "public-input",
      },
    ],

    personal: [
      {
        fact: "kids_in_schools",
        when: true,
        effect: "direct",
        lines: [
          {
            text: "Your child could not use or carry a personal phone during the school day, including at lunch and recess, unless an exception applied.",
            quote: "all-day",
          },
          {
            text: "Your child's school would have to give you at least one way to reach your child during the day, including in an emergency.",
            quote: "contact",
          },
        ],
      },
    ],

    takesEffect: [
      {
        label: "Before the 2026-27 school year",
        pastOn: "2026-09-01",
        line: {
          text: "If it became law as saved, schools would have to adopt a policy before the 2026-2027 school year started.",
          quote: "school-year",
        },
      },
      {
        label: "Dec 31, 2027",
        line: { text: "If it became law, the state education department would report to the Legislature on how the policies are working.", quote: "report" },
      },
    ],

    versionNotes: [
      {
        text: "These lines describe the Senate's version. The House passed a different version.",
        action: "For the text of House amendments, see H5366",
      },
      {
        text: "A conference committee from both chambers is working out the differences.",
        action: "Committee of conference appointed - (Peisch-F. Moran-Vieira), in concurrence",
      },
    ],
  },

  H4699: {
    author: "team",
    quotes: [
      {
        id: "commission",
        text: "there shall be a special commission to study and define conditions under which Single-Stair Multi-Family Residential buildings up to six stories shall be legalized in Massachusetts",
      },
      {
        id: "amendment",
        text: "The commission shall produce a building code amendment that allows single-stair multi-family residential buildings of up to six stories, including measures for mitigating any adverse health and safety impacts unique to single-stair multi-family residential buildings.",
      },
      {
        id: "fire",
        text: "Said measures mitigating any adverse health and safety impacts would include general fire prevention measures, including smoke alarms, sprinkler systems, fire-resistant materials, emergency exit strategies",
      },
      { id: "chair", text: "the secretary of housing and livable communities, or their designee, who shall serve as chair" },
      {
        id: "members",
        text: "2 members of the Massachusetts House of Representatives, or their designees, 2 members of Massachusetts Senate, or their designees, 1 member representing the Fire Chiefs Association of Massachusetts, 2 members of the American Institute of Architects, 1 member who is a practicing fire engineer representing the National Fire Protection Association, 2 members representing the Board of Building Regulations and Standards, 1 member representing the American Planning Association Massachusetts Chapter, 1 member representing the Home Builders and Remodelers Association",
      },
      {
        id: "safety-study",
        text: "a technical study into the safety of single-stair residential buildings compared to two-staircase buildings, and a process map and timeline for implementation of drafted building code amendment",
      },
      {
        id: "builds-on",
        text: "The study shall build on the report Legalizing Mid-Rise Single-Stair Housing in Massachusetts produced by the Harvard Joint Center for Housing Studies, Boston Indicators, and Utile",
      },
      {
        id: "deadline",
        text: "Not later than July 31, 2026, the commission shall file its study with the clerks of the house of representatives and the senate and the joint committee on housing.",
      },
    ],

    proposes: [
      {
        text: "A state commission would study when apartment buildings of up to six stories with a single stairway could be allowed in Massachusetts.",
        quote: "commission",
      },
      {
        text: "The commission would draft a building code amendment to allow them, with fire and safety measures.",
        quote: "amendment",
      },
    ],

    changes: [
      {
        heading: "What the commission would do",
        lines: [
          {
            text: "It would compare the safety of single-stair buildings with buildings that have two staircases, and map out how a code change could be put in place.",
            quote: "safety-study",
          },
          {
            text: "Its safety measures would include smoke alarms, sprinklers, fire-resistant materials, and emergency exit plans.",
            quote: "fire",
          },
          {
            text: "It would build on an existing report by the Harvard Joint Center for Housing Studies, Boston Indicators, and Utile.",
            quote: "builds-on",
          },
        ],
      },
      {
        heading: "Who would sit on it",
        lines: [
          { text: "The state housing secretary, or a designee, would chair it.", quote: "chair" },
          {
            text: "Members would include legislators, fire chiefs, architects, a fire engineer, state building regulators, planners, and home builders.",
            quote: "members",
          },
        ],
      },
    ],

    affects: [
      {
        text: "Fire chiefs, architects, fire engineers, building regulators, planners, and home builders would have seats on the commission that drafts the code change.",
        quote: "members",
      },
    ],

    personal: [],

    takesEffect: [
      {
        label: "Jul 31, 2026",
        pastOn: "2026-08-01",
        line: { text: "If it became law as saved, the commission would have to file its study by this date.", quote: "deadline" },
      },
    ],
  },

  H1482: {
    author: "team",
    quotes: [
      {
        id: "fund",
        text: "There shall be an Accessory Dwelling Unit Trust Fund to support low- and moderate-income property owners whose incomes are not more than 110 per cent of median income as determined by the federal Department of Housing and Urban Development build an Accessory Dwelling Unit.",
      },
      {
        id: "eligible",
        text: "A property owner who has an income of up to 110% of the area median income, as defined by the United States Department of Housing and Urban Development",
      },
      {
        id: "forms",
        text: "Funds expended pursuant to this chapter may be in the form of grants, loans or other financial assistance to eligible participants to build an accessory dwelling unit",
      },
      {
        id: "costs",
        text: "pre-development and non-recurring closing costs associated with building an Accessory Dwelling Unit, which may include, but shall not be limited to, architectural and design costs, site preparation, such as clearance or landscaping, utility connection fees, impact fees, permitting fees",
      },
      {
        id: "loans",
        text: "Funds expended pursuant to this chapter may finance low and no interest loans, grants, subsidies, credit enhancements and other financial assistance",
      },
      { id: "minimum", text: "provided, however, that assistance shall be the minimum amount necessary to make a project feasible" },
      {
        id: "admin",
        text: "The fund shall be administered by the Executive Office of Housing and Livable Communities or through contracts with 1 or more of the following administering agencies",
      },
      { id: "nonprofits", text: "may enter into subcontracts with non-profit organizations established pursuant to chapter 180 for those purposes" },
      {
        id: "money",
        text: "There shall be credited to the fund: (i) revenue from appropriations or other money authorized by the general court and specifically designated for the fund; (ii) any gifts, grants, private contributions, repayment of loans",
      },
      { id: "no-revert", text: "Money remaining in the fund at the end of a fiscal year shall not revert to the General Fund." },
    ],

    proposes: [
      {
        text: "A state trust fund would help property owners with incomes up to 110 percent of the area median build an accessory dwelling unit, like an in-law or backyard apartment.",
        quote: "fund",
      },
      {
        text: "Help could come as grants, loans, or other financial assistance.",
        quote: "forms",
      },
    ],

    changes: [
      {
        heading: "What the fund could pay for",
        lines: [
          {
            text: "It could cover early and one-time costs such as design, site preparation, utility hookups, impact fees, and permits.",
            quote: "costs",
          },
          {
            text: "It could also offer low- and no-interest loans, subsidies, and credit enhancements for building these units.",
            quote: "loans",
          },
          {
            text: "Each award would have to be the smallest amount needed to make the project workable.",
            quote: "minimum",
          },
        ],
      },
      {
        heading: "How it would run",
        lines: [
          {
            text: "The state housing office would run it, directly or through one or more state housing agencies.",
            quote: "admin",
          },
          {
            text: "Those agencies could contract with nonprofit organizations to offer the help.",
            quote: "nonprofits",
          },
          {
            text: "Money would come from state appropriations made for the fund, plus gifts, grants, and loan repayments.",
            quote: "money",
          },
          {
            text: "Money left at the end of a fiscal year would stay in the fund.",
            quote: "no-revert",
          },
        ],
      },
    ],

    affects: [
      {
        text: "Property owners with incomes up to 110 percent of the area median would be eligible.",
        quote: "eligible",
      },
    ],

    personal: [
      {
        fact: "owns",
        when: true,
        effect: "direct",
        lines: [
          {
            text: "If your income is at or below 110 percent of the area median, you could qualify for a grant or loan to build an accessory unit on your property.",
            quote: "eligible",
          },
        ],
      },
    ],

    takesEffect: [],
  },
};
