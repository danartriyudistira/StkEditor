import { useState, useCallback } from 'react'
import Slider from './Slider.jsx'

const CC_CHANNELS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function CcPanel({ inputs, mapping, parameterConfig, values, onValueChange, fxChain }) {
  const [expanded, setExpanded] = useState(false)

  const handleCcChange = useCallback((channel, val) => {
    onValueChange?.(`u_cc${channel}`, val)
  }, [onValueChange])

  const ccFxLabels = {}
  for (const fx of (fxChain || [])) {
    if (fx.toggleCc && fx.toggleCc.cc) {
      const key = fx.toggleCc.cc
      const current = ccFxLabels[key] || []
      current.push(fx.label + '(ON)')
      ccFxLabels[key] = current
    }
    if (fx.paramCc) {
      for (const [paramName, fxMapping] of Object.entries(fx.paramCc)) {
        if (fxMapping && fxMapping.cc) {
          const key = fxMapping.cc
          const current = ccFxLabels[key] || []
          current.push(fx.label + '.' + paramName)
          ccFxLabels[key] = current
        }
      }
    }
  }

  if (parameterConfig) {
    for (const [paramName, cfg] of Object.entries(parameterConfig)) {
      if (cfg.cc && cfg.cc > 0) {
        const current = ccFxLabels[cfg.cc] || []
        if (!current.includes(paramName)) {
          current.push(paramName)
          ccFxLabels[cfg.cc] = current
        }
      }
    }
  }

  return (
    <div className="cc-panel">
      <div className="cc-header" onClick={() => setExpanded(!expanded)}>
        <span>CC {expanded ? '▾' : '▸'}</span>
        <span className="cc-header-label">Color Control</span>
      </div>

      {expanded && (
        <div className="cc-body">
          <div className="cc-channels">
            {CC_CHANNELS.map(ch => (
              <div key={ch} className="cc-channel">
                <label className="cc-label">CC{ch}</label>
                <Slider
                  value={values?.[`u_cc${ch}`] ?? 0.5}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => handleCcChange(ch, v)}
                />
                <span className="td-slider-control-value" style={{ color: '#4fc3f7' }}>
                  {(values?.[`u_cc${ch}`] ?? 0.5).toFixed(3)}
                </span>
                {ccFxLabels[ch] && ccFxLabels[ch].length > 0 && (
                  <span className="cc-fx-badge">{ccFxLabels[ch].join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
