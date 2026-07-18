import { useRef, useState } from 'react'

export default function Toolbar({

  onLoadFromLibrary,
  onSendToConsole,
  consoleConfig,
  onConsoleConfigChange,
  projectName,
  onProjectNameChange,
  onImportStk,
  consoleConnected,
  libraryFiles,
  sourceType,
  onSourceChange,
  onSourceUpload,
  onSavePreset,
  onLoadPreset,
}) {
  const fileInputRef = useRef(null)
  const [showConfig, setShowConfig] = useState(false)
  const [configDraft, setConfigDraft] = useState({ host: '', port: '' })

  function openConfig() {
    setConfigDraft({ host: consoleConfig.host, port: String(consoleConfig.port) })
    setShowConfig(true)
  }

  function saveConfig() {
    const host = configDraft.host.trim() || 'localhost'
    const port = parseInt(configDraft.port) || 8765
    onConsoleConfigChange?.({ host, port })
    setShowConfig(false)
  }

  return (
    <div className="toolbar">
      <input
        className="toolbar-project-name"
        value={projectName}
        onChange={e => onProjectNameChange?.(e.target.value)}
        title="Project name"
      />

      <div className="toolbar-actions">
        <button className="toolbar-btn" onClick={onImportStk} title="Import .stk project">Import</button>

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
            {sourceType === 'webcam' ? '\uD83D\uDCF7' : sourceType === 'image' ? '\uD83D\uDDBC\uFE0F' : '\uD83C\uDFA8'} Source
          </button>
          <div className="source-dropdown">
            <button
              className={sourceType === 'placeholder' ? 'active' : ''}
              onClick={() => onSourceChange('placeholder')}
            >
              Placeholder
            </button>
            <button
              className={sourceType === 'image' ? 'active' : ''}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Image
            </button>
            <button
              className={sourceType === 'webcam' ? 'active' : ''}
              onClick={() => onSourceChange('webcam')}
            >
              Webcam
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

        {/* Send to Console */}
        <div className="console-picker">
          <button
            onClick={onSendToConsole}
            title={`Send to Console (${consoleConfig.host}:${consoleConfig.port})`}
            className={consoleConnected ? 'tv-connected' : ''}
          >
            {consoleConnected ? 'Console \u2713' : 'Send to Console'}
          </button>
          <button
            className="console-config-btn"
            onClick={openConfig}
            title="Console connection settings"
          >
            \u2699
          </button>
        </div>
      </div>

      {/* Console Config Dialog */}
      {showConfig && (
        <div className="console-config-overlay" onClick={() => setShowConfig(false)}>
          <div className="console-config-dialog" onClick={e => e.stopPropagation()}>
            <h3>Console Connection</h3>
            <div className="console-config-field">
              <label>Host</label>
              <input
                type="text"
                value={configDraft.host}
                onChange={e => setConfigDraft(p => ({ ...p, host: e.target.value }))}
                placeholder="localhost"
                autoFocus
              />
            </div>
            <div className="console-config-field">
              <label>Port</label>
              <input
                type="number"
                value={configDraft.port}
                onChange={e => setConfigDraft(p => ({ ...p, port: e.target.value }))}
                placeholder="8765"
              />
            </div>
            <div className="console-config-actions">
              <button onClick={() => setShowConfig(false)}>Cancel</button>
              <button onClick={saveConfig} className="primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
