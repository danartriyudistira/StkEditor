import { useState } from 'react'
import { effects, getEffectById, getEffectsByCategory } from '../fx/effects.js'
import ParameterPopup from './ParameterPopup.jsx'

const CC_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

export default function FxPanel({ fxChain, onFxChainChange, ccValues, onSaveStkfx, onLoadStkfx, onLoadIsf }) {
  const [expanded, setExpanded] = useState(false)
  const [activeFxParam, setActiveFxParam] = useState(null) // { fxIndex, paramName }
  const [activeFxSettings, setActiveFxSettings] = useState(null) // fxIndex for FX-level settings
  const categories = getEffectsByCategory()

  function handleAddFx(effectId) {
    const fx = getEffectById(effectId)
    if (!fx) return

    const paramValues = {}
    if (fx.params) {
      for (const [k, v] of Object.entries(fx.params)) {
        paramValues[k] = v.default ?? 0
      }
    }

    onFxChainChange?.([
      ...(fxChain || []),
      { id: fx.id, label: fx.label, enabled: true, paramValues, paramCc: {}, paramConfig: {} },
    ])
  }

  function handleRemoveFx(index) {
    const next = [...(fxChain || [])]
    next.splice(index, 1)
    onFxChainChange?.(next)
  }

  function handleToggleFx(index) {
    const next = [...(fxChain || [])]
    next[index] = { ...next[index], enabled: !next[index].enabled }
    onFxChainChange?.(next)
  }

  function handleParamChange(index, paramName, value) {
    const next = [...(fxChain || [])]
    const fx = { ...next[index] }
    fx.paramValues = { ...fx.paramValues, [paramName]: value }
    next[index] = fx
    onFxChainChange?.(next)
  }

  // FX-level toggle CC
  function handleToggleEffectCc(index) {
    const next = [...(fxChain || [])]
    const fx = { ...next[index] }
    if (fx.toggleCc) {
      fx.toggleCc = null
    } else {
      // Find first free CC channel
      const usedCc = new Set(next.map(f => f.toggleCc?.cc).filter(Boolean))
      const freeCc = CC_CHANNELS.find(c => c > 0 && !usedCc.has(c)) || 1
      fx.toggleCc = { cc: freeCc, min: 0, max: 1 }
    }
    next[index] = fx
    onFxChainChange?.(next)
  }

  // Update FX parameter config (animation, cc, osc)
  function handleFxParamAnimChange(index, paramName, animConfig) {
    const next = [...(fxChain || [])]
    const fx = { ...next[index] }
    fx.paramConfig = {
      ...fx.paramConfig,
      [paramName]: { ...fx.paramConfig?.[paramName], animation: animConfig }
    }
    next[index] = fx
    onFxChainChange?.(next)
  }

  function handleFxParamOscChange(index, paramName, oscAddr) {
    const next = [...(fxChain || [])]
    const fx = { ...next[index] }
    fx.paramConfig = {
      ...fx.paramConfig,
      [paramName]: { ...fx.paramConfig?.[paramName], oscAddr }
    }
    next[index] = fx
    onFxChainChange?.(next)
  }

  const usedCc = new Set((fxChain || []).map(f => f.toggleCc?.cc).filter(Boolean))

  return (
    <div className="fx-panel">
      <div className="fx-header" onClick={() => setExpanded(!expanded)}>
        <span>FX {expanded ? '▾' : '▸'}</span>
        <span className="fx-header-label">Effect Chain</span>
        {fxChain && fxChain.length > 0 && (
          <span className="fx-badge">{fxChain.length}</span>
        )}
      </div>

      {expanded && (
        <div className="fx-body">
          {fxChain && fxChain.length > 0 && (
            <div className="fx-chain">
              {fxChain.map((fx, i) => { const fxDef = getEffectById(fx.id); return (
                <div key={`${fx.id}-${i}`} className={`fx-item ${fx.enabled ? '' : 'fx-item--disabled'}`}>
                  <div className="fx-item-header">
                    <button
                      className="fx-toggle"
                      onClick={() => handleToggleFx(i)}
                      title={fx.enabled ? 'Disable' : 'Enable'}
                    >
                      {fx.enabled ? '●' : '○'}
                    </button>
                    <span className="fx-item-label">{fx.label}{fxDef?.isIsf && <span className="fx-isf-badge">ISF</span>}</span>
                    <button
                      className={`fx-settings-btn ${fx.toggleCc ? 'has-toggle' : ''}`}
                      onClick={() => setActiveFxSettings(i)}
                      title="FX settings (Toggle CC)"
                    >
                      ⚙
                    </button>
                    <button
                      className="fx-remove"
                      onClick={() => handleRemoveFx(i)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>

                  {fx.toggleCc && (
                    <div className="fx-toggle-cc-info">
                      <span className="fx-toggle-cc-badge">Toggle: CC{fx.toggleCc.cc}</span>
                    </div>
                  )}

                  {fx.enabled && fx.paramValues && Object.keys(fx.paramValues).length > 0 && (
                    <div className="fx-params">
                      {Object.entries(fx.paramValues).map(([paramName, val]) => {
                        const fxDef = getEffectById(fx.id)
                        const paramDef = fxDef?.params?.[paramName]
                        if (!paramDef) return null
                        const paramCfg = fx.paramConfig?.[paramName] || {}
                        const hasOsc = paramCfg.oscAddr?.trim()
                        const hasAnim = paramCfg.animation && paramCfg.animation.mode !== 'off'
                        const hasBadge = hasOsc || hasAnim

                        const displayVal = val

                        const btnClass = `fx-param-settings-btn${hasBadge ? ' active' : ''}${hasOsc ? ' has-osc' : ''}`

                        // Render control based on type
                        function renderControl() {
                          switch (paramDef.type) {
                            case 'bool':
                              return (
                                <input
                                  type="checkbox"
                                  checked={!!displayVal}
                                  onChange={e => handleParamChange(i, paramName, e.target.checked ? 1 : 0)}
                                />
                              )
                            case 'color':
                              return (
                                <input
                                  type="color"
                                  value={rgbToHex(displayVal)}
                                  onChange={e => handleParamChange(i, paramName, hexToRgb(e.target.value))}
                                />
                              )
                            default: // float, long, and others use slider
                              return (
                                <input
                                  type="range"
                                  min={paramDef.min}
                                  max={paramDef.max}
                                  step={paramDef.step}
                                  value={displayVal}
                                  onChange={e => handleParamChange(i, paramName, parseFloat(e.target.value))}
                                />
                              )
                          }
                        }

                        return (
                          <div key={paramName} className="fx-param">
                            <div className="fx-param-row">
                              <label>{paramDef.label || paramName}</label>
                              <button
                                className={btnClass}
                                onClick={() => setActiveFxParam({ fxIndex: i, paramName })}
                                title="Control settings (Animation, OSC)"
                              >
                                {'⚙'}
                              </button>
                              {renderControl()}
                              <span className="fx-param-value">
                                {paramDef.type === 'bool'
                                  ? (displayVal ? 'ON' : 'OFF')
                                  : paramDef.type === 'color'
                                    ? ''
                                    : paramDef.labels
                                      ? paramDef.labels[Math.round(displayVal)] ?? displayVal.toFixed(0)
                                      : (paramDef.max <= 3 ? (displayVal * 100).toFixed(0) + '%' : displayVal.toFixed(2))
                                }
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}

          <div className="fx-gallery">
            {Object.entries(categories).map(([cat, fxList]) => (
              <div key={cat} className="fx-category">
                <div className="fx-category-label">{cat}</div>
                {fxList.map(fx => (
                  <button
                    key={fx.id}
                    className="fx-add-btn"
                    onClick={() => handleAddFx(fx.id)}
                    disabled={usedCc.size >= CC_CHANNELS.length}
                  >
                    + {fx.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="fx-footer">
            {onLoadIsf && <button className="fx-footer-btn fx-footer-btn--isf" onClick={onLoadIsf}>Load ISF</button>}
            <button className="fx-footer-btn" onClick={onLoadStkfx}>Load FX</button>
            <button className="fx-footer-btn fx-footer-btn--save" onClick={onSaveStkfx}>Save FX</button>
          </div>
        </div>
      )}

      {activeFxSettings !== null && (() => {
        const fx = fxChain?.[activeFxSettings]
        if (!fx) return null
        return (
          <div className="anim-popup-overlay" onClick={() => setActiveFxSettings(null)}>
            <div className="anim-popup" onClick={e => e.stopPropagation()}>
              <div className="anim-popup-header">
                <span>FX Settings — {fx.label}</span>
                <button className="anim-popup-close" onClick={() => setActiveFxSettings(null)}>{'\u2715'}</button>
              </div>
              <div className="anim-popup-body">
                <div className="anim-popup-section">
                  <div className="anim-popup-section-title">Toggle CC</div>
                  <div className="anim-popup-row">
                    <label>Enable</label>
                    <input
                      type="checkbox"
                      checked={!!fx.toggleCc}
                      onChange={() => handleToggleEffectCc(activeFxSettings)}
                    />
                  </div>
                  {fx.toggleCc && (
                    <>
                      <div className="anim-popup-row">
                        <label>CC Channel</label>
                        <select
                          value={fx.toggleCc.cc}
                          onChange={e => {
                            const next = [...(fxChain || [])]
                            next[activeFxSettings] = {
                              ...next[activeFxSettings],
                              toggleCc: { ...fx.toggleCc, cc: Number(e.target.value) }
                            }
                            onFxChainChange?.(next)
                          }}
                        >
                          {CC_CHANNELS.filter(c => c > 0).map(ch => (
                            <option key={ch} value={ch}>CC{ch}</option>
                          ))}
                        </select>
                      </div>
                      <div className="anim-popup-row">
                        <label>Min</label>
                        <input
                          type="range"
                          min={0}
                          max={0.95}
                          step={0.01}
                          value={fx.toggleCc.min}
                          onChange={e => {
                            const next = [...(fxChain || [])]
                            const toggleCc = { ...fx.toggleCc, min: parseFloat(e.target.value) }
                            if (toggleCc.min >= toggleCc.max) toggleCc.max = Math.min(1, toggleCc.min + 0.05)
                            next[activeFxSettings] = { ...next[activeFxSettings], toggleCc }
                            onFxChainChange?.(next)
                          }}
                        />
                        <span className="anim-popup-value">{(fx.toggleCc.min * 100).toFixed(0)}%</span>
                      </div>
                      <div className="anim-popup-row">
                        <label>Max</label>
                        <input
                          type="range"
                          min={0.05}
                          max={1}
                          step={0.01}
                          value={fx.toggleCc.max}
                          onChange={e => {
                            const next = [...(fxChain || [])]
                            const toggleCc = { ...fx.toggleCc, max: parseFloat(e.target.value) }
                            if (toggleCc.max <= toggleCc.min) toggleCc.min = Math.max(0, toggleCc.max - 0.05)
                            next[activeFxSettings] = { ...next[activeFxSettings], toggleCc }
                            onFxChainChange?.(next)
                          }}
                        />
                        <span className="anim-popup-value">{(fx.toggleCc.max * 100).toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="anim-popup-footer">
                <button className="anim-popup-save" onClick={() => setActiveFxSettings(null)}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {activeFxParam !== null && (() => {
        const fx = fxChain?.[activeFxParam.fxIndex]
        const fxDef = getEffectById(fx?.id)
        const paramDef = fxDef?.params?.[activeFxParam.paramName]
        const paramCfg = fx?.paramConfig?.[activeFxParam.paramName] || {}
        const animCfg = paramCfg.animation || { mode: 'off', speed: 1, min: 0, max: 1, bpmSync: false, bpmDiv: 4, direction: 'loop' }

        return (
          <ParameterPopup
            paramName={activeFxParam.paramName}
            label={paramDef?.label || activeFxParam.paramName}
            paramMin={paramDef?.min ?? 0}
            paramMax={paramDef?.max ?? 1}
            animConfig={animCfg}
            oscAddr={paramCfg.oscAddr || ''}
            onAnimSave={(name, cfg) => handleFxParamAnimChange(activeFxParam.fxIndex, activeFxParam.paramName, cfg)}
            onOscChange={(name, addr) => handleFxParamOscChange(activeFxParam.fxIndex, activeFxParam.paramName, addr)}
            onClose={() => setActiveFxParam(null)}
          />
        )
      })()}
    </div>
  )
}

function rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return '#ffffff'
  const r = Math.round(Math.min(1, Math.max(0, rgb[0])) * 255)
  const g = Math.round(Math.min(1, Math.max(0, rgb[1])) * 255)
  const b = Math.round(Math.min(1, Math.max(0, rgb[2])) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b, 1]
}
