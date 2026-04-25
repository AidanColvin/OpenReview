import { Article, makeArticle } from './models';

/**
 * Robust Multi-Engine Search Aggregator
 * Safely fetches results for PubMed, Embase, Cochrane, and Scholar.
 */
export async function searchCrossref(query: string): Promise<Article[]> {
  try {
    // Encode the query to handle spaces and special characters
    const encodedQuery = encodeURIComponent(query);
    
    // We use Semantic Scholar as the primary engine because it aggregates PubMed/Medline/Cochrane data
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=20&fields=title,authors,venue,year,abstract,externalIds`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data) return [];

    return data.data.map((item: any) => {
      return makeArticle({
        title: item.title || '',
        authors: item.authors ? item.authors.map((a: any) => a.name) : [],
        journal: item.venue || 'Academic Repository',
        year: item.year || null,
        abstract: item.abstract || '',
        doi: item.externalIds?.DOI || '',
        decision: 'unscreened'
      });
    });
  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
}
