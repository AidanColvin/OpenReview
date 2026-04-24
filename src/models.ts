/**
 * models.ts
 * All TypeScript interfaces and factory functions for core data shapes.
 * No I/O. No side effects. Imported by every other module.
 */

export type Decision = 'include' | 'exclude' | 'maybe' | 'unscreened';

export interface Article {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number | null;
  journal: string;
  doi: string;
  decision: Decision;
  tags: string[];
  notes: string;
  screened_at: string | null;
  session_decision: boolean;
}

export interface Filter {
  status: string;
  tag: string;
  query: string;
}

export interface Stats {
  total: number;
  included: number;
  excluded: number;
  maybe: number;
  unscreened: number;
  include_rate: number;
  session_decisions: number;
}

export interface AppState {
  articles: Article[];
  currentId: string | null;
  filters: Filter;
  snackbarFrame: number | null;
  snackbarTimer: number | null;
}

/**
 * Given optional field overrides, returns a new Article with all defaults applied.
 */
export function makeArticle(fields: Partial<Article> = {}): Article {
  return {
    id:               fields.id               ?? crypto.randomUUID(),
    title:            fields.title            ?? '',
    abstract:         fields.abstract         ?? '',
    authors:          fields.authors          ?? [],
    year:             fields.year             ?? null,
    journal:          fields.journal          ?? '',
    doi:              fields.doi              ?? '',
    decision:         fields.decision         ?? 'unscreened',
    tags:             fields.tags             ?? [],
    notes:            fields.notes            ?? '',
    screened_at:      fields.screened_at      ?? null,
    session_decision: fields.session_decision ?? false,
  };
}

/**
 * Given optional filter values, returns a new Filter with all defaults applied.
 */
export function makeFilter(fields: Partial<Filter> = {}): Filter {
  return {
    status: fields.status ?? '',
    tag:    fields.tag    ?? '',
    query:  fields.query  ?? '',
  };
}

/**
 * Given an articles array, returns a Stats snapshot with all progress counts.
 */
export function makeStats(articles: Article[]): Stats {
  const total     = articles.length;
  const included  = articles.filter(a => a.decision === 'include').length;
  const excluded  = articles.filter(a => a.decision === 'exclude').length;
  const maybe     = articles.filter(a => a.decision === 'maybe').length;
  const unscreened = articles.filter(a => a.decision === 'unscreened').length;
  const screened  = total - unscreened;
  const include_rate = screened > 0 ? Math.round((included / screened) * 10000) / 10000 : 0;
  const session_decisions = articles.filter(a => a.session_decision).length;
  return { total, included, excluded, maybe, unscreened, include_rate, session_decisions };
}
