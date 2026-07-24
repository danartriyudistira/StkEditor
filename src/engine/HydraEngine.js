import EngineInterface from './EngineInterface.js'

/**
 * HydraEngine — wraps hydra-synth as a rendering engine.
 *
 * Hydra uses regl internally and manages its own WebGL context.
 * We create it on a hidden canvas and copy the output texture
 * to be consumed by FxProcessor.
 *
 * Key design decisions (matching ISFEngine's proven pattern):
 * - preserveDrawingBuffer: true so texImage2D can read canvas content
 * - autoLoop: false so we control render timing (sync with Preview.jsx rAF)
 * - draw() calls hydra.tick() synchronously BEFORE getOutputTexture() reads the canvas
 */
export default class HydraEngine extends EngineInterface {
  constructor() {
    super()
    this.hydra = null
    this.outputCanvas = null
    this.outputGL = null   // GL from main canvas — for output texture to FxProcessor
    this.outputTexture = null
    this.valid = false
    this.error = null
    this.startTime = Date.now()
  }

  get name() { return 'hydra' }

  /**
   * @param {HTMLCanvasElement} displayCanvas — main canvas (for sizing reference)
   * @param {WebGLRenderingContext} outputGL — GL from main canvas (for FxProcessor)
   */
  async init(displayCanvas, outputGL) {
    this.outputGL = outputGL

    // Create offscreen canvas for Hydra rendering
    this.outputCanvas = document.createElement('canvas')
    this.outputCanvas.width = displayCanvas.width || 1280
    this.outputCanvas.height = displayCanvas.height || 720

    // CRITICAL: Pre-create GL context with preserveDrawingBuffer: true
    // When regl calls getContext() later, it returns this EXISTING context
    // (browser spec: same canvas + same context type = returns existing)
    // Without this, regl defaults to preserveDrawingBuffer: false and
    // texImage2D reads empty/stale canvas content
    this.outputCanvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    })

    try {
      const Hydra = (await import('hydra-synth')).default

      this.hydra = new Hydra({
        canvas: this.outputCanvas,
        makeGlobal: true,      // Required: sandbox uses globalThis.eval(), needs synth functions on window
        detectAudio: false,
        autoLoop: false,       // We control tick() manually in draw() for sync
        numOutputs: 1,
        numSources: 4,
        enableStreamCapture: false,
        debug: false,
      })

      // Create output texture on the OUTPUT GL context (FxProcessor's GL)
      this.outputTexture = outputGL.createTexture()
      this.valid = true
      this.error = null
    } catch (e) {
      this.valid = false
      this.error = 'Failed to init Hydra: ' + (e.message || String(e))
    }
  }

  /** Update offscreen canvas size to match display canvas */
  resize(w, h) {
    if (!this.outputCanvas || w <= 0 || h <= 0) return
    if (this.outputCanvas.width === w && this.outputCanvas.height === h) return
    this.outputCanvas.width = w
    this.outputCanvas.height = h
  }

  loadCode(code) {
    if (!this.hydra) return
    try {
      this.hydra.eval(code)
      this.valid = true
      this.error = null
    } catch (e) {
      this.valid = false
      this.error = e.message || String(e)
    }
  }

  setValue(name, value) {
    if (!this.hydra) return
    try {
      this.hydra.synth[name] = value
      window[name] = value
    } catch (_) {}
  }

  setInputImage(source) {
    if (!this.hydra) return
    try {
      this.hydra.s[0].init({ src: source })
    } catch (_) {}
  }

  /**
   * Synchronous render — called by Preview.jsx rAF loop.
   * This ensures Hydra renders to the offscreen canvas BEFORE
   * getOutputTexture() reads it. No race condition.
   */
  draw() {
    if (!this.hydra) return
    try {
      this.hydra.tick(16.67) // ~60fps dt in ms
    } catch (_) {}
  }

  getOutputTexture() {
    if (!this.outputGL || !this.outputCanvas || !this.outputTexture) return null
    const gl = this.outputGL
    gl.bindTexture(gl.TEXTURE_2D, this.outputTexture)
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.outputCanvas
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return this.outputTexture
  }

  getGL() { return this.outputGL }

  getMetadata() {
    return {
      inputs: [],
      name: 'Hydra',
      description: 'Hydra Synth — Live Coding Visual\nKonsep IPO: Input (source) -> Proses (transform) -> Output (render)',
      categories: ['Hydra', 'Live Coding'],
      help: 'Ctrl+Enter: run | Ctrl+Shift+Enter: run baris | Klik Kanan: modul',
    }
  }

  isValid() { return this.valid }
  getError() { return this.error }

  destroy() {
    if (this.hydra) {
      try { this.hydra.hush() } catch (_) {}
      this.hydra = null
    }
    if (this.outputGL && this.outputTexture) {
      this.outputGL.deleteTexture(this.outputTexture)
    }
    this.outputTexture = null
    this.outputCanvas = null
    this.outputGL = null
  }
}
