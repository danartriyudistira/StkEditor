// Random Note Generator - ported from shaderTV's random_gen.dart
// Generates automatic note sequences from C minor pentatonic scale

const PITCH_SETS = [
  [48, 49, 51, 55, 56],
  [60, 61, 63, 67, 68],
  [72, 73, 75, 79, 80],
  [48, 60, 61, 67, 68],
  [49, 55, 60, 63, 72],
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default class RandomNoteGenerator {
  constructor() {
    this._sequence = []
    this._noteIndex = 0
    this._loopCount = 0
    this._timer = null
    this._enabled = false
    this._bpm = 120
    this._noteDivider = 1
    this.onNote = null
    this.onNoteOff = null
  }

  get enabled() { return this._enabled }

  setBpm(bpm) {
    const clamped = Math.max(40, Math.min(240, bpm))
    if (clamped === this._bpm) return
    this._bpm = clamped
    if (this._enabled) {
      this._stop()
      this._start()
    }
  }

  setNoteDivider(divider) {
    const clamped = Math.max(1, Math.min(8, divider))
    if (clamped === this._noteDivider) return
    this._noteDivider = clamped
    if (this._enabled) {
      this._stop()
      this._start()
    }
  }

  start() {
    if (this._enabled) return
    this._enabled = true
    this._generate()
    this._start()
  }

  stop() {
    this._enabled = false
    this._stop()
    this._sequence = []
    this._noteIndex = 0
    this._loopCount = 0
  }

  _start() {
    const interval = Math.round(60000 / this._bpm / this._noteDivider)
    const clamped = Math.max(10, Math.min(5000, interval))
    this._timer = setInterval(() => this._tick(), clamped)
  }

  _stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  _generate() {
    const setIndex = Math.floor(Math.random() * PITCH_SETS.length)
    this._sequence = shuffle(PITCH_SETS[setIndex])
    this._noteIndex = 0
    this._loopCount = 0
  }

  _tick() {
    if (this._sequence.length === 0) return
    if (this._noteIndex >= this._sequence.length) {
      this._noteIndex = 0
      this._loopCount++
      if (this._loopCount >= 8) {
        this._generate()
      } else {
        this._sequence = shuffle(this._sequence)
        this._noteIndex = 0
      }
    }
    if (this._noteIndex < this._sequence.length) {
      const pitch = this._sequence[this._noteIndex]
      const velocity = 60 + Math.floor(Math.random() * 68)
      this.onNote?.(pitch, velocity)
      setTimeout(() => {
        this.onNoteOff?.(pitch)
      }, 50)
      this._noteIndex++
    }
  }
}
