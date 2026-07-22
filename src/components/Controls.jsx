import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import ParameterPopup from './ParameterPopup.jsx'
import Slider from './Slider.jsx'
import { computeAnimatedValue } from '../utils/animation.js'

export default function Controls({
  metadata, values, onChange,
  paramAnimation, onParamAnimationChange,
  parameterConfig, onParameterConfigChange, onParamOscChange,
  bpm, onBpmChange,
  hydraParams, engineMode,
  glitchParamConfig, onGlitchConfigChange,
  onAnimGlitch,
  resetBeatKey,
  onResetBeat,
  hideTempo,
}) {
  const isHydra = engineMode === 'hydra'
  const [activeParam, setActiveParam] = useState(null)
  const [animTick, setAnimTick] = useState(0)
  const startTimeRef = useRef(Date.now())
  const displayRef = useRef({})

  const hasAnyAnim = useMemo(
    () => Object.values(paramAnimation).some(c => c && c.mode !== 'off' && c.mode !== 'link'),
    [paramAnimation]
  )
  const prevAnimRef = useRef({})
  const animCtxRef = useRef(null)
  animCtxRef.current = { isHydra, hydraParams, metadata, values, paramAnimation, bpm, onAnimGlitch, onChange }
  const bpmRef = useRef()

  // Reset beat phase
  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [resetBeatKey])

  // Hold-repeat refs
  const holdIntervalRef = useRef(null)

  function startHold(fn, interval = 120) {
    stopHold()
    fn()
    holdIntervalRef.current = setInterval(fn, interval)
  }

  function stopHold() {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }

  // Tempo editing (double-click)
  const [tempoEditing, setTempoEditing] = useState(false)
  const tempoInputRef = useRef(null)
  useEffect(() => {
    if (tempoEditing) tempoInputRef.current?.focus()
  }, [tempoEditing])

  // Tap tempo
  const tapTimesRef = useRef([])
  const handleTapTempo = useCallback(() => {
    const now = Date.now()
    const taps = tapTimesRef.current
    taps.push(now)
    if (taps.length > 4) taps.shift()
    if (taps.length >= 2) {
      const intervals = []
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1])
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const newBpm = Math.round(60000 / avg)
      if (newBpm >= 40 && newBpm <= 240) onBpmChange?.(newBpm)
    }
  }, [onBpmChange])

  useEffect(() => {
    if (!hasAnyAnim) return
    let raf
    let frame = 0
    function tick() {
      frame++
      const ctx = animCtxRef.current
      const list = ctx.isHydra
        ? Object.entries(ctx.hydraParams || {}).map(([n, p]) => ({ NAME: n, MIN: p.min, MAX: p.max }))
        : ctx.metadata?.inputs
      if (list) {
        const time = (Date.now() - startTimeRef.current) / 1000
        let fired = false
        for (const input of list) {
          const animCfg = ctx.paramAnimation?.[input.NAME]
          if (!animCfg || animCfg.mode === 'off' || animCfg.mode === 'link') continue
          const base = ctx.values?.[input.NAME] ?? 0
          const newVal = computeAnimatedValue(base, animCfg, time, ctx.bpm, input.NAME)
          displayRef.current[input.NAME] = newVal
          const prevVal = prevAnimRef.current[input.NAME]
          if (prevVal !== undefined && Math.abs(newVal - prevVal) > 0.0001) {
            fired = true
            ctx.onAnimGlitch(input.NAME, newVal)
            ctx.onChange?.(input.NAME, newVal)
            const links = animCfg.links || []
            for (const linkName of links) {
              ctx.onChange?.(linkName, newVal)
            }
          }
          prevAnimRef.current[input.NAME] = newVal
        }
        if (fired || frame % 3 === 0) {
          setAnimTick(t => t + 1)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [hasAnyAnim])

  const inputs = useMemo(() => {
    if (isHydra) {
      return Object.entries(hydraParams || {}).map(([name, p]) => ({
        NAME: name,
        LABEL: name,
        MIN: p.min,
        MAX: p.max,
        DEFAULT: p.default,
        TYPE: 'float',
        STEP: (p.max - p.min) / 100 || 0.01,
      }))
    }
    return metadata?.inputs
  }, [isHydra, hydraParams, metadata])

  function getDisplayValue(inputName) {
    const config = paramAnimation?.[inputName]
    if (!config || config.mode === 'off') return values?.[inputName] ?? 0
    return displayRef.current[inputName] ?? values?.[inputName] ?? 0
  }

  return (
    <div className="controls">
      {!hideTempo && <div className="tempo-bar">
        <div className="tempo-bar-bpm">
          <button className="tempo-btn"
            onMouseDown={() => startHold(() => onBpmChange?.(Math.max(40, (bpm ?? 120) - 1)))}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => startHold(() => onBpmChange?.(Math.max(40, (bpm ?? 120) - 1)))}
            onTouchEnd={stopHold}
          >-</button>

          {tempoEditing ? (
            <input
              ref={tempoInputRef}
              className="tempo-input"
              type="number"
              min={40}
              max={240}
              defaultValue={bpm ?? 120}
              onBlur={e => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v >= 40 && v <= 240) onBpmChange?.(v)
                setTempoEditing(false)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v) && v >= 40 && v <= 240) onBpmChange?.(v)
                  setTempoEditing(false)
                }
                if (e.key === 'Escape') setTempoEditing(false)
              }}
            />
          ) : (
            <span className="tempo-value" onDoubleClick={() => setTempoEditing(true)}>
              {bpm ?? 120}
            </span>
          )}

          <button className="tempo-btn"
            onMouseDown={() => startHold(() => onBpmChange?.(Math.min(240, (bpm ?? 120) + 1)))}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => startHold(() => onBpmChange?.(Math.min(240, (bpm ?? 120) + 1)))}
            onTouchEnd={stopHold}
          >+</button>
        </div>
        <div className="tempo-bar-actions">
          <button className="tempo-act tempo-act--tab" onClick={handleTapTempo} title="Tap tempo">TAB</button>
          <button className="tempo-act tempo-act--reset" onClick={onResetBeat} title="Reset beat phase">Reset</button>
          <button className="tempo-act tempo-act--nudge"
            onMouseDown={() => { bpmRef.current = bpm ?? 120; startHold(() => onBpmChange?.(Math.max(40, (bpm ?? 120) - 5)), 200); }}
            onMouseUp={() => { stopHold(); const v = bpmRef.current; if (v !== undefined) onBpmChange?.(v); }}
            onMouseLeave={() => { stopHold(); const v = bpmRef.current; if (v !== undefined) onBpmChange?.(v); }}
            onTouchStart={() => { bpmRef.current = bpm ?? 120; startHold(() => onBpmChange?.(Math.max(40, (bpm ?? 120) - 5)), 200); }}
            onTouchEnd={() => { stopHold(); const v = bpmRef.current; if (v !== undefined) onBpmChange?.(v); }}
            title="Nudge down">{'\u2039'} Nudge</button>
          <button className="tempo-act tempo-act--nudge"
            onMouseDown={() => { bpmRef.current = bpm ?? 120; startHold(() => onBpmChange?.(Math.min(240, (bpm ?? 120) + 5)), 200); }}
            onMouseUp={() => { stopHold(); const v = bpmRef.current; if (v !== undefined) onBpmChange?.(v); }}
            onMouseLeave={() => { stopHold(); const v = bpmRef.current; if (v !== undefined) onBpmChange?.(v); }}
            onTouchStart={() => { bpmRef.current = bpm ?? 120; startHold(() => onBpmChange?.(Math.min(240, (bpm ?? 120) + 5)), 200); }}
            onTouchEnd={() => { stopHold(); const v = bpmRef.current; if (v !== undefined) onBpmChange?.(v); }}
            title="Nudge up">Nudge {'\u203A'}</button>
        </div>
      </div>}

      {!inputs || inputs.length === 0 ? (
        <div className="controls-empty">
          {isHydra ? 'Right-click a number and choose Create slider' : 'No inputs'}
        </div>
      ) : inputs.map((input) => (
        <ControlRow
          key={input.NAME}
          input={input}
          displayValue={getDisplayValue(input.NAME)}
          onChange={onChange}
          inputName={input.NAME}
          animConfig={paramAnimation?.[input.NAME]}
          paramConfig={parameterConfig?.[input.NAME]}
          setActiveParam={setActiveParam}
        />
      ))}

      {activeParam !== null && (() => {
        const input = inputs?.find(i => i.NAME === activeParam)
        const cfg = parameterConfig?.[activeParam] || {}
        return (
          <ParameterPopup
            paramName={activeParam}
            label={input?.LABEL || activeParam}
            paramMin={input?.MIN ?? 0}
            paramMax={input?.MAX ?? 1}
            value={values?.[activeParam]}
            animConfig={paramAnimation?.[activeParam] || { mode: 'off', speed: 1, min: 0, max: 1, bpmSync: false, bpmDiv: 4, direction: 'loop' }}
            oscAddr={cfg.oscAddr || ''}
            onAnimSave={onParamAnimationChange}
            onOscChange={onParamOscChange}
            onClose={() => setActiveParam(null)}
            glitchConfig={glitchParamConfig?.[activeParam] || {}}
            onGlitchChange={(cfg) => onGlitchConfigChange?.(activeParam, cfg)}
            allParamNames={inputs?.map(i => i.NAME) || []}
          />
        )
      })()}
    </div>
  )
}

