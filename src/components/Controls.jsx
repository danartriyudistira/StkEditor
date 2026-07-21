import { useState, useEffect, useRef } from 'react'
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
}) {
  const isHydra = engineMode === 'hydra'
  const [activeParam, setActiveParam] = useState(null)
  const [animTick, setAnimTick] = useState(0)
  const startTimeRef = useRef(Date.now())

  const hasAnyAnim = Object.values(paramAnimation).some(c => c && c.mode !== 'off')
  const prevAnimRef = useRef({})
  const animCtxRef = useRef({ isHydra, hydraParams, metadata, values, paramAnimation, bpm, onAnimGlitch, onChange })
  animCtxRef.current = { isHydra, hydraParams, metadata, values, paramAnimation, bpm, onAnimGlitch, onChange }

  useEffect(() => {
    if (!hasAnyAnim) return
    let raf, frame = 0
    function tick() {
      frame++
      if (frame % 2 === 0) {
        setAnimTick(t => t + 1)
        const ctx = animCtxRef.current
          const list = ctx.isHydra
            ? Object.entries(ctx.hydraParams || {}).map(([n, p]) => ({ NAME: n, MIN: p.min, MAX: p.max }))
            : ctx.metadata?.inputs
          if (list) {
            const time = (Date.now() - startTimeRef.current) / 1000
            for (const input of list) {
              const animCfg = ctx.paramAnimation?.[input.NAME]
              if (!animCfg || animCfg.mode === 'off' || animCfg.mode === 'link') continue
              const base = ctx.values?.[input.NAME] ?? 0
              const newVal = computeAnimatedValue(base, animCfg, time, ctx.bpm, input.NAME)
              const prevVal = prevAnimRef.current[input.NAME]
              if (prevVal !== undefined && Math.abs(newVal - prevVal) > 0.0001) {
                ctx.onAnimGlitch(input.NAME, newVal)
                ctx.onChange?.(input.NAME, newVal)
                const links = animCfg.links || []
                for (const linkName of links) {
                  ctx.onChange?.(linkName, newVal)
                }
              }
              prevAnimRef.current[input.NAME] = newVal
            }
          }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [hasAnyAnim])

  const inputs = isHydra
    ? Object.entries(hydraParams || {}).map(([name, p]) => ({
        NAME: name,
        LABEL: name,
        MIN: p.min,
        MAX: p.max,
        DEFAULT: p.default,
        TYPE: 'float',
        STEP: (p.max - p.min) / 100 || 0.01,
      }))
    : metadata?.inputs

  if (!inputs || inputs.length === 0) {
    return (
      <div className="controls-empty">
        {isHydra ? 'Right-click a number and choose Create slider' : 'No inputs'}
      </div>
    )
  }

  function getDisplayValue(inputName) {
    const config = paramAnimation?.[inputName]
    if (!config || config.mode === 'off') return values?.[inputName] ?? 0
    const time = (Date.now() - startTimeRef.current) / 1000
    return computeAnimatedValue(values?.[inputName] ?? 0, config, time, bpm, inputName)
  }

  return (
    <div className="controls">
      {inputs.map((input) => (
        <ControlRow
          key={input.NAME}
          input={input}
          value={getDisplayValue(input.NAME)}
          onChange={(val) => onChange?.(input.NAME, val)}
          animConfig={paramAnimation?.[input.NAME]}
          paramConfig={parameterConfig?.[input.NAME]}
          onSettingsClick={() => setActiveParam(input.NAME)}
        />
      ))}

      {hasAnyAnim && (
        <div className="controls-bpm-row">
          <label className="controls-bpm-label">BPM</label>
          <Slider
            value={bpm}
            min={40}
            max={200}
            step={1}
            onChange={onBpmChange}
          />
          <span className="controls-bpm-value">{bpm}</span>
        </div>
      )}

      {activeParam !== null && (() => {
        const input = inputs.find(i => i.NAME === activeParam)
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

function ControlRow({ input, value, onChange, animConfig, paramConfig, onSettingsClick }) {
  const label = input.LABEL || input.NAME
  const val = value ?? input.DEFAULT ?? 0
  const min = input.MIN ?? 0
  const max = input.MAX ?? 1
  const step = input.STEP ?? (max - min) / 100
  const hasAnim = animConfig && animConfig.mode !== 'off'
  const hasOsc = paramConfig?.oscAddr?.trim()
  const hasNote = animConfig?.mode === 'note'
  const hasBadge = hasAnim || hasOsc || hasNote

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
            onChange={onChange}
            className={hasAnim ? 'td-slider--anim' : ''}
          />
          <button
            className={btnClass}
            onClick={onSettingsClick}
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
            onChange={(v) => onChange(Math.round(v))}
            className={hasAnim ? 'td-slider--anim' : ''}
          />
          <button
            className={btnClass}
            onClick={onSettingsClick}
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
            onChange={(e) => onChange(e.target.checked ? 1 : 0)}
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
            onChange={(e) => onChange(hexToRgba(e.target.value))}
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
                onChange([v, cur[1]])
              }}
            />
            <Slider
              value={val?.[1] ?? 0}
              min={min}
              max={max}
              step={step}
              onChange={(v) => {
                const cur = val || [0, 0]
                onChange([cur[0], v])
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
}

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
