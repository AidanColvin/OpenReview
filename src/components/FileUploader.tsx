import React, { useState } from 'react';

/**
 * FileUploader Component
 * Handles multiple uploads for various research formats.
 * Displays human-readable filenames instead of binary strings.
 */
const FileUploader: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // Logic to hold and present numerous files at once
      const selectedFiles = Array.from(event.target.files);
      setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      {/* Task 1 & 2: Updated Display Text and Input Logic */}
      <label htmlFor="file-upload" style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
        Drop a PDF, Docx, RIS, or BibTeX file here or click here to upload from your computer
      </label>
      
      <input
        id="file-upload"
        type="file" multiple={true} accept=".pdf,.docx,.ris,.bib,.zip,.rar,.xlsx,.xls,.csv,.tsv,.png,.jpg"
        multiple={true}
        accept=".pdf,.docx,.ris,.bib,.zip,.rar,.xlsx,.xls,.csv,.tsv,.png,.jpg"
        onChange={handleFileChange}
      />

      <div style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid #333' }}>Articles</h2>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
              {/* Fix: Displays actual filename instead of garbled text */}
              📄 <strong>{file.name}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FileUploader;
