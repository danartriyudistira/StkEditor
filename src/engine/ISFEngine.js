import { Renderer, Parser } from 'interactive-shader-format'
import EngineInterface from './EngineInterface.js'

/**
 * ISFEngine — wraps interactive-shader-format Renderer/Parser
 * into the EngineInterface contract.
 *
 * Uses two GL contexts:
 * - renderGL: offscreen canvas for ISF rendering (preserveDrawingBuffer: true)
 * - outputGL: main canvas GL for output texture (used by FxProcessor)
 */
export default class ISFEngine extends EngineInterface {
  constructor() {
    super()
    this.renderGL = null   // GL on offscreen canvas — for ISF rendering
    this.outputGL = null   // GL on main canvas — for output texture to FxProcessor
    this.renderer = null
    this.parser = null
    this.canvas = null     // offscreen canvas
    this.outputTexture = null
    this.valid = false
    this.error = null
    this.metadata = { inputs: [], description: '', categories: [] }
    this.hasInputImage = false
  }

  get name() { return 'isf' }

  /**
   * @param {HTMLCanvasElement} offscreenCanvas — canvas untuk ISF rendering
   * @param {WebGLRenderingContext} outputGL — GL context dari main canvas (untuk FxProcessor)
   */
  init(offscreenCanvas, outputGL) {
    this.canvas = offscreenCanvas
    this.outputGL = outputGL

    this.renderGL = offscreenCanvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      alpha: true,
      antialias: true,
    })
    if (!this.renderGL) {
      this.error = 'WebGL not supported (ISF render context)'
      return
    }

    this.renderer = new Renderer(this.renderGL)

    // Create output texture on the OUTPUT GL context (FxProcessor's GL)
    this.outputTexture = outputGL.createTexture()
    this.valid = true
  }

  loadCode(code) {
    if (!this.renderer) return
    try {
      const input = this._wrapGLSL(code)
      const parser = new Parser()
      parser.parse(input)
      this.parser = parser

      if (!parser.valid) {
        this.valid = false
        this.error = parser.error || 'Invalid ISF'
        return
      }

      this.metadata = {
        inputs: parser.inputs || [],
        description: parser.description || '',
        credit: parser.credit || '',
        categories: parser.categories || [],
        passes: parser.passes || [],
      }

      this.hasInputImage = (parser.inputs || []).some(i => i.TYPE === 'image')
      this.renderer.loadSource(input)
      this.valid = true
      this.error = null
    } catch (e) {
      this.valid = false
      this.error = e.message || String(e)
    }
  }

  setValue(name, value) {
    if (!this.renderer || !this.valid) return
    try {
      this.renderer.setValue(name, value)
    } catch (_) {}
  }

  setInputImage(source) {
    if (!this.renderer || !this.valid || !this.hasInputImage) return
    try {
      this.renderer.setValue('inputImage', source)
    } catch (_) {}
  }

  draw() {
    if (!this.renderer || !this.renderGL) return
    this.renderGL.viewport(0, 0, this.canvas.width, this.canvas.height)
    this.renderer.draw(this.canvas)
  }

  getOutputTexture() {
    if (!this.outputGL || !this.canvas) return null
    const gl = this.outputGL
    gl.bindTexture(gl.TEXTURE_2D, this.outputTexture)
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return this.outputTexture
  }

  getGL() { return this.outputGL }
  getMetadata() { return this.metadata }
  isValid() { return this.valid }
  getError() { return this.error }

  destroy() {
    if (this.renderer) {
      try { this.renderer.cleanup() } catch (_) {}
    }
    if (this.outputGL && this.outputTexture) {
      this.outputGL.deleteTexture(this.outputTexture)
    }
    this.renderer = null
    this.renderGL = null
    this.outputGL = null
    this.outputTexture = null
  }

  _wrapGLSL(code) {
    const trimmed = code.trimLeft()
    if (trimmed.startsWith('/*{')) return code
    return `/*{
  "DESCRIPTION": "",
  "CREDIT": "",
  "ISFVSN": "2",
  "INPUTS": [],
  "CATEGORIES": [ "Custom" ]
}
*/

${code}`
  }
}
