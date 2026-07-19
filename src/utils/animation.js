const DEFAULT_CONFIG = {
  mode: 'off',
  direction: 'loop',
  speed: 1,
  min: 0,
  max: 1,
  bpmSync: false,
  bpmDiv: 4,
}

function makeDefaultConfig() {
  return { ...DEFAULT_CONFIG }
}

const _randomCache = {}

function sampleAndHold(key, time, hold) {
  const index = Math.floor(time / hold)
  if (_randomCache[key] === undefined || _randomCache[key].index !== index) {
    _randomCache[key] = { index, value: Math.random() }
  }
  return _randomCache[key].value
}

function waveSine(t) { return 0.5 + 0.5 * Math.sin(t * Math.PI * 2) }
function waveTriangle(t) { const p = t - Math.floor(t); return p < 0.5 ? p * 2 : 2 - p * 2 }
function waveSaw(t) { return t - Math.floor(t) }
function waveSquare(t) { return (t - Math.floor(t)) < 0.5 ? 1 : 0 }

function computeAnimatedValue(baseValue, config, time, bpm) {
  if (!config || config.mode === 'off') return baseValue

  let speed = config.speed || 1
  if (config.bpmSync) {
    const beatsPerSecond = bpm / 60
    speed = beatsPerSecond / (config.bpmDiv || 4)
  }

  const direction = config.direction || 'loop'
  const animMin = config.min ?? 0
  const animMax = config.max ?? 1

  if (direction === 'random') {
    const r = sampleAndHold('dir', time * speed, 1 / (speed || 1))
    return animMin + r * (animMax - animMin)
  }

  const raw = time * speed
  let phase
  switch (direction) {
    case 'forward':
      phase = Math.min(raw, 1)
      break
    case 'pingpong':
      phase = 1 - Math.abs(1 - (raw % 2))
      break
    default:
      phase = raw - Math.floor(raw)
      break
  }

  let animated
  switch (config.mode) {
    case 'sine':
      animated = waveSine(phase)
      break
    case 'triangle':
      animated = waveTriangle(phase)
      break
    case 'saw':
      animated = waveSaw(phase)
      break
    case 'square':
      animated = waveSquare(phase)
      break
    case 'random':
      animated = sampleAndHold('cc', raw, 1)
      break
    default:
      return baseValue
  }

  return animMin + animated * (animMax - animMin)
}

export { DEFAULT_CONFIG, makeDefaultConfig, computeAnimatedValue }
