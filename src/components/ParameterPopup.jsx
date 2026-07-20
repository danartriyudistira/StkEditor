import { useEffect } from 'react'
import Slider from './Slider.jsx'

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

export default function ParameterPopup({
  paramName,
  label,
  paramMin = 0,
  paramMax = 1,
  animConfig,
  oscAddr = '',
  onAnimSave,
  onOscChange,
  onClose
}) {
  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleKey(e) {
    if (e.key === 'Escape') onClose?.()
  }

  function setAnimField(field, value) {
    onAnimSave?.(paramName, { ...animConfig, [field]: value })
  }

  function handleReset() {
    onAnimSave?.(paramName, { mode: 'off', speed: 1, min: 0, max: 1, bpmSync: false, bpmDiv: 4, direction: 'loop' })
    onOscChange?.(paramName, '')
  }

  const hasOsc = oscAddr.trim() !== ''
  const hasAnim = animConfig && animConfig.mode !== 'off'

  return (
    <div className="anim-popup-overlay" onClick={onClose}>
      <div className="anim-popup" onClick={e => e.stopPropagation()}>
        <div className="anim-popup-header">
          <span>Control — {label || paramName}</span>
          {(hasAnim || hasOsc) && (
            <span className="anim-popup-badges">
              {hasAnim && <span className="anim-badge anim-badge--anim">A</span>}
              {hasOsc && <span className="anim-badge anim-badge--osc">OSC</span>}
            </span>
          )}
          <button className="anim-popup-close" onClick={onClose}>{'\u2715'}</button>
        </div>

        <div className="anim-popup-body">
          {/* Animation Section */}
          <div className="anim-popup-section">
            <div className="anim-popup-section-title">Animation</div>
            <div className="anim-popup-row">
              <label>Mode</label>
              <select value={animConfig?.mode || 'off'} onChange={e => setAnimField('mode', e.target.value)}>
                {MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {animConfig?.mode !== 'off' && (
              <>
                <div className="anim-popup-row">
                  <label>Direction</label>
                  <select value={animConfig?.direction || 'loop'} onChange={e => setAnimField('direction', e.target.value)}>
                    {DIRECTIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="anim-popup-row">
                  <label>BPM Sync</label>
                  <input
                    type="checkbox"
                    checked={animConfig?.bpmSync || false}
                    onChange={e => setAnimField('bpmSync', e.target.checked)}
                  />
                </div>

                {animConfig?.bpmSync ? (
                  <div className="anim-popup-row">
                    <label>Beat Division</label>
                    <select value={animConfig?.bpmDiv || 4} onChange={e => setAnimField('bpmDiv', Number(e.target.value))}>
                      {BPM_DIVS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="anim-popup-row">
                    <label>Speed (Hz)</label>
                    <Slider
                      value={animConfig?.speed || 1}
                      min={0.01}
                      max={20}
                      step={0.01}
                      onChange={(v) => setAnimField('speed', v)}
                    />
                    <span className="anim-popup-value">{(animConfig?.speed || 1).toFixed(2)}</span>
                  </div>
                )}

                <div className="anim-popup-row">
                  <label>Min</label>
                  <Slider
                    value={animConfig?.min ?? 0}
                    min={paramMin}
                    max={paramMax}
                    step={(paramMax - paramMin) / 100 || 0.01}
                    onChange={(v) => setAnimField('min', v)}
                  />
                  <span className="anim-popup-value">{(animConfig?.min ?? 0).toFixed(3)}</span>
                </div>
                <div className="anim-popup-row">
                  <label>Max</label>
                  <Slider
                    value={animConfig?.max ?? 1}
                    min={paramMin}
                    max={paramMax}
                    step={(paramMax - paramMin) / 100 || 0.01}
                    onChange={(v) => setAnimField('max', v)}
                  />
                  <span className="anim-popup-value">{(animConfig?.max ?? 1).toFixed(3)}</span>
                </div>
              </>
            )}
          </div>

          {/* OSC Address Section */}
          <div className="anim-popup-section">
            <div className="anim-popup-section-title">OSC Address</div>
            <div className="anim-popup-row">
              <label>Address</label>
              <input
                type="text"
                value={oscAddr}
                onChange={e => onOscChange?.(paramName, e.target.value)}
                placeholder="/fader1"
                className="anim-popup-input"
              />
            </div>
          </div>
        </div>

        <div className="anim-popup-footer">
          <button className="anim-popup-reset" onClick={handleReset}>Reset</button>
          <button className="anim-popup-save" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
