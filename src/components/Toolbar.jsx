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
  onSavePreset,
  onLoadPreset,
  performanceMode,
  onPerformanceToggle,
  vjMode,
  onVjToggle,
  canvasSettings,
  onCanvasSettingsChange,
}) {
  const [showConfig, setShowConfig] = useState(false)
  const [configDraft, setConfigDraft] = useState({ host: '', port: '' })
  const [showCanvasDlg, setShowCanvasDlg] = useState(false)
  const [canvasDraft, setCanvasDraft] = useState({ width: '', height: '', fps: '', scaleMode: 'fit' })
  const [aspectLocked, setAspectLocked] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(null)
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

  function openCanvasSettings() {
    const w = canvasSettings?.width > 0 ? canvasSettings.width : 0
    const h = canvasSettings?.height > 0 ? canvasSettings.height : 0
    setCanvasDraft({
      width: w > 0 ? String(w) : '',
      height: h > 0 ? String(h) : '',
      fps: canvasSettings?.fps > 0 ? String(canvasSettings.fps) : '',
      scaleMode: canvasSettings?.scaleMode || 'fit',
    })
    if (w > 0 && h > 0) {
      setAspectRatio(w / h)
    }
    setShowCanvasDlg(true)
  }

  function handleCanvasWidthChange(val) {
    setCanvasDraft(p => {
      const next = { ...p, width: val }
      if (aspectLocked && aspectRatio && val) {
        const w = parseFloat(val)
        if (w > 0) next.height = String(Math.round(w / aspectRatio))
      }
      return next
    })
  }

  function handleCanvasHeightChange(val) {
    setCanvasDraft(p => {
      const next = { ...p, height: val }
      if (aspectLocked && aspectRatio && val) {
        const h = parseFloat(val)
        if (h > 0) next.width = String(Math.round(h * aspectRatio))
      }
      return next
    })
  }

  function saveCanvasSettings() {
    const width = parseInt(canvasDraft.width) || 0
    const height = parseInt(canvasDraft.height) || 0
    const fps = parseInt(canvasDraft.fps) || 0
    onCanvasSettingsChange?.({ width, height, fps, scaleMode: canvasDraft.scaleMode })
    setShowCanvasDlg(false)
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

        {/* VJ Mode */}
        <button
          className={`toolbar-btn ${vjMode ? 'vj-active' : ''}`}
          onClick={onVjToggle}
          title="VJ Mode (full-screen live performance with sliders + shader matrix)"
        >
          {vjMode ? 'Exit VJ' : 'VJ Mode'}
        </button>

        <div className="toolbar-separator" />

        {/* TV Mode */}
        <button
          className={`toolbar-btn ${performanceMode ? 'performance-active' : ''}`}
          onClick={onPerformanceToggle}
          title="TV Mode (fullscreen, keyboard-only)"
        >
          {performanceMode ? 'Exit TV' : 'TV Mode'}
        </button>

        <div className="toolbar-separator" />

        {/* Console */}
        <div className="console-picker">
          <button
            className="console-config-btn"
            onClick={openConfig}
            title="Console connection settings"
          >
            Console
          </button>
        </div>

        {/* Canvas */}
        <div className="console-picker">
          <button
            className="console-config-btn"
            onClick={openCanvasSettings}
            title="Canvas resolution and FPS settings"
          >
            {canvasSettings && (canvasSettings.width > 0 || canvasSettings.height > 0 || canvasSettings.fps > 0) ? 'Canvas \u2713' : 'Canvas'}
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
              <button
                onClick={() => {
                  const host = configDraft.host.trim() || 'localhost'
                  const port = parseInt(configDraft.port) || 8765
                  onConsoleConfigChange?.({ host, port })
                  onSendToConsole?.(host, port)
                  setShowConfig(false)
                }}
                className="primary"
                style={{ background: consoleConnected ? '#4a7' : undefined }}
              >
                {consoleConnected ? 'Console \u2713' : 'Send to Console'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Settings Dialog */}
      {showCanvasDlg && (
        <div className="console-config-overlay" onClick={() => setShowCanvasDlg(false)}>
          <div className="console-config-dialog" onClick={e => e.stopPropagation()}>
            <h3>Canvas Settings</h3>
            <p style={{ fontSize: 11, color: '#888', marginTop: -6, marginBottom: 8 }}>
              Set to 0 or leave empty for auto (container size / unlimited FPS).
            </p>
            <div className="console-config-field">
              <label>Width (px)</label>
              <input
                type="number"
                value={canvasDraft.width}
                onChange={e => handleCanvasWidthChange(e.target.value)}
                placeholder="Auto"
              />
            </div>
            <div className="console-config-field">
              <label>Height (px)</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="number"
                  value={canvasDraft.height}
                  onChange={e => handleCanvasHeightChange(e.target.value)}
                  placeholder="Auto"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => setAspectLocked(l => {
                    if (!l && canvasDraft.width && canvasDraft.height) {
                      const w = parseFloat(canvasDraft.width)
                      const h = parseFloat(canvasDraft.height)
                      if (w > 0 && h > 0) setAspectRatio(w / h)
                    }
                    return !l
                  })}
                  title={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  style={{
                    background: aspectLocked ? '#007acc' : '#333',
                    border: '1px solid #555',
                    color: '#ccc',
                    padding: '4px 8px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  {aspectLocked ? '🔒' : '🔓'}
                </button>
              </div>
            </div>
            <div className="console-config-field">
              <label>Scale Mode</label>
              <select
                value={canvasDraft.scaleMode}
                onChange={e => setCanvasDraft(p => ({ ...p, scaleMode: e.target.value }))}
                style={{
                  background: '#1e1e1e',
                  border: '1px solid #444',
                  color: '#ccc',
                  padding: '4px 6px',
                  borderRadius: 3,
                  fontSize: 12,
                  width: '100%',
                }}
              >
                <option value="fit">Fit (letterbox)</option>
                <option value="fill">Fill (crop)</option>
                <option value="stretch">Stretch</option>
                <option value="original">Original (1:1)</option>
              </select>
            </div>
            <div className="console-config-field">
              <label>FPS Limit</label>
              <input
                type="number"
                value={canvasDraft.fps}
                onChange={e => setCanvasDraft(p => ({ ...p, fps: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>
            <div className="console-config-actions">
              <button onClick={() => setShowCanvasDlg(false)}>Cancel</button>
              <button onClick={saveCanvasSettings} className="primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
