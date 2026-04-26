import { Article, makeArticle } from './models';
export async function searchCrossref(query: string): Promise<Article[]> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=12&fields=title,authors,venue,year,abstract`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return (data.data || []).map((item: any) => makeArticle({
      title: item.title || 'Untitled',
      authors: item.authors ? item.authors.map((a: any) => a.name) : [],
      journal: item.venue || 'Academic Database',
      year: item.year || null,
      abstract: item.abstract || '',
      decision: 'unscreened'
    }));
  } catch (e) { 
    console.error("Semantic Scholar API connection lost.");
    throw e; 
  }
}
