/**
 * parser.ts
 * Parses RIS and BibTeX citation file text into Article objects.
 * Pure functions only. No I/O. No DOM. No side effects.
 */

import { Article, makeArticle } from './models';

export interface DedupeResult {
  unique: Article[];
  removed: string[];
}

const RIS_FIELD_MAP: Record<string, string> = {
  TI: 'title',   T1: 'title',
  AB: 'abstract',
  PY: 'year',    Y1: 'year',
  JO: 'journal', JF: 'journal', T2: 'journal', SO: 'journal',
  DO: 'doi',
  AU: 'authors', A1: 'authors', A2: 'authors',
};

/**
 * Given raw RIS file text, returns an array of Article objects.
 */
export function parseRIS(text: string): Article[] {
  const articles: Article[] = [];
  let current: Record<string, unknown> = {};

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('ER')) {
      if (Object.keys(current).length) {
        articles.push(makeArticle(current as Partial<Article>));
        current = {};
      }
      continue;
    }

    if (line.length < 6) continue;
    const tag   = line.slice(0, 2).trim();
    const value = line.slice(6).trim();
    if (!tag || !value) continue;

    const field = RIS_FIELD_MAP[tag];
    if (!field) continue;

    if (field === 'authors') {
      const existing = (current['authors'] as string[] | undefined) ?? [];
      current['authors'] = [...existing, value];
    } else if (field === 'year') {
      const y = parseYear(value);
      if (y !== null) current['year'] = y;
    } else if (!current[field]) {
      current[field] = value;
    }
  }

  if (Object.keys(current).length) articles.push(makeArticle(current as Partial<Article>));
  return articles;
}

/**
 * Given raw BibTeX file text, returns an array of Article objects.
 */
export function parseBibTeX(text: string): Article[] {
  const entries = [...text.matchAll(/@\w+\s*\{[^@]+?\n\}/gs)].map(m => m[0]);
  return entries.map(entry => {
    const get = (pattern: string): string | null => {
      const re1 = new RegExp(pattern + '\\s*=\\s*\\{([^}]*)\\}', 'i');
      const re2 = new RegExp(pattern + '\\s*=\\s*"([^"]*)"', 'i');
      const m   = entry.match(re1) ?? entry.match(re2);
      return m ? m[1].replace(/\s+/g, ' ').replace(/[{}]/g, '').trim() : null;
    };

    const authorRaw = get('author');
    return makeArticle({
      title:    get('title')                         ?? '',
      abstract: get('abstract')                      ?? '',
      journal:  get('journal|booktitle|publisher')   ?? '',
      doi:      get('doi')                           ?? '',
      year:     parseYear(get('year') ?? ''),
      authors:  authorRaw
        ? authorRaw.split(/\s+and\s+/i).map(a => a.trim())
        : [],
    });
  });
}

/**
 * Given an articles array, returns a deduplicated array and a list of removed identifiers.
 */
export function deduplicateArticles(articles: Article[]): DedupeResult {
  const seenDois   = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: Article[]  = [];
  const removed: string[]  = [];

  for (const a of articles) {
    const doi   = a.doi.trim().toLowerCase();
    const title = a.title.trim().toLowerCase();

    if (doi   && seenDois.has(doi))     { removed.push(a.doi);   continue; }
    if (title && seenTitles.has(title)) { removed.push(a.title); continue; }

    if (doi)   seenDois.add(doi);
    if (title) seenTitles.add(title);
    unique.push(a);
  }

  return { unique, removed };
}

/**
 * Given a year string, returns an integer year or null if unparseable.
 */
function parseYear(value: string): number | null {
  if (!value) return null;
  const m = String(value).match(/\d{4}/);
  if (!m) return null;
  const y = parseInt(m[0], 10);
  return y >= 1000 && y <= 2100 ? y : null;
}
