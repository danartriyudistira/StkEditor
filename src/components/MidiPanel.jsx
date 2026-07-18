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

function noteName(note) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  return names[note % 12] + Math.floor(note / 12 - 1)
}

export default function MidiPanel({ ccValues, onCcChange, triggers, onTrigger, fxChain }) {
  const [expanded, setExpanded] = useState(false)
  const [midiAccess, setMidiAccess] = useState(null)
  const [inputs, setInputs] = useState([])
  const [outputs, setOutputs] = useState([])
  const [selectedInput, setSelectedInput] = useState(null)
  const [selectedOutput, setSelectedOutput] = useState(null)
  const [inputChannel, setInputChannel] = useState(0) // 0 = all channels
  const [outputChannel, setOutputChannel] = useState(0)
  const [ccMapping, setCcMapping] = useState(() => {
    const m = {}
    for (const [ccNum, config] of Object.entries(CC_NUMBERS)) {
      m[ccNum] = config.defaultChannel
    }
    return m
  })
  const [noteMapping, setNoteMapping] = useState({})
  const activeNotesRef = useRef({})
  const outputRef = useRef(null)

  useEffect(() => {
    if (!navigator.requestMIDIAccess) return
    navigator.requestMIDIAccess()
      .then(access => {
        setMidiAccess(access)
        updateDevices(access)
        access.onstatechange = () => updateDevices(access)
      })
      .catch(() => {})
  }, [])

  function updateDevices(access) {
    const inList = []
    for (const input of access.inputs.values()) {
      inList.push({ id: input.id, name: input.name, manufacturer: input.manufacturer })
    }
    setInputs(inList)
    const outList = []
    for (const output of access.outputs.values()) {
      outList.push({ id: output.id, name: output.name, manufacturer: output.manufacturer })
    }
    setOutputs(outList)
    console.log('MIDI Inputs:', inList.length, inList.map(d => d.name))
    console.log('MIDI Outputs:', outList.length, outList.map(d => d.name))
  }

  // Track output device
  useEffect(() => {
    if (!midiAccess || !selectedOutput) {
      outputRef.current = null
      return
    }
    const device = midiAccess.outputs.get(selectedOutput)
    console.log('Selected output device:', device)
    outputRef.current = device
  }, [midiAccess, selectedOutput])

  // Send CC when ccValues change
  useEffect(() => {
    if (!outputRef.current) return
    for (const [key, val] of Object.entries(ccValues || {})) {
      const ccNum = parseInt(key.replace('u_cc', ''))
      if (!isNaN(ccNum) && ccNum >= 1 && ccNum <= 8) {
        if (outputChannel === -1) {
          for (let ch = 0; ch < 16; ch++) outputRef.current.send([0xB0 | ch, ccNum, Math.round(val * 127)])
        } else {
          outputRef.current.send([0xB0 | outputChannel, ccNum, Math.round(val * 127)])
        }
      }
    }
  }, [ccValues, outputChannel])

  // Send note triggers to output
  useEffect(() => {
    if (!outputRef.current || !triggers || triggers.length === 0) {
      if (triggers && triggers.length > 0) console.log('MIDI OUT: no output device selected')
      return
    }
    const latest = triggers[triggers.length - 1]
    if (!latest) return
    console.log('MIDI OUT:', latest.type, 'note:', latest.note, 'vel:', latest.velocity)
    const sendNote = (ch) => {
      if (latest.type === 'noteOn') {
        outputRef.current.send([0x90 | ch, latest.note, Math.round(latest.velocity * 127)])
      } else if (latest.type === 'noteOff') {
        outputRef.current.send([0x80 | ch, latest.note, 0])
      }
    }
    if (outputChannel === -1) {
      for (let ch = 0; ch < 16; ch++) sendNote(ch)
    } else {
      sendNote(outputChannel)
    }
  }, [triggers, outputChannel])

  // Input message handler - listen to selected input device
  useEffect(() => {
    if (!midiAccess) return
    if (!expanded) return

    function handleMessage(e) {
      const [status, data1, data2] = e.data
      const msgType = status & 0xF0
      const msgChannel = status & 0x0F

      // Filter by input channel (0 = all channels)
      if (inputChannel !== 0 && msgChannel !== inputChannel - 1) return

      if (msgType === 0x90 && data2 > 0) {
        const note = data1
        const velocity = data2 / 127
        activeNotesRef.current[note] = { velocity, startTime: Date.now() }
        const mapping = noteMapping[note]
        if (mapping) {
          if (mapping.type === 'cc') {
            onCcChange?.('u_cc' + mapping.channel, velocity)
          } else if (mapping.type === 'effect') {
            onTrigger?.({ note, velocity, type: 'noteOn', effectId: mapping.effectId })
          }
        } else {
          onTrigger?.({ note, velocity, type: 'noteOn' })
        }
      } else if (msgType === 0x80 || (msgType === 0x90 && data2 === 0)) {
        const note = data1
        delete activeNotesRef.current[note]
        const mapping = noteMapping[note]
        if (mapping) {
          if (mapping.type === 'cc') {
            onCcChange?.('u_cc' + mapping.channel, 0)
          } else if (mapping.type === 'effect') {
            onTrigger?.({ note, velocity: 0, type: 'noteOff', effectId: mapping.effectId })
          }
        } else {
          onTrigger?.({ note, velocity: 0, type: 'noteOff' })
        }
      } else if (msgType === 0xB0) {
        const ccNum = data1
        const channel = ccMapping[ccNum]
        if (channel !== undefined) {
          onCcChange?.('u_cc' + channel, data2 / 127)
        }
      }
    }

    // Attach to selected input device or all devices
    if (selectedInput) {
      const device = midiAccess.inputs.get(selectedInput)
      if (device) {
        device.onmidimessage = handleMessage
        return () => { device.onmidimessage = null }
      }
    } else {
      for (const input of midiAccess.inputs.values()) {
        input.onmidimessage = handleMessage
      }
      return () => {
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = null
        }
      }
    }
  }, [midiAccess, expanded, selectedInput, inputChannel, ccMapping, noteMapping, onCcChange, onTrigger])

  const handleCcMappingChange = useCallback((ccNum, channel) => {
    setCcMapping(prev => ({ ...prev, [ccNum]: channel }))
  }, [])

  const handleNoteMappingChange = useCallback((note, type, target) => {
    setNoteMapping(prev => {
      if (!type || type === '') {
        const next = { ...prev }
        delete next[note]
        return next
      }
      return { ...prev, [note]: { type, ...target } }
    })
  }, [])

  if (!navigator.requestMIDIAccess) return null

  const activeNotes = Object.keys(activeNotesRef.current).map(Number).sort((a, b) => a - b)

  return (
    <div className="midi-panel">
      <div className="midi-header" onClick={() => setExpanded(!expanded)}>
        <span>MIDI {expanded ? '\u25BE' : '\u25B8'}</span>
        <span className="midi-header-label">
          {inputs.length > 0 ? inputs.length + ' in' : ''}
          {inputs.length > 0 && outputs.length > 0 ? ' / ' : ''}
          {outputs.length > 0 ? outputs.length + ' out' : ''}
          {inputs.length === 0 && outputs.length === 0 ? 'No device' : ''}
        </span>
      </div>

      {expanded && (
        <div className="midi-body">
          {inputs.length === 0 && outputs.length === 0 && (
            <div className="midi-empty">No MIDI devices detected</div>
          )}

          {/* Input Section */}
          {inputs.length > 0 && (
            <div className="midi-section">
              <div className="midi-section-title">Input</div>
              <div className="midi-output-row">
                <select
                  className="midi-output-select"
                  value={selectedInput || ''}
                  onChange={e => setSelectedInput(e.target.value || null)}
                >
                  <option value="">All Devices</option>
                  {inputs.map(dev => (
                    <option key={dev.id} value={dev.id}>{dev.name}</option>
                  ))}
                </select>
                <select
                  className="midi-channel-select"
                  value={inputChannel}
                  onChange={e => setInputChannel(parseInt(e.target.value))}
                >
                  <option value={0}>All Ch</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(ch => (
                    <option key={ch} value={ch}>Ch {ch}</option>
                  ))}
                </select>
              </div>
              {selectedInput && (
                <div className="midi-output-status">
                  Listening: {inputs.find(i => i.id === selectedInput)?.name} (Ch {inputChannel === 0 ? 'All' : inputChannel})
                </div>
              )}
            </div>
          )}

          {/* Output Section */}
          {outputs.length > 0 && (
            <div className="midi-section">
              <div className="midi-section-title">Output</div>
              <div className="midi-output-row">
                <select
                  className="midi-output-select"
                  value={selectedOutput || ''}
                  onChange={e => setSelectedOutput(e.target.value || null)}
                >
                  <option value="">None</option>
                  {outputs.map(dev => (
                    <option key={dev.id} value={dev.id}>{dev.name}</option>
                  ))}
                  {inputs.filter(i => !outputs.find(o => o.id === i.id)).map(dev => (
                    <option key={dev.id} value={dev.id}>{dev.name} (input)</option>
                  ))}
                </select>
                <select
                  className="midi-channel-select"
                  value={outputChannel}
                  onChange={e => setOutputChannel(parseInt(e.target.value))}
                >
                  <option value={-1}>All Ch</option>
                  {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(ch => (
                    <option key={ch} value={ch}>Ch {ch + 1}</option>
                  ))}
                </select>
              </div>
              {selectedOutput && (
                <div className="midi-output-status">
                  Sending to: {outputs.find(o => o.id === selectedOutput)?.name || inputs.find(i => i.id === selectedOutput)?.name} (Ch {outputChannel === -1 ? 'All' : outputChannel + 1})
                </div>
              )}
            </div>
          )}

          {/* Active Notes Display */}
          {activeNotes.length > 0 && (
            <div className="midi-active-notes">
              <span className="midi-active-label">Active: </span>
              {activeNotes.map(n => (
                <span key={n} className="midi-note-badge">{noteName(n)}</span>
              ))}
            </div>
          )}

          {/* CC Mapping */}
          <div className="midi-mapping">
            <div className="midi-mapping-title">MIDI CC {'\u2192'} CC Channel</div>
            {Object.entries(CC_NUMBERS).map(([ccNum, config]) => (
              <div key={ccNum} className="midi-mapping-row">
                <span className="midi-cc-label">CC {ccNum} ({config.name})</span>
                <span className="midi-arrow">{'\u2192'}</span>
                <select
                  value={ccMapping[ccNum] || ''}
                  onChange={e => handleCcMappingChange(ccNum, parseInt(e.target.value))}
                >
                  <option value="">{'\u2014'}</option>
                  {[1,2,3,4,5,6,7,8].map(ch => (
                    <option key={ch} value={ch}>CC{ch}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Note Trigger Mapping */}
          <div className="midi-mapping">
            <div className="midi-mapping-title">Note Trigger {'\u2192'} Target</div>
            <div className="midi-note-map-hint">
              Click a key on your MIDI keyboard, then map it below
            </div>
            {Object.keys(noteMapping).sort((a, b) => Number(a) - Number(b)).map(note => (
              <div key={note} className="midi-mapping-row">
                <span className="midi-cc-label">{noteName(Number(note))}</span>
                <span className="midi-arrow">{'\u2192'}</span>
                <select
                  value={noteMapping[note]?.type === 'cc' ? 'cc' + noteMapping[note].channel : noteMapping[note]?.type === 'effect' ? 'fx:' + noteMapping[note].effectId : ''}
                  onChange={e => {
                    const val = e.target.value
                    if (val.startsWith('cc')) {
                      handleNoteMappingChange(note, 'cc', { channel: parseInt(val.replace('cc', '')) })
                    } else if (val.startsWith('fx:')) {
                      handleNoteMappingChange(note, 'effect', { effectId: val.replace('fx:', '') })
                    } else {
                      handleNoteMappingChange(note, '', {})
                    }
                  }}
                >
                  <option value="">{'\u2014'}</option>
                  <optgroup label="CC Channel">
                    {[1,2,3,4,5,6,7,8].map(ch => (
                      <option key={ch} value={'cc' + ch}>CC{ch}</option>
                    ))}
                  </optgroup>
                  {(fxChain || []).length > 0 && (
                    <optgroup label="Effect Toggle">
                      {fxChain.map(fx => (
                        <option key={fx.id} value={'fx:' + fx.id}>{fx.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  className="midi-remove-btn"
                  onClick={() => handleNoteMappingChange(note, '', {})}
                  title="Remove mapping"
                >
                  {'\u2715'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}