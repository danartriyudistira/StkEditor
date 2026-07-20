/**
 * Hydra Code Mutator — randomly mutates Hydra shader code.
 * Used by the Mutate button to create variations of the current sketch.
 */

const SOURCE_FUNCS = ['osc', 'voronoi', 'noise', 'shape', 'gradient', 'solid']
const TRANSFORMS = [
  'rotate', 'scale', 'pixelate', 'kaleid',
  'repeat', 'repeatX', 'repeatY',
  'scrollX', 'scrollY', 'scroll',
  'contrast', 'brightness', 'saturate', 'invert',
  'posterize', 'colorama', 'hue',
]
const BLEND_FUNCS = ['add', 'sub', 'diff', 'mult', 'blend', 'layer', 'mask']
const MODULATE_FUNCS = [
  'modulate', 'modulateRotate', 'modulateScale',
  'modulatePixelate', 'modulateKaleid',
  'modulateRepeat', 'modulateScrollX', 'modulateScrollY',
]

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Mutate a Hydra code string.
 * @param {string} code - Original Hydra code
 * @param {number} intensity - Mutation strength 0.1 (subtle) to 1.0 (heavy)
 * @returns {string} Mutated code
 */
export function mutateCode(code, intensity = 0.3) {
  if (!code || typeof code !== 'string') return code

  // Pick a mutation strategy based on intensity
  const strategies = [
    () => mutateNumbers(code, intensity),
    () => mutateTransformChain(code, intensity),
    () => mutateSourceSwap(code, intensity),
    () => injectTransform(code, intensity),
  ]

  // Higher intensity = more likely to apply multiple mutations
  let result = code
  const numMutations = Math.max(1, Math.floor(intensity * 3))

  for (let i = 0; i < numMutations; i++) {
    const strategy = randomPick(strategies)
    result = strategy()
  }

  return result
}

/** Jitter numeric values in the code */
function mutateNumbers(code, intensity) {
  return code.replace(/(\d+\.?\d*)/g, (match) => {
    // Don't mutate common fixed values like 0 or 1 too aggressively
    const num = parseFloat(match)
    if (Math.random() > intensity) return match

    const jitter = num * (0.1 + Math.random() * intensity * 0.9)
    const newVal = Math.max(0, num + (Math.random() > 0.5 ? jitter : -jitter))

    // Keep reasonable precision
    if (match.includes('.')) {
      return newVal.toFixed(2).replace(/\.?0+$/, '') || '0'
    }
    return Math.round(newVal).toString()
  })
}

/** Swap source functions (osc <-> voronoi <-> noise <-> shape) */
function mutateSourceSwap(code, intensity) {
  if (Math.random() > intensity) return code

  const lines = code.split('\n')
  const sourceLineIdx = lines.findIndex(l =>
    SOURCE_FUNCS.some(f => l.trim().startsWith(f + '('))
  )

  if (sourceLineIdx === -1) return code

  const line = lines[sourceLineIdx]
  const currentSource = SOURCE_FUNCS.find(f => line.trim().startsWith(f + '('))
  if (!currentSource) return code

  const otherSources = SOURCE_FUNCS.filter(f => f !== currentSource)
  const newSource = randomPick(otherSources)

  // Replace just the function name at the start
  lines[sourceLineIdx] = line.replace(
    new RegExp(`^\\s*${currentSource}\\(`),
    `${newSource}(`
  )

  return lines.join('\n')
}

/** Modify the transform chain (add/remove/swap transforms) */
function mutateTransformChain(code, intensity) {
  const lines = code.split('\n')
  const transformLines = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.startsWith('.') && !trimmed.startsWith('.out(')) {
      transformLines.push(i)
    }
  }

  if (transformLines.length === 0) {
    // No transforms — inject one
    return injectTransform(code, intensity)
  }

  if (Math.random() < intensity * 0.5 && transformLines.length > 1) {
    // Remove a random transform
    const removeIdx = randomPick(transformLines)
    lines.splice(removeIdx, 1)
    return lines.join('\n')
  }

  // Swap a transform to a different one
  const swapIdx = randomPick(transformLines)
  const line = lines[swapIdx]
  const allTransforms = [...TRANSFORMS, ...MODULATE_FUNCS]
  const currentTransform = allTransforms.find(t => {
    const match = trimmed = line.trim()
    return match.startsWith(`.${t}(`) || match.startsWith(`.${t} `)
  })

  if (currentTransform) {
    const otherTransforms = allTransforms.filter(t => t !== currentTransform)
    const newTransform = randomPick(otherTransforms)
    lines[swapIdx] = line.replace(`.${currentTransform}`, `.${newTransform}`)
  }

  return lines.join('\n')
}

/** Inject a new random transform into the chain */
function injectTransform(code, intensity) {
  if (Math.random() > intensity) return code

  const lines = code.split('\n')

  // Find the last .out() line and insert before it
  const outIdx = lines.findIndex(l => l.trim().startsWith('.out('))
  if (outIdx === -1) return code

  const transforms = TRANSFORMS
  const transform = randomPick(transforms)

  // Generate reasonable parameters for the transform
  let params = ''
  switch (transform) {
    case 'rotate':
      params = `${randomFloat(-2, 2)}, ${randomFloat(-0.5, 0.5)}`
      break
    case 'scale':
      params = `${randomFloat(0.1, 3)}`
      break
    case 'kaleid':
      params = `${randomInt(2, 12)}`
      break
    case 'repeat':
      params = `${randomInt(2, 8)}, ${randomInt(2, 8)}`
      break
    case 'pixelate':
      params = `${randomInt(5, 50)}, ${randomInt(5, 50)}`
      break
    case 'contrast':
      params = `${randomFloat(0.1, 3)}`
      break
    case 'brightness':
      params = `${randomFloat(-0.5, 0.5)}`
      break
    case 'saturate':
      params = `${randomFloat(0, 3)}`
      break
    case 'invert':
      params = `${randomFloat(0, 1)}`
      break
    case 'posterize':
      params = `${randomInt(2, 8)}, ${randomFloat(0.1, 1)}`
      break
    case 'colorama':
      params = `${randomFloat(0, 2)}`
      break
    case 'hue':
      params = `${randomFloat(0, 2)}`
      break
    default:
      params = `${randomFloat(0, 1)}`
  }

  lines.splice(outIdx, 0, `  .${transform}(${params})`)
  return lines.join('\n')
}
