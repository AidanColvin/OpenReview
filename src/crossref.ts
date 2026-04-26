import { Article, makeArticle } from './models';

export async function searchCrossref(query: string, engine: string): Promise<Article[]> {
  try {
    if (engine === 'pubmed') {
      // PUBMED LOGIC (Bulletproof NCBI)
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
          year: item.pubdate ? parseInt(item.pubdate.match(/\d{4}/)?.[0] || '') : null,
          decision: 'unscreened'
        });
      }).filter(Boolean) as Article[];
    } else {
      // SCHOLAR LOGIC (Robust OpenAlex)
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=type:article&per-page=15`;
      const res = await fetch(url);
      const data = await res.json();
      return (data.results || []).map((item: any) => makeArticle({
        title: item.title || 'Untitled',
        authors: item.authorships ? item.authorships.map((a: any) => a.author?.display_name || '').filter(Boolean) : [],
        journal: item.primary_location?.source?.display_name || 'Google Scholar',
        year: item.publication_year || null,
        decision: 'unscreened'
      }));
    }
  } catch (e) { return []; }
}
