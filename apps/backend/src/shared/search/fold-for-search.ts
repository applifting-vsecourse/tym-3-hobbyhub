// Free-text matching shared by the lists that offer a search (events, groups):
// case and diacritics are ignored, every word of the text has to match. Plain
// TypeScript, so a domain may use it; the SQL side is in `folded-search.ts`.

// The form a text is compared in: lower case, no diacritics, no outer spaces.
export const foldForSearch = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// The folded words of a text; every one of them has to match.
export const searchWords = (text?: string): string[] =>
  foldForSearch(text ?? '')
    .split(/\s+/)
    .filter(Boolean);
