// Words Nine never uses in its own strings or in generated explanations.
// Verbatim quotes from official text are exempt. See product.md.
export const BANNED_WORDS = [
  "should",
  "recommend",
  "good",
  "bad",
  "support",
  "oppose",
] as const;

// Whole-word match with common inflections (recommends, supporting, opposed...).
export const BANNED_PATTERN =
  /\b(should|recommend\w*|good|bad|support\w*|oppos\w*)\b/gi;

export function findBannedWords(text: string): string[] {
  const hits = new Set<string>();
  for (const m of text.matchAll(BANNED_PATTERN)) hits.add(m[0].toLowerCase());
  return [...hits];
}
