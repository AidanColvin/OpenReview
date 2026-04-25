/**
 * parser.ts
 * Parses RIS, BibTeX, PDF, DOCX, CSV, XLSX, ZIP, PNG, JPG into Article objects.
 * DOCX uses JSZip for reliable ZIP extraction.
 */

import { Article, makeArticle } from './models';
import JSZip from 'jszip';

export interface DedupeResult {
  unique: Article[];
  removed: string[];
}

const RIS_FIELD_MAP: Record<string, string> = {
  TI: 'title', T1: 'title',
  AB: 'abstract',
  PY: 'year',   Y1: 'year',
  JO: 'journal', JF: 'journal', T2: 'journal', SO: 'journal',
  DO: 'doi',
  AU: 'authors', A1: 'authors', A2: 'authors',
};

export function parseRIS(text: string): Article[] {
  const articles: Article[] = [];
  let current: Record<string, unknown> = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('ER')) {
      if (Object.keys(current).length) { articles.push(makeArticle(current as Partial<Article>)); current = {}; }
      continue;
    }
    if (line.length < 6) continue;
    const tag = line.slice(0,2).trim(); const value = line.slice(6).trim();
    if (!tag || !value) continue;
    const field = RIS_FIELD_MAP[tag];
    if (!field) continue;
    if (field === 'authors') {
      current['authors'] = [...((current['authors'] as string[]|undefined) ?? []), value];
    } else if (field === 'year') {
      const y = _parseYear(value); if (y) current['year'] = y;
    } else if (!current[field]) { current[field] = value; }
  }
  if (Object.keys(current).length) articles.push(makeArticle(current as Partial<Article>));
  return articles;
}

export function parseBibTeX(text: string): Article[] {
  const entries = [...text.matchAll(/@\w+\s*\{[^@]+?\n\}/gs)].map(m => m[0]);
  return entries.map(entry => {
    const get = (p: string): string | null => {
      const m = entry.match(new RegExp(p+'\\s*=\\s*\\{([^}]*)\\}','i'))
             ?? entry.match(new RegExp(p+'\\s*=\\s*"([^"]*)"','i'));
      return m ? m[1].replace(/\s+/g,' ').replace(/[{}]/g,'').trim() : null;
    };
    const ar = get('author');
    return makeArticle({
      title:    get('title')                       ?? '',
      abstract: get('abstract')                    ?? '',
      journal:  get('journal|booktitle|publisher') ?? '',
      doi:      get('doi')                         ?? '',
      year:     _parseYear(get('year') ?? ''),
      authors:  ar ? ar.split(/\s+and\s+/i).map(a => a.trim()) : [],
    });
  });
}

/**
 * Given a DOCX File, uses JSZip to extract word/document.xml and return Article objects.
 */
export async function parseDocx(file: File): Promise<Article[]> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // Try to get title from core properties
  let title = '';
  const core = zip.file('docProps/core.xml');
  if (core) {
    const coreXml = await core.async('string');
    const tm = coreXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    if (tm) title = tm[1].trim();
  }

  // Extract body text from document.xml
  let bodyText = '';
  const doc = zip.file('word/document.xml');
  if (doc) {
    const xml = await doc.async('string');
    // Extract all <w:t> text nodes
    const texts: string[] = [];
    for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)) {
      const t = m[1].trim();
      if (t) texts.push(t);
    }
    // Group by paragraphs
    const paragraphs: string[] = [];
     //  // let para = '';
    const parts = xml.split(/<w:p[ >]/);
    for (const part of parts) {
      const ts: string[] = [];
      for (const m of part.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)) {
        const t = m[1];
        if (t.trim()) ts.push(t);
      }
      if (ts.length) paragraphs.push(ts.join(''));
    }
    bodyText = paragraphs.join('\n');

    // Use first meaningful paragraph as title if not found in metadata
    if (!title) {
      title = paragraphs.find(p => p.trim().length > 3 && p.trim().length < 300) ?? '';
    }
  }

  return [makeArticle({
    title:    title || file.name.replace(/\.docx$/i,''),
    abstract: bodyText.slice(0, 2000),
    journal:  file.name,
  })];
}

/**
 * Given a PDF File, extracts text strings from PDF content streams.
 */
export async function parsePdf(file: File): Promise<Article[]> {
  const buf = await file.arrayBuffer();
  const latin = new TextDecoder('windows-1252').decode(buf);

  let title = '';
  const tm = latin.match(/\/Title\s*\(([^)]{1,300})\)/);
  if (tm) title = _pdfDecode(tm[1]);

  const strings: string[] = [];
  for (const m of latin.matchAll(/\(([^)]{3,300})\)\s*Tj/g)) {
    const s = _pdfDecode(m[1]);
    if (_isPrintable(s)) strings.push(s);
  }
  for (const m of latin.matchAll(/\[([^\]]{1,600})\]\s*TJ/g)) {
    for (const sub of m[1].matchAll(/\(([^)]{2,200})\)/g)) {
      const s = _pdfDecode(sub[1]);
      if (_isPrintable(s)) strings.push(s);
    }
  }

  const body = strings.join(' ').replace(/\s+/g,' ').trim();
  if (!title) title = strings.find(s => s.length > 4 && s.length < 200) ?? file.name.replace(/\.pdf$/i,'');

  return [makeArticle({ title, abstract: body.slice(0,2000), journal: file.name })];
}

/**
 * Given a CSV or TSV File, creates one Article per non-empty row using the first column as title.
 */
