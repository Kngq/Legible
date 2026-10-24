// Matches a question asking how to vote or which side to take, so the app
// can show the fixed response locally (or server-side, as a second check)
// without ever asking the model to weigh in. See product.md.
const VOTE_PATTERN =
  /\b(how (should|do) i vote|which (way|side) (should|do)|what (should|would) i vote|vote (yes|no)\b|yes or no\??$|should i vote|who should i vote for)\b/i;

export function asksHowToVote(question: string): boolean {
  return VOTE_PATTERN.test(question.trim());
}

export const VOTE_FIXED_RESPONSE =
  "Nine doesn't say how to vote or which side to take. It can tell you what changes under YES or under NO, in the official text's own words — ask it that way.";
