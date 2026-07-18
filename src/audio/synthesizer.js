// Web Audio API Synthesizer - ported from shaderTV's AudioEngine.kt
// 4-voice polyphonic synth with 11 presets

const PRESETS = [
  { name: 'Saw Lead',    wave: 'sawtooth',  pulseWidth: 0.5, cutoff: 1200, attack: 0.005, decay: 0.3,  release: 0.8  },
  { name: 'Square',      wave: 'square',    pulseWidth: 0.5, cutoff: 800,  attack: 0.005, decay: 0.4,  release: 0.6  },
  { name: 'Triangle',    wave: 'triangle',  pulseWidth: 0.5, cutoff: 600,  attack: 0.01,  decay: 0.5,  release: 0.8  },
  { name: 'Sine Pad',    wave: 'sine',      pulseWidth: 0.5, cutoff: 400,  attack: 0.05,  decay: 0.6,  release: 1.2  },
  { name: 'Bass',        wave: 'sawtooth',  pulseWidth: 0.0, cutoff: 300,  attack: 0.005, decay: 0.2,  release: 0.4  },
  { name: 'Brass',       wave: 'square',    pulseWidth: 0.5, cutoff: 2000, attack: 0.002, decay: 0.2,  release: 0.3  },
  { name: 'Keys',        wave: 'sawtooth',  pulseWidth: 0.5, cutoff: 1500, attack: 0.001, decay: 0.15, release: 0.2  },
  { name: 'Organ',       wave: 'square',    pulseWidth: 0.5, cutoff: 800,  attack: 0.005, decay: 0.8,  release: 0.6  },
  { name: 'Bell',        wave: 'sine',      pulseWidth: 0.5, cutoff: 2000, attack: 0.001, decay: 1.0,  release: 1.5  },
  { name: 'Pulse',       wave: 'pulse',     pulseWidth: 0.25,cutoff: 1000, attack: 0.005, decay: 0.3,  release: 0.6  },
  { name: 'Gamelan',     wave: 'pulse',     pulseWidth: 0.12,cutoff: 1200, attack: 0.001, decay: 0.8,  release: 1.5  },
]

const MAX_VOICES = 4

class Voice {
  constructor() {
    this.active = false
    this.note = -1
    this.velocity = 0
    this.phase = 0
    this.envelope = 0
    this.envState = 0 // 0=idle, 1=attack, 2=decay, 3=release
    this.attackRate = 0
    this.decayRate = 0
    this.releaseRate = 0
    this.filterOut = 0
    this.startTime = 0
  }
}

export default class Synthesizer {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.analyser = null
    this.voices = Array.from({ length: MAX_VOICES }, () => new Voice())
    this.preset = PRESETS[0]
    this.presetIndex = 0
    this.sampleRate = 44100
    this.processor = null
    this._started = false
  }

  get presets() { return PRESETS }

  start() {
    if (this._started) return
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.sampleRate = this.ctx.sampleRate
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.5
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.masterGain.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)

    this.processor = this.ctx.createScriptProcessor(512, 0, 1)
    this.processor.onaudioprocess = (e) => this._render(e)
    this.masterGain.connect(this.processor)
    this.processor.connect(this.ctx.destination)

    this._started = true
  }

  stop() {
    if (!this._started) return
    this.processor?.disconnect()
    this.masterGain?.disconnect()
    this.analyser?.disconnect()
    this.ctx?.close()
    this.ctx = null
    this._started = false
  }

  setPreset(index) {
    this.presetIndex = Math.max(0, Math.min(PRESETS.length - 1, index))
    this.preset = PRESETS[this.presetIndex]
  }

  noteOn(note, velocity = 100) {
    if (!this._started) this.start()
    if (this.ctx?.state === 'suspended') this.ctx.resume()

    const vel = velocity / 127
    const preset = this.preset

    // Find free voice or steal oldest
    let voice = this.voices.find(v => !v.active)
    if (!voice) {
      voice = this.voices.reduce((oldest, v) => v.startTime < oldest.startTime ? v : oldest)
    }

    voice.active = true
    voice.note = note
    voice.velocity = vel
    voice.phase = 0
    voice.envelope = 0
    voice.envState = 1 // attack
    voice.attackRate = 1.0 / (preset.attack * this.sampleRate)
    voice.decayRate = 1.0 / (preset.decay * this.sampleRate)
    voice.releaseRate = 1.0 / (preset.release * this.sampleRate)
    voice.filterOut = 0
    voice.startTime = this.ctx?.currentTime || 0
  }

  noteOff(note) {
    for (const voice of this.voices) {
      if (voice.active && voice.note === note && voice.envState !== 3) {
        voice.envState = 3 // release
      }
    }
  }

  getAnalyserData() {
    if (!this.analyser) return null
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  _render(e) {
    const output = e.outputBuffer.getChannelData(0)
    const preset = this.preset
    const sr = this.sampleRate

    for (let i = 0; i < output.length; i++) {
      let sample = 0

      for (const voice of this.voices) {
        if (!voice.active) continue

        // Phase accumulation
        const freq = 440 * Math.pow(2, (voice.note - 69) / 12)
        voice.phase += freq / sr
        if (voice.phase >= 1) voice.phase -= 1

        // Waveform generation
        let wave = 0
        const p = voice.phase
        switch (preset.wave) {
          case 'sawtooth': wave = p * 2 - 1; break
          case 'square':   wave = p < 0.5 ? 1 : -1; break
          case 'triangle': wave = Math.abs(p * 4 - 2) - 1; break
          case 'sine':     wave = Math.sin(p * 2 * Math.PI); break
          case 'pulse':    wave = p < preset.pulseWidth ? 1 : -1; break
        }

        // Velocity scaling
        wave *= voice.velocity

        // Soft clipping
        wave = wave - wave * wave * wave * 0.3

        // One-pole low-pass filter
        voice.filterOut += (wave - voice.filterOut) * preset.cutoff / sr

        // ADSR envelope
        switch (voice.envState) {
          case 1: // attack
            voice.envelope += voice.attackRate
            if (voice.envelope >= 1.0) {
              voice.envelope = 1.0
              voice.envState = 2 // decay
            }
            break
          case 2: // decay
            voice.envelope -= voice.decayRate
            if (voice.envelope <= 0) {
              voice.envelope = 0
              voice.active = false
            }
            break
          case 3: // release
            voice.envelope -= voice.releaseRate
            if (voice.envelope <= 0) {
              voice.envelope = 0
              voice.active = false
            }
            break
        }

        // Mix
        sample += voice.filterOut * voice.envelope * 0.25
      }

      // Clamp
      output[i] = Math.max(-1, Math.min(1, sample))
    }
  }
}
