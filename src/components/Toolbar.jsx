import { useRef } from 'react'

export default function Toolbar({
  onNew,
  onOpen,
  onDownload,
  onLoadFromLibrary,
  onSendToTV,
  fileName,
  tvConnected,
  libraryFiles,
  sourceType,
  onSourceChange,
  onSourceUpload,
}) {
  const fileInputRef = useRef(null)

  return (
    <div className="toolbar">
      <span className="toolbar-title">
        {fileName || 'untitled.fs'}
      </span>

      <div className="toolbar-actions">
        <button onClick={onNew} title="New shader">
          New
        </button>

        <button onClick={onOpen} title="Open shader file (.stk)">
          Open
        </button>

        <button onClick={onDownload} title="Download shader">
          Download
        </button>

        {libraryFiles && libraryFiles.length > 0 && (
          <button onClick={onLoadFromLibrary} title="Browse ISF library">
            Library
          </button>
        )}

        <div className="toolbar-separator" />

        {/* Source Input Picker */}
        <div className="source-picker">
          <button
            className={`source-btn ${sourceType !== 'placeholder' ? 'active' : ''}`}
            title="Source input for ISF shaders"
          >
            {sourceType === 'webcam' ? '📷' : sourceType === 'image' ? '🖼️' : '🎨'} Source
          </button>
          <div className="source-dropdown">
            <button
              className={sourceType === 'placeholder' ? 'active' : ''}
              onClick={() => onSourceChange('placeholder')}
            >
              🎨 Placeholder
            </button>
            <button
              className={sourceType === 'image' ? 'active' : ''}
              onClick={() => fileInputRef.current?.click()}
            >
              🖼️ Upload Image
            </button>
            <button
              className={sourceType === 'webcam' ? 'active' : ''}
              onClick={() => onSourceChange('webcam')}
            >
              📷 Webcam
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onSourceUpload(file)
              e.target.value = ''
            }}
          />
        </div>

        <div className="toolbar-separator" />

        <button
          onClick={onSendToTV}
          title="Send to TV"
          className={tvConnected ? 'tv-connected' : ''}
        >
          {tvConnected ? 'TV ✓' : 'Send to TV'}
        </button>
      </div>
    </div>
  )
}
