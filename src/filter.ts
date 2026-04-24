/**
 * filter.ts
 * Search and filter logic for article arrays. Pure functions only.
 * Given arrays in, returns filtered arrays out. No DOM. No localStorage.
 */

import { Article, Filter } from './models';

/**
 * Given an articles array and a Filter object, returns the filtered articles array.
 */
export function applyFilters(articles: Article[], filters: Filter): Article[] {
  let result = articles;
  if (filters.status) result = filterByDecision(result, filters.status);
  if (filters.tag)    result = filterByTag(result, filters.tag);
  if (filters.query)  result = searchArticles(result, filters.query);
  return result;
}

/**
 * Given an articles array and a decision string, returns articles matching that decision.
 */
export function filterByDecision(articles: Article[], decision: string): Article[] {
  return articles.filter(a => a.decision === decision);
}

/**
 * Given an articles array and a tag string, returns articles containing that tag.
 */
export function filterByTag(articles: Article[], tag: string): Article[] {
  const t = tag.trim().toLowerCase();
  return articles.filter(a => a.tags.some(x => x.toLowerCase() === t));
}

/**
 * Given an articles array and a query string, returns articles matching title or abstract.
 */
export function searchArticles(articles: Article[], query: string): Article[] {
  const q = query.trim().toLowerCase();
  if (!q) return articles;
  return articles.filter(
    a => a.title.toLowerCase().includes(q) || a.abstract.toLowerCase().includes(q),
  );
}

/**
 * Given an articles array, returns a sorted list of all unique tags in use.
 */
export function getAllTags(articles: Article[]): string[] {
  const tags = new Set<string>();
  articles.forEach(a => a.tags.forEach(t => tags.add(t)));
  return [...tags].sort();
}

/**
 * Given an Article and a tag string, returns the Article with that tag added if not already present.
 */
export function addTag(article: Article, tag: string): Article {
  const trimmed = tag.trim();
  if (!trimmed || article.tags.includes(trimmed)) return article;
  return { ...article, tags: [...article.tags, trimmed] };
}

/**
 * Given an Article and a tag string, returns the Article with that tag removed.
 */
export function removeTag(article: Article, tag: string): Article {
  return { ...article, tags: article.tags.filter(t => t !== tag) };
}

/**
 * Given an Article and a notes string, returns the Article with its notes field updated.
 */
export function updateNotes(article: Article, notes: string): Article {
  return { ...article, notes };
}
