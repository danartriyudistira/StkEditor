import { useState, useCallback } from 'react'

const CC_CHANNELS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function CcPanel({ inputs, mapping, onMappingChange, values, onValueChange, fxChain }) {
  const [expanded, setExpanded] = useState(false)

  const handleCcChange = useCallback((channel, val) => {
    onValueChange?.(`u_cc${channel}`, val)
  }, [onValueChange])

  const ccFxLabels = {}
  for (const fx of (fxChain || [])) {
    if (fx.cc) {
      const current = ccFxLabels[fx.cc] || []
      current.push(fx.label)
      ccFxLabels[fx.cc] = current
    }
    if (fx.toggleCc && fx.toggleCc.cc) {
      const key = fx.toggleCc.cc
      const current = ccFxLabels[key] || []
      current.push(fx.label + '(ON)')
      ccFxLabels[key] = current
    }
    if (fx.paramCc) {
      for (const [paramName, mapping] of Object.entries(fx.paramCc)) {
        if (mapping && mapping.cc && mapping.cc !== fx.cc) {
          const key = mapping.cc
          const current = ccFxLabels[key] || []
          current.push(fx.label + '.' + paramName)
          ccFxLabels[key] = current
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
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={values?.[`u_cc${ch}`] ?? 0.5}
                  onChange={e => handleCcChange(ch, parseFloat(e.target.value))}
                  className="cc-slider"
                />
                <span className="cc-value">
                  {(values?.[`u_cc${ch}`] ?? 0.5).toFixed(3)}
                </span>
                {ccFxLabels[ch] && ccFxLabels[ch].length > 0 && (
                  <span className="cc-fx-badge">{ccFxLabels[ch].join(', ')}</span>
                )}
              </div>
            ))}
          </div>

          {inputs && inputs.length > 0 && (
            <div className="cc-mapping">
              <div className="cc-mapping-title">Input → CC Mapping</div>
              {inputs.map(input => (
                <div key={input.NAME} className="cc-mapping-row">
                  <span className="cc-mapping-name">{input.LABEL || input.NAME}</span>
                  <select
                    value={mapping?.[input.NAME] || ''}
                    onChange={e => onMappingChange?.(input.NAME, e.target.value)}
                  >
                    <option value="">—</option>
                    {CC_CHANNELS.map(ch => (
                      <option key={ch} value={`cc${ch}`}>CC{ch}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
