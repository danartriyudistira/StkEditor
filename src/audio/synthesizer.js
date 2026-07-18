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
}
