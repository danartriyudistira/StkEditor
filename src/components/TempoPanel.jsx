import { useState, useRef, useCallback, useEffect } from 'react'

export default function TempoPanel({ bpm, onBpmChange, onResetBeat, resetBeatKey }) {
  const [tempoEditing, setTempoEditing] = useState(false)
  const tempoInputRef = useRef(null)
  const holdIntervalRef = useRef(null)
  const bpmRef = useRef()

  useEffect(() => {
    if (tempoEditing) tempoInputRef.current?.focus()
  }, [tempoEditing])

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

  return (
    <div className="vj-tempo">
      <div className="vj-tempo-row">
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
      <div className="vj-tempo-actions">
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
    </div>
  )
}
