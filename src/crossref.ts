/**
 * crossref.ts
 * Searches the Crossref REST API for academic papers.
 * No authentication required. Pure functions. No DOM. No side effects.
 */

import { Article, makeArticle } from './models';

interface CrossrefAuthor {
  given?: string;
  family?: string;
}

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  author?: CrossrefAuthor[];
  abstract?: string;
  published?: { 'date-parts': number[][] };
  'container-title'?: string[];
}

interface CrossrefResponse {
  status: string;
  message: { items: CrossrefWork[] };
}

/**
 * Given a search query, returns up to 10 Article objects from the Crossref API.
 */
export async function searchCrossref(query: string): Promise<Article[]> {
  const params = new URLSearchParams({
    query: query.trim(),
    rows: '10',
    select: 'DOI,title,author,abstract,published,container-title',
  });
  const res = await fetch(`https://api.crossref.org/works?${params.toString()}`);
  if (!res.ok) throw new Error(`Crossref error: ${res.status}`);
  const data = await res.json() as CrossrefResponse;
  return data.message.items.map(workToArticle);
}

/**
 * Given a CrossrefWork, returns a normalized Article object.
 */
function workToArticle(w: CrossrefWork): Article {
  const authors = (w.author ?? []).map(a =>
    [a.given, a.family].filter(Boolean).join(' ')
  );
  return makeArticle({
    title:    w.title?.[0]                                 ?? '',
    abstract: (w.abstract ?? '').replace(/<[^>]+>/g, '').trim(),
    authors,
    year:     w.published?.['date-parts']?.[0]?.[0]       ?? null,
    journal:  w['container-title']?.[0]                   ?? '',
    doi:      w.DOI                                       ?? '',
  });
}
