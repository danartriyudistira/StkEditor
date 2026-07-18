import { useRef, useEffect, useCallback } from 'react'
import { Renderer, Parser } from 'interactive-shader-format'
import FxProcessor from '../fx/FxProcessor.js'

function wrapGLSL(code) {
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

export default function Preview({ code, uniformValues, fxChain, onMetadata, onError, sourceType, sourceElement }) {
  const canvasRef = useRef(null)
  const isfCanvasRef = useRef(null)
  const isfRendererRef = useRef(null)
  const fxProcessorRef = useRef(null)
  const isfTextureRef = useRef(null)
  const placeholderRef = useRef(null)
  const parserRef = useRef(null)
  const rafRef = useRef(null)
  const codeRef = useRef(code)
  const uniformValuesRef = useRef(uniformValues)
  const fxChainRef = useRef(fxChain)
  const sourceTypeRef = useRef(sourceType)
  const sourceElementRef = useRef(sourceElement)
  const sourceVersionRef = useRef(0)

  codeRef.current = code
  uniformValuesRef.current = uniformValues
  fxChainRef.current = fxChain
  sourceTypeRef.current = sourceType
  sourceElementRef.current = sourceElement

  // Track source changes - increment version when source changes
  const prevSourceRef = useRef(null)
  useEffect(() => {
    const key = `${sourceType}:${sourceElement?.src || sourceElement?.width || 'none'}`
    if (key !== prevSourceRef.current) {
      prevSourceRef.current = key
      sourceVersionRef.current++
    }
  }, [sourceType, sourceElement])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isfCanvas = document.createElement('canvas')
    isfCanvasRef.current = isfCanvas

    const isfGL = isfCanvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      alpha: true,
      antialias: true,
    })

    if (!isfGL) {
      onError?.('WebGL not supported')
      return
    }

    const isfRenderer = new Renderer(isfGL)
    isfRendererRef.current = isfRenderer

    const mainGL = canvas.getContext('webgl', {
      preserveDrawingBuffer: false,
      alpha: false,
      antialias: true,
    })

    if (!mainGL) {
      onError?.('WebGL not supported (main)')
      return
    }

    const fxProcessor = new FxProcessor(mainGL)
    fxProcessorRef.current = fxProcessor

    isfTextureRef.current = mainGL.createTexture()
    placeholderRef.current = createPlaceholderImage()

    function render() {
      const r = isfRendererRef.current
      const fx = fxProcessorRef.current
      const c = canvasRef.current
      const ic = isfCanvasRef.current
      const gl = mainGL
      if (!r || !c || !ic || !fx || !r.valid) {
        rafRef.current = requestAnimationFrame(render)
        return
      }
      if (c.width === 0 || c.height === 0) {
        rafRef.current = requestAnimationFrame(render)
        return
      }

      if (ic.width !== c.width || ic.height !== c.height) {
        ic.width = c.width
        ic.height = c.height
      }

      try {
        r.draw(ic)
      } catch (_) {}

      try {
        gl.bindTexture(gl.TEXTURE_2D, isfTextureRef.current)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ic)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        const ccValues = uniformValuesRef.current || {}
        const chain = fxChainRef.current || []
        const time = (Date.now() - (r.startTime || Date.now())) / 1000

        fx.process(isfTextureRef.current, chain, ccValues, time, c.width, c.height)
      } catch (e) {
        console.warn('FxProcessor error:', e)
      }

      rafRef.current = requestAnimationFrame(render)
    }
    render()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fxProcessor.destroy()
    }
  }, [onError])

  const loadCode = useCallback((src) => {
    const renderer = isfRendererRef.current
    if (!renderer) return

    const input = wrapGLSL(src)

    try {
      const parser = new Parser()
      parser.parse(input)
      parserRef.current = parser

      if (!parser.valid) {
        onError?.(parser.error || 'Invalid ISF')
        return
      }

      onMetadata?.({
        inputs: parser.inputs || [],
        description: parser.description || '',
        credit: parser.credit || '',
        categories: parser.categories || [],
        passes: parser.passes || [],
      })

      renderer.loadSource(input)

      // Set source image after shader is loaded
      const srcType = sourceTypeRef.current
      const srcEl = sourceElementRef.current
      const ph = placeholderRef.current

      if (srcType === 'webcam' && srcEl && srcEl.readyState >= 2) {
        try { renderer.setValue('inputImage', srcEl) } catch (_) {}
      } else if (srcType === 'image' && srcEl && srcEl.complete) {
        try { renderer.setValue('inputImage', srcEl) } catch (_) {}
      } else if (ph) {
        try { renderer.setValue('inputImage', ph) } catch (_) {}
      }

      onError?.(null)
    } catch (e) {
      onError?.(e.message || String(e))
    }
  }, [onMetadata, onError])

  useEffect(() => {
    if (code) loadCode(code)
  }, [code, loadCode])

  // Update source when sourceType/sourceElement changes
  useEffect(() => {
    const renderer = isfRendererRef.current
    if (!renderer || !renderer.valid) return

    const srcType = sourceTypeRef.current
    const srcEl = sourceElementRef.current
    const ph = placeholderRef.current

    try {
      if (srcType === 'webcam' && srcEl && srcEl.readyState >= 2) {
        renderer.setValue('inputImage', srcEl)
      } else if (srcType === 'image' && srcEl && srcEl.complete) {
        renderer.setValue('inputImage', srcEl)
      } else if (ph) {
        renderer.setValue('inputImage', ph)
      }
    } catch (_) {}
  }, [sourceType, sourceElement])

  const prevUniformsRef = useRef('')
  useEffect(() => {
    const renderer = isfRendererRef.current
    if (!renderer || !uniformValues) return

    const key = JSON.stringify(uniformValues)
    if (key === prevUniformsRef.current) return
    prevUniformsRef.current = key

    for (const [name, value] of Object.entries(uniformValues)) {
      try { renderer.setValue(name, value) } catch (_) {}
    }
  }, [uniformValues])

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return
      const w = parent.clientWidth
      const h = parent.clientHeight
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w
        canvas.height = h
      }
    }
    resize()

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

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
