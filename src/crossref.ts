import { Article, makeArticle } from './models';

export async function searchCrossref(query: string, engine: string): Promise<Article[]> {
  try {
    // 1. PUBMED API (Official US Gov NCBI E-Utilities)
    if (engine === 'pubmed') {
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=12`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) throw new Error("PubMed API Error");
      
      const searchData = await searchRes.json();
      const ids = searchData.esearchresult?.idlist || [];
      if (ids.length === 0) return [];

      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
      const sumRes = await fetch(summaryUrl);
      const sumData = await sumRes.json();

      return ids.map((id: string) => {
        const item = sumData.result[id];
        if (!item) return null;
        const yearMatch = item.pubdate ? item.pubdate.match(/\d{4}/) : null;
        return makeArticle({
          title: item.title || 'Untitled',
          authors: item.authors ? item.authors.map((a: any) => a.name) : [],
          journal: item.source || 'PubMed',
          year: yearMatch ? parseInt(yearMatch[0]) : null,
          abstract: '',
          decision: 'unscreened'
        });
      }).filter(Boolean);
    } 
    
    // 2. SEMANTIC SCHOLAR API (For Google Scholar, Embase, Cochrane)
    else {
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=12&fields=title,authors,venue,year,abstract,externalIds`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Semantic Scholar API Error");
      
      const data = await res.json();
      return (data.data || []).map((item: any) => makeArticle({
        title: item.title || 'Untitled',
        authors: item.authors ? item.authors.map((a: any) => a.name) : [],
        journal: item.venue || (engine === 'scholar' ? 'Google Scholar' : 'Academic Repository'),
        year: item.year || null,
        abstract: item.abstract || '',
        decision: 'unscreened'
      }));
    }
  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
}
