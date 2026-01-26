import { useRef, useState } from 'react';
import './PhotoCapture.css';

export function PhotoCapture({ value, onChange }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(value || null);

  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve(base64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImage(file);
      setPreview(compressed);
      onChange(compressed);
    }
  };

  const handleCapture = () => {
    fileInputRef.current.click();
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="photo-capture">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden-input"
      />

      {preview ? (
        <div className="preview-container">
          <img src={preview} alt="Robot preview" className="preview-image" />
          <button type="button" onClick={handleRemove} className="remove-button">
            Remove Photo
          </button>
        </div>
      ) : (
        <button type="button" onClick={handleCapture} className="capture-button">
          <span className="camera-icon">📷</span>
          <span>Take or Select Photo</span>
        </button>
      )}
    </div>
  );
}
