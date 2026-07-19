/**
 * ISF-to-FX Adapter
 * Converts ISF shader source into FX-compatible fragment shaders
 * for use in the FBO ping-pong FX chain pipeline.
 */

/**
 * Extract metadata from ISF shader source.
 * @param {string} source - Raw .fs file content
 * @returns {object|null} - Parsed metadata or null
 */
export function extractIsfMetadata(source) {
  if (!source || typeof source !== 'string') return null
  let src = source.replace(/^\uFEFF/, '')
  const match = src.match(/\/\*\{([\s\S]*?)\}\*\//)
  if (!match) return null
  try {
    return JSON.parse('{' + match[1] + '}')
  } catch {
    return null
  }
}

/**
 * Convert ISF shader source to FX-compatible fragment shader.
 * @param {string} isfSource - Raw .fs file content
 * @param {object} metadata - Parsed ISF metadata
 * @returns {{ shader: string, params: object, warnings: string[] }}
 */
export function adaptIsfToFx(isfSource, metadata) {
  const warnings = []

  // Strip metadata comment block
  let body = isfSource.replace(/\/\*\{[\s\S]*?\}\*\//, '').trim()

  // Strip license/multi-line comments that aren't the metadata block
  body = body.replace(/\/\*[\s\S]*?\*\//g, '')

  // Strip #version directive (WebGL 1.0 compatible)
  body = body.replace(/^#version\s+\d+\s*\w*\s*$/gm, '')

  // Reject #include directives
  if (body.includes('#include')) {
    warnings.push('Shader uses #include which is not supported')
  }

  // Extract image-type inputs (become u_input, not params)
  const allInputs = metadata?.INPUTS || []
  const imageInputs = allInputs.filter(i => i.TYPE === 'image')

  // Convert non-image INPUTS to FX params
  const params = {}
  for (const input of allInputs) {
    if (input.TYPE === 'image') continue
    if (input.TYPE === 'color') {
      // Hardcode color inputs as const - cannot map to scalar float
      const def = input.DEFAULT || [0, 0, 0, 1]
      body = 'const vec4 ' + input.NAME + ' = vec4(' + def.join(', ') + ');\n' + body
      warnings.push('Color input "' + input.NAME + '" hardcoded to default value')
      continue
    }
    if (input.TYPE === 'point2D') {
      // Hardcode point2D inputs as const
      const def = input.DEFAULT || [0.5, 0.5]
      body = 'const vec2 ' + input.NAME + ' = vec2(' + def.join(', ') + ');\n' + body
      warnings.push('Point2D input "' + input.NAME + '" hardcoded to default value')
      continue
    }

    params[input.NAME] = {
      min: input.MIN ?? 0,
      max: input.MAX ?? 1,
      step: computeStep(input),
      default: input.DEFAULT ?? input.MIN ?? 0,
      label: input.LABEL ?? input.NAME,
      ...(input.LABELS ? { labels: input.LABELS } : {}),
    }
  }

  // Generate uniform declarations for params
  const paramUniforms = Object.keys(params)
    .map(name => 'uniform float ' + name + ';')
    .join('\n')

  // Build FX compatibility header
  const header = 'precision highp float;\n' +
    'varying vec2 v_uv;\n' +
    '#define TIME u_time\n' +
    '#define RENDERSIZE u_resolution\n' +
    '#define PASSINDEX 0\n' +
    '#define isf_FragNormCoord v_uv\n' +
    '\n' +
    'uniform sampler2D u_input;\n' +
    'uniform vec2 u_resolution;\n' +
    'uniform float u_time;\n' +
    'uniform float strength;\n' +
    paramUniforms + '\n'

  // Replace ISF texture sampling macros with plain texture2D calls
  body = body.replace(/IMG_THIS_PIXEL\s*\(\s*inputImage\s*\)/g, 'texture2D(u_input, v_uv)')
  body = body.replace(/IMG_NORM_PIXEL\s*\(\s*inputImage\s*,\s*([^)]+)\)/g, 'texture2D(u_input, $1)')
  body = body.replace(/IMG_PIXEL\s*\(\s*inputImage\s*,\s*([^)]+)\)/g, 'texture2D(u_input, $1)')
  body = body.replace(/IMG_SIZE\s*\(\s*inputImage\s*\)/g, 'u_resolution')

  // Replace any remaining IMG_THIS_PIXEL macros
  body = body.replace(/IMG_THIS_PIXEL\s*\(\s*\w+\s*\)/g, 'texture2D(u_input, v_uv)')

  const shader = header + '\n' + body

  return { shader, params, warnings }
}

function computeStep(input) {
  if (input.TYPE === 'long') return 1
  const range = (input.MAX ?? 1) - (input.MIN ?? 0)
  if (range <= 2) return 0.01
  if (range <= 10) return 0.1
  return 1
}

/**
 * Validate whether an ISF shader can be used as an FX effect.
 * @param {object} metadata - Parsed ISF metadata
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateIsfForFx(metadata) {
  if (!metadata) {
    return { valid: false, reason: 'No ISF metadata found in shader' }
  }

  if (metadata.PASSES && metadata.PASSES.length > 1) {
    return {
      valid: false,
      reason: 'This shader uses ' + metadata.PASSES.length + ' render passes - not supported as an FX effect (single-pass only)'
    }
  }

  const imageInputs = (metadata.INPUTS || []).filter(i => i.TYPE === 'image')
  if (imageInputs.length > 1) {
    return {
      valid: false,
      reason: 'This shader requires ' + imageInputs.length + ' texture inputs - only 1 input texture is supported in the FX chain'
    }
  }

  return { valid: true, reason: '' }
}





