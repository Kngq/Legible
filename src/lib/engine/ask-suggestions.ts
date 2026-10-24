// Starter questions for the Ask sheet. Each is neutral, contains nothing about
// the person (so tapping one never reveals an answer from their profile), and
// names the quote that answers it, so the official text can always reply.
export interface Suggestion {
  q: string;
  /** The quote that answers it. Tests check it exists on the measure. */
  quoteId: string;
}

export const ASK_SUGGESTIONS: Record<string, Suggestion[]> = {
  "ballot-2026-q1": [
    { q: "Which offices would the Public Records Law cover?", quoteId: "q1-c1" },
    { q: "Which records would stay exempt?", quoteId: "q1-c2" },
    { q: "What does a NO vote keep?", quoteId: "q1-no" },
  ],
  "ballot-2026-q2": [
    { q: "Who could bargain collectively under this?", quoteId: "q2-c1" },
    { q: "How would an agreement be funded?", quoteId: "q2-c2" },
    { q: "What does a NO vote keep?", quoteId: "q2-no" },
  ],
  "ballot-2026-q3": [
    { q: "How would the single primary work?", quoteId: "q3-c1" },
    { q: "How many candidates would advance to November?", quoteId: "q3-c2" },
    { q: "What does a NO vote keep?", quoteId: "q3-no" },
  ],
  "ballot-2026-q4": [
    { q: "How would registering on Election Day work?", quoteId: "q4-c1" },
    { q: "When would this take effect?", quoteId: "q4-c2" },
    { q: "What does a NO vote keep?", quoteId: "q4-no" },
  ],
  "ballot-2026-q5": [
    { q: "How would the revenue limit be set?", quoteId: "q5-c1" },
    { q: "What happens to revenue above the limit?", quoteId: "q5-c2" },
    { q: "What does the fiscal statement say?", quoteId: "q5-fiscal" },
  ],
  "ballot-2026-q6": [
    { q: "Where would the fund's money come from?", quoteId: "q6-c1" },
    { q: "Who could receive money from the fund?", quoteId: "q6-c2" },
    { q: "What does a NO vote keep?", quoteId: "q6-no" },
  ],
  "ballot-2026-q7": [
    { q: "Which lots would qualify?", quoteId: "q7-c1" },
    { q: "What could cities and towns still regulate?", quoteId: "q7-c3" },
    { q: "What does a NO vote keep?", quoteId: "q7-no" },
  ],
  "ballot-2026-q8": [
    { q: "What would change about retail sales?", quoteId: "q8-c1" },
    { q: "Could adults still possess marijuana?", quoteId: "q8-c2" },
    { q: "What happens to the Cannabis Control Commission?", quoteId: "q8-c3" },
  ],
  "ballot-2026-q9": [
    { q: "What does the law require for serial numbers?", quoteId: "q9-c1" },
    { q: "What age limit does the law set?", quoteId: "q9-c2" },
    { q: "What happens under a NO vote?", quoteId: "q9-no" },
  ],
};

/** For the whole ballot: one question per subject people ask about most. Ids are "measureId:quoteId". */
export const BALLOT_SUGGESTIONS: { q: string; measureId: string; quoteId: string }[] = [
  { q: "What does Question 4 change about registering to vote?", measureId: "ballot-2026-q4", quoteId: "q4-c1" },
  { q: "What does Question 7 change about single-family homes?", measureId: "ballot-2026-q7", quoteId: "q7-c1" },
  { q: "What happens under a NO vote on Question 9?", measureId: "ballot-2026-q9", quoteId: "q9-no" },
];
