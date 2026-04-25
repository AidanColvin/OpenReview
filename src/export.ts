/**
 * export.ts
 * Generates downloadable CSV, RIS, and JSON files from article data.
 * All functions are pure except for _download() which triggers a browser save dialog.
 * No localStorage. No DOM reads.
 */

import { Article } from './models';

/**
 * Given an articles array, generates and downloads a CSV file.
 */
export function exportCSV(articles: Article[]): void {
  const headers = [
    'id','title','abstract','authors','year',
    'journal','doi','decision','tags','notes','screened_at',
  ];
  const rows = articles.map(a =>
    [
      a.id, a.title, a.abstract,
      a.authors.join('; '),
      a.year ?? '',
      a.journal, a.doi, a.decision,
      a.tags.join('; '),
      a.notes,
      a.screened_at ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
  );
  download([headers.join(','), ...rows].join('\n'), 'openreview_export.csv', 'text/csv');
}

/**
 * Given an articles array and an optional decision filter, generates and downloads a RIS file.
 */
export function exportRIS(articles: Article[], decision: string | null = null): void {
  const filtered = decision ? articles.filter(a => a.decision === decision) : articles;
  const lines: string[] = [];

  for (const a of filtered) {
    lines.push('TY  - JOUR');
    if (a.title)    lines.push(`TI  - ${(a.title && /\.(pdf|docx?|zip|rar|png|jpg|csv|xlsx?)$/i.test(a.title) && a.abstract) ? a.abstract.substring(0, 120) + "..." : a.title}`);
    a.authors.forEach(au => lines.push(`AU  - ${au}`));
    if (a.abstract) lines.push(`AB  - ${(a.title && /\.(pdf|docx?|zip|rar|png|jpg|csv|xlsx?)$/i.test(a.title) && a.abstract) ? a.title : a.abstract}`);
    if (a.year)     lines.push(`PY  - ${a.year}`);
    if (a.journal)  lines.push(`JO  - ${a.journal}`);
    if (a.doi)      lines.push(`DO  - ${a.doi}`);
    lines.push('ER  - ', '');
  }

  download(lines.join('\n'), 'openreview_export.ris', 'text/plain');
}

/**
 * Given an articles array, generates and downloads a JSON file.
 */
export function exportJSON(articles: Article[]): void {
  download(JSON.stringify(articles, null, 2), 'openreview_export.json', 'application/json');
}

/**
 * Given content, a filename, and a MIME type, triggers a browser file download.
 */
function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
