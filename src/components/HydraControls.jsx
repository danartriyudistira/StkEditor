import Slider from './Slider.jsx'

export default function HydraControls({ params, onParamChange }) {
  const entries = Object.entries(params)
  if (entries.length === 0) return null

  return (
    <div className="hydra-controls">
      <div className="hydra-controls-header">
        <span className="hydra-controls-label">Hydra Params</span>
      </div>
      <div className="hydra-controls-body">
        {entries.map(([name, p]) => (
          <div key={name} className="hydra-controls-row">
            <label className="hydra-controls-name">{name}</label>
            <Slider
              value={p.value}
              min={p.min}
              max={p.max}
              step={(p.max - p.min) / 100 || 0.01}
              onChange={(v) => onParamChange(name, v)}
            />
            <span className="hydra-controls-value">{p.value.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
