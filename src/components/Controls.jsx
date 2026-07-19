import { useState, useEffect, useRef } from 'react'
import AnimationPopup from './AnimationPopup.jsx'
import { computeAnimatedValue } from '../utils/animation.js'

export default function Controls({ metadata, values, onChange, paramAnimation, onParamAnimationChange, bpm, onBpmChange }) {
  const [animParam, setAnimParam] = useState(null)
  const [animTick, setAnimTick] = useState(0)
  const startTimeRef = useRef(Date.now())

  const hasAnyAnim = Object.values(paramAnimation).some(c => c && c.mode !== 'off')

  useEffect(() => {
    if (!hasAnyAnim) return
    let raf, frame = 0
    function tick() {
      frame++
      if (frame % 2 === 0) setAnimTick(t => t + 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [hasAnyAnim])

  if (!metadata || !metadata.inputs || metadata.inputs.length === 0) {
    return (
      <div className="controls-empty">
        No inputs
      </div>
    )
  }

  function getDisplayValue(inputName) {
    const config = paramAnimation?.[inputName]
    if (!config || config.mode === 'off') return values[inputName]
    const time = (Date.now() - startTimeRef.current) / 1000
    return computeAnimatedValue(values[inputName], config, time, bpm)
  }

  return (
    <div className="controls">
      {metadata.inputs.map((input) => (
        <ControlRow
          key={input.NAME}
          input={input}
          value={getDisplayValue(input.NAME)}
          onChange={(val) => onChange?.(input.NAME, val)}
          animConfig={paramAnimation?.[input.NAME]}
          onAnimClick={() => setAnimParam(input.NAME)}
        />
      ))}

      <div className="controls-bpm-row">
        <label className="controls-bpm-label">BPM</label>
        <input
          type="range"
          min={40}
          max={200}
          step={1}
          value={bpm}
          onChange={e => onBpmChange?.(parseFloat(e.target.value))}
          className="controls-bpm-slider"
        />
        <span className="controls-bpm-value">{bpm}</span>
      </div>

      {animParam !== null && (
        <AnimationPopup
          paramName={animParam}
          label={metadata.inputs.find(i => i.NAME === animParam)?.LABEL || animParam}
          config={paramAnimation?.[animParam] || { mode: 'off', speed: 1, depth: 1, bpmSync: false, bpmDiv: 4 }}
          onSave={onParamAnimationChange}
          onClose={() => setAnimParam(null)}
        />
      )}
    </div>
  )
}

function ControlRow({ input, value, onChange, animConfig, onAnimClick }) {
  const label = input.LABEL || input.NAME
  const val = value ?? input.DEFAULT ?? 0
  const min = input.MIN ?? 0
  const max = input.MAX ?? 1
  const step = input.STEP ?? (max - min) / 100
  const hasAnim = animConfig && animConfig.mode !== 'off'

  switch (input.TYPE) {
    case 'float':
      return (
        <div className="control-row">
          <label>{label}</label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={val}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className={hasAnim ? 'control-slider--anim' : ''}
          />
          <span className="control-value">{val.toFixed(3)}</span>
          <button
            className={`control-anim-btn${hasAnim ? ' active' : ''}`}
            onClick={onAnimClick}
            title="Animation settings"
          >
            {'\u2699'}
          </button>
        </div>
      )

    case 'long':
      return (
        <div className="control-row">
          <label>{label}</label>
          <input
            type="range"
            min={Math.round(min)}
            max={Math.round(max)}
            step={1}
            value={Math.round(val)}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className={hasAnim ? 'control-slider--anim' : ''}
          />
          <span className="control-value">{Math.round(val)}</span>
          <button
            className={`control-anim-btn${hasAnim ? ' active' : ''}`}
            onClick={onAnimClick}
            title="Animation settings"
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
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={val?.[0] ?? 0}
              onChange={(e) => {
                const v = val || [0, 0]
                onChange([parseFloat(e.target.value), v[1]])
              }}
            />
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={val?.[1] ?? 0}
              onChange={(e) => {
                const v = val || [0, 0]
                onChange([v[0], parseFloat(e.target.value)])
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
