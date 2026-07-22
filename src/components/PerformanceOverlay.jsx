import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

const INSTRUMENT_NAMES = [
  'Saw Lead', 'Square', 'Triangle', 'Sine Pad', 'Bass',
  'Brass', 'Keys', 'Organ', 'Bell', 'Pulse', 'Gamelan'
]

const NOTE_DIVIDER_LABELS = ['1/4', '1/8', '1/16', '1/32']
const NOTE_DIVIDER_VALUES = [1, 2, 4, 8]

const F_RND_GEN = 0
const F_SHADER = 1
const F_MIDI_DEVICE = 2
const F_MIDI_CH_IN = 3
const F_INSTR = 4
const F_VOLUME = 5
const F_BPM = 6
const F_NOTE_DIV = 7
const F_CC_SLIDERS_START = 8
const F_MIDI_LEARN = 16
const F_RENDER = 17
const F_FPS = 18
const F_CLOSE = 19
const F_IMPORT = 20
const F_ISF_START = 21

const RENDER_LABELS = ['Full', '3/4', 'Half', 'Quarter']
const FPS_LABELS = ['60', '30', '24', '15']

export default function PerformanceOverlay({
  visible,
  onClose,
  tabs,
  activeTabId,
  onSwitchTab,
  ccValues,
  onCcChange,
  randomGenOn,
  onToggleRandomGen,
  midiDeviceName,
  midiConnected,
  midiChannel,
  onMidiChannelChange,
  presetIndex,
  onPresetChange,
  volume,
  onVolumeChange,
  bpm,
  onBpmChange,
  noteDivider,
  onNoteDividerChange,
  isfMetadata,
  isfValues,
  onIsfValueChange,
  renderQuality,
  onRenderQualityChange,
  fps,
  onFpsChange,
  midiLearnActive,
  onToggleMidiLearn,
  onImport,
}) {
  const [focusIndex, setFocusIndex] = useState(0)
  const overlayRef = useRef(null)
  const menuRef = useRef(null)
  const ctxRef = useRef({})

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const apply = () => {
      const vh = window.innerHeight
      const s = Math.max(0.55, Math.min(1.2, vh / 1080))
      el.style.setProperty('--pf-s', s.toFixed(3))
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])

  useEffect(() => {
    if (!menuRef.current) return
    const row = menuRef.current.querySelector(`[data-pf-idx="${focusIndex}"]`)
    if (row) row.scrollIntoView({ block: 'nearest' })
  }, [focusIndex])

  const isfInputs = useMemo(() => {
    return (isfMetadata?.inputs || []).filter(i =>
      i.TYPE === 'float' || i.TYPE === 'long' || i.TYPE === 'bool' || i.TYPE === 'event'
    )
  }, [isfMetadata])

  const totalItems = F_ISF_START + isfInputs.length

  ctxRef.current = {
    focusIndex, tabs, activeTabId, ccValues, volume, bpm, noteDivider, presetIndex,
    renderQuality, fps, isfInputs, isfValues, midiChannel,
    onSwitchTab, onMidiChannelChange, onPresetChange, onVolumeChange, onBpmChange,
    onNoteDividerChange, onCcChange, onRenderQualityChange, onFpsChange,
    onIsfValueChange, onToggleRandomGen, onToggleMidiLearn, onClose, onImport,
  }

  const wrap = useCallback((idx) => {
    if (totalItems === 0) return 0
    return ((idx % totalItems) + totalItems) % totalItems
  }, [totalItems])

  const handleAdjust = useCallback((dir) => {
    const c = ctxRef.current
    switch (c.focusIndex) {
      case F_SHADER: {
        if (!c.tabs || c.tabs.length === 0) break
        const activeIdx = c.tabs.findIndex(t => t.id === c.activeTabId)
        const newIdx = (activeIdx + dir + c.tabs.length) % c.tabs.length
        c.onSwitchTab?.(c.tabs[newIdx]?.id)
        break
      }
      case F_MIDI_CH_IN: {
        const cur = c.midiChannel ?? 0
        let next = cur + dir
        if (next < -1) next = 15
        if (next > 15) next = -1
        c.onMidiChannelChange?.(next)
        break
      }
      case F_INSTR: {
        const cur = c.presetIndex ?? 0
        const next = (cur + dir + INSTRUMENT_NAMES.length) % INSTRUMENT_NAMES.length
        c.onPresetChange?.(next)
        break
      }
      case F_VOLUME: {
        const cur = c.volume ?? 50
        const next = Math.max(0, Math.min(100, cur + dir * 5))
        c.onVolumeChange?.(next)
        break
      }
      case F_BPM: {
        const cur = c.bpm ?? 120
        const next = Math.max(40, Math.min(240, cur + dir * 5))
        c.onBpmChange?.(next)
        break
      }
      case F_NOTE_DIV: {
        const cur = c.noteDivider ?? 2
        const idx = NOTE_DIVIDER_VALUES.indexOf(cur)
        const newIdx = (idx + dir + NOTE_DIVIDER_LABELS.length) % NOTE_DIVIDER_LABELS.length
        c.onNoteDividerChange?.(NOTE_DIVIDER_VALUES[newIdx])
        break
      }
      case F_CC_SLIDERS_START:
      case F_CC_SLIDERS_START + 1:
      case F_CC_SLIDERS_START + 2:
      case F_CC_SLIDERS_START + 3:
      case F_CC_SLIDERS_START + 4:
      case F_CC_SLIDERS_START + 5:
      case F_CC_SLIDERS_START + 6:
      case F_CC_SLIDERS_START + 7: {
        const ccNum = c.focusIndex - F_CC_SLIDERS_START + 1
        const key = `u_cc${ccNum}`
        const cur = c.ccValues?.[key] ?? 0.5
        const next = Math.max(0, Math.min(1, cur + dir * 0.02))
        c.onCcChange?.(key, parseFloat(next.toFixed(3)))
        break
      }
      case F_RENDER: {
        const idx = RENDER_LABELS.indexOf(c.renderQuality ?? 'Full')
        const newIdx = (idx + dir + RENDER_LABELS.length) % RENDER_LABELS.length
        c.onRenderQualityChange?.(RENDER_LABELS[newIdx])
        break
      }
      case F_FPS: {
        const idx = FPS_LABELS.indexOf(String(c.fps ?? 60))
        const newIdx = (idx + dir + FPS_LABELS.length) % FPS_LABELS.length
        c.onFpsChange?.(parseInt(FPS_LABELS[newIdx]))
        break
      }
      default: {
        if (c.focusIndex >= F_ISF_START) {
          const inputIdx = c.focusIndex - F_ISF_START
          const input = c.isfInputs[inputIdx]
          if (input) {
            const cur = c.isfValues?.[input.NAME] ?? input.DEFAULT ?? 0
            const min = input.MIN ?? 0
            const max = input.MAX ?? 1
            const step = (max - min) * 0.02 * dir
            const next = Math.max(min, Math.min(max, cur + step))
            c.onIsfValueChange?.(input.NAME, parseFloat(next.toFixed(3)))
          }
        }
        break
      }
    }
  }, [])

  const handleSelect = useCallback(() => {
    const c = ctxRef.current
    switch (c.focusIndex) {
      case F_RND_GEN:
        c.onToggleRandomGen?.()
        break
      case F_MIDI_LEARN:
        c.onToggleMidiLearn?.()
        break
      case F_CLOSE:
        c.onClose?.()
        break
      case F_IMPORT:
        c.onImport?.()
        break
      case F_ISF_START: {
        const input = c.isfInputs[0]
        if (input && (input.TYPE === 'bool' || input.TYPE === 'event')) {
          const cur = c.isfValues?.[input.NAME] ?? input.DEFAULT ?? 0
          c.onIsfValueChange?.(input.NAME, cur > 0.5 ? 0 : 1)
        }
        break
      }
      default: {
        if (c.focusIndex >= F_ISF_START) {
          const inputIdx = c.focusIndex - F_ISF_START
          const input = c.isfInputs[inputIdx]
          if (input && (input.TYPE === 'bool' || input.TYPE === 'event')) {
            const cur = c.isfValues?.[input.NAME] ?? input.DEFAULT ?? 0
            c.onIsfValueChange?.(input.NAME, cur > 0.5 ? 0 : 1)
          }
        }
        break
      }
    }
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (!visible) return
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ctxRef.current.onClose?.(); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setFocusIndex(prev => wrap(prev - 1)) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setFocusIndex(prev => wrap(prev + 1)) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); handleAdjust(-1) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); handleAdjust(1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleSelect() }
  }, [visible, wrap, handleAdjust, handleSelect])

  useEffect(() => {
    if (!visible) return
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleKeyDown, visible])

  useEffect(() => {
    if (visible) {
      setFocusIndex(0)
    }
  }, [visible])

  if (!visible) return null

  const activeTab = tabs?.find(t => t.id === activeTabId) || tabs?.[0]
  const focusColor = (idx) => focusIndex === idx ? 'var(--pf-cyan)' : 'var(--pf-dim)'
  const focusBg = (idx) => focusIndex === idx ? 'var(--pf-cyan-bg)' : 'transparent'

  return (
    <div className="pf-overlay" ref={overlayRef}>
      <div className="pf-menu" ref={menuRef}>
        {/* 0: RND GEN */}
        <div
          className="pf-row"
          data-pf-idx={F_RND_GEN}
          style={{ background: focusBg(F_RND_GEN) }}
        >
          <span className="pf-indicator" style={{ background: randomGenOn ? 'var(--pf-green)' : 'var(--pf-dim)' }} />
          <span className="pf-label">RND GEN</span>
          <span className="pf-value" style={{ color: randomGenOn ? 'var(--pf-green)' : 'var(--pf-dim)' }}>
            {randomGenOn ? 'ON' : 'OFF'}
          </span>
          <span className="pf-arrow" style={{ color: focusColor(F_RND_GEN) }}>{'<'}</span>
        </div>

        {/* 1: SHADER */}
        <div
          className="pf-row"
          data-pf-idx={F_SHADER}
          style={{ background: focusBg(F_SHADER) }}
        >
          <span className="pf-label">SHADER</span>
          <span className="pf-arrow" style={{ color: focusColor(F_SHADER) }}>{'<'}</span>
          <span className="pf-value" style={{ color: 'var(--pf-cyan)' }}>
            {activeTab?.name || 'None'}
          </span>
          <span className="pf-arrow" style={{ color: focusColor(F_SHADER) }}>{'>'}</span>
        </div>

        {/* 2: MIDI */}
        <div
          className="pf-row"
          data-pf-idx={F_MIDI_DEVICE}
          style={{ background: focusBg(F_MIDI_DEVICE) }}
        >
          <span className="pf-indicator" style={{ background: midiConnected ? 'var(--pf-green)' : 'var(--pf-dim)' }} />
          <span className="pf-label">MIDI</span>
          <span className="pf-value">{midiDeviceName || 'None'}</span>
        </div>

        {/* 3: MIDI CH IN */}
        <div
          className="pf-row"
          data-pf-idx={F_MIDI_CH_IN}
          style={{ background: focusBg(F_MIDI_CH_IN) }}
        >
          <span className="pf-label">MIDI CH IN</span>
          <span className="pf-arrow" style={{ color: focusColor(F_MIDI_CH_IN) }}>{'<'}</span>
          <span className="pf-value">{midiChannel === -1 || midiChannel === undefined ? 'ANY' : String(midiChannel + 1).padStart(2, '0')}</span>
          <span className="pf-arrow" style={{ color: focusColor(F_MIDI_CH_IN) }}>{'>'}</span>
        </div>

        {/* 4: INSTR */}
        <div
          className="pf-row"
          data-pf-idx={F_INSTR}
          style={{ background: focusBg(F_INSTR) }}
        >
          <span className="pf-label">INSTR</span>
          <span className="pf-arrow" style={{ color: focusColor(F_INSTR) }}>{'<'}</span>
          <span className="pf-value">{INSTRUMENT_NAMES[presetIndex ?? 0]}</span>
          <span className="pf-arrow" style={{ color: focusColor(F_INSTR) }}>{'>'}</span>
        </div>

        {/* 5: VOL */}
        <div
          className="pf-row pf-row-slider"
          data-pf-idx={F_VOLUME}
          style={{ background: focusBg(F_VOLUME) }}
        >
          <span className="pf-label">VOL</span>
          <span className="pf-arrow" style={{ color: focusColor(F_VOLUME) }}>{'<'}</span>
          <div className="pf-slider-track">
            <div className="pf-slider-fill" style={{ width: `${volume ?? 50}%` }} />
          </div>
          <span className="pf-value">{Math.round(volume ?? 50)}%</span>
          <span className="pf-arrow" style={{ color: focusColor(F_VOLUME) }}>{'>'}</span>
        </div>

        {/* 6: BPM */}
        <div
          className="pf-row"
          data-pf-idx={F_BPM}
          style={{ background: focusBg(F_BPM) }}
        >
          <span className="pf-label">BPM</span>
          <span className="pf-arrow" style={{ color: focusColor(F_BPM) }}>{'<'}</span>
          <span className="pf-value">{bpm ?? 120}</span>
          <span className="pf-arrow" style={{ color: focusColor(F_BPM) }}>{'>'}</span>
        </div>

        {/* 7: NOTE DIV */}
        <div
          className="pf-row"
          data-pf-idx={F_NOTE_DIV}
          style={{ background: focusBg(F_NOTE_DIV) }}
        >
          <span className="pf-label">NOTE</span>
          <span className="pf-arrow" style={{ color: focusColor(F_NOTE_DIV) }}>{'<'}</span>
          <span className="pf-value">
            {NOTE_DIVIDER_LABELS[NOTE_DIVIDER_VALUES.indexOf(noteDivider ?? 2)]}
          </span>
          <span className="pf-arrow" style={{ color: focusColor(F_NOTE_DIV) }}>{'>'}</span>
        </div>

        {/* CC SLIDERS Header */}
        <div className="pf-section-header pf-cc-header">
          CC SLIDERS
        </div>

        {/* 8-15: CC Sliders */}
        {[1,2,3,4,5,6,7,8].map((ch, i) => {
          const idx = F_CC_SLIDERS_START + i
          const val = ccValues?.[`u_cc${ch}`] ?? 0.5
          return (
            <div
              key={ch}
              className="pf-row pf-row-slider"
              data-pf-idx={idx}
              style={{ background: focusBg(idx) }}
            >
              <span className="pf-label pf-cc-label">cc{ch}</span>
              <span className="pf-arrow" style={{ color: focusColor(idx) }}>{'<'}</span>
              <div className="pf-slider-track">
                <div className="pf-slider-fill pf-cc-fill" style={{ width: `${val * 100}%` }} />
              </div>
              <span className="pf-value">{val.toFixed(2)}</span>
              <span className="pf-arrow" style={{ color: focusColor(idx) }}>{'>'}</span>
            </div>
          )
        })}

        {/* 16: MIDI LEARN */}
        <div
          className="pf-row"
          data-pf-idx={F_MIDI_LEARN}
          style={{
            background: midiLearnActive
              ? 'var(--pf-purple-bg)'
              : focusBg(F_MIDI_LEARN)
          }}
        >
          <span className="pf-indicator" style={{ background: midiLearnActive ? 'var(--pf-purple)' : 'var(--pf-dim)' }} />
          <span className="pf-label" style={{ color: midiLearnActive ? 'var(--pf-purple)' : undefined }}>
            {midiLearnActive ? 'MIDI LEARN...' : 'MIDI LEARN'}
          </span>
        </div>

        {/* 17: RENDER */}
        <div
          className="pf-row"
          data-pf-idx={F_RENDER}
          style={{ background: focusBg(F_RENDER) }}
        >
          <span className="pf-label">RENDER</span>
          <span className="pf-arrow" style={{ color: focusColor(F_RENDER) }}>{'<'}</span>
          <span className="pf-value">{renderQuality ?? 'Full'}</span>
          <span className="pf-arrow" style={{ color: focusColor(F_RENDER) }}>{'>'}</span>
        </div>

        {/* 18: FPS */}
        <div
          className="pf-row"
          data-pf-idx={F_FPS}
          style={{ background: focusBg(F_FPS) }}
        >
          <span className="pf-label">FPS</span>
          <span className="pf-arrow" style={{ color: focusColor(F_FPS) }}>{'<'}</span>
          <span className="pf-value">{fps ?? 60}</span>
          <span className="pf-arrow" style={{ color: focusColor(F_FPS) }}>{'>'}</span>
        </div>

        {/* 19: CLOSE */}
        <div
          className="pf-row"
          data-pf-idx={F_CLOSE}
          style={{ background: focusBg(F_CLOSE) }}
        >
          <span className="pf-label" style={{ color: focusColor(F_CLOSE) }}>[X]  Close Menu</span>
        </div>

        {/* 20: IMPORT */}
        <div
          className="pf-row"
          data-pf-idx={F_IMPORT}
          style={{ background: focusBg(F_IMPORT) }}
        >
          <span className="pf-label" style={{ color: focusColor(F_IMPORT) }}>IMPORT</span>
          <span className="pf-value" style={{ color: 'var(--pf-green)' }}>Load .fs/.frag</span>
        </div>

        {/* ISF Controls */}
        {isfInputs.length > 0 && (
          <>
            <div className="pf-section-header pf-isf-header">
              {isfMetadata?.DESCRIPTION || 'ISF CONTROLS'}
            </div>
            {isfInputs.map((input, i) => {
              const idx = F_ISF_START + i
              const val = isfValues?.[input.NAME] ?? input.DEFAULT ?? 0
              const isBool = input.TYPE === 'bool' || input.TYPE === 'event'
              return (
                <div
                  key={input.NAME}
                  className={`pf-row ${isBool ? '' : 'pf-row-slider'}`}
                  data-pf-idx={idx}
                  style={{ background: focusBg(idx) }}
                >
                  <span className="pf-label">{(input.LABEL || input.NAME).substring(0, 10)}</span>
                  {isBool ? (
                    <span className="pf-indicator" style={{ background: val > 0.5 ? 'var(--pf-purple)' : 'var(--pf-dim)' }} />
                  ) : (
                    <>
                      <span className="pf-arrow" style={{ color: focusColor(idx) }}>{'<'}</span>
                      <div className="pf-slider-track pf-isf-track">
                        <div className="pf-slider-fill pf-isf-fill" style={{
                          width: `${((val - (input.MIN ?? 0)) / ((input.MAX ?? 1) - (input.MIN ?? 0))) * 100}%`
                        }} />
                      </div>
                    </>
                  )}
                  <span className="pf-value">{typeof val === 'number' ? val.toFixed(2) : String(val)}</span>
                  {!isBool && <span className="pf-arrow" style={{ color: focusColor(idx) }}>{'>'}</span>}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
