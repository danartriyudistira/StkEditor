export default function Toolbar({
  onNew,
  onOpen,
  onDownload,
  onLoadFromLibrary,
  onSendToTV,
  fileName,
  tvConnected,
  libraryFiles,
}) {
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
