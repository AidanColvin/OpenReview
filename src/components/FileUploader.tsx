import React, { useState, useRef } from 'react';

interface ArticleMetadata {
  id: string;
  name: string;
}

const FileUploader: React.FC = () => {
  // This state holds the accumulated list of files
  const [articles, setArticles] = useState<ArticleMetadata[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      // Extract the actual file names
      const newFiles = Array.from(event.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name // Guarantees we show "03.pdf" or the real name, NOT raw binary text
      }));

      // THE FIX: Append new files to the existing list instead of overwriting
      setArticles(prev => [...prev, ...newFiles]);

      // THE FIX: Reset the input so you can click again and add MORE files later
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeArticle = (idToRemove: string) => {
    setArticles(prev => prev.filter(art => art.id !== idToRemove));
  };

  return (
    <div style={{ display: 'flex', gap: '40px', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Left Column: Uploader & Articles */}
      <div style={{ flex: 1 }}>
        <div style={{ border: '2px dashed #ccc', padding: '40px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          <p style={{ fontWeight: 'bold' }}>Drop a PDF, DOCX, RIS, or BibTeX file here, or click here to upload from your computer</p>
          
          <input
            type="file"
            multiple={true} // Allows highlighting multiple files in the window
            accept=".pdf,.docx,.ris,.bib,.zip,.rar,.xlsx,.xls,.csv,.tsv,.png,.jpg"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }} // Hidden because we click the box above it
          />
          
          <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '15px' }}>
            Select multiple files at once — all formats accepted
          </p>
        </div>

        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>Articles</h3>
            <span style={{ color: '#d35400', cursor: 'pointer', fontSize: '0.9rem' }}>Manage →</span>
          </div>
          
          <div style={{ border: '1px solid #eee', borderRadius: '8px', minHeight: '120px', marginTop: '10px' }}>
            {articles.length === 0 ? (
              <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>No articles yet. Upload a file to begin.</p>
            ) : (
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                {articles.map((art) => (
                  <li key={art.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #f5f5f5' }}>
                    <div>
                      <strong style={{ display: 'block', color: '#222' }}>{art.name}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ backgroundColor: '#ffeaa7', color: '#d35400', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>imported</span>
                      <span onClick={() => removeArticle(art.id)} style={{ color: '#ccc', cursor: 'pointer', fontSize: '1.2rem' }}>✕</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Search */}
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '0.9rem', color: '#666', letterSpacing: '1px' }}>SEARCH PAPERS</h3>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input type="text" placeholder="Title, author, keyword..." style={{ flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <button style={{ background: '#222', color: '#fff', padding: '12px 25px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Find</button>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
          Via Google Scholar · click any title to read abstract
        </p>
      </div>

    </div>
  );
};

export default FileUploader;
