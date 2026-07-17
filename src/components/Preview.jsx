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

export default function Preview({ code, uniformValues, fxChain, onMetadata, onError }) {
  const canvasRef = useRef(null)
  const isfCanvasRef = useRef(null)
  const isfRendererRef = useRef(null)
  const fxProcessorRef = useRef(null)
  const isfTextureRef = useRef(null)
  const parserRef = useRef(null)
  const rafRef = useRef(null)
  const codeRef = useRef(code)
  const uniformValuesRef = useRef(uniformValues)
  const fxChainRef = useRef(fxChain)

  codeRef.current = code
  uniformValuesRef.current = uniformValues
  fxChainRef.current = fxChain

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

    function render() {
      const r = isfRendererRef.current
      const fx = fxProcessorRef.current
      const c = canvasRef.current
      const ic = isfCanvasRef.current
      const gl = mainGL
      if (!r || !c || !ic || !fx) {
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
      onError?.(null)
    } catch (e) {
      onError?.(e.message || String(e))
    }
  }, [onMetadata, onError])

  useEffect(() => {
    if (code) loadCode(code)
  }, [code, loadCode])

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
