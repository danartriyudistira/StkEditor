import { useState, useEffect, useRef, useCallback } from 'react'
import Synthesizer from '../audio/synthesizer.js'

export default function AudioPanel({ onSynthReady }) {
  const [expanded, setExpanded] = useState(false)
  const [presetIndex, setPresetIndex] = useState(0)
  const [volume, setVolume] = useState(50)
  const [audioActive, setAudioActive] = useState(false)
  const synthRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const synth = new Synthesizer()
    synthRef.current = synth
    onSynthReady?.(synth)
    return () => synth.stop()
  }, [])

  // Visualizer loop
  useEffect(() => {
    if (!expanded || !audioActive) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function draw() {
      const data = synthRef.current?.getAnalyserData()
      if (!data) { rafRef.current = requestAnimationFrame(draw); return }

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const barCount = 32
      const barWidth = w / barCount - 1
      const step = Math.floor(data.length / barCount)

      for (let i = 0; i < barCount; i++) {
        const val = data[i * step] / 255
        const barH = val * h
        const x = i * (barWidth + 1)
        ctx.fillStyle = `hsl(${200 + val * 60}, 80%, ${40 + val * 30}%)`
        ctx.fillRect(x, h - barH, barWidth, barH)
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [expanded, audioActive])

  const toggleAudio = useCallback(() => {
    const synth = synthRef.current
    if (audioActive) {
      synth.stop()
      setAudioActive(false)
    } else {
      synth.start()
      setAudioActive(true)
    }
  }, [audioActive])

  const handlePreset = useCallback((idx) => {
    setPresetIndex(idx)
    synthRef.current?.setPreset(idx)
  }, [])

  const handleVolume = useCallback((val) => {
    const v = parseInt(val)
    setVolume(v)
    if (synthRef.current?.masterGain) {
      synthRef.current.masterGain.gain.value = v / 100
    }
  }, [])

  const presets = synthRef.current?.presets || []

  return (
    <div className="audio-panel">
      <div className="audio-header" onClick={() => setExpanded(!expanded)}>
        <button
          className={`audio-toggle ${audioActive ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleAudio() }}
        >
          {audioActive ? 'Sound ON' : 'Sound OFF'}
        </button>
        <span className="audio-label">
          Audio {expanded ? '\u25BE' : '\u25B8'}
        </span>
      </div>

      {expanded && (
        <div className="audio-body">
          {audioActive && (
            <canvas
              ref={canvasRef}
              width={200}
              height={40}
              className="audio-visualizer"
            />
          )}

          <div className="audio-control">
            <label>Volume</label>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={e => handleVolume(e.target.value)}
            />
            <span className="audio-value">{volume}%</span>
          </div>

          <div className="audio-presets">
            <div className="audio-preset-title">Instrument</div>
            <div className="audio-preset-list">
              {presets.map((p, i) => (
                <button
                  key={i}
                  className={`audio-preset-btn ${i === presetIndex ? 'active' : ''}`}
                  onClick={() => handlePreset(i)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
