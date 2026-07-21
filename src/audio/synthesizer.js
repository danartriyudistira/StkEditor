// Lightweight Synthesizer - native Web Audio API oscillators
// For monitoring only - no manual sample rendering

const PRESETS = [
  { name: 'Saw Lead',    type: 'sawtooth', filter: 1200, attack: 0.005, decay: 0.3,  release: 0.8  },
  { name: 'Square',      type: 'square',   filter: 800,  attack: 0.005, decay: 0.4,  release: 0.6  },
  { name: 'Triangle',    type: 'triangle', filter: 600,  attack: 0.01,  decay: 0.5,  release: 0.8  },
  { name: 'Sine Pad',    type: 'sine',     filter: 400,  attack: 0.05,  decay: 0.6,  release: 1.2  },
  { name: 'Bass',        type: 'sawtooth', filter: 300,  attack: 0.005, decay: 0.2,  release: 0.4  },
  { name: 'Brass',       type: 'square',   filter: 2000, attack: 0.002, decay: 0.2,  release: 0.3  },
  { name: 'Keys',        type: 'sawtooth', filter: 1500, attack: 0.001, decay: 0.15, release: 0.2  },
  { name: 'Organ',       type: 'square',   filter: 800,  attack: 0.005, decay: 0.8,  release: 0.6  },
  { name: 'Bell',        type: 'sine',     filter: 2000, attack: 0.001, decay: 1.0,  release: 1.5  },
  { name: 'Pulse',       type: 'square',   filter: 1000, attack: 0.005, decay: 0.3,  release: 0.6  },
  { name: 'Gamelan',     type: 'sine',     filter: 1200, attack: 0.001, decay: 0.8,  release: 1.5  },
]

class Voice {
  constructor() {
    this.osc = null
    this.gain = null
    this.filter = null
    this.active = false
    this.note = -1
  }
}

