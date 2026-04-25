import { Article, makeArticle } from './models';

export async function searchCrossref(query: string): Promise<Article[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    // Semantic Scholar is the best aggregator for PubMed/Medline/Cochrane
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=15&fields=title,authors,venue,year,abstract,externalIds`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("API Error");

    const data = await response.json();
    if (!data.data) return [];

    return data.data.map((item: any) => makeArticle({
      title: item.title || 'Untitled',
      authors: item.authors ? item.authors.map((a: any) => a.name) : [],
      journal: item.venue || 'Academic Repository',
      year: item.year || null,
      abstract: item.abstract || '',
      doi: item.externalIds?.DOI || '',
      decision: 'unscreened'
    }));
  } catch (error) {
    console.error("Search Error:", error);
    return []; // Return empty instead of crashing
  }
}
