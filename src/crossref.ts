import { Article, makeArticle } from './models';
export async function searchCrossref(query: string, engine: string = 'pubmed'): Promise<Article[]> {
  try {
    let finalQuery = query;
    if (engine === 'pubmed') finalQuery = `source:pubmed ${query}`;
    else if (engine === 'embase') finalQuery = `venue:embase ${query}`;
    else if (engine === 'cochrane') finalQuery = `venue:cochrane ${query}`;
    
    const encoded = encodeURIComponent(finalQuery);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encoded}&limit=12&fields=title,authors,venue,year,abstract,externalIds`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return (data.data || []).map((item: any) => makeArticle({
      title: item.title || 'Untitled',
      authors: item.authors ? item.authors.map((a: any) => a.name) : [],
      journal: item.venue || 'Academic Database',
      year: item.year || null,
      abstract: item.abstract || '',
      doi: item.externalIds?.DOI || '',
      decision: 'unscreened'
    }));
  } catch (e) { return []; }
}
