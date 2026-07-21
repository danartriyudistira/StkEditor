import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Slider from './Slider.jsx'

const MODES = [
  { value: 'off', label: 'Off' },
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'saw', label: 'Saw' },
  { value: 'square', label: 'Square' },
  { value: 'random', label: 'Random (S&H)' },
  { value: 'note', label: 'Note Trigger' },
  { value: 'link', label: 'Link' },
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

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function noteName(n) {
  if (n < 0 || n > 127) return String(n)
  return NOTE_NAMES[n % 12] + Math.floor(n / 12)
}

const GLITCH_DEFAULTS = {
  enabled: false, mode: 'trigger', type: 'click',
  sensitivity: 0.15, volume: 0.5,
  cutoff: 4000, emphasis: 5, contour: 0,
  soundType: 'noise',
  modCutoff: true, modEmphasis: false, modContour: false,
}

export default function ParameterPopup({
  paramName,
  label,
  paramMin = 0,
  paramMax = 1,
  value,
  animConfig,
  oscAddr = '',
  onAnimSave,
  onOscChange,
  onClose,
  glitchConfig = {},
  onGlitchChange,
  allParamNames = [],
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

  function setGlitchField(field, value) {
    onGlitchChange?.({ ...GLITCH_DEFAULTS, ...glitchConfig, [field]: value })
  }

  function toggleLinkTarget(targetName) {
    const links = animConfig?.links || []
    const next = links.includes(targetName)
      ? links.filter(n => n !== targetName)
      : [...links, targetName]
    setAnimField('links', next)
  }

  function handleReset() {
    onAnimSave?.(paramName, { mode: 'off', speed: 1, min: 0, max: 1, bpmSync: false, bpmDiv: 4, direction: 'loop' })
    onOscChange?.(paramName, '')
    onGlitchChange?.(GLITCH_DEFAULTS)
  }

  const glitchObj = { ...GLITCH_DEFAULTS, ...glitchConfig }

  const isNote = animConfig?.mode === 'note'
  const isLink = animConfig?.mode === 'link'
  const hasOsc = oscAddr.trim() !== ''
  const hasAnim = animConfig && animConfig.mode !== 'off'
  const hasNote = isNote
  const hasLink = isLink
  const hasGlitch = glitchObj.enabled

  // Note mode local state (kept in sync with animConfig)
  const [ntNotes, setNtNotes] = useState(
    animConfig?.notes ? Object.entries(animConfig.notes).map(([k,v]) => ({note: Number(k), value: v})) : []
  )
  const [ntUseVelocity, setNtUseVelocity] = useState(animConfig?.useVelocity ?? false)
  const [ntFixedValue, setNtFixedValue] = useState(animConfig?.fixedValue ?? 1)
  const [ntVelocityMin, setNtVelocityMin] = useState(animConfig?.velocityMin ?? 0)
  const [ntVelocityMax, setNtVelocityMax] = useState(animConfig?.velocityMax ?? 1)

  useEffect(() => {
    if (!isNote) return
    setAnimField('notes', Object.fromEntries(ntNotes.map(e => [e.note, e.value])))
  }, [ntNotes])

  useEffect(() => {
    if (!isNote) return
    setAnimField('useVelocity', ntUseVelocity)
  }, [ntUseVelocity])

  useEffect(() => {
    if (!isNote) return
    setAnimField('fixedValue', ntFixedValue)
  }, [ntFixedValue])

  useEffect(() => {
    if (!isNote) return
    setAnimField('velocityMin', ntVelocityMin)
  }, [ntVelocityMin])

  useEffect(() => {
    if (!isNote) return
    setAnimField('velocityMax', ntVelocityMax)
  }, [ntVelocityMax])

  function addNote() {
    const used = new Set(ntNotes.map(e => e.note))
    let next = 60
    while (used.has(next)) next++
    setNtNotes([...ntNotes, { note: next, value: 0.5 }])
  }

  function removeNote(idx) {
    setNtNotes(ntNotes.filter((_, i) => i !== idx))
  }

  function updateNote(idx, field, val) {
    const copy = [...ntNotes]
    copy[idx] = { ...copy[idx], [field]: val }
    setNtNotes(copy)
  }

  return createPortal(
    <div className="anim-popup-overlay" onClick={onClose}>
      <div className="anim-popup" onClick={e => e.stopPropagation()}>
        <div className="anim-popup-header">
          <span>Control — {label || paramName}</span>
          {(hasAnim || hasOsc || hasGlitch) && (
            <span className="anim-popup-badges">
              {hasAnim && <span className={`anim-badge${hasNote ? ' anim-badge--note' : hasLink ? ' anim-badge--link' : ' anim-badge--anim'}`}>{hasNote ? 'N' : hasLink ? 'L' : 'A'}</span>}
              {hasOsc && <span className="anim-badge anim-badge--osc">OSC</span>}
              {hasGlitch && <span className="anim-badge anim-badge--glitch">G</span>}
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

            {isNote && (
              <>
                <div className="anim-popup-row">
                  <label>Any Note</label>
                  <input type="checkbox" checked={animConfig?.any ?? false} onChange={e => setAnimField('any', e.target.checked)} />
                </div>

                {!animConfig?.any && (
                  <div className="anim-popup-notes-list">
                    {ntNotes.map((entry, i) => (
                      <div className="anim-popup-note-row" key={i}>
                        <button className="anim-popup-note-del" onClick={() => removeNote(i)} title="Remove note">{'\u2715'}</button>
                        <input
                          className="anim-popup-note-input"
                          type="number" min={0} max={127}
                          value={entry.note}
                          onChange={e => updateNote(i, 'note', Math.max(0, Math.min(127, Number(e.target.value))))}
                        />
                        <span className="anim-popup-note-name">{noteName(entry.note)}</span>
                        <Slider
                          value={entry.value}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={v => updateNote(i, 'value', v)}
                        />
                        <span className="anim-popup-value">{entry.value.toFixed(2)}</span>
                      </div>
                    ))}
                    <button className="anim-popup-add-note" onClick={addNote}>+ Add Note</button>
                  </div>
                )}

                <div className="anim-popup-row">
                  <label>Use Velocity</label>
                  <input type="checkbox" checked={ntUseVelocity} onChange={e => setNtUseVelocity(e.target.checked)} />
                </div>

                {ntUseVelocity ? (
                  <>
                    <div className="anim-popup-row">
                      <label>Vel Min</label>
                      <Slider value={ntVelocityMin} min={0} max={1} step={0.01} onChange={setNtVelocityMin} />
                      <span className="anim-popup-value">{ntVelocityMin.toFixed(3)}</span>
                    </div>
                    <div className="anim-popup-row">
                      <label>Vel Max</label>
                      <Slider value={ntVelocityMax} min={0} max={1} step={0.01} onChange={setNtVelocityMax} />
                      <span className="anim-popup-value">{ntVelocityMax.toFixed(3)}</span>
                    </div>
                  </>
                ) : animConfig?.any && (
                  <div className="anim-popup-row">
                    <label>Fixed Value</label>
                    <Slider value={ntFixedValue} min={0} max={1} step={0.01} onChange={setNtFixedValue} />
                    <span className="anim-popup-value">{ntFixedValue.toFixed(3)}</span>
                  </div>
                )}
              </>
            )}

            {isLink && allParamNames.length > 0 && (() => {
              const otherParams = allParamNames.filter(n => n !== paramName)
              const links = animConfig?.links || []
              return (
                <>
                  <div className="anim-popup-section-title" style={{ marginTop: 10 }}>Link To</div>
                  {otherParams.map(n => (
                    <div className="anim-popup-row" key={n}>
                      <label>{n}</label>
                      <input type="checkbox" checked={links.includes(n)} onChange={() => toggleLinkTarget(n)} />
                    </div>
                  ))}
                </>
              )
            })()}

            {animConfig?.mode !== 'off' && !isNote && !isLink && (
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
              </>
            )}

            {animConfig?.mode !== 'off' && !isNote && (
              <>
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

          {/* Glitch Sound Section */}
          <div className="anim-popup-section">
            <div className="anim-popup-section-title">Glitch Sound</div>
            <div className="anim-popup-row">
              <label>Enable</label>
              <input
                type="checkbox"
                checked={glitchObj.enabled}
                onChange={e => setGlitchField('enabled', e.target.checked)}
              />
            </div>
            {glitchObj.enabled && (
              <>
                <div className="anim-popup-row">
                  <label>Mode</label>
                  <select value={glitchObj.mode} onChange={e => setGlitchField('mode', e.target.value)}>
                    <option value="trigger">Trigger</option>
                    <option value="frequency">Frequency</option>
                  </select>
                </div>
                {glitchObj.mode === 'trigger' ? (
                  <>
                    <div className="anim-popup-row">
                      <label>Type</label>
                      <select value={glitchObj.type} onChange={e => setGlitchField('type', e.target.value)}>
                        <option value="click">Click</option>
                        <option value="klek">Klek</option>
                        <option value="sss">Sss</option>
                        <option value="engine">Engine</option>
                        <option value="hum">Hum</option>
                      </select>
                    </div>
                    <div className="anim-popup-row">
                      <label>Sensitivity</label>
                      <Slider value={glitchObj.sensitivity} min={0.01} max={0.5} step={0.01} onChange={v => setGlitchField('sensitivity', v)} />
                      <span className="anim-popup-value">{glitchObj.sensitivity.toFixed(2)}</span>
                    </div>
                    <div className="anim-popup-row">
                      <label>Volume</label>
                      <Slider value={glitchObj.volume} min={0} max={1} step={0.05} onChange={v => setGlitchField('volume', v)} />
                      <span className="anim-popup-value">{glitchObj.volume.toFixed(2)}</span>
                    </div>
                  </>
                ) : (() => {
                  const normVal = value !== undefined
                    ? (value - paramMin) / Math.max(0.001, paramMax - paramMin)
                    : 0.5
                  const effCutoff = glitchObj.modCutoff
                    ? 20 + normVal * Math.max(1, glitchObj.cutoff - 20)
                    : glitchObj.cutoff
                  const effEmphasis = glitchObj.modEmphasis
                    ? glitchObj.emphasis * (0.5 + normVal * 0.5)
                    : glitchObj.emphasis
                  const effContour = glitchObj.modContour
                    ? glitchObj.contour * normVal
                    : glitchObj.contour
                  return (
                  <>
                    <div className="anim-popup-row">
                      <label>Sound</label>
                      <select value={glitchObj.soundType} onChange={e => setGlitchField('soundType', e.target.value)}>
                        <option value="noise">Noise</option>
                        <option value="ambience">Ambience</option>
                        <option value="space">Space</option>
                        <option value="wind">Wind</option>
                        <option value="bass">Bass</option>
                      </select>
                    </div>
                    <div className="anim-popup-row">
                      <label>Cutoff</label>
                      <Slider value={effCutoff} min={20} max={8000} step={10} onChange={v => setGlitchField('cutoff', v)} />
                      <span className="anim-popup-value">{effCutoff >= 1000 ? `${(effCutoff / 1000).toFixed(1)}k` : Math.round(effCutoff)}</span>
                      <label className="anim-popup-toggle-label">
                        <input type="checkbox" checked={glitchObj.modCutoff} onChange={e => setGlitchField('modCutoff', e.target.checked)} />
                      </label>
                    </div>
                    <div className="anim-popup-row">
                      <label>Emphasis</label>
                      <Slider value={effEmphasis} min={0} max={20} step={0.5} onChange={v => setGlitchField('emphasis', v)} />
                      <span className="anim-popup-value">{effEmphasis.toFixed(1)}</span>
                      <label className="anim-popup-toggle-label">
                        <input type="checkbox" checked={glitchObj.modEmphasis} onChange={e => setGlitchField('modEmphasis', e.target.checked)} />
                      </label>
                    </div>
                    <div className="anim-popup-row">
                      <label>Contour</label>
                      <Slider value={effContour} min={-1} max={1} step={0.05} onChange={v => setGlitchField('contour', v)} />
                      <span className="anim-popup-value">{effContour.toFixed(2)}</span>
                      <label className="anim-popup-toggle-label">
                        <input type="checkbox" checked={glitchObj.modContour} onChange={e => setGlitchField('modContour', e.target.checked)} />
                      </label>
                    </div>
                    <div className="anim-popup-row">
                      <label>Volume</label>
                      <Slider value={glitchObj.volume} min={0} max={1} step={0.05} onChange={v => setGlitchField('volume', v)} />
                      <span className="anim-popup-value">{glitchObj.volume.toFixed(2)}</span>
                    </div>
                  </>
                  )
                })()}
              </>
            )}
          </div>
        </div>

        <div className="anim-popup-footer">
          <button className="anim-popup-reset" onClick={handleReset}>Reset</button>
          <button className="anim-popup-save" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  )
}