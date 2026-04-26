import { Article, makeArticle } from './models';

export async function searchCrossref(query: string, engine: string): Promise<Article[]> {
  try {
    let finalQuery = query;
    if (engine === 'pubmed') finalQuery = `pubmed ${query}`;
    else if (engine === 'cochrane') finalQuery = `cochrane ${query}`;
    else if (engine === 'embase') finalQuery = `embase ${query}`;
    
    const encoded = encodeURIComponent(finalQuery);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encoded}&limit=10&fields=title,authors,venue,year,abstract`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    return (data.data || []).map((item: any) => makeArticle({
      title: item.title || 'Untitled',
      authors: item.authors ? item.authors.map((a: any) => a.name) : [],
      journal: item.venue || 'Academic Repository',
      year: item.year || null,
      abstract: item.abstract || '',
      decision: 'unscreened'
    }));
  } catch (e) { return []; }
}
