import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'

const ShaderMatrix = forwardRef(function ShaderMatrix({
  tabs,
  activeTabId,
  onSwitchTab,
  shaderKeyMap,
  onShaderKeyMapChange,
  midiLearnActive,
  setMidiLearnActive,
}, ref) {
  const [listeningCell, setListeningCell] = useState(null)
  const learnRef = useRef(null)
  learnRef.current = { midiLearnActive, listeningCell, shaderKeyMap, onShaderKeyMapChange, tabs }

  useImperativeHandle(ref, () => ({
    handleMidiNote(note) {
      const ctx = learnRef.current
      if (!ctx.listeningCell) return false
      const map = { ...ctx.shaderKeyMap }
      const existing = Object.entries(map).find(([, v]) => v === ctx.listeningCell)
      if (existing) delete map[existing[0]]
      map['midi_' + note] = ctx.listeningCell
      ctx.onShaderKeyMapChange(map)
      setListeningCell(null)
      return true
    }
  }), [])

  useEffect(() => {
    const handler = (e) => {
      const ctx = learnRef.current
      if (!ctx.listeningCell) return
      const key = e.key.toLowerCase()
      if (key === 'escape') { setListeningCell(null); return }
      if (key.length === 1 || key.startsWith('f')) {
        const map = { ...ctx.shaderKeyMap }
        const existing = Object.entries(map).find(([, v]) => v === ctx.listeningCell)
        if (existing) delete map[existing[0]]
        map['key_' + key] = ctx.listeningCell
        ctx.onShaderKeyMapChange(map)
        setListeningCell(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCellClick = useCallback((tabId) => {
    const ctx = learnRef.current
    if (ctx.listeningCell === tabId) {
      setListeningCell(null)
      return
    }
    if (ctx.midiLearnActive) {
      setListeningCell(tabId)
      return
    }
    onSwitchTab?.(tabId)
  }, [onSwitchTab])

  const handleCellContext = useCallback((e, tabId) => {
    e.preventDefault()
    const map = { ...(learnRef.current.shaderKeyMap || {}) }
    const existing = Object.entries(map).find(([, v]) => v === tabId)
    if (existing) {
      delete map[existing[0]]
      learnRef.current.onShaderKeyMapChange(map)
    }
    setListeningCell(null)
  }, [])

  function getCellMeta(tabId) {
    const map = shaderKeyMap || {}
    const entry = Object.entries(map).find(([, v]) => v === tabId)
    if (!entry) return null
    const [key] = entry
    if (key.startsWith('key_')) return { type: 'key', label: key.slice(4).toUpperCase() }
    if (key.startsWith('midi_')) return { type: 'midi', label: key.replace('midi_', 'N') }
    if (key.startsWith('osc_')) return { type: 'osc', label: key.slice(4) }
    return { type: 'map', label: key }
  }

  return (
    <div className="vj-matrix">
      <div className="vj-matrix-header">
        <span className="vj-matrix-title">Shader Matrix</span>
        <span className="vj-matrix-count">{tabs?.length || 0}</span>
      </div>
      <div className="vj-matrix-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {tabs?.map(tab => {
          const isActive = tab.id === activeTabId
          const isListening = listeningCell === tab.id
          const meta = getCellMeta(tab.id)
          return (
            <button
              key={tab.id}
              className={`vj-matrix-cell${isActive ? ' vj-matrix-cell--active' : ''}${isListening ? ' vj-matrix-cell--listening' : ''}${meta ? ' vj-matrix-cell--mapped' : ''}`}
              onClick={() => handleCellClick(tab.id)}
              onContextMenu={e => handleCellContext(e, tab.id)}
              title={`${tab.name}${meta ? ' [' + meta.label + ']' : ''}${midiLearnActive ? '\nClick to learn MIDI' : ''}`}
            >
              <span className="vj-matrix-cell-name">{tab.name}</span>
              {meta && (
                <span className={`vj-matrix-cell-badge vj-matrix-cell-badge--${meta.type}`}>
                  {meta.label}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {listeningCell && (
        <div className="vj-matrix-hint">
          Press a keyboard key to assign, or send MIDI note. Right-click to clear.
        </div>
      )}
    </div>
  )
})

export default ShaderMatrix
