import React, { useState } from 'react';

interface Article {
  id: string;
  name: string;
  type: string;
}

const FileUploader: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name, // Fix: Use .name to avoid garbled binary text
        type: file.type
      }));
      setArticles(prev => [...prev, ...newFiles]);
    }
  };

  return (
    <div className="uploader-container" style={{ display: 'flex', gap: '40px', padding: '20px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ border: '2px dashed #ccc', padding: '40px', textAlign: 'center', borderRadius: '8px' }}>
          <p>Drop a PDF, Docx, RIS, or BibTeX file here or click here to upload from your computer</p>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.ris,.bib,.zip,.rar,.xlsx,.xls,.csv,.tsv,.png,.jpg"
            onChange={handleFileChange}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3>Articles <span style={{ float: 'right', fontSize: '0.8rem', color: 'blue', cursor: 'pointer' }}>Manage →</span></h3>
          <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '10px', minHeight: '100px' }}>
            {articles.length === 0 ? (
              <p style={{ color: '#999' }}>No articles yet. Upload a file or search on the right.</p>
            ) : (
              articles.map(art => (
                <div key={art.id} style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📄 {art.name}</span>
                  <span style={{ color: '#ff4d4f', cursor: 'pointer' }}>✕</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h3>SEARCH PAPERS</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="Title, author, keyword..." style={{ flex: 1, padding: '8px' }} />
          <button style={{ background: '#222', color: '#fff', padding: '8px 20px', borderRadius: '4px' }}>Find</button>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
          Search using Google Scholar · click a title to read abstract
        </p>
      </div>
    </div>
  );
};

export default FileUploader;
