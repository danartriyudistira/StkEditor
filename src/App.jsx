import { useState, useCallback, useEffect, useRef } from 'react'
import ShaderEditor from './components/Editor.jsx'
import Preview from './components/Preview.jsx'
import Controls from './components/Controls.jsx'
import CcPanel from './components/CcPanel.jsx'
import FxPanel from './components/FxPanel.jsx'
import MidiPanel from './components/MidiPanel.jsx'
import RandomGenPanel from './components/RandomGenPanel.jsx'
import AudioPanel from './components/AudioPanel.jsx'
import Toolbar from './components/Toolbar.jsx'
import ISFLibrary from './components/ISFLibrary.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './App.css'

const DEFAULT_SHADER = `/*{
  "DESCRIPTION": "Simple gradient",
  "CREDIT": "",
  "ISFVSN": "2",
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0, "MAX": 2 },
    { "NAME": "hueShift", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0, "MAX": 6.28 },
    { "NAME": "invert", "TYPE": "bool", "DEFAULT": false }
  ],
  "CATEGORIES": [ "Generator" ]
}
*/

void main() {
  vec2 uv = isf_FragNormCoord.xy;
  float t = TIME * speed;
  vec3 col = 0.5 + 0.5 * cos(t + uv.xyx + vec3(hueShift, hueShift + 2.09, hueShift + 4.18));
  if (invert) col = 1.0 - col;
  gl_FragColor = vec4(col, 1.0);
}`

const defaultCcValues = Object.fromEntries(
  [1,2,3,4,5,6,7,8].map(ch => [`u_cc${ch}`, 0.5])
)

