import { useRef, useEffect } from 'react'

export default function SourcePopup({ sourceType, sourceElement, onSourceChange, onSourceUpload, uploadedImages, onSourceSelectImage, onClose }) {
  const fileInputRef = useRef(null)

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleKey(e) {
    if (e.key === 'Escape') onClose?.()
  }

  return (
    <div className="source-popup-overlay" onClick={onClose}>
      <div className="source-popup" onClick={e => e.stopPropagation()}>
        <div className="source-popup-header">
          <span>Select Source</span>
          <button className="source-popup-close" onClick={onClose}>{'\u2715'}</button>
        </div>
        <div className="source-popup-options">
          <button
            className={`source-popup-option ${sourceType === 'placeholder' ? 'active' : ''}`}
            onClick={() => { onSourceChange('placeholder'); onClose() }}
          >
            Placeholder
          </button>
          <button
            className={`source-popup-option ${sourceType === 'image' && !uploadedImages.length ? 'active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Image
          </button>
          <button
            className={`source-popup-option ${sourceType === 'webcam' ? 'active' : ''}`}
            onClick={() => { onSourceChange('webcam'); onClose() }}
          >
            Webcam
          </button>
        </div>
        {uploadedImages.length > 0 && (
          <div className="source-popup-images">
            <div className="source-popup-images-title">Uploaded Images</div>
            <div className="source-popup-images-grid">
              {uploadedImages.map((img, i) => (
                <button
                  key={i}
                  className={`source-popup-image-item ${sourceType === 'image' && sourceElement === img.element ? 'active' : ''}`}
                  onClick={() => { onSourceSelectImage(img.element); onClose() }}
                >
                  <img src={img.url} alt={img.name} />
                  <span>{img.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              onSourceUpload(file)
              onClose()
            }
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
