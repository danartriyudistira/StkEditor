import { useState } from 'react'
import { effects, getEffectsByCategory } from '../fx/effects.js'

const CC_CHANNELS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function FxPanel({ fxChain, onFxChainChange, ccValues, onSaveStkfx, onLoadStkfx }) {
  const [expanded, setExpanded] = useState(false)
  const categories = getEffectsByCategory()

  function handleAddFx(effectId) {
    const fx = effects.find(e => e.id === effectId)
    if (!fx) return
    const usedCc = new Set((fxChain || []).map(f => f.cc))
    const freeCc = CC_CHANNELS.find(c => !usedCc.has(c))
    if (freeCc === undefined) return

    const paramValues = {}
    if (fx.params) {
      for (const [k, v] of Object.entries(fx.params)) {
        paramValues[k] = v.default ?? 0
      }
    }

    onFxChainChange?.([
      ...(fxChain || []),
      { id: fx.id, label: fx.label, cc: freeCc, enabled: true, paramValues, paramCc: {} },
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

  function handleCcChange(index, cc) {
    const next = [...(fxChain || [])]
    next[index] = { ...next[index], cc: Number(cc) }
    onFxChainChange?.(next)
  }

  function handleParamChange(index, paramName, value) {
    const next = [...(fxChain || [])]
    const fx = { ...next[index] }
    fx.paramValues = { ...fx.paramValues, [paramName]: value }
    next[index] = fx
    onFxChainChange?.(next)
  }

  function handleToggleEffectCc(index) {
    const next = [...(fxChain || [])]
    const fx = { ...next[index] }
    if (fx.toggleCc) {
      fx.toggleCc = null
    } else {
      fx.toggleCc = { cc: fx.cc, min: 0, max: 1 }
    }
    next[index] = fx
    onFxChainChange?.(next)
  }

  function handleToggleEffectCcChange(index, field, value) {
    const next = [...(fxChain || [])]
    const fx = { ...next[index] }
    const toggleCc = { ...(fx.toggleCc || {}), [field]: value }
    if (field === 'min' && toggleCc.min >= toggleCc.max) {
      toggleCc.max = Math.min(1, toggleCc.min + 0.05)
    }
    if (field === 'max' && toggleCc.max <= toggleCc.min) {
      toggleCc.min = Math.max(0, toggleCc.max - 0.05)
    }
    fx.toggleCc = toggleCc
    next[index] = fx
    onFxChainChange?.(next)
  }

  function handleToggleParamCc(index, paramName) {
    const next = [...(fxChain || [])]
    const fx = { ...next[index] }
    const paramCc = { ...(fx.paramCc || {}) }
    if (paramCc[paramName]) {
      delete paramCc[paramName]
    } else {
      paramCc[paramName] = { cc: fx.cc, min: 0, max: 1 }
    }
    fx.paramCc = paramCc
    next[index] = fx
    onFxChainChange?.(next)
  }

  function handleParamCcChange(index, paramName, field, value) {
    const next = [...(fxChain || [])]
    const fx = { ...next[index] }
    const paramCc = { ...(fx.paramCc || {}) }
    const mapping = { ...(paramCc[paramName] || {}), [field]: value }
    if (field === 'min' && mapping.min >= mapping.max) {
      mapping.max = Math.min(1, mapping.min + 0.05)
    }
    if (field === 'max' && mapping.max <= mapping.min) {
      mapping.min = Math.max(0, mapping.max - 0.05)
    }
    paramCc[paramName] = mapping
    fx.paramCc = paramCc
    next[index] = fx
    onFxChainChange?.(next)
  }

  const usedCc = new Set((fxChain || []).map(f => f.cc))

  return (
    <div className="fx-panel">
      <div className="fx-header" onClick={() => setExpanded(!expanded)}>
        <span>FX {expanded ? 'â–¾' : 'â–¸'}</span>
        <span className="fx-header-label">Effect Chain</span>
        {fxChain && fxChain.length > 0 && (
          <span className="fx-badge">{fxChain.length}</span>
        )}
      </div>

      {expanded && (
        <div className="fx-body">
          {fxChain && fxChain.length > 0 && (
            <div className="fx-chain">
              {fxChain.map((fx, i) => (
                <div key={`${fx.id}-${i}`} className={`fx-item ${fx.enabled ? '' : 'fx-item--disabled'}`}>
                  <div className="fx-item-header">
                    <button
                      className="fx-toggle"
                      onClick={() => handleToggleFx(i)}
                      title={fx.enabled ? 'Disable' : 'Enable'}
                    >
                      {fx.enabled ? 'â—' : 'â—‹'}
                    </button>
                    <button
                      className={`fx-param-cc-btn ${fx.toggleCc ? 'active' : ''}`}
                      onClick={() => handleToggleEffectCc(i)}
                      title={fx.toggleCc ? 'Remove toggle CC' : 'Map toggle to CC'}
                    >
                      CC
                    </button>
                    <span className="fx-item-label">{fx.label}</span>
                    <select
                      className="fx-cc-select"
                      value={fx.cc}
                      onChange={e => handleCcChange(i, e.target.value)}
                    >
                      {CC_CHANNELS.map(ch => (
                        <option key={ch} value={ch}>CC{ch}</option>
                      ))}
                    </select>
                    <button
                      className="fx-remove"
                      onClick={() => handleRemoveFx(i)}
                      title="Remove"
                    >
                      Ã—
                    </button>
                  </div>

                  {fx.toggleCc && (
                    <div className="fx-param-cc-range fx-toggle-cc-range">
                      <span className="fx-param-cc-range-label">ON</span>
                      <span className="fx-param-cc-range-label">CC{fx.toggleCc.cc}</span>
                      <span className="fx-param-cc-range-label">min</span>
                      <input
                        type="range"
                        min={0}
                        max={0.95}
                        step={0.01}
                        value={fx.toggleCc.min}
                        onChange={e => handleToggleEffectCcChange(i, 'min', parseFloat(e.target.value))}
                      />
                      <span className="fx-param-cc-range-val">
                        {(fx.toggleCc.min * 100).toFixed(0)}%
                      </span>
                      <span className="fx-param-cc-range-label">max</span>
                      <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.01}
                        value={fx.toggleCc.max}
                        onChange={e => handleToggleEffectCcChange(i, 'max', parseFloat(e.target.value))}
                      />
                      <span className="fx-param-cc-range-val">
                        {(fx.toggleCc.max * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {fx.enabled && fx.paramValues && Object.keys(fx.paramValues).length > 0 && (
                    <div className="fx-params">
                      {Object.entries(fx.paramValues).map(([paramName, val]) => {
                        const fxDef = effects.find(e => e.id === fx.id)
                        const paramDef = fxDef?.params?.[paramName]
                        if (!paramDef) return null
                        const isCcMapped = !!fx.paramCc?.[paramName]
                        const mapping = fx.paramCc?.[paramName]
                        let displayVal = val
                        if (isCcMapped && mapping && mapping.cc) {
                          const ccKey = `u_cc${mapping.cc}`
                          const ccVal = ccValues?.[ccKey] ?? 0
                          if (ccVal < mapping.min) {
                            displayVal = paramDef.default ?? paramDef.min ?? 0
                          } else {
                            const norm = Math.min(1, Math.max(0, (ccVal - mapping.min) / (mapping.max - mapping.min)))
                            displayVal = (paramDef.min ?? 0) + norm * ((paramDef.max ?? 1) - (paramDef.min ?? 0))
                          }
                        }
                        return (
                          <div key={paramName} className={`fx-param ${isCcMapped ? 'fx-param--cc' : ''}`}>
                            <div className="fx-param-row">
                              <label>{paramDef.label || paramName}</label>
                              <button
                                className={`fx-param-cc-btn ${isCcMapped ? 'active' : ''}`}
                                onClick={() => handleToggleParamCc(i, paramName)}
                                title={isCcMapped ? 'Remove CC' : 'Map to CC'}
                              >
                                CC
                              </button>
                              <input
                                type="range"
                                min={paramDef.min}
                                max={paramDef.max}
                                step={paramDef.step}
                                value={displayVal}
                                disabled={isCcMapped}
                                onChange={e => handleParamChange(i, paramName, parseFloat(e.target.value))}
                              />
                              <span className="fx-param-value">
                                {paramDef.labels
                                  ? paramDef.labels[Math.round(displayVal)] ?? displayVal.toFixed(0)
                                  : (paramDef.max <= 3 ? (displayVal * 100).toFixed(0) + '%' : displayVal.toFixed(2))
                                }
                              </span>
                            </div>

                            {isCcMapped && (
                              <div className="fx-param-cc-range">
                                <span className="fx-param-cc-range-label">CC{mapping.cc}</span>
                                <span className="fx-param-cc-range-label">min</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={0.95}
                                  step={0.01}
                                  value={mapping.min}
                                  onChange={e => handleParamCcChange(i, paramName, 'min', parseFloat(e.target.value))}
                                />
                                <span className="fx-param-cc-range-val">
                                  {(mapping.min * 100).toFixed(0)}%
                                </span>
                                <span className="fx-param-cc-range-label">max</span>
                                <input
                                  type="range"
                                  min={0.05}
                                  max={1}
                                  step={0.01}
                                  value={mapping.max}
                                  onChange={e => handleParamCcChange(i, paramName, 'max', parseFloat(e.target.value))}
                                />
                                <span className="fx-param-cc-range-val">
                                  {(mapping.max * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
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
            <button className="fx-footer-btn" onClick={onLoadStkfx}>Load FX</button>
            <button className="fx-footer-btn fx-footer-btn--save" onClick={onSaveStkfx}>Save FX</button>
          </div>
        </div>
      )}
    </div>
  )
}