export default function App() {
  const [code, setCode] = useState(DEFAULT_SHADER)
  const [isfMetadata, setIsfMetadata] = useState(null)
  const [uniformValues, setUniformValues] = useState({})
  const [ccValues, setCcValues] = useState(defaultCcValues)
  const [ccMapping, setCcMapping] = useState({})
  const [fxChain, setFxChain] = useState([])
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState('untitled.fs')
  const [stkfxName, setStkfxName] = useState('')
  const [libraryFiles, setLibraryFiles] = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [consoleConnected, setConsoleConnected] = useState(false)
  const [consoleConfig, setConsoleConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('consoleConfig')) || { host: 'localhost', port: 8765 } } catch { return { host: 'localhost', port: 8765 } }
  })
  const [triggers, setTriggers] = useState([])
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [panelOpacity, setPanelOpacity] = useState(0.92)
  const [sourceType, setSourceType] = useState('placeholder')
  const [sourceElement, setSourceElement] = useState(null)
  const wsRef = useRef(null)
  const webcamStreamRef = useRef(null)
  const synthRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); setLeftOpen(v => !v) }
      if (e.ctrlKey && e.key === '.') { e.preventDefault(); setRightOpen(v => !v) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/'
    fetch(`${base}ISF/isf-index.json`)
      .then(r => r.json())
      .then(files => setLibraryFiles(Array.isArray(files) ? files : []))
      .catch(() => setLibraryFiles([]))
  }, [])

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const handleMetadata = useCallback((meta) => {
    setIsfMetadata(meta)
    const defaults = {}
    for (const input of (meta?.inputs || [])) {
      if (input.DEFAULT !== undefined) {
        defaults[input.NAME] = input.DEFAULT
      }
    }
    setUniformValues(defaults)
    setError(null)
  }, [])

  const handleError = useCallback((err) => {
    setError(typeof err === 'string' ? err : err?.message || String(err))
  }, [])

  const handleControlChange = useCallback((name, value) => {
    setUniformValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleCcValueChange = useCallback((name, value) => {
    setCcValues(prev => ({ ...prev, [name]: value }))

    const ccChannel = name.replace('u_cc', '')
    const mappedInputs = Object.entries(ccMapping)
      .filter(([_, ch]) => ch === `cc${ccChannel}`)
      .map(([inputName]) => inputName)

    if (mappedInputs.length > 0 && isfMetadata?.inputs) {
      setUniformValues(prev => {
        const next = { ...prev }
        for (const inputName of mappedInputs) {
          const input = isfMetadata.inputs.find(i => i.NAME === inputName)
          if (input) {
            const min = input.MIN ?? 0
            const max = input.MAX ?? 1
            next[inputName] = min + value * (max - min)
          }
        }
        return next
      })
    }
  }, [ccMapping, isfMetadata])

  const handleCcMappingChange = useCallback((inputName, channel) => {
    setCcMapping(prev => ({ ...prev, [inputName]: channel }))
  }, [])

  const handleTrigger = useCallback((trigger) => {
    // Play sound via synth
    if (trigger.type === 'noteOn' && trigger.velocity > 0) {
      synthRef.current?.noteOn(trigger.note, Math.round(trigger.velocity * 127))
    } else if (trigger.type === 'noteOff') {
      synthRef.current?.noteOff(trigger.note)
    }

    setTriggers(prev => {
      if (trigger.type === 'noteOn') {
        const next = [...prev, {
          note: trigger.note,
          velocity: trigger.velocity,
          startTime: Date.now(),
          effectId: trigger.effectId || null,
        }]
        return next.slice(-6) // max 6 active triggers
      } else {
        return prev.filter(t => t.note !== trigger.note)
      }
    })

    // If mapped to effect, toggle it
    if (trigger.effectId) {
      setFxChain(prev => prev.map(fx => {
        if (fx.id === trigger.effectId) {
          return { ...fx, enabled: trigger.type === 'noteOn' ? true : fx.enabled }
        }
        return fx
      }))
    }
  }, [])

  const handleSourceChange = useCallback((type) => {
    // Stop webcam if switching away
    if (type !== 'webcam' && webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop())
      webcamStreamRef.current = null
    }

    if (type === 'webcam') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          webcamStreamRef.current = stream
          const video = document.createElement('video')
          video.srcObject = stream
          video.autoplay = true
          video.playsInline = true
          video.muted = true
          video.play()
          setSourceType('webcam')
          setSourceElement(video)
        })
        .catch(err => {
          console.error('Webcam error:', err)
          setError('Could not access webcam')
        })
    } else if (type === 'image') {
      // Handled by file upload
    } else {
      setSourceType('placeholder')
      setSourceElement(null)
    }
  }, [])

  const handleSourceUpload = useCallback((file) => {
    const img = new Image()
    img.onload = () => {
      setSourceType('image')
      setSourceElement(img)
    }
    img.src = URL.createObjectURL(file)
  }, [])

  const handleNew = useCallback(() => {
    setCode(DEFAULT_SHADER)
    setIsfMetadata(null)
    setUniformValues({})
    setCcMapping({})
    setFxChain([])
    setError(null)
    setFileName('untitled.fs')
    setStkfxName('')
  }, [])

  const handleOpen = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.fs,.frag,.glsl,.vert,.txt'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        setCode(ev.target.result)
        setFileName(file.name)
        setError(null)
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }, [code, fileName])

  const handleLoadFromLibrary = useCallback(() => {
    setShowLibrary(true)
  }, [])

  const handleLibrarySelect = useCallback((source, name) => {
    setCode(source)
    setFileName(name)
    setShowLibrary(false)
    setError(null)
  }, [])

  const handleSaveStkfx = useCallback(() => {
    const data = {
      version: 1,
      shader: fileName,
      fxChain: fxChain || [],
      ccLabels: [],
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = stkfxName || fileName.replace(/\.\w+$/, '.stkfx')
    a.click()
    URL.revokeObjectURL(url)
  }, [fileName, fxChain, stkfxName])

  const handleLoadStkfx = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.stkfx,.json'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result)
          if (data.fxChain) setFxChain(data.fxChain)
          if (data.shader) setStkfxName(file.name)
        } catch (err) {
          setError('Failed to parse .stkfx file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  const handleSynthReady = useCallback((synth) => {
    synthRef.current = synth
  }, [])

  const handleConsoleConfigChange = useCallback((newConfig) => {
    setConsoleConfig(newConfig)
    localStorage.setItem('consoleConfig', JSON.stringify(newConfig))
  }, [])

  const handleSendToConsole = useCallback(() => {
    const payload = JSON.stringify({
      type: 'shader',
      code,
      cc: ccValues,
      uniforms: uniformValues,
      triggers,
    })

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload)
      return
    }

    const ws = new WebSocket(`ws://${consoleConfig.host}:${consoleConfig.port}`)
    ws.onopen = () => {
      setConsoleConnected(true)
      ws.send(payload)
    }
    ws.onclose = () => {
      setConsoleConnected(false)
      wsRef.current = null
    }
    ws.onerror = () => {
      setConsoleConnected(false)
      wsRef.current = null
    }
    wsRef.current = ws
  }, [code, ccValues, uniformValues, triggers, consoleConfig])

  const allUniformValues = { ...uniformValues, ...ccValues }

  const appliedUniformValues = { ...ccValues }
  for (const [inputName, channel] of Object.entries(ccMapping)) {
    if (channel && ccValues[`u_${channel}`] !== undefined) {
      const input = isfMetadata?.inputs?.find(i => i.NAME === inputName)
      if (input) {
        const ccVal = ccValues[`u_${channel}`]
        const min = input.MIN ?? 0
        const max = input.MAX ?? 1
        appliedUniformValues[inputName] = min + ccVal * (max - min)
      }
    }
  }
  for (const [name, val] of Object.entries(uniformValues)) {
    if (!ccMapping[name] && !name.startsWith('u_cc')) {
      appliedUniformValues[name] = val
    }
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <Toolbar
          fileName={fileName}
          consoleConnected={consoleConnected}
          libraryFiles={libraryFiles}
          onNew={handleNew}
          onOpen={handleOpen}
          onDownload={handleDownload}
          onLoadFromLibrary={handleLoadFromLibrary}
          onSendToConsole={handleSendToConsole}
          consoleConfig={consoleConfig}
          onConsoleConfigChange={handleConsoleConfigChange}
          sourceType={sourceType}
          onSourceChange={handleSourceChange}
          onSourceUpload={handleSourceUpload}
        />

        <div className="main">
          {/* Fullscreen Preview Background */}
          <div className="preview-bg">
            <Preview
              code={code}
              uniformValues={allUniformValues}
              fxChain={fxChain}
              onMetadata={handleMetadata}
              onError={handleError}
              sourceType={sourceType}
              sourceElement={sourceElement}
            />
          </div>

          {/* Left Panel - Editor */}
          <div
            className={`left-panel${leftOpen ? '' : ' collapsed'}`}
            style={{ background: `rgba(30, 30, 30, ${panelOpacity})` }}
          >
            <div className="editor-pane">
              <ShaderEditor value={code} onChange={setCode} />
              {error && <div className="error-bar">{error}</div>}
            </div>
          </div>

          {/* Right Panel - Controls */}
          <div
            className={`right-panel${rightOpen ? '' : ' collapsed'}`}
            style={{ background: `rgba(37, 37, 38, ${panelOpacity})` }}
          >
            <Controls
              metadata={isfMetadata}
              values={uniformValues}
              onChange={handleControlChange}
            />
            <CcPanel
              inputs={isfMetadata?.inputs}
              mapping={ccMapping}
              onMappingChange={handleCcMappingChange}
              values={ccValues}
              onValueChange={handleCcValueChange}
              fxChain={fxChain}
            />
            <FxPanel
              fxChain={fxChain}
              onFxChainChange={setFxChain}
              ccValues={ccValues}
              onSaveStkfx={handleSaveStkfx}
              onLoadStkfx={handleLoadStkfx}
            />
            <MidiPanel
              ccValues={ccValues}
              onCcChange={handleCcValueChange}
              triggers={triggers}
              onTrigger={handleTrigger}
              fxChain={fxChain}
            />
            <RandomGenPanel
              onTrigger={handleTrigger}
              noteMapping={{}}
            />
            <AudioPanel
              onSynthReady={handleSynthReady}
            />
          </div>

          {/* Toggle Buttons - always visible */}
          <button
            className={`panel-toggle panel-toggle--left${leftOpen ? ' at-edge' : ''}`}
            onClick={() => setLeftOpen(v => !v)}
            title={leftOpen ? 'Hide editor (Ctrl+B)' : 'Show editor (Ctrl+B)'}
          >
            {leftOpen ? '\u25C0' : '\u25B6'}
          </button>
          <button
            className={`panel-toggle panel-toggle--right${rightOpen ? ' at-edge' : ''}`}
            onClick={() => setRightOpen(v => !v)}
            title={rightOpen ? 'Hide controls (Ctrl+.)' : 'Show controls (Ctrl+.)'}
          >
            {rightOpen ? '\u25B6' : '\u25C0'}
          </button>

          {/* Opacity Slider */}
          <div className="opacity-control">
            <label title="Panel opacity">Op</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              value={panelOpacity}
              onChange={(e) => setPanelOpacity(parseFloat(e.target.value))}
            />
            <span>{Math.round(panelOpacity * 100)}%</span>
          </div>
        </div>

        {showLibrary && (
          <ISFLibrary
            files={libraryFiles}
            onSelect={handleLibrarySelect}
            onClose={() => setShowLibrary(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
