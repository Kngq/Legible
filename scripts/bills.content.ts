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
};