export default class Synthesizer {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.analyser = null
    this.voices = []
    this.preset = PRESETS[0]
    this.presetIndex = 0
    this._started = false
  }

  get presets() { return PRESETS }

  start() {
    if (this._started) return
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.3
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 128
    this.masterGain.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)
    this._started = true
  }

  stop() {
    if (!this._started) return
    for (const v of this.voices) {
      if (v.active) this._killVoice(v)
    }
    this.ctx?.close()
    this.ctx = null
    this._started = false
  }

  setPreset(index) {
    this.presetIndex = Math.max(0, Math.min(PRESETS.length - 1, index))
    this.preset = PRESETS[this.presetIndex]
  }

  noteOn(note, velocity = 100) {
    if (!this._started) return
    if (this.ctx?.state === 'suspended') this.ctx.resume()

    // Kill existing voice for same note
    const existing = this.voices.find(v => v.active && v.note === note)
    if (existing) this._killVoice(existing)

    // Find free slot or reuse
    let voice = this.voices.find(v => !v.active)
    if (!voice) {
      voice = this.voices.find(v => v.active)
      if (voice) this._killVoice(voice)
      else {
        voice = new Voice()
        this.voices.push(voice)
      }
    }

    const now = this.ctx.currentTime
    const vel = velocity / 127
    const freq = 440 * Math.pow(2, (note - 69) / 12)
    const preset = this.preset

    // Create nodes
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()

    osc.type = preset.type
    osc.frequency.value = freq

    filter.type = 'lowpass'
    filter.frequency.value = preset.filter
    filter.Q.value = 1

    // ADSR envelope
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vel, now + preset.attack)
    gain.gain.linearRampToValueAtTime(vel * 0.3, now + preset.attack + preset.decay)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    osc.start(now)

    voice.osc = osc
    voice.gain = gain
    voice.filter = filter
    voice.active = true
    voice.note = note
  }

  noteOff(note) {
    const voice = this.voices.find(v => v.active && v.note === note)
    if (!voice) return

    const now = this.ctx.currentTime
    const preset = this.preset

    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now)
    voice.gain.gain.linearRampToValueAtTime(0, now + preset.release)

    voice.osc.stop(now + preset.release + 0.01)
    voice.active = false
  }

  _killVoice(voice) {
    try {
      voice.osc?.stop()
      voice.osc?.disconnect()
      voice.gain?.disconnect()
      voice.filter?.disconnect()
    } catch (_) {}
    voice.active = false
  }

  getAnalyserData() {
    if (!this.analyser) return null
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  // ── Glitch Sound Engine ────────────────────────────────────

  initGlitchAudio() {
    if (this._glitchCtx) return
    this._glitchCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (this._glitchCtx.state === 'suspended') this._glitchCtx.resume()
    this._glitchMaster = this._glitchCtx.createGain()
    this._glitchMaster.gain.value = 0.5
    this._glitchMaster.connect(this._glitchCtx.destination)
    this._glitchContinuous = null
    this._glitchStopTimeout = null
  }

  setGlitchVolume(vol) {
    if (this._glitchMaster) this._glitchMaster.gain.value = Math.max(0, Math.min(1, vol))
  }

  // ── Trigger Mode ───────────────────────────────────────────

  playGlitchTrigger(type, intensity) {
    if (!this._glitchCtx) this.initGlitchAudio()
    const ctx = this._glitchCtx
    const now = ctx.currentTime
    const vol = Math.min(1, intensity * 1.5)

    switch (type) {
      case 'click':
        this._glitchClick(ctx, now, vol)
        break
      case 'klek':
        this._glitchKlek(ctx, now, vol)
        break
      case 'sss':
        this._glitchSss(ctx, now, vol)
        break
      case 'engine':
        this._glitchEngine(ctx, now, vol)
        break
      case 'hum':
        this._glitchHum(ctx, now, vol)
        break
    }
  }

  _glitchClick(ctx, now, vol) {
    const duration = 0.02 + Math.random() * 0.03
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.15))
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.8, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    src.connect(gain)
    gain.connect(this._glitchMaster)
    src.start(now)
    src.stop(now + duration + 0.01)
  }

  _glitchKlek(ctx, now, vol) {
    const freq = 800 + Math.random() * 700
    const duration = 0.04 + Math.random() * 0.04
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.6, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    osc.connect(gain)
    gain.connect(this._glitchMaster)
    osc.start(now)
    osc.stop(now + duration + 0.01)
  }

  _glitchSss(ctx, now, vol) {
    const duration = 0.05 + Math.random() * 0.12
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3))
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 3000 + Math.random() * 5000
    filter.Q.value = 1
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this._glitchMaster)
    src.start(now)
    src.stop(now + duration + 0.01)
  }

  _glitchEngine(ctx, now, vol) {
    const baseFreq = 30 + Math.random() * 50
    const duration = 0.06 + Math.random() * 0.1
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.linearRampToValueAtTime(baseFreq + Math.random() * 40, now + duration)

    // FM modulator
    const mod = ctx.createOscillator()
    mod.type = 'sine'
    mod.frequency.value = baseFreq * 4
    const modGain = ctx.createGain()
    modGain.gain.value = baseFreq * 0.3
    mod.connect(modGain)
    modGain.connect(osc.frequency)
    mod.start(now)
    mod.stop(now + duration + 0.01)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = baseFreq * 4
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this._glitchMaster)
    osc.start(now)
    osc.stop(now + duration + 0.01)
  }

  _glitchHum(ctx, now, vol) {
    const duration = 0.06 + Math.random() * 0.1
    const base = 50 + Math.random() * 20
    ;[base, base * 2].forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(vol * (freq === base ? 0.25 : 0.12), now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
      osc.connect(gain)
      gain.connect(this._glitchMaster)
      osc.start(now)
      osc.stop(now + duration + 0.01)
    })
  }

  // ── Frequency (Continuous) Mode ────────────────────────────

  startGlitchContinuous(val, config) {
    if (!this._glitchCtx) this.initGlitchAudio()
    this.stopGlitchContinuous()
    const ctx = this._glitchCtx
    const now = ctx.currentTime

    const cfg = config || {}
    const soundType = cfg.soundType || 'noise'
    const volume = cfg.volume ?? 0.5

    const filter = ctx.createBiquadFilter()
    filter.type = soundType === 'wind' ? 'bandpass' : 'lowpass'

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.1)

    let nodes = []

    switch (soundType) {
      case 'noise': {
        const len = ctx.sampleRate * 0.5
        const buf = ctx.createBuffer(1, len, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        src.connect(filter)
        src.start(now)
        nodes = [src]
        break
      }
      case 'ambience': {
        const len = ctx.sampleRate * 0.5
        const buf = ctx.createBuffer(1, len, ctx.sampleRate)
        const data = buf.getChannelData(0)
        let last = 0
        for (let i = 0; i < len; i++) {
          last += (Math.random() * 2 - 1) * 0.02
          last = Math.max(-1, Math.min(1, last))
          data[i] = last
        }
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        src.connect(filter)
        src.start(now)
        nodes = [src]
        break
      }
      case 'space': {
        const o1 = ctx.createOscillator()
        o1.type = 'sine'
        o1.frequency.value = 80
        const o2 = ctx.createOscillator()
        o2.type = 'sine'
        o2.frequency.value = 82
        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.value = 0.3
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 15
        lfo.connect(lfoGain)
        lfoGain.connect(o1.frequency)
        lfoGain.connect(o2.frequency)
        o1.connect(filter)
        o2.connect(filter)
        o1.start(now)
        o2.start(now)
        lfo.start(now)
        nodes = [o1, o2, lfo]
        break
      }
      case 'wind': {
        const len = ctx.sampleRate * 0.5
        const buf = ctx.createBuffer(1, len, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        src.connect(filter)
        src.start(now)
        nodes = [src]
        break
      }
      case 'bass': {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = 40
        osc.connect(filter)
        osc.start(now)
        nodes = [osc]
        break
      }
    }

    filter.connect(gain)
    gain.connect(this._glitchMaster)

    this._glitchContinuous = { nodes, filter, gain, config, soundType }
    this._updateGlitchParams(val, config, filter, soundType, nodes)
  }

  updateGlitchContinuous(val) {
    if (!this._glitchContinuous) return
    const { filter, config, soundType, nodes } = this._glitchContinuous
    this._updateGlitchParams(val, config, filter, soundType, nodes)
  }

  _updateGlitchParams(val, config, filter, soundType, nodes) {
    const {
      cutoff = 4000, emphasis = 5, contour = 0,
      modCutoff = true, modEmphasis = false, modContour = false,
    } = config || {}

    const effCutoff = modCutoff
      ? 20 + val * Math.max(1, cutoff - 20)
      : cutoff

    const effQ = modEmphasis
      ? emphasis * (0.5 + val * 0.5)
      : emphasis

    const effContour = modContour ? contour * val : 0

    filter.frequency.value = Math.max(20, effCutoff + effContour * effCutoff * 0.5)
    filter.Q.value = effQ

    if (soundType === 'bass' && nodes?.[0]) {
      nodes[0].frequency.value = 30 + val * 90
    }
  }

  stopGlitchContinuous() {
    if (this._glitchStopTimeout) {
      clearTimeout(this._glitchStopTimeout)
      this._glitchStopTimeout = null
    }
    if (!this._glitchContinuous) return
    const ctx = this._glitchCtx
    if (!ctx) return
    const { nodes, gain } = this._glitchContinuous
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0.001, now + 0.2)
    for (const n of nodes) {
      try { n.stop?.(now + 0.25) } catch (_) {}
    }
    setTimeout(() => {
      try {
        for (const n of nodes) {
          try { n.disconnect?.() } catch (_) {}
        }
        gain?.disconnect()
        this._glitchContinuous?.filter?.disconnect()
      } catch (_) {}
      this._glitchContinuous = null
    }, 300)
  }

  scheduleStopGlitch(delay = 200) {
    if (this._glitchStopTimeout) clearTimeout(this._glitchStopTimeout)
    this._glitchStopTimeout = setTimeout(() => this.stopGlitchContinuous(), delay)
  }
}
