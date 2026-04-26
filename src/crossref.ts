import { Article, makeArticle } from './models';

export async function searchCrossref(query: string, engine: string): Promise<Article[]> {
  try {
    // 1. OFFICIAL PUBMED API (Bulletproof, exact match for medical literature)
    if (engine === 'pubmed') {
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
    } 
    
    // 2. GOOGLE SCHOLAR PROXY (Dual-Layer: Semantic Scholar -> Strict Crossref)
    else {
      // LAYER A: Semantic Scholar (Highest quality, mimics Google Scholar's algorithm)
      try {
        const semUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=15&fields=title,authors,venue,year,abstract,externalIds`;
        const semRes = await fetch(semUrl);
        if (!semRes.ok) throw new Error("Rate Limited");
        
        const semData = await semRes.json();
        if (semData.data && semData.data.length > 0) {
          return semData.data.map((item: any) => makeArticle({
            title: item.title || 'Untitled',
            authors: item.authors ? item.authors.map((a: any) => a.name) : [],
            journal: item.venue || 'Google Scholar',
            year: item.year || null,
            abstract: item.abstract || '',
            doi: item.externalIds?.DOI || '',
            decision: 'unscreened'
          }));
        }
      } catch (semError) {
        console.warn("Primary Scholar API blocked. Engaging strict Crossref fallback...");
      }

      // LAYER B: Crossref Fallback (Strictly filtered for 'journal-article' only)
      const crossUrl = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&filter=type:journal-article&select=title,author,container-title,issued,abstract,DOI&rows=15`;
      const crossRes = await fetch(crossUrl);
      if (!crossRes.ok) throw new Error("Scholar API Error");
      
      const crossData = await crossRes.json();
      const items = crossData.message?.items || [];
      
      return items.map((item: any) => {
        const title = item.title ? item.title[0] : 'Untitled';
        const authors = item.author ? item.author.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) : [];
        const journal = item['container-title'] ? item['container-title'][0] : 'Google Scholar';
        const year = item.issued && item.issued['date-parts'] ? item.issued['date-parts'][0][0] : null;
        
        let abstract = item.abstract || '';
        abstract = abstract.replace(/<[^>]*>?/gm, ''); // Strip XML tags
        
        return makeArticle({
          title,
          authors,
          journal,
          year,
          abstract,
          doi: item.DOI || '',
          decision: 'unscreened'
        });
      }).filter((a: Article) => a.title !== 'Untitled' && a.title.length > 5);
    }
  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
}
