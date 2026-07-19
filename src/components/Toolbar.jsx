import { useRef, useState, useEffect } from 'react'

export default function Toolbar({
  onLoadFromLibrary,
  onSendToConsole,
  consoleConfig,
  onConsoleConfigChange,
  projectName,
  onProjectNameChange,
  onImportStk,
  onExportStk,
  consoleConnected,
  libraryFiles,
  sourceType,
  onSourceChange,
  onSourceUpload,
  onSavePreset,
  onLoadPreset,
  performanceMode,
  onPerformanceToggle,
}) {
  const fileInputRef = useRef(null)
  const [showConfig, setShowConfig] = useState(false)
  const [configDraft, setConfigDraft] = useState({ host: '', port: '' })
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

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

  function handleSubmit() {
    if (editValue.trim()) {
      onProjectNameChange?.(editValue.trim())
    }
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-project-name" onDoubleClick={() => { setEditing(true); setEditValue(projectName) }}>
        {editing ? (
          <input
            ref={inputRef}
            className="toolbar-rename-input"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          projectName
        )}
      </div>

      <div className="toolbar-actions">
        <button className="toolbar-btn" onClick={onImportStk} title="Import .stk project">Import</button>
        <button className="toolbar-btn" onClick={onExportStk} title="Export .stk project">Export</button>

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

        <div className="toolbar-separator" />

        {/* Performance Mode */}
        <button
          className={`toolbar-btn ${performanceMode ? 'performance-active' : ''}`}
          onClick={onPerformanceToggle}
          title="Performance Mode (fullscreen, keyboard-only)"
        >
          {performanceMode ? 'Exit Perf' : 'Performance'}
        </button>
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
