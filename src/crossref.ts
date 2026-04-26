import { Article, makeArticle } from './models';

export async function searchCrossref(query: string, engine: string): Promise<Article[]> {
  try {
    if (engine === 'pubmed') {
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=15`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      const ids = searchData.esearchresult?.idlist || [];
      if (ids.length === 0) return [];
      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
      const sumRes = await fetch(summaryUrl);
      const sumData = await sumRes.json();
      return ids.map((id: string) => {
        const item = sumData.result[id];
        return makeArticle({
          title: item.title || 'Untitled',
          authors: item.authors ? item.authors.map((a: any) => a.name) : [],
          journal: item.source || 'PubMed',
          year: item.pubdate ? parseInt(item.pubdate.match(/\d{4}/)?.[0]) : null,
          decision: 'unscreened'
        });
      }).filter(Boolean) as Article[];
    } else {
      // Improved Scholar Logic: English Research focus with abstracts
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=15&fields=title,authors,venue,year,abstract,externalIds`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fallback");
      const data = await res.json();
      return (data.data || []).map((item: any) => makeArticle({
        title: item.title || 'Untitled',
        authors: item.authors ? item.authors.map((a: any) => a.name) : [],
        journal: item.venue || 'Google Scholar',
        year: item.year || null,
        abstract: item.abstract || '',
        decision: 'unscreened'
      }));
    }
  } catch (e) { return []; }
}
