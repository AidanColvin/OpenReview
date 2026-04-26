import { Article, makeArticle } from './models';

export async function searchCrossref(query: string, engine: string): Promise<Article[]> {
  try {
    // 1. OFFICIAL PUBMED API (Untouched, exactly as it worked in V24)
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
          doi: item.elocationid && item.elocationid.includes('doi:') ? item.elocationid.split('doi: ')[1] : '',
          decision: 'unscreened'
        });
      }).filter(Boolean) as Article[];
    } 
    
    // 2. NEW BULLETPROOF SCHOLAR API (Crossref API - No Rate Limits)
    else {
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&select=title,author,container-title,issued,abstract,DOI&rows=12`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Scholar API Error");
      
      const data = await res.json();
      const items = data.message?.items || [];
      
      return items.map((item: any) => {
        const title = item.title ? item.title[0] : 'Untitled';
        const authors = item.author ? item.author.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) : [];
        const journal = item['container-title'] ? item['container-title'][0] : 'Google Scholar';
        const year = item.issued && item.issued['date-parts'] ? item.issued['date-parts'][0][0] : null;
        
        // Clean up XML tags often found in Crossref abstracts
        let abstract = item.abstract || '';
        abstract = abstract.replace(/<[^>]*>?/gm, '');
        
        return makeArticle({
          title,
          authors,
          journal,
          year,
          abstract,
          doi: item.DOI || '',
          decision: 'unscreened'
        });
      });
    }
  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
}
