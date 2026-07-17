export default function Controls({ metadata, values, onChange }) {
  if (!metadata || !metadata.inputs || metadata.inputs.length === 0) {
    return (
      <div className="controls-empty">
        No inputs
      </div>
    )
  }

  return (
    <div className="controls">
      {metadata.inputs.map((input) => (
        <ControlRow
          key={input.NAME}
          input={input}
          value={values[input.NAME]}
          onChange={(val) => onChange?.(input.NAME, val)}
        />
      ))}
    </div>
  )
}

function ControlRow({ input, value, onChange }) {
  const label = input.LABEL || input.NAME
  const val = value ?? input.DEFAULT ?? 0
  const min = input.MIN ?? 0
  const max = input.MAX ?? 1
  const step = input.STEP ?? (max - min) / 100

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
          />
          <span className="control-value">{val.toFixed(3)}</span>
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
          />
          <span className="control-value">{Math.round(val)}</span>
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
