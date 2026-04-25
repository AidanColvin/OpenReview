import React, { useState } from 'react';

const FileUploader: React.FC = () => {
  const [articles, setArticles] = useState<File[]>([]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      // Phase 5: Append to list so previous files do not disappear
      setArticles((prev) => [...prev, ...newFiles]);
    }
  };

  return (
    <div className="uploader-container">
      <label htmlFor="file-upload" className="upload-label">
        {/* Phase 2: Exact Text Matching */}
        Drop a PDF, Docx, RIS, or BibTeX file here or click here to upload from your computer
      </label>
      <input
        id="file-upload"
        type="file"
        // Phase 1: Multiple uploads and specific formats
        multiple
        accept=".pdf,.docx,.ris,.bib,.zip,.rar,.xlsx,.xls,.csv,.tsv,.png,.jpg"
        onChange={handleUpload}
        style={{ display: 'none' }}
      />

      <div className="articles-section">
        <h3>Articles</h3>
        <ul>
          {articles.map((file, index) => (
            // Phase 3: Using file.name to avoid garbled binary text
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FileUploader;