const ControlRow = memo(function ControlRow({ input, displayValue, onChange, inputName, animConfig, paramConfig, setActiveParam }) {
  const label = input.LABEL || input.NAME
  const val = displayValue ?? input.DEFAULT ?? 0
  const min = input.MIN ?? 0
  const max = input.MAX ?? 1
  const step = input.STEP ?? (max - min) / 100
  const hasAnim = animConfig && animConfig.mode !== 'off'
  const hasOsc = paramConfig?.oscAddr?.trim()
  const hasNote = animConfig?.mode === 'note'
  const hasBadge = hasAnim || hasOsc || hasNote

  const handleChange = useCallback((v) => { onChange?.(inputName, v) }, [onChange, inputName])
  const handleSettings = useCallback(() => { setActiveParam(inputName) }, [setActiveParam, inputName])

  const btnClass = `control-anim-btn${hasBadge ? ' active' : ''}${hasOsc ? ' has-osc' : ''}${hasNote ? ' has-note' : ''}`

  switch (input.TYPE) {
      case 'float':
      return (
        <div className="control-row">
          <label>{label}</label>
          <Slider
            value={val}
            min={min}
            max={max}
            step={step}
            onChange={handleChange}
            className={hasAnim ? 'td-slider--anim' : ''}
          />
          <button
            className={btnClass}
            onClick={handleSettings}
            title="Control settings (Animation, CC, OSC)"
          >
            {'\u2699'}
          </button>
        </div>
      )

    case 'long':
      return (
        <div className="control-row">
          <label>{label}</label>
          <Slider
            value={Math.round(val)}
            min={Math.round(min)}
            max={Math.round(max)}
            step={1}
            onChange={(v) => handleChange(Math.round(v))}
            className={hasAnim ? 'td-slider--anim' : ''}
          />
          <button
            className={btnClass}
            onClick={handleSettings}
            title="Control settings (Animation, CC, OSC)"
          >
            {'\u2699'}
          </button>
        </div>
      )

    case 'bool':
    case 'event':
      return (
        <div className="control-row">
          <label>{label}</label>
          <input
            type="checkbox"
            checked={!!val}
            onChange={(e) => handleChange(e.target.checked ? 1 : 0)}
          />
        </div>
      )

    case 'color': {
      const hex = rgbaToHex(val)
      return (
        <div className="control-row">
          <label>{label}</label>
          <input
            type="color"
            value={hex}
            onChange={(e) => handleChange(hexToRgba(e.target.value))}
          />
          <span className="control-value">
            {Array.isArray(val) ? val.map(v => v.toFixed(2)).join(', ') : ''}
          </span>
        </div>
      )
    }

    case 'point2D':
      return (
        <div className="control-row control-row--point">
          <label>{label}</label>
          <div className="point-inputs">
            <Slider
              value={val?.[0] ?? 0}
              min={min}
              max={max}
              step={step}
              onChange={(v) => {
                const cur = val || [0, 0]
                handleChange([v, cur[1]])
              }}
            />
            <Slider
              value={val?.[1] ?? 0}
              min={min}
              max={max}
              step={step}
              onChange={(v) => {
                const cur = val || [0, 0]
                handleChange([cur[0], v])
              }}
            />
          </div>
        </div>
      )

    default:
      return (
        <div className="control-row">
          <label>{label}</label>
          <span className="control-value">{String(val)}</span>
        </div>
      )
  }
})

function rgbaToHex(rgba) {
  if (!Array.isArray(rgba) || rgba.length < 3) return '#ffffff'
  const r = Math.round(Math.min(1, Math.max(0, rgba[0])) * 255)
  const g = Math.round(Math.min(1, Math.max(0, rgba[1])) * 255)
  const b = Math.round(Math.min(1, Math.max(0, rgba[2])) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function hexToRgba(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b, 1]
}
