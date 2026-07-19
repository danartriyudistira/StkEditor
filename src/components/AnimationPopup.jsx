import { useEffect } from 'react'

const MODES = [
  { value: 'off', label: 'Off' },
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'saw', label: 'Saw' },
  { value: 'square', label: 'Square' },
  { value: 'random', label: 'Random (S&H)' },
]

const DIRECTIONS = [
  { value: 'loop', label: 'Loop' },
  { value: 'forward', label: 'Forward' },
  { value: 'pingpong', label: 'Pingpong' },
  { value: 'random', label: 'Random' },
]

const BPM_DIVS = [
  { value: 1, label: '1/4' },
  { value: 2, label: '1/2' },
  { value: 4, label: '1' },
  { value: 8, label: '2' },
  { value: 16, label: '4' },
  { value: 32, label: '8' },
]

export default function AnimationPopup({ paramName, label, config, onSave, onClose }) {
  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleKey(e) {
    if (e.key === 'Escape') onClose?.()
  }

  function setField(field, value) {
    onSave?.(paramName, { ...config, [field]: value })
  }

  return (
    <div className="anim-popup-overlay" onClick={onClose}>
      <div className="anim-popup" onClick={e => e.stopPropagation()}>
        <div className="anim-popup-header">
          <span>Animation — {label || paramName}</span>
          <button className="anim-popup-close" onClick={onClose}>{'\u2715'}</button>
        </div>

        <div className="anim-popup-body">
          <div className="anim-popup-row">
            <label>Mode</label>
            <select value={config.mode} onChange={e => setField('mode', e.target.value)}>
              {MODES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {config.mode !== 'off' && (
            <>
              <div className="anim-popup-row">
                <label>Direction</label>
                <select value={config.direction || 'loop'} onChange={e => setField('direction', e.target.value)}>
                  {DIRECTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="anim-popup-row">
                <label>BPM Sync</label>
                <input
                  type="checkbox"
                  checked={config.bpmSync}
                  onChange={e => setField('bpmSync', e.target.checked)}
                />
              </div>

              {config.bpmSync ? (
                <div className="anim-popup-row">
                  <label>Beat Division</label>
                  <select value={config.bpmDiv} onChange={e => setField('bpmDiv', Number(e.target.value))}>
                    {BPM_DIVS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="anim-popup-row">
                  <label>Speed (Hz)</label>
                  <input
                    type="range"
                    min={0.01}
                    max={20}
                    step={0.01}
                    value={config.speed}
                    onChange={e => setField('speed', parseFloat(e.target.value))}
                  />
                  <span className="anim-popup-value">{config.speed.toFixed(2)}</span>
                </div>
              )}

              <div className="anim-popup-row">
                <label>Min</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={config.min ?? 0}
                  onChange={e => setField('min', parseFloat(e.target.value))}
                />
                <span className="anim-popup-value">{(config.min ?? 0).toFixed(2)}</span>
              </div>
              <div className="anim-popup-row">
                <label>Max</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={config.max ?? 1}
                  onChange={e => setField('max', parseFloat(e.target.value))}
                />
                <span className="anim-popup-value">{(config.max ?? 1).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        <div className="anim-popup-footer">
          <button className="anim-popup-save" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
