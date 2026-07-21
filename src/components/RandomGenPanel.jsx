import { useState, useEffect, useRef, useCallback } from 'react'
import RandomNoteGenerator from '../audio/randomGen.js'

function noteName(note) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  return names[note % 12] + Math.floor(note / 12 - 1)
}

export default function RandomGenPanel({ onTrigger, noteMapping, onToggleRef, onChange, bpm, onBpmChange }) {
  const [enabled, setEnabled] = useState(false)
  const [noteDivider, setNoteDivider] = useState(1)
  const [activeNote, setActiveNote] = useState(null)
  const genRef = useRef(null)
  const onTriggerRef = useRef(onTrigger)
  const noteMappingRef = useRef(noteMapping)
  const enabledRef = useRef(false)
  const bpmRef = useRef(bpm ?? 120)

  enabledRef.current = enabled
  bpmRef.current = bpm ?? 120

  useEffect(() => {
    genRef.current?.setBpm(bpm ?? 120)
  }, [bpm])

  // Expose toggle function to parent
  useEffect(() => {
    if (onToggleRef) {
      onToggleRef.current = () => {
        const gen = genRef.current
        if (!gen) return
        if (enabledRef.current) {
          gen.stop()
          setEnabled(false)
          onChange?.(false)
        } else {
          gen.setBpm(bpmRef.current)
          gen.start()
          setEnabled(true)
          onChange?.(true)
        }
      }
    }
  }, [onToggleRef, onChange])

  onTriggerRef.current = onTrigger
  noteMappingRef.current = noteMapping

  useEffect(() => {
    const gen = new RandomNoteGenerator()
    gen.onNote = (pitch, velocity) => {
      setActiveNote(pitch)
      const mapping = noteMappingRef.current?.[pitch]
      if (mapping) {
        onTriggerRef.current?.({ note: pitch, velocity: velocity / 127, type: 'noteOn', effectId: mapping.effectId || null, ccChannel: mapping.channel || null })
      } else {
        onTriggerRef.current?.({ note: pitch, velocity: velocity / 127, type: 'noteOn' })
      }
    }
    gen.onNoteOff = (pitch) => {
      setActiveNote(null)
      const mapping = noteMappingRef.current?.[pitch]
      if (mapping) {
        onTriggerRef.current?.({ note: pitch, velocity: 0, type: 'noteOff', effectId: mapping.effectId || null, ccChannel: mapping.channel || null })
      } else {
        onTriggerRef.current?.({ note: pitch, velocity: 0, type: 'noteOff' })
      }
    }
    gen.setBpm(bpm ?? 120)
    genRef.current = gen
    return () => gen.stop()
  }, [])

  const toggle = useCallback(() => {
    const gen = genRef.current
    if (enabled) {
      gen.stop()
      setEnabled(false)
      onChange?.(false)
    } else {
      gen.setBpm(bpmRef.current)
      gen.start()
      setEnabled(true)
      onChange?.(true)
    }
  }, [enabled, onChange])

  const handleDivider = useCallback((val) => {
    const v = parseInt(val)
    setNoteDivider(v)
    genRef.current?.setNoteDivider(v)
  }, [])

  return (
    <div className="rndgen-panel">
      <div className="rndgen-header">
        <button
          className={`rndgen-toggle ${enabled ? 'active' : ''}`}
          onClick={toggle}
        >
          {enabled ? 'RND \u25BC' : 'RND \u25B6'}
        </button>
        <span className="rndgen-label">Random Gen</span>
      </div>

      {enabled && (
        <div className="rndgen-body">
          <div className="rndgen-active">
            {activeNote !== null ? (
              <span className="midi-note-badge">{noteName(activeNote)}</span>
            ) : (
              <span className="midi-note-badge midi-note-idle">-</span>
            )}
          </div>

          <div className="rndgen-control">
            <label>Divider</label>
            <select value={noteDivider} onChange={e => handleDivider(e.target.value)}>
              <option value={1}>1/4</option>
              <option value={2}>1/8</option>
              <option value={4}>1/16</option>
              <option value={8}>1/32</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
