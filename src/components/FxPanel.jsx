import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { effects, getEffectById, getEffectsByCategory } from '../fx/effects.js'
import ParameterPopup from './ParameterPopup.jsx'
import Slider from './Slider.jsx'
import { computeAnimatedValue } from '../utils/animation.js'

const CC_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8]
const FX_CATEGORIES = getEffectsByCategory()

export default function FxPanel({ fxChain, onFxChainChange, ccValues, onSaveStkfx, onLoadStkfx, onLoadIsf, onAnimGlitch, glitchParamConfig, onGlitchConfigChange, bpm, resetBeatKey }) {
  const [expanded, setExpanded] = useState(false)
  const [collapsedFx, setCollapsedFx] = useState({})
  const [activeFxParam, setActiveFxParam] = useState(null)
  const [activeFxSettings, setActiveFxSettings] = useState(null)
  const categories = FX_CATEGORIES
  const startTimeRef = useRef(Date.now())
  const animValuesRef = useRef({})
  const animCtxRef = useRef()
  animCtxRef.current = { fxChain, bpm, onAnimGlitch, onFxChainChange }

  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [resetBeatKey])

  const hasAnyAnim = useMemo(() => {
    return (fxChain || []).some(fx =>
      fx.paramConfig && Object.values(fx.paramConfig).some(pc => pc.animation && pc.animation.mode !== 'off' && pc.animation.mode !== 'link')
    )
  }, [fxChain])

  useEffect(() => {
    if (!hasAnyAnim) return
    let raf
    function tick() {
      const { fxChain: chain, bpm: bpmVal, onAnimGlitch: glitchFn, onFxChainChange: changeFn } = animCtxRef.current || {}
      if (!chain) { raf = requestAnimationFrame(tick); return }
      const time = (Date.now() - startTimeRef.current) / 1000
      const prev = { ...animValuesRef.current }
      const updates = {}

      for (let i = 0; i < chain.length; i++) {
        const fx = chain[i]
        const fxDef = getEffectById(fx.id)
        if (!fxDef?.params) continue
        for (const [paramName, paramDef] of Object.entries(fxDef.params)) {
          const animCfg = fx.paramConfig?.[paramName]?.animation
          if (!animCfg || animCfg.mode === 'off' || animCfg.mode === 'link') continue
          const key = `fx${i}_${paramName}`
          const baseVal = fx.paramValues[paramName] ?? paramDef.default ?? 0
          const newVal = computeAnimatedValue(baseVal, animCfg, time, bpmVal, key)
          if (prev[key] === undefined || Math.abs(newVal - (prev[key] ?? baseVal)) > 0.0001) {
            updates[key] = newVal
          }
          prev[key] = newVal
        }
      }

      if (Object.keys(updates).length > 0) {
        const nextChain = chain.map(fx => ({ ...fx, paramValues: { ...fx.paramValues } }))
        for (const [key, val] of Object.entries(updates)) {
          const parts = key.match(/^fx(\d+)_(.+)$/)
          if (parts) {
            const i = parseInt(parts[1])
            const paramName = parts[2]
            if (nextChain[i]) {
              nextChain[i].paramValues[paramName] = val
            }
          }
          glitchFn?.(key, val)
        }

        for (let i = 0; i < nextChain.length; i++) {
          const fx = nextChain[i]
          const fxDef = getEffectById(fx.id)
          if (!fxDef?.params) continue
          for (const [paramName, paramDef] of Object.entries(fxDef.params)) {
            const animCfg = fx.paramConfig?.[paramName]?.animation
            if (!animCfg || animCfg.mode !== 'link') continue
            const links = animCfg.links || []
            for (const linkName of links) {
              const srcKey = `fx${i}_${linkName}`
              const srcVal = updates[srcKey] ?? nextChain[i].paramValues[linkName]
              if (srcVal !== undefined) {
                const srcDef = fxDef.params?.[linkName]
                const srcMin = srcDef?.min ?? 0
                const srcMax = srcDef?.max ?? 1
                const norm = (srcVal - srcMin) / Math.max(0.001, srcMax - srcMin)
                const dstMin = animCfg.min ?? 0
                const dstMax = animCfg.max ?? 1
                nextChain[i].paramValues[paramName] = dstMin + norm * (dstMax - dstMin)
              }
            }
          }
        }

        changeFn?.(nextChain)
      }

      animValuesRef.current = prev
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [hasAnyAnim])

  const handleAddFx = useCallback((effectId) => {
    const fx = getEffectById(effectId)
    if (!fx) return

    const paramValues = {}
    if (fx.params) {
      for (const [k, v] of Object.entries(fx.params)) {
        paramValues[k] = v.default ?? 0
      }
    }

    onFxChainChange?.(prev => [
      ...(prev || []),
      { id: fx.id, label: fx.label, enabled: true, paramValues, paramCc: {}, paramConfig: {} },
    ])
  }, [onFxChainChange])

  const handleRemoveFx = useCallback((index) => {
    onFxChainChange?.(prev => {
      const next = [...prev]
      next.splice(index, 1)
      return next
    })
  }, [onFxChainChange])

  const handleToggleFx = useCallback((index) => {
    onFxChainChange?.(prev => {
      const next = [...prev]
      next[index] = { ...next[index], enabled: !next[index].enabled }
      return next
    })
  }, [onFxChainChange])

  const handleParamChange = useCallback((index, paramName, value) => {
    onAnimGlitch?.(`fx${index}_${paramName}`, value)
    onFxChainChange?.(prev => {
      const next = [...prev]
      const fx = { ...next[index] }
      fx.paramValues = { ...fx.paramValues, [paramName]: value }
      next[index] = fx
      return next
    })
  }, [onFxChainChange, onAnimGlitch])

  const handleToggleEffectCc = useCallback((index) => {
    onFxChainChange?.(prev => {
      const next = [...prev]
      const fx = { ...next[index] }
      if (fx.toggleCc) {
        fx.toggleCc = null
      } else {
        const usedCc = new Set(next.map(f => f.toggleCc?.cc).filter(Boolean))
        const freeCc = CC_CHANNELS.find(c => c > 0 && !usedCc.has(c)) || 1
        fx.toggleCc = { cc: freeCc, min: 0, max: 1 }
      }
      next[index] = fx
      return next
    })
  }, [onFxChainChange])

  const handleFxParamAnimChange = useCallback((index, paramName, animConfig) => {
    onFxChainChange?.(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        paramConfig: {
          ...next[index].paramConfig,
          [paramName]: { ...next[index].paramConfig?.[paramName], animation: animConfig }
        }
      }
      return next
    })
  }, [onFxChainChange])

  const handleFxParamOscChange = useCallback((index, paramName, oscAddr) => {
    onFxChainChange?.(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        paramConfig: {
          ...next[index].paramConfig,
          [paramName]: { ...next[index].paramConfig?.[paramName], oscAddr }
        }
      }
      return next
    })
  }, [onFxChainChange])

  const usedCc = useMemo(
    () => new Set((fxChain || []).map(f => f.toggleCc?.cc).filter(Boolean)),
    [fxChain]
  )

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
              {fxChain.map((fx, i) => { const fxDef = getEffectById(fx.id); const cellKey = `${fx.id}-${i}`; return (
                <div key={cellKey} className={`fx-item ${fx.enabled ? '' : 'fx-item--disabled'}`}>
                  <div className="fx-item-header">
                    <button
                      className="fx-collapse"
                      onClick={() => setCollapsedFx(prev => ({ ...prev, [cellKey]: !prev[cellKey] }))}
                      title={collapsedFx[cellKey] ? 'Expand' : 'Collapse'}
                    >
                      {collapsedFx[cellKey] ? '▸' : '▾'}
                    </button>
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

                  {!collapsedFx[i] && fx.paramValues && Object.keys(fx.paramValues).length > 0 && (
<div className="fx-params">
                       {Object.entries(fx.paramValues).map(([paramName, val]) => {
                         const fxDef = getEffectById(fx.id)
                         const paramDef = fxDef?.params?.[paramName]
                         if (!paramDef) return null
                         const paramCfg = fx.paramConfig?.[paramName] || {}
                         const animCfg = paramCfg.animation
                         const hasOsc = paramCfg.oscAddr?.trim()
                         const hasAnim = animCfg && animCfg.mode !== 'off'
                         const hasBadge = hasOsc || hasAnim
 
                          const animRefVal = animValuesRef.current?.[`fx${i}_${paramName}`]
                          const displayVal = hasAnim && animRefVal !== undefined ? animRefVal : val
 
                         const btnClass = `fx-param-settings-btn${hasBadge ? ' active' : ''}${hasOsc ? ' has-osc' : ''}`

                        return (
                          <div key={paramName} className="fx-param">
                            {paramDef.type === 'bool' ? (
                              <div className="fx-param-row">
                                <label>{paramDef.label || paramName}</label>
                                <input
                                  type="checkbox"
                                  checked={!!displayVal}
                                  onChange={e => handleParamChange(i, paramName, e.target.checked ? 1 : 0)}
                                />
                              </div>
                            ) : paramDef.type === 'color' ? (
                              <div className="fx-param-row">
                                <label>{paramDef.label || paramName}</label>
                                <input
                                  type="color"
                                  value={rgbToHex(displayVal)}
                                  onChange={e => handleParamChange(i, paramName, hexToRgb(e.target.value))}
                                />
                              </div>
                            ) : (
                              <div className="fx-param-row">
                                <label>{paramDef.label || paramName}</label>
                                <Slider
                                  value={displayVal}
                                  min={paramDef.min}
                                  max={paramDef.max}
                                  step={paramDef.step}
                                  onChange={(v) => handleParamChange(i, paramName, v)}
                                  className={hasAnim ? 'td-slider--anim' : ''}
                                />
                                <button
                                  className={btnClass}
                                  onClick={() => setActiveFxParam({ fxIndex: i, paramName })}
                                  title="Control settings (Animation, OSC)"
                                >
                                  {'\u2699'}
                                </button>
                              </div>
                            )}
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
        return createPortal(
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
                        <Slider
                          value={fx.toggleCc.min}
                          min={0}
                          max={0.95}
                          step={0.01}
                          onChange={(v) => {
                            const next = [...(fxChain || [])]
                            const toggleCc = { ...fx.toggleCc, min: v }
                            if (toggleCc.min >= toggleCc.max) toggleCc.max = Math.min(1, toggleCc.min + 0.05)
                            next[activeFxSettings] = { ...next[activeFxSettings], toggleCc }
                            onFxChainChange?.(next)
                          }}
                        />
                        <span className="anim-popup-value">{(fx.toggleCc.min * 100).toFixed(0)}%</span>
                      </div>
                      <div className="anim-popup-row">
                        <label>Max</label>
                        <Slider
                          value={fx.toggleCc.max}
                          min={0.05}
                          max={1}
                          step={0.01}
                          onChange={(v) => {
                            const next = [...(fxChain || [])]
                            const toggleCc = { ...fx.toggleCc, max: v }
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
          </div>,
          document.body
        )
      })()}

      {activeFxParam !== null && (() => {
        const fx = fxChain?.[activeFxParam.fxIndex]
        const fxDef = getEffectById(fx?.id)
        const paramDef = fxDef?.params?.[activeFxParam.paramName]
        const paramCfg = fx?.paramConfig?.[activeFxParam.paramName] || {}
        const animCfg = paramCfg.animation || { mode: 'off', speed: 1, min: 0, max: 1, bpmSync: false, bpmDiv: 4, direction: 'loop' }
        const glitchKey = `fx${activeFxParam.fxIndex}_${activeFxParam.paramName}`

        const fxValues = fxChain?.[activeFxParam.fxIndex]?.paramValues || {}
        const otherFxParams = fxDef?.params ? Object.keys(fxDef.params).filter(n => n !== activeFxParam.paramName) : []
        return (
          <ParameterPopup
            paramName={activeFxParam.paramName}
            label={paramDef?.label || activeFxParam.paramName}
            paramMin={paramDef?.min ?? 0}
            paramMax={paramDef?.max ?? 1}
            value={fxValues[activeFxParam.paramName]}
            animConfig={animCfg}
            oscAddr={paramCfg.oscAddr || ''}
            onAnimSave={(name, cfg) => handleFxParamAnimChange(activeFxParam.fxIndex, activeFxParam.paramName, cfg)}
            onOscChange={(name, addr) => handleFxParamOscChange(activeFxParam.fxIndex, activeFxParam.paramName, addr)}
            onClose={() => setActiveFxParam(null)}
            glitchConfig={glitchParamConfig?.[glitchKey] || {}}
            onGlitchChange={(cfg) => onGlitchConfigChange?.(glitchKey, cfg)}
            allParamNames={otherFxParams}
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
