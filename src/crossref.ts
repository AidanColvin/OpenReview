import { Article, makeArticle } from './models';

export async function searchCrossref(query: string, engine: string): Promise<Article[]> {
  try {
    if (engine === 'pubmed') {
      // 1. PUBMED LOGIC (UNTOUCHED)
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=15`;
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
          doi: item.elocationid && item.elocationid.includes('doi:') ? item.elocationid.split('doi: ')[1] : '',
          decision: 'unscreened'
        });
      }).filter(Boolean) as Article[];
    } else {
      // 2. GOOGLE SCHOLAR REPLACEMENT (OPENALEX API)
      // OpenAlex is an academic-only database. It ignores non-research documents.
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=type:article&per-page=15`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Scholar API Error");
      
      const data = await res.json();
      const items = data.results || [];
      
      return items.map((item: any) => {
        const title = item.title || 'Untitled';
        const authors = item.authorships ? item.authorships.map((a: any) => a.author?.display_name || '').filter(Boolean) : [];
        const journal = item.primary_location?.source?.display_name || 'Google Scholar';
        const year = item.publication_year || null;
        
        return makeArticle({
          title,
          authors,
          journal,
          year,
          abstract: '',
          doi: item.doi ? item.doi.replace('https://doi.org/', '') : '',
          decision: 'unscreened'
        });
      }).filter((a: Article) => a.title !== 'Untitled');
    }
  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
}
