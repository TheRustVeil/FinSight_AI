import { CATEGORY_KEYWORDS } from 'shared';

interface CategoryMatch {
  categorySlug: string;
  confidence: number;
}

export function categorizeByRules(merchant: string, description?: string | null): CategoryMatch | null {
  const text = `${merchant} ${description ?? ''}`.toLowerCase();

  let bestMatch: CategoryMatch | null = null;

  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        const confidence = keyword.length > 5 ? 0.92 : 0.78;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { categorySlug: slug, confidence };
        }
      }
    }
  }

  return bestMatch;
}
