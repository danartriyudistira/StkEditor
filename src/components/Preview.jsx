import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import FxProcessor from '../fx/FxProcessor.js'
import { computeAnimatedValue } from '../utils/animation.js'
import ISFEngine from '../engine/ISFEngine.js'
import HydraEngine from '../engine/HydraEngine.js'
import HtmlEngine from '../engine/HtmlEngine.js'

function createPlaceholderImage() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 256, 256)
  gradient.addColorStop(0, '#3c28a0')
  gradient.addColorStop(0.5, '#b432b4')
  gradient.addColorStop(1, '#ff69b4')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  return canvas
}

const flipCanvas = document.createElement('canvas')
const flipCtx = flipCanvas.getContext('2d')

function flipSourceVertically(source) {
  const w = source.videoWidth || source.naturalWidth || source.width || 256
  const h = source.videoHeight || source.naturalHeight || source.height || 256
  if (flipCanvas.width !== w || flipCanvas.height !== h) {
    flipCanvas.width = w
    flipCanvas.height = h
  }
  flipCtx.setTransform(1, 0, 0, -1, 0, h)
  flipCtx.drawImage(source, 0, 0, w, h)
  flipCtx.setTransform(1, 0, 0, 1, 0, 0)
  return flipCanvas
}

const Preview = forwardRef(function Preview({ code, uniformValues, hydraParams, fxChain, onMetadata, onError, sourceType, sourceElement, paramAnimation, bpm, engineMode, noteTriggerRef, canvasSettings }, ref) {
  const canvasRef = useRef(null)
  const iframeRef = useRef(null)
  const engineRef = useRef(null)
  const fxProcessorRef = useRef(null)
  const rafRef = useRef(null)
  const mainGLRef = useRef(null)
  const codeRef = useRef(code)
  const uniformValuesRef = useRef(uniformValues)
  const fxChainRef = useRef(fxChain)
  const sourceTypeRef = useRef(sourceType)
  const sourceElementRef = useRef(sourceElement)
  const paramAnimationRef = useRef(paramAnimation)
  const bpmRef = useRef(bpm)
  const engineModeRef = useRef(engineMode)
  const hydraParamsRef = useRef(hydraParams)
  const canvasSettingsRef = useRef(canvasSettings)
  const lastFrameTimeRef = useRef(0)
  const placeholderImageRef = useRef(null)
  const activeNoteTriggersRef = useRef({})
  const resizeRef = useRef(null)
  const thumbCanvasRef = useRef(null)
  const thumbCtxRef = useRef(null)
  const capturePendingRef = useRef(false)
  const lastThumbCopyRef = useRef(0)

  useImperativeHandle(ref, () => ({
    capture() {
      const tc = thumbCanvasRef.current
      if (!tc) return null
      capturePendingRef.current = true
      return null
    },
    getThumbnail() {
      const tc = thumbCanvasRef.current
      return tc ? tc.toDataURL('image/jpeg', 0.6) : null
    },
    runCode(text) {
      const eng = engineRef.current
      if (eng && eng.isValid()) {
        eng.loadCode(text)
        onMetadata?.(eng.getMetadata())
      }
    },
  }))

  codeRef.current = code
  uniformValuesRef.current = uniformValues
  fxChainRef.current = fxChain
  sourceTypeRef.current = sourceType
  sourceElementRef.current = sourceElement
  paramAnimationRef.current = paramAnimation
  bpmRef.current = bpm
  engineModeRef.current = engineMode
  hydraParamsRef.current = hydraParams
  canvasSettingsRef.current = canvasSettings

  if (noteTriggerRef) {
    noteTriggerRef.current.triggerNote = (paramName, peakFraction, paramMin, paramMax) => {
      activeNoteTriggersRef.current[paramName] = {
        peakFraction,
        paramMin,
        paramMax,
        startTime: Date.now(),
      }
    }
  }

  // Initialize engine + render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mode = engineModeRef.current || 'isf'

    if (mode === 'html') {
      const engine = new HtmlEngine()
      engine.init(canvas)
      engine.loadCode(codeRef.current || '')
      engineRef.current = engine
      onMetadata?.(engine.getMetadata())
      return () => { engine.destroy() }
    }

    const engine = mode === 'hydra' ? new HydraEngine() : new ISFEngine()
    engineRef.current = engine

    const mainGL = canvas.getContext('webgl', {
      preserveDrawingBuffer: false,
      alpha: false,
      antialias: true,
    })

    if (!mainGL) {
      onError?.('WebGL not supported')
      return
    }

    mainGLRef.current = mainGL

    const fxProcessor = new FxProcessor(mainGL)
    fxProcessorRef.current = fxProcessor

    const tc = document.createElement('canvas')
    tc.width = 128
    tc.height = 128
    thumbCanvasRef.current = tc
    thumbCtxRef.current = tc.getContext('2d', { willReadFrequently: true })

    placeholderImageRef.current = createPlaceholderImage()

    let cancelled = false
    let engineReady = false

    // Init engine (async for Hydra)
    async function initEngine() {
      if (mode === 'isf') {
        const isfCanvas = document.createElement('canvas')
        engine._offscreenCanvas = isfCanvas
        engine.init(isfCanvas, mainGL)
      } else {
        await engine.init(canvas, mainGL)
      }

      if (cancelled) return
      if (!engine.isValid()) {
        onError?.(engine.getError())
        return
      }

      engineReady = true

      // Load initial code now that engine is ready
      const initialCode = codeRef.current
      if (initialCode) {
        engine.loadCode(initialCode)
        if (engine.isValid()) {
          const meta = engine.getMetadata()
          onMetadata?.(meta)
          onError?.(null)
        } else {
          onError?.(engine.getError())
        }
      }
    }
    initEngine()

    function render() {
      const eng = engineRef.current
      const fx = fxProcessorRef.current
      const c = canvasRef.current
      if (!eng || !c || !fx) {
        rafRef.current = requestAnimationFrame(render)
        return
      }
      if (c.width === 0 || c.height === 0) {
        rafRef.current = requestAnimationFrame(render)
        return
      }

      const cfg = canvasSettingsRef.current || {}
      if (cfg.fps > 0) {
        const now = performance.now()
        const interval = 1000 / cfg.fps
        if (now - lastFrameTimeRef.current < interval) {
          rafRef.current = requestAnimationFrame(render)
          return
        }
        lastFrameTimeRef.current = now
      }

      const ccValues = uniformValuesRef.current || {}
      const animCfg = paramAnimationRef.current || {}
      const currentBpm = bpmRef.current || 120
      const chain = fxChainRef.current || []
      const hydraParamsRefCurrent = hydraParamsRef.current || {}

      // Use engine's startTime for consistent time calculation
      const startTime = eng.startTime || (eng.startTime = Date.now())
      const time = (Date.now() - startTime) / 1000

      // Compute animated values (ISF + Hydra params)
      const animated = { ...ccValues }
      for (const [name, p] of Object.entries(hydraParamsRefCurrent)) {
        animated[name] = p
      }
      for (const key of Object.keys(animated)) {
        if (key.startsWith('u_cc')) continue
        const cfg = animCfg[key]
        if (cfg && cfg.mode !== 'off') {
          animated[key] = computeAnimatedValue(animated[key], cfg, time, currentBpm)
        }
      }

      // Apply note trigger envelopes (decay over 1 beat)
      const triggers = activeNoteTriggersRef.current
      const now = Date.now()
      const beatMs = (60 / currentBpm) * 1000
      for (const [name, t] of Object.entries(triggers)) {
        const elapsed = now - t.startTime
        if (elapsed >= beatMs) {
          delete triggers[name]
          animated[name] = t.paramMin
          continue
        }
        const progress = elapsed / beatMs
        const envelope = 1 - progress
        animated[name] = t.paramMin + t.peakFraction * envelope * (t.paramMax - t.paramMin)
      }

      // Update uniforms on engine
      if (eng.isValid()) {
        try {
          for (const key of Object.keys(animated)) {
            if (key.startsWith('u_cc')) continue
            if (key === 'inputImage') continue
            if (animated[key] !== undefined) {
              eng.setValue(key, animated[key])
            }
          }
        } catch (_) {}
      }

      // Update inputImage (ISF only)
      if (eng.isValid() && eng.name === 'isf') {
        const srcType = sourceTypeRef.current
        const srcEl = sourceElementRef.current
        const ph = placeholderImageRef.current
        try {
          if (srcType === 'webcam' && srcEl && srcEl.readyState >= 2) {
            eng.setInputImage(flipSourceVertically(srcEl))
          } else if ((srcType === 'image' || srcType === 'placeholder') && srcEl) {
            eng.setInputImage(flipSourceVertically(srcEl))
          } else if (ph) {
            eng.setInputImage(ph)
          }
        } catch (_) {}
      }

      // Draw engine output
      try { eng.draw() } catch (_) {}

      // Get output texture and process through FX chain
      try {
        const outputTex = eng.getOutputTexture()
        if (outputTex) {
          fx.process(outputTex, chain, animated, time, c.width, c.height)
        }
      } catch (e) {
        console.warn('FxProcessor error:', e)
      }

      if (capturePendingRef.current) {
        const tc = thumbCanvasRef.current
        const tctx = thumbCtxRef.current
        if (tc && tctx && c.width > 0 && c.height > 0) {
          const size = Math.min(c.width, c.height, 128)
          tctx.drawImage(c, (c.width - size) / 2, (c.height - size) / 2, size, size, 0, 0, 128, 128)
          capturePendingRef.current = false
        }
      } else {
        const now = performance.now()
        if (now - lastThumbCopyRef.current > 2000) {
          const tc = thumbCanvasRef.current
          const tctx = thumbCtxRef.current
          if (tc && tctx && c.width > 0 && c.height > 0) {
            const size = Math.min(c.width, c.height, 128)
            tctx.drawImage(c, (c.width - size) / 2, (c.height - size) / 2, size, size, 0, 0, 128, 128)
            lastThumbCopyRef.current = now
          }
        }
      }

      rafRef.current = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      const offscreen = engine._offscreenCanvas
      if (offscreen) {
        const gl = offscreen.getContext('webgl') || offscreen.getContext('webgl2')
        if (gl) {
          const ext = gl.getExtension('WEBGL_lose_context')
          if (ext) ext.loseContext()
        }
      }
      engine.destroy()
      fxProcessor.destroy()
    }
  }, [onError, onMetadata, engineMode])

  // Load code into engine (only when engine is ready)
  const loadCode = useCallback((src) => {
    const engine = engineRef.current
    if (!engine || !engine.isValid()) return

    engine.loadCode(src)

    if (!engine.isValid()) {
      onError?.(engine.getError())
      return
    }

    const meta = engine.getMetadata()
    onMetadata?.(meta)
    onError?.(null)
  }, [onMetadata, onError])

  useEffect(() => {
    if (!code) return
    const engine = engineRef.current
    if (!engine) return
    if (engine.name === 'html') {
      engine.loadCode(code)
      onMetadata?.(engine.getMetadata())
      return
    }
    loadCode(code)
  }, [code, loadCode])

  // Post uniformValues to HTML iframe + scroll
  useEffect(() => {
    if (engineMode !== 'html') return
    const iframe = iframeRef.current
    if (!iframe) return
    const cw = iframe.contentWindow
    if (cw) {
      try {
        cw.postMessage({
          type: 'stk_params',
          values: uniformValues || {},
        }, '*')
        if (uniformValues?.scroll !== undefined) {
          const doc = iframe.contentDocument
          const el = doc?.documentElement
          if (el) {
            const maxScroll = Math.max(0, (el.scrollHeight || doc.body?.scrollHeight || 0) - cw.innerHeight)
            cw.scrollTo(0, ((uniformValues.scroll + 1) / 2) * maxScroll)
          }
        }
      } catch (_) {}
    }
  }, [uniformValues, engineMode])

  // Resize observer
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return
      const cfg = canvasSettingsRef.current || {}
      let w, h
      if (cfg.width > 0 && cfg.height > 0) {
        w = cfg.width
        h = cfg.height
      } else {
        w = parent.clientWidth
        h = parent.clientHeight
      }
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w
        canvas.height = h
        // Resize offscreen canvas to match
        const eng = engineRef.current
        if (eng) {
          if (eng.name === 'hydra' && typeof eng.resize === 'function') {
            eng.resize(w, h)
          } else if (eng.name === 'isf' && eng.canvas) {
            eng.canvas.width = w
            eng.canvas.height = h
          }
        }
      }
    }
    resize()
    resizeRef.current = resize

    const parent = canvasRef.current?.parentElement
    let ro = null
    if (parent && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize)
      ro.observe(parent)
    } else {
      window.addEventListener('resize', resize)
    }
    return () => {
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    resizeRef.current?.()
  }, [canvasSettings])

  const isCustomRes = canvasSettings && canvasSettings.width > 0 && canvasSettings.height > 0
  const scaleMode = canvasSettings?.scaleMode || 'fit'

  function getCanvasStyle() {
    if (!isCustomRes) return { width: '100%', height: '100%', display: 'block' }
    switch (scaleMode) {
      case 'fill':
        return {
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
        }
      case 'stretch':
        return {
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'fill',
        }
      case 'original':
        return {
          display: 'block',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          imageRendering: 'pixelated',
        }
      case 'fit':
      default:
        return {
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          objectFit: 'contain',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ ...getCanvasStyle(), display: engineMode === 'html' ? 'none' : getCanvasStyle().display }}
      />
      {engineMode === 'html' && (
        <iframe
          ref={iframeRef}
          title="HTML Preview"
          srcDoc={code}
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}
    </>
  )
})

export default Preview
