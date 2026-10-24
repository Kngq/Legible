// Pure text normalization and quote location. No React, no network.

/** Normalize text so that a quote and its source compare word for word. */
export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/-\s*\n\s*/g, "") // words hyphenated across line breaks
    .replace(/\s+/g, " ")
    .trim();
}

export interface Located {
  page: number; // 1-indexed
  index: number; // start offset in the normalized page
}

/**
 * Find a quote in page text. Checks the stated page first, then every page.
 * Returns null when the quote appears nowhere.
 */
export function locateQuote(
  quote: string,
  pages: string[],
  statedPage?: number,
): Located | null {
  const q = normalize(quote);
  if (!q) return null;
  const order: number[] = [];
  if (statedPage && statedPage >= 1 && statedPage <= pages.length) order.push(statedPage - 1);
  for (let i = 0; i < pages.length; i++) if (i !== statedPage! - 1) order.push(i);
  for (const i of order) {
    const idx = normalize(pages[i]).indexOf(q);
    if (idx >= 0) return { page: i + 1, index: idx };
  }
  return null;
}