export async function parseCsv(file: File): Promise<Article[]> {
  const text = await file.text();
  const sep  = file.name.toLowerCase().endsWith('.tsv') ? '\t' : ',';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  const header = lines[0].split(sep).map(h => h.replace(/^"|"$/g,'').toLowerCase());
  const titleIdx    = header.findIndex(h => h.includes('title'));
  const abstractIdx = header.findIndex(h => h.includes('abstract'));
  const authorIdx   = header.findIndex(h => h.includes('author'));
  const yearIdx     = header.findIndex(h => h.includes('year'));
  const journalIdx  = header.findIndex(h => h.includes('journal') || h.includes('source'));

  return lines.slice(1).map(line => {
    const cols = line.split(sep).map(c => c.replace(/^"|"$/g,'').trim());
    return makeArticle({
      title:    cols[titleIdx]    ?? cols[0] ?? '',
      abstract: cols[abstractIdx] ?? '',
      authors:  cols[authorIdx]   ? [cols[authorIdx]] : [],
      year:     _parseYear(cols[yearIdx] ?? ''),
      journal:  cols[journalIdx]  ?? file.name,
    });
  }).filter(a => a.title.length > 0);
}

/**
 * Given an XLSX/XLS File, extracts rows using basic XML parsing from the ZIP structure.
 */
export async function parseXlsx(file: File): Promise<Article[]> {
  try {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    // Read shared strings
    const sharedStrings: string[] = [];
    const ssFile = zip.file('xl/sharedStrings.xml');
    if (ssFile) {
      const xml = await ssFile.async('string');
      for (const m of xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)) {
        sharedStrings.push(m[1]);
      }
    }

    // Read first sheet
    const sheet = zip.file('xl/worksheets/sheet1.xml');
    if (!sheet) return [makeArticle({ title: file.name, journal: file.name })];

    const xml  = await sheet.async('string');
    const rows: string[][] = [];
    for (const rowMatch of xml.matchAll(/<row[^>]*>(.*?)<\/row>/gs)) {
      const cells: string[] = [];
      for (const cellMatch of rowMatch[1].matchAll(/<c[^>]*(?:t="s"[^>]*)?>.*?<v>(\d+)<\/v>|<c[^>]*>.*?<v>([^<]*)<\/v>/gs)) {
        if (cellMatch[1] !== undefined) {
          cells.push(sharedStrings[parseInt(cellMatch[1])] ?? '');
        } else {
          cells.push(cellMatch[2] ?? '');
        }
      }
      if (cells.some(c => c.trim())) rows.push(cells);
    }

    if (rows.length < 2) return [makeArticle({ title: file.name, journal: file.name })];

    const header  = rows[0].map(h => h.toLowerCase());
    const titleIdx    = header.findIndex(h => h.includes('title'));
    const abstractIdx = header.findIndex(h => h.includes('abstract'));
    const authorIdx   = header.findIndex(h => h.includes('author'));
    const yearIdx     = header.findIndex(h => h.includes('year'));

    return rows.slice(1).map(row => makeArticle({
      title:    row[titleIdx]    ?? row[0] ?? file.name,
      abstract: row[abstractIdx] ?? '',
      authors:  row[authorIdx]   ? [row[authorIdx]] : [],
      year:     _parseYear(row[yearIdx] ?? ''),
      journal:  file.name,
    })).filter(a => a.title.length > 0);
  } catch {
    return [makeArticle({ title: file.name, journal: file.name })];
  }
}

/**
 * Given a ZIP File, extracts and parses any RIS or BibTeX files inside it.
 */
export async function parseZip(file: File): Promise<Article[]> {
  const buf     = await file.arrayBuffer();
  const zip     = await JSZip.loadAsync(buf);
  const results: Article[] = [];

  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const lower = name.toLowerCase();
    if (lower.endsWith('.ris')) {
      const text = await entry.async('string');
      results.push(...parseRIS(text));
    } else if (lower.endsWith('.bib')) {
      const text = await entry.async('string');
      results.push(...parseBibTeX(text));
    } else if (lower.endsWith('.docx')) {
      const blob = await entry.async('blob');
      const f    = new File([blob], name);
      results.push(...await parseDocx(f));
    }
  }

  if (!results.length) results.push(makeArticle({ title: file.name, journal: file.name }));
  return results;
}

/**
 * Given an image File (PNG or JPG), creates a placeholder Article using the filename as title.
 */
export function parseImage(file: File): Article[] {
  const title = file.name.replace(/\.(png|jpe?g)$/i, '').replace(/[-_]/g, ' ');
  return [makeArticle({ title: title || file.name, journal: file.name })];
}

export function deduplicateArticles(articles: Article[]): DedupeResult {
  const seenDois   = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: Article[]  = [];
  const removed: string[]  = [];
  for (const a of articles) {
    const doi   = (a.doi || "").trim().toLowerCase();
    const title = (a.title || "").trim().toLowerCase();
    if (doi   && seenDois.has(doi))     { removed.push(a.doi);   continue; }
    if (title && seenTitles.has(title)) { removed.push(a.title); continue; }
    if (doi)   seenDois.add(doi);
    if (title) seenTitles.add(title);
    unique.push(a);
  }
  return { unique, removed };
}

function _parseYear(value: string): number | null {
  if (!value) return null;
  const m = String(value).match(/\d{4}/);
  if (!m) return null;
  const y = parseInt(m[0], 10);
  return y >= 1000 && y <= 2100 ? y : null;
}

function _pdfDecode(s: string): string {
  return s
    .replace(/\\n/g,' ').replace(/\\r/g,' ').replace(/\\t/g,' ')
    .replace(/\\\\/g,'\\').replace(/\\\(/g,'(').replace(/\\\)/g,')')
    .replace(/[^\x20-\x7E]/g,'').trim();
}

function _isPrintable(s: string): boolean {
  if (!s || s.length < 2) return false;
  const printable = (s.match(/[\x20-\x7E]/g) ?? []).length;
  return printable / s.length > 0.7;
}
