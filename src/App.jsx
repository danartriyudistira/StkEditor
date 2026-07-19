import { useState, useCallback, useEffect, useRef } from 'react'
import ShaderEditor from './components/Editor.jsx'
import Preview from './components/Preview.jsx'
import Controls from './components/Controls.jsx'
import CcPanel from './components/CcPanel.jsx'
import FxPanel from './components/FxPanel.jsx'
import MidiPanel from './components/MidiPanel.jsx'
import RandomGenPanel from './components/RandomGenPanel.jsx'
import AudioPanel from './components/AudioPanel.jsx'
import OscPanel from './components/OscPanel.jsx'
import Toolbar from './components/Toolbar.jsx'
import PerformanceOverlay from './components/PerformanceOverlay.jsx'
import ISFLibrary from './components/ISFLibrary.jsx'
import TabBar from './components/TabBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { exportStk, importStk } from './lib/stkArchive.js'
import { extractIsfMetadata, adaptIsfToFx, validateIsfForFx } from './fx/isfAdapter.js'
import { registerIsfEffect } from './fx/effects.js'
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
  const [projectName, setProjectName] = useState('untitled')
  const [tabs, setTabs] = useState([{ id: 1, name: 'untitled.fs', code: DEFAULT_SHADER, modified: false }])
  const [activeTabId, setActiveTabId] = useState(1)
  const nextTabIdRef = useRef(2)
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]
  const code = activeTab?.code || ''
  const fileName = activeTab?.name || 'untitled.fs'
  const [isfMetadata, setIsfMetadata] = useState(null)
  const [uniformValues, setUniformValues] = useState({})
  const [ccValues, setCcValues] = useState(defaultCcValues)
  const [ccMapping, setCcMapping] = useState({})
  const [fxChain, setFxChain] = useState([])
  const [error, setError] = useState(null)
  const [stkfxName, setStkfxName] = useState('')
  const [libraryFiles, setLibraryFiles] = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [showIsfLibraryForFx, setShowIsfLibraryForFx] = useState(false)
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
  const [performanceMode, setPerformanceMode] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showPerfBar, setShowPerfBar] = useState(false)
  const perfBarTimerRef = useRef(null)
  const savedPanelsRef = useRef({ left: true, right: true })
  const [pfRenderQuality, setPfRenderQuality] = useState('Full')
  const [pfFps, setPfFps] = useState(60)
  const [pfVolume, setPfVolume] = useState(50)
  const [pfBpm, setPfBpm] = useState(120)
  const [pfNoteDivider, setPfNoteDivider] = useState(2)
  const [pfPresetIndex, setPfPresetIndex] = useState(0)
  const [pfMidiLearnActive, setPfMidiLearnActive] = useState(false)
  const [pfMidiChannel, setPfMidiChannel] = useState(0)
  const [randomGenOn, setRandomGenOn] = useState(false)
  const randomGenRef = useRef(null)
  const wsRef = useRef(null)
  const webcamStreamRef = useRef(null)
  const synthRef = useRef(null)
  const midiOutputRef = useRef(null)
  const midiChannelRef = useRef(0)

  const handlePerformanceToggle = useCallback(() => {
    setPerformanceMode(prev => {
      const next = !prev
      if (next) {
        savedPanelsRef.current = { left: leftOpen, right: rightOpen }
        setShowOverlay(false)
        setLeftOpen(false)
        setRightOpen(false)
      } else {
        setShowOverlay(false)
        setLeftOpen(savedPanelsRef.current.left)
        setRightOpen(savedPanelsRef.current.right)
      }
      return next
    })
  }, [leftOpen, rightOpen])

  // Tab helpers
  const updateActiveTab = useCallback((updates) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t))
  }, [activeTabId])

  const handleNewTab = useCallback(() => {
    const id = nextTabIdRef.current++
    const newTab = { id, name: 'untitled.fs', code: DEFAULT_SHADER, modified: false }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(id)
  }, [])

  const handleCloseTab = useCallback((tabId) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)
      if (tabId === activeTabId) {
        const newIdx = Math.min(idx, next.length - 1)
        setActiveTabId(next[newIdx]?.id || next[0]?.id)
      }
      return next
    })
  }, [activeTabId])

  const handleSwitchTab = useCallback((tabId) => {
    setActiveTabId(tabId)
  }, [])

  const handleRename = useCallback((tabId, newName) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, name: newName } : t))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); setLeftOpen(v => !v) }
      if (e.ctrlKey && e.key === '.') { e.preventDefault(); setRightOpen(v => !v) }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleExportStk() }
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); handleImportStk() }

      if (performanceMode && !showOverlay) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setShowOverlay(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          handlePerformanceToggle()
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          const currentIdx = tabs.findIndex(t => t.id === activeTabId)
          if (currentIdx === -1) return
          const dir = e.key === 'ArrowRight' ? 1 : -1
          const nextIdx = (currentIdx + dir + tabs.length) % tabs.length
          setActiveTabId(tabs[nextIdx].id)
        }
      } else if (performanceMode && showOverlay) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setShowOverlay(false)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [performanceMode, showOverlay, handlePerformanceToggle, tabs, activeTabId])

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
    if (err === null || err === undefined) { setError(null) } else { setError(typeof err === 'string' ? err : err?.message || String(err)) }
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

    // Send MIDI output directly
    const output = midiOutputRef.current
    if (output) {
      const ch = midiChannelRef.current
      const sendToChannel = (channel) => {
        if (trigger.type === 'noteOn' && trigger.velocity > 0) {
          output.send([0x90 | channel, trigger.note, Math.round(trigger.velocity * 127)])
        } else if (trigger.type === 'noteOff') {
          output.send([0x80 | channel, trigger.note, 0])
        }
      }
      if (ch === -1) {
        for (let c = 0; c < 16; c++) sendToChannel(c)
      } else {
        sendToChannel(ch)
      }
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
    updateActiveTab({ code: DEFAULT_SHADER, name: 'untitled.fs', modified: false })
    setIsfMetadata(null)
    setUniformValues({})
    setCcMapping({})
    setFxChain([])
    setError(null)
    setStkfxName('')
  }, [updateActiveTab])

  const handleOpen = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.fs,.frag,.glsl,.vert,.txt'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        updateActiveTab({ code: ev.target.result, name: file.name, modified: false })
        setError(null)
      }
      reader.readAsText(file)
    }
    input.click()
  }, [updateActiveTab])

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }, [code, fileName])

  const handleSave = useCallback(() => {
    // Save .fs file - overwrite if already has content, else download
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'untitled.fs'
    a.click()
    URL.revokeObjectURL(url)
    updateActiveTab({ modified: false })
  }, [code, fileName, updateActiveTab])

  const handleLoadFromLibrary = useCallback(() => {
    setShowLibrary(true)
  }, [])

  const handleLibrarySelect = useCallback((source, name) => {
    updateActiveTab({ code: source, name: name, modified: false })
    setShowLibrary(false)
    setError(null)
  }, [updateActiveTab])

  const handleIsfSelectForFx = useCallback((source, name) => {
    const metadata = extractIsfMetadata(source)
    const validation = validateIsfForFx(metadata)
    if (!validation.valid) {
      setError(validation.reason)
      setShowIsfLibraryForFx(false)
      return
    }

    const id = 'isf_' + name.replace(/\.fs$/, '').replace(/[^a-zA-Z0-9]/g, '_')
    const label = name.replace(/\.fs$/, '')
    const category = 'ISF'

    const { shader, params, warnings } = adaptIsfToFx(source, metadata)

    const effectDef = {
      id, label, category,
      isIsf: true,
      source,
      params,
      shader,
    }

    registerIsfEffect(id, effectDef)
    

    // Auto-add to chain
    const usedCc = new Set((fxChain || []).map(fx => fx.cc))
    const ccChannels = [1, 2, 3, 4, 5, 6, 7, 8]
    const freeCc = ccChannels.find(cc => !usedCc.has(cc)) || 1

    const newFx = {
      id,
      label,
      cc: freeCc,
      enabled: true,
      isIsf: true,
      isfSource: source,
      category,
      paramValues: Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, v.default ?? 0])
      ),
      paramCc: {},
      toggleCc: null,
    }
    setFxChain(prev => [...(prev || []), newFx])

    setShowIsfLibraryForFx(false)
    setError(null)
  }, [fxChain])

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

  const handleSavePreset = useCallback(() => {
    const preset = {
      version: 1,
      shader: { code, fileName },
      cc: ccValues,
      ccMapping,
      fxChain: fxChain || [],
      audio: {
        presetIndex: synthRef.current?.presetIndex || 0,
      },
      midi: {
        ccMapping: {},
      },
      console: consoleConfig,
    }
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.replace(/\\.[\\w]+$/, '.stk') || 'preset.stk'
    a.click()
    URL.revokeObjectURL(url)
  }, [code, fileName, ccValues, ccMapping, fxChain, consoleConfig])

  const handleLoadPreset = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.stk,.stkfx,.json'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result)
          // Full preset (.stk)
          if (data.version === 1) {
            if (data.shader?.code) setCode(data.shader.code)
            if (data.shader?.fileName) setFileName(data.shader.fileName)
            if (data.cc) setCcValues(prev => ({ ...prev, ...data.cc }))
            if (data.ccMapping) setCcMapping(data.ccMapping)
            if (data.fxChain) setFxChain(data.fxChain)
            if (data.console) {
              setConsoleConfig(data.console)
              localStorage.setItem('consoleConfig', JSON.stringify(data.console))
            }
            if (data.audio?.presetIndex !== undefined) {
              synthRef.current?.setPreset(data.audio.presetIndex)
            }
          }
          // Legacy stkfx (.stkfx)
          else {
            if (data.fxChain) setFxChain(data.fxChain)
          }
          setFileName(file.name.replace(/\\.[\\w]+$/, '.fs'))
          setError(null)
        } catch (err) {
          setError('Failed to parse preset file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  const handleExportStk = useCallback(async () => {
    try {
      const blob = await exportStk({
        projectName,
        tabs,
        fxChain: fxChain || [],
        ccValues,
        ccMapping,
        console: consoleConfig,
        audio: { presetIndex: synthRef.current?.presetIndex || 0 },
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (projectName || 'untitled') + '.stk'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('Failed to export: ' + e.message)
    }
  }, [projectName, tabs, ccValues, ccMapping, fxChain, consoleConfig])

  const handleImportStk = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.stk,.zip'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const project = await importStk(file)
        setProjectName(project.projectName)
        setTabs(project.tabs.length > 0 ? project.tabs : [{ id: 1, name: 'untitled.fs', code: DEFAULT_SHADER, modified: false }])
        if (project.ccValues) setCcValues(prev => ({ ...prev, ...project.ccValues }))
        if (project.ccMapping) setCcMapping(project.ccMapping)
        if (project.fxChain) setFxChain(project.fxChain)
        if (project.console) {
          setConsoleConfig(project.console)
          localStorage.setItem('consoleConfig', JSON.stringify(project.console))
        }
        if (project.audio?.presetIndex !== undefined) {
          synthRef.current?.setPreset(project.audio.presetIndex)
        }
        setError(null)
      } catch (err) {
        setError('Failed to import: ' + err.message)
      }
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

  const handleOverlayClose = useCallback(() => {
    setShowOverlay(false)
  }, [])

  const handlePerfBarEnter = useCallback(() => {
    if (perfBarTimerRef.current) clearTimeout(perfBarTimerRef.current)
    setShowPerfBar(true)
  }, [])

  const handlePerfBarLeave = useCallback(() => {
    perfBarTimerRef.current = setTimeout(() => setShowPerfBar(false), 800)
  }, [])

  const handleOverlaySwitchTab = useCallback((tabId) => {
    setActiveTabId(tabId)
  }, [])

  const handleOverlayPresetChange = useCallback((idx) => {
    setPfPresetIndex(idx)
    synthRef.current?.setPreset(idx)
  }, [])

  const handleOverlayToggleRandomGen = useCallback(() => {
    randomGenRef.current?.()
  }, [])

  const handleOverlayVolumeChange = useCallback((val) => {
    setPfVolume(val)
    if (synthRef.current?.masterGain) {
      synthRef.current.masterGain.gain.value = val / 100
    }
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
      <div className={`app${performanceMode ? ' performance-mode' : ''}`}>
        {performanceMode ? (
          <div
            className={`perf-bar ${showPerfBar ? 'visible' : ''}`}
            onMouseEnter={handlePerfBarEnter}
            onMouseLeave={handlePerfBarLeave}
          >
            <button className="toolbar-btn performance-active" onClick={handlePerformanceToggle}>
              Exit Perf
            </button>
          </div>
        ) : (
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
          onImportStk={handleImportStk}
          onExportStk={handleExportStk}
          sourceType={sourceType}
          onSourceChange={handleSourceChange}
          onSourceUpload={handleSourceUpload}
          performanceMode={performanceMode}
          onPerformanceToggle={handlePerformanceToggle}
        />
        )}

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
          {!performanceMode && (
          <div
            className={`left-panel${leftOpen ? '' : ' collapsed'}`}
            style={{ background: `rgba(30, 30, 30, ${panelOpacity})` }}
          >
            <div className="editor-pane">
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSwitch={handleSwitchTab}
                onClose={handleCloseTab}
                onNew={handleNewTab}
                onOpen={handleOpen}
                onExport={handleExportStk}
                onDownload={handleDownload}
                onRename={handleRename}
                onLoadFromLibrary={handleLoadFromLibrary}
                libraryFiles={libraryFiles}
              />
              <ShaderEditor value={code} onChange={(v) => updateActiveTab({ code: v, modified: true })} />
              {error && <div className="error-bar">{error}</div>}
            </div>
          </div>
          )}

          {/* Right Panel - Controls */}
          <div
            className={`right-panel${rightOpen ? '' : ' collapsed'}${performanceMode ? ' perf-hidden' : ''}`}
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
              onExportStk={handleExportStk}
              onImportStk={handleImportStk}
              onLoadIsf={() => setShowIsfLibraryForFx(true)}
            />
            <MidiPanel
              ccValues={ccValues}
              onCcChange={handleCcValueChange}
              triggers={triggers}
              onTrigger={handleTrigger}
              fxChain={fxChain}
              midiOutputRef={midiOutputRef}
              midiChannelRef={midiChannelRef}
            />
            <RandomGenPanel
              onTrigger={handleTrigger}
              noteMapping={{}}
              onToggleRef={randomGenRef}
              onChange={setRandomGenOn}
            />
            <AudioPanel
              onSynthReady={handleSynthReady}
            />
            <OscPanel
              onCcChange={handleCcValueChange}
            />
          </div>

          {/* Toggle Buttons - always visible */}
          {!performanceMode && (
          <>
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
          </>
          )}
        </div>

        {showLibrary && (
          <ISFLibrary
            files={libraryFiles}
            onSelect={handleLibrarySelect}
            onClose={() => setShowLibrary(false)}
          />
        )}

        {showIsfLibraryForFx && (
          <ISFLibrary
            files={libraryFiles}
            onSelect={handleIsfSelectForFx}
            onClose={() => setShowIsfLibraryForFx(false)}
          />
        )}
        <PerformanceOverlay
          visible={performanceMode && showOverlay}
          onClose={handleOverlayClose}
          tabs={tabs}
          activeTabId={activeTabId}
          onSwitchTab={handleOverlaySwitchTab}
          ccValues={ccValues}
          onCcChange={handleCcValueChange}
          randomGenOn={randomGenOn}
          onToggleRandomGen={handleOverlayToggleRandomGen}
          midiDeviceName={null}
          midiConnected={false}
          midiChannel={pfMidiChannel}
          onMidiChannelChange={setPfMidiChannel}
          presetIndex={pfPresetIndex}
          onPresetChange={handleOverlayPresetChange}
          volume={pfVolume}
          onVolumeChange={handleOverlayVolumeChange}
          bpm={pfBpm}
          onBpmChange={setPfBpm}
          noteDivider={pfNoteDivider}
          onNoteDividerChange={setPfNoteDivider}
          isfMetadata={isfMetadata}
          isfValues={uniformValues}
          onIsfValueChange={handleControlChange}
          renderQuality={pfRenderQuality}
          onRenderQualityChange={setPfRenderQuality}
          fps={pfFps}
          onFpsChange={setPfFps}
          midiLearnActive={pfMidiLearnActive}
          onToggleMidiLearn={() => setPfMidiLearnActive(v => !v)}
          onImport={handleImportStk}
        />
      </div>
    </ErrorBoundary>
  )
}





