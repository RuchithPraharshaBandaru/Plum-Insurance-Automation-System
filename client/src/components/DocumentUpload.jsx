import { useRef, useState } from 'react';

export default function DocumentUpload({ files, setFiles }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(f =>
      ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)
    );
    setFiles(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="upload-zone-icon">📄</div>
        <div className="upload-zone-text">
          Drop medical documents here or click to browse
        </div>
        <div className="upload-zone-hint">
          Accepts JPG, PNG, WebP, PDF • Max 10MB each • Up to 5 files
        </div>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="uploaded-files">
          {files.map((file, i) => (
            <div key={i} className="uploaded-file">
              <span>{file.type.startsWith('image') ? '🖼️' : '📎'}</span>
              <span>{file.name}</span>
              <span
                className="uploaded-file-remove"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
              >
                ✕
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
