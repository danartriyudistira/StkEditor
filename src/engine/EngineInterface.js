/**
 * EngineInterface — abstraction layer untuk rendering engines
 * Semua engine (ISF, Hydra) harus implement interface ini.
 */
export default class EngineInterface {
  /** @param {HTMLCanvasElement} canvas — canvas target untuk rendering */
  init(canvas) {
    throw new Error('init() must be implemented')
  }

  /** @param {string} code — shader/source code */
  loadCode(code) {
    throw new Error('loadCode() must be implemented')
  }

  /** @param {string} name — uniform/variable name
   *  @param {*} value — nilai */
  setValue(name, value) {
    throw new Error('setValue() must be implemented')
  }

  /** Set source image (webcam/image/placeholder) */
  setInputImage(source) {
    // Optional — hanya ISF yang butuh
  }

  /** Render satu frame */
  draw() {
    throw new Error('draw() must be implemented')
  }

  /** @returns {WebGLTexture} output texture untuk FxProcessor */
  getOutputTexture() {
    throw new Error('getOutputTexture() must be implemented')
  }

  /** @returns {WebGLRenderingContext} GL context yang dipakai */
  getGL() {
    throw new Error('getGL() must be implemented')
  }

  /** @returns {{ inputs: Array, description: string, categories: string[] }} */
  getMetadata() {
    return { inputs: [], description: '', categories: [] }
  }

  /** @returns {boolean} */
  isValid() {
    return false
  }

  /** @returns {string|null} error message */
  getError() {
    return null
  }

  /** Cleanup resources */
  destroy() {}

  /** @returns {string} engine identifier */
  get name() {
    return 'base'
  }
}
