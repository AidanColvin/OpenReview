import React, { useState } from 'react';

interface ArticleMetadata {
  id: string;
  name: string;
}

const FileUploader: React.FC = () => {
  const [articles, setArticles] = useState<ArticleMetadata[]>([]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(f => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name // Fix: Pulls the actual title, not binary data
      }));
      setArticles(prev => [...prev, ...newFiles]);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ flex: 1 }}>
        <div style={{ border: '2px dashed #ccc', padding: '30px', textAlign: 'center' }}>
          <p>Drop a PDF, Docx, RIS, or BibTeX file here or click here to upload from your computer</p>
          <input 
            type="file" 
            multiple 
            accept=".pdf,.docx,.ris,.bib,.zip,.rar,.xlsx,.xls,.csv,.tsv,.png,.jpg" 
            onChange={handleUpload} 
          />
        </div>
        <div style={{ marginTop: '20px' }}>
          <h3>Articles</h3>
          <div style={{ border: '1px solid #eee', padding: '10px', minHeight: '100px' }}>
            {articles.map(art => (
              <div key={art.id} style={{ padding: '5px 0', borderBottom: '1px solid #f9f9f9' }}>
                📄 {art.name}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <h3>SEARCH PAPERS</h3>
        <input type="text" placeholder="Title, author, keyword..." style={{ width: '80%', padding: '8px' }} />
        <button style={{ padding: '8px' }}>Find</button>
        <p style={{ fontSize: '0.8rem', color: '#666' }}>Search using Google Scholar</p>
      </div>
    </div>
  );
};

export default FileUploader;
