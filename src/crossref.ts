/**
 * crossref.ts
 * Searches the Semantic Scholar API for academic papers.
 * Same paper index as Google Scholar. No API key required.
 * Pure functions. No DOM. No side effects.
 */

import { Article, makeArticle } from './models';

interface S2Author { name: string }
interface S2Paper {
  paperId: string;
  title: string;
  abstract: string | null;
  year: number | null;
  authors: S2Author[];
  venue: string | null;
  externalIds: { DOI?: string } | null;
}
interface S2Response { data: S2Paper[] }

/**
 * Given a search query, returns up to 10 Article objects from the Semantic Scholar API.
 */
export async function searchCrossref(query: string): Promise<Article[]> {
  const params = new URLSearchParams({
    query: query.trim(),
    limit: '10',
    fields: 'title,abstract,year,authors,venue,externalIds',
  });
  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`
  );
  if (!res.ok) throw new Error(`Search error: ${res.status}`);
  const data = await res.json() as S2Response;
  return (data.data ?? []).map(paperToArticle);
}

/**
 * Given a Semantic Scholar paper object, returns a normalized Article.
 */
function paperToArticle(p: S2Paper): Article {
  return makeArticle({
    title:    p.title                              ?? '',
    abstract: p.abstract                          ?? '',
    authors:  (p.authors ?? []).map(a => a.name),
    year:     p.year                              ?? null,
    journal:  p.venue                             ?? '',
    doi:      p.externalIds?.DOI                  ?? '',
  });
}
