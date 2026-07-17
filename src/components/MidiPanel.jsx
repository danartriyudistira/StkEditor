import { useState, useEffect, useCallback, useRef } from 'react'

const CC_NUMBERS = {
  1: { name: 'Mod Wheel', defaultChannel: 1 },
  2: { name: 'Breath', defaultChannel: 2 },
  7: { name: 'Volume', defaultChannel: 3 },
  10: { name: 'Pan', defaultChannel: 4 },
  11: { name: 'Expression', defaultChannel: 5 },
  71: { name: 'Resonance', defaultChannel: 6 },
  74: { name: 'Cutoff', defaultChannel: 7 },
  91: { name: 'Reverb', defaultChannel: 8 },
}

export default function MidiPanel({ ccValues, onCcChange }) {
  const [expanded, setExpanded] = useState(false)
  const [midiAccess, setMidiAccess] = useState(null)
  const [inputs, setInputs] = useState([])
  const [mapping, setMapping] = useState(() => {
    const m = {}
    for (const [ccNum, config] of Object.entries(CC_NUMBERS)) {
      m[ccNum] = config.defaultChannel
    }
    return m
  })
  const activeRef = useRef({})

  useEffect(() => {
    if (!navigator.requestMIDIAccess) return

    navigator.requestMIDIAccess()
      .then(access => {
        setMidiAccess(access)
        updateInputs(access)
        access.onstatechange = () => updateInputs(access)
      })
      .catch(() => {})
  }, [])

  function updateInputs(access) {
    const list = []
    for (const input of access.inputs.values()) {
      list.push({ id: input.id, name: input.name, manufacturer: input.manufacturer })
    }
    setInputs(list)
  }

  useEffect(() => {
    if (!midiAccess) return
    if (!expanded) return

    function handleMessage(e) {
      const [status, ccNum, value] = e.data
      const channel = mapping[ccNum]
      if (channel !== undefined) {
        const normalized = value / 127
        onCcChange?.(`u_cc${channel}`, normalized)
      }
    }

    for (const input of midiAccess.inputs.values()) {
      input.onmidimessage = handleMessage
    }

    return () => {
      for (const input of midiAccess.inputs.values()) {
        input.onmidimessage = null
      }
    }
  }, [midiAccess, expanded, mapping, onCcChange])

  const handleMappingChange = useCallback((ccNum, channel) => {
    setMapping(prev => ({ ...prev, [ccNum]: channel }))
  }, [])

  if (!navigator.requestMIDIAccess) {
    return null
  }

  return (
    <div className="midi-panel">
      <div className="midi-header" onClick={() => setExpanded(!expanded)}>
        <span>MIDI {expanded ? '▾' : '▸'}</span>
        <span className="midi-header-label">
          {inputs.length > 0 ? `${inputs.length} device(s)` : 'No device'}
        </span>
      </div>

      {expanded && (
        <div className="midi-body">
          {inputs.length === 0 && (
            <div className="midi-empty">No MIDI devices detected</div>
          )}

          {inputs.length > 0 && (
            <>
              <div className="midi-devices">
                {inputs.map(dev => (
                  <div key={dev.id} className="midi-device">
                    {dev.name}
                  </div>
                ))}
              </div>

              <div className="midi-mapping">
                <div className="midi-mapping-title">MIDI CC → CC Channel</div>
                {Object.entries(CC_NUMBERS).map(([ccNum, config]) => (
                  <div key={ccNum} className="midi-mapping-row">
                    <span className="midi-cc-label">CC {ccNum} ({config.name})</span>
                    <span className="midi-arrow">→</span>
                    <select
                      value={mapping[ccNum] || ''}
                      onChange={e => handleMappingChange(ccNum, parseInt(e.target.value))}
                    >
                      <option value="">—</option>
                      {[1,2,3,4,5,6,7,8].map(ch => (
                        <option key={ch} value={ch}>CC{ch}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
