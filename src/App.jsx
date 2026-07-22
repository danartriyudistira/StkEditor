import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
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
const ISFLibrary = lazy(() => import('./components/ISFLibrary.jsx'))
import TabBar from './components/TabBar.jsx'
import SourcePopup from './components/SourcePopup.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Slider from './components/Slider.jsx'
import ModuleMenu from './components/ModuleMenu.jsx'
import ShaderMatrix from './components/ShaderMatrix.jsx'
import FloatingPanel from './components/FloatingPanel.jsx'
import TempoPanel from './components/TempoPanel.jsx'
import { exportStk, importStk } from './lib/stkArchive.js'
import { DEFAULT_CONFIG } from './utils/animation.js'
import { extractIsfMetadata, adaptIsfToFx, validateIsfForFx } from './fx/isfAdapter.js'
import { registerIsfEffect } from './fx/effects.js'
import HydraEditor from './components/HydraEditor.jsx'
const HydraLibrary = lazy(() => import('./components/HydraLibrary.jsx'))
import { DEFAULT_HYDRA_CODE, getRandomExample } from './data/hydraExamples.js'
import { MODULE_CATEGORIES } from './data/moduleRegistry.js'
import { mutateCode } from './utils/hydraMutator.js'
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

const VJ_POSITIONS = {
  matrix: { x: 20, y: 50 },
  shaderParams: { x: 320, y: 50 },
  ccSliders: { x: 620, y: 50 },
  tempo: { x: 20, y: 360 },
  fxSliders: { x: 620, y: 360 },
}

export default function App() {
  const [projectName, setProjectName] = useState('untitled')
  const [tabs, setTabs] = useState([{ id: 1, name: 'untitled.js', code: DEFAULT_HYDRA_CODE, type: 'hydra', modified: false }])
  const [activeTabId, setActiveTabId] = useState(1)
  const nextTabIdRef = useRef(2)
  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  )
  const code = activeTab?.code || ''
  const fileName = activeTab?.name || 'untitled.fs'
  const engineMode = activeTab?.type || 'isf'
  const codeRef = useRef(code)
  codeRef.current = code
  const [isfMetadata, setIsfMetadata] = useState(null)
  const [uniformValues, setUniformValues] = useState({})
  const [ccValues, setCcValues] = useState(defaultCcValues)
  const [ccMapping, setCcMapping] = useState({})
  const [paramAnimation, setParamAnimation] = useState({})
  const [parameterConfig, setParameterConfig] = useState({})
  const [bpm, setBpm] = useState(120)
  const [resetBeatKey, setResetBeatKey] = useState(0)
  const [fxChain, setFxChain] = useState([])
  const [glitchParamConfig, setGlitchParamConfig] = useState({})
  const [error, setError] = useState(null)
  const [stkfxName, setStkfxName] = useState('')
  const [libraryFiles, setLibraryFiles] = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [showIsfLibraryForFx, setShowIsfLibraryForFx] = useState(false)
  const [showHydraLibrary, setShowHydraLibrary] = useState(false)
  const [showSourcePopup, setShowSourcePopup] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [moduleMenu, setModuleMenu] = useState(null)
  const editorRef = useRef(null)
  const [hydraParams, setHydraParams] = useState({})
  const hydraParamIdRef = useRef(0)

  const parseHydraParamsFromCode = useCallback((code) => {
    const re = /^\s*(\w+)\s*=\s*([\d.]+)\s*(?:\/\/\s*min:\s*([\d.-]+)\s*max:\s*([\d.-]+)\s*(?:default:\s*([\d.-]+))?)?/gm
    const found = {}
    let match
    while ((match = re.exec(code)) !== null) {
      const name = match[1]
      const val = parseFloat(match[2])
      const min = match[3] !== undefined ? parseFloat(match[3]) : 0
      const max = match[4] !== undefined ? parseFloat(match[4]) : 1
      const def = match[5] !== undefined ? parseFloat(match[5]) : val
      found[name] = { value: val, min, max, default: def }
    }
    return found
  }, [])

  useEffect(() => {
    if (engineMode !== 'hydra') return
    const found = parseHydraParamsFromCode(code)
    setHydraParams(prev => {
      const next = { ...prev }
      let changed = false
      for (const [name, p] of Object.entries(found)) {
        if (!next[name]) {
          next[name] = p
          changed = true
        } else {
          const cur = next[name]
          if (cur.min !== p.min || cur.max !== p.max || cur.default !== p.default) {
            next[name] = { ...cur, min: p.min, max: p.max, default: p.default }
            changed = true
          }
        }
      }
      for (const name of Object.keys(next)) {
        if (!found[name]) {
          delete next[name]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [code, engineMode, parseHydraParamsFromCode])
  const [consoleConnected, setConsoleConnected] = useState(false)
  const [consoleConfig, setConsoleConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('consoleConfig')) || { host: 'localhost', port: 8765 } } catch { return { host: 'localhost', port: 8765 } }
  })
  const [triggers, setTriggers] = useState([])
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [leftPanelWidth, setLeftPanelWidth] = useState(45)
  const [rightPanelWidth, setRightPanelWidth] = useState(350)
  const leftPanelWidthRef = useRef(45)
  const rightPanelWidthRef = useRef(350)
  leftPanelWidthRef.current = leftPanelWidth
  rightPanelWidthRef.current = rightPanelWidth

  const [panelOpacity, setPanelOpacity] = useState(0.92)
  const [sourceType, setSourceType] = useState('placeholder')
  const [sourceElement, setSourceElement] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])
  const [performanceMode, setPerformanceMode] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showPerfBar, setShowPerfBar] = useState(false)
  const perfBarTimerRef = useRef(null)
  const savedPanelsRef = useRef({ left: true, right: true })
  const [vjMode, setVjMode] = useState(false)
  const [vjMidiLearn, setVjMidiLearn] = useState(false)
  const [shaderKeyMap, setShaderKeyMap] = useState({})
  const vjMatrixRef = useRef(null)
  const kbdRef = useRef({ tabs, activeTabId, shaderKeyMap, vjMode, performanceMode, showOverlay })
  kbdRef.current = { tabs, activeTabId, shaderKeyMap, vjMode, performanceMode, showOverlay }
  const triggerRef = useRef({ tabs, shaderKeyMap, vjMode, paramAnimation, hydraParams, isfMetadata })
  triggerRef.current = { tabs, shaderKeyMap, vjMode, paramAnimation, hydraParams, isfMetadata }
  const handlerRef = useRef({})
  const [pfRenderQuality, setPfRenderQuality] = useState('Full')
  const [pfFps, setPfFps] = useState(60)
  const [pfVolume, setPfVolume] = useState(50)

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
  const noteTriggerRef = useRef({ triggerNote: () => {} })

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      clearTimeout(window._glitchDebounce)
    }
  }, [])
  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const handlePerformanceToggle = useCallback(() => {
    setPerformanceMode(prev => !prev)
  }, [])

  useEffect(() => {
    if (performanceMode) {
      setVjMode(false)
      savedPanelsRef.current = { left: leftOpen, right: rightOpen }
      setShowOverlay(false)
      setLeftOpen(false)
      setRightOpen(false)
    } else {
      setShowOverlay(false)
      setLeftOpen(savedPanelsRef.current.left)
      setRightOpen(savedPanelsRef.current.right)
    }
  }, [performanceMode])

  // Tab helpers
  const updateActiveTab = useCallback((updates) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t))
  }, [activeTabId])

  const moduleDecorationsRef = useRef([])

  const handleModuleSelect = useCallback((module) => {
    setModuleMenu(null)
    if (module.type === 'insert') {
      const ed = editorRef.current
      if (ed) {
        const snippet = (module.snippet || '') + '\n'
        const sel = ed.getSelection()
        ed.executeEdits('module-insert', [{ range: sel, text: snippet }])
        const lineCount = snippet.split('\n').length - 1
        const newLine = sel.startLineNumber + lineCount
        ed.setPosition({ lineNumber: newLine, column: 1 })
        ed.focus()
        updateActiveTab({ modified: true })

        // Add colored line decoration to highlight inserted range
        const catColor = MODULE_CATEGORIES.find(c => c.id === module.category)?.color || '#888'
        moduleDecorationsRef.current = ed.deltaDecorations(moduleDecorationsRef.current, [
          {
            range: {
              startLineNumber: sel.startLineNumber,
              startColumn: 1,
              endLineNumber: sel.startLineNumber + lineCount,
              endColumn: 1
            },
            options: {
              isWholeLine: true,
              linesDecorationsClassName: 'module-line-decoration',
              stickiness: 1,
            }
          }
        ])

        // Apply color to decoration via CSS variable on editor container
        const container = ed.getContainerDomNode()
        if (container) {
          container.style.setProperty('--module-color', catColor)
        }
      }
    } else if (module.type === 'fx') {
      setFxChain(prev => {
        const params = {}
        for (const [k, v] of Object.entries(module.params || {})) {
          params[k] = v.default ?? 0
        }
        return [...prev, { id: module.id, label: module.name, enabled: true, paramValues: params, paramCc: {}, paramConfig: {} }]
      })
    }
  }, [updateActiveTab])

  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  const handleCreateSlider = useCallback((word) => {
    setModuleMenu(null)
    const ed = editorRef.current
    if (!ed || !word) return
    const id = hydraParamIdRef.current++
    const name = `__p${id}`
    const defaultValue = Number(word.text)
    const wrap = `() => ${name}`
    ed.executeEdits('create-slider', [
      { range: { startLineNumber: word.lineNumber, startColumn: word.startColumn, endLineNumber: word.lineNumber, endColumn: word.endColumn }, text: wrap }
    ])
    const min = defaultValue <= 0 ? defaultValue * 2 : 0
    const max = defaultValue > 0 ? defaultValue * 2 : Math.max(1, defaultValue * 2)
    const decl = `${name} = ${defaultValue}  // min:${min} max:${max} default:${defaultValue}\n`
    setHydraParams(prev => ({
      ...prev,
      [name]: { value: defaultValue, min, max, default: defaultValue }
    }))
    ed.executeEdits('create-slider-decl', [
      { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: decl }
    ])
    const newCol = word.startColumn + wrap.length
    ed.setPosition({ lineNumber: word.lineNumber, column: newCol })
    ed.focus()
    updateActiveTab({ modified: true })
  }, [updateActiveTab])

  const glitchPrevRef = useRef({})
  const glitchDragRef = useRef(false)
  const glitchParamRef = useRef(glitchParamConfig)
  glitchParamRef.current = glitchParamConfig
  const paramAnimationRef = useRef(paramAnimation)
  paramAnimationRef.current = paramAnimation
  const isfMetadataRef = useRef(isfMetadata)
  isfMetadataRef.current = isfMetadata
  const hydraParamsRef = useRef(hydraParams)
  hydraParamsRef.current = hydraParams

  const handleAnimGlitch = useCallback((name, value) => {
    const cfg = glitchParamRef.current[name]
    if (!cfg?.enabled) return
    const synth = synthRef.current
    if (!synth) return
    if (cfg.mode === 'trigger') {
      const prevVal = glitchPrevRef.current[name]
      if (prevVal !== undefined) {
        const delta = Math.abs(value - prevVal)
        if (delta > cfg.sensitivity) {
          synth.playGlitchTrigger(cfg.type, delta / (cfg.sensitivity * 4))
        }
      }
      glitchPrevRef.current[name] = value
    } else if (cfg.mode === 'frequency') {
      if (glitchDragRef.current) {
        synth.updateGlitchContinuous(value)
      } else {
        glitchDragRef.current = true
        synth.startGlitchContinuous(value, cfg)
      }
      clearTimeout(window._glitchDebounce)
      window._glitchDebounce = setTimeout(() => {
        glitchDragRef.current = false
        synth.scheduleStopGlitch(200)
      }, 250)
    }
  }, [])

  const handleGlitchConfigChange = useCallback((name, config) => {
    setGlitchParamConfig(prev => ({
      ...prev,
      [name]: { enabled: false, mode: 'trigger', type: 'click', sensitivity: 0.15, volume: 0.5, cutoff: 4000, emphasis: 5, contour: 0, soundType: 'noise', modCutoff: true, modEmphasis: false, modContour: false, ...config }
    }))
  }, [])

  const handleHydraParamChange = useCallback((name, value) => {
    const cfg = glitchParamRef.current[name]
    if (cfg?.enabled) {
      const synth = synthRef.current
      if (synth) {
        if (cfg.mode === 'trigger') {
          const prevVal = glitchPrevRef.current[name]
          if (prevVal !== undefined) {
            const delta = Math.abs(value - prevVal)
            if (delta > cfg.sensitivity) {
              synth.playGlitchTrigger(cfg.type, delta / (cfg.sensitivity * 4))
            }
          }
          glitchPrevRef.current[name] = value
        } else if (cfg.mode === 'frequency') {
          if (glitchDragRef.current) {
            synth.updateGlitchContinuous(value)
          } else {
            glitchDragRef.current = true
            synth.startGlitchContinuous(value, cfg)
          }
          clearTimeout(window._glitchDebounce)
          window._glitchDebounce = setTimeout(() => {
            glitchDragRef.current = false
            synth.scheduleStopGlitch(200)
          }, 250)
        }
      }
    }
    setHydraParams(prev => {
      const p = prev[name]
      if (!p) return prev
      return { ...prev, [name]: { ...p, value } }
    })
    const pAnim = paramAnimationRef.current
    const hp = hydraParamsRef.current
    const srcP = hp?.[name]
    const srcMin = srcP?.min ?? 0
    const srcMax = srcP?.max ?? 1
    const srcRange = Math.max(0.001, srcMax - srcMin)
    const normVal = (value - srcMin) / srcRange
    const linked = {}
    for (const [pName, pCfg] of Object.entries(pAnim)) {
      if (pCfg.mode === 'link' && (pCfg.links || []).includes(name)) {
        const dstMin = pCfg.min ?? 0
        const dstMax = pCfg.max ?? 1
        linked[pName] = dstMin + normVal * (dstMax - dstMin)
      }
    }
    if (Object.keys(linked).length > 0) {
      setHydraParams(prev => {
        const next = { ...prev }
        for (const [ln, lv] of Object.entries(linked)) {
          const lp = next[ln]
          if (lp) next[ln] = { ...lp, value: lv }
        }
        return next
      })
    }
  }, [])

  const hydraValues = useMemo(() => {
    const out = {}
    for (const [name, p] of Object.entries(hydraParams)) {
      out[name] = p.value
    }
    return out
  }, [hydraParams])

  const handleEditorContext = useCallback((e) => {
    e.preventDefault()
    let word = null
    const ed = editorRef.current
    if (ed) {
      const pos = ed.getPosition()
      const model = ed.getModel()
      if (pos && model) {
        const w = model.getWordAtPosition(pos)
        if (w && !isNaN(Number(w.word))) {
          word = { text: w.word, startColumn: w.startColumn, endColumn: w.endColumn, lineNumber: pos.lineNumber }
        }
      }
    }
    setModuleMenu({ x: e.clientX, y: e.clientY, word })
  }, [])

  const handleNewTab = useCallback((type) => {
    const tabType = type || 'isf'
    const id = nextTabIdRef.current++
    const newTab = tabType === 'hydra'
      ? { id, name: 'untitled.js', code: DEFAULT_HYDRA_CODE, type: 'hydra', modified: false }
      : { id, name: 'untitled.fs', code: DEFAULT_SHADER, type: 'isf', modified: false }
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

  const handleSwitchTabType = useCallback((type) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t
      if (t.type === type) return t
      const newCode = type === 'hydra' ? DEFAULT_HYDRA_CODE : DEFAULT_SHADER
      return { ...t, type, code: newCode, name: type === 'hydra' ? 'untitled.js' : 'untitled.fs' }
    }))
  }, [activeTabId])

  const handleHydraLibrarySelect = useCallback((code, name) => {
    updateActiveTab({ code, name, modified: false })
    setShowHydraLibrary(false)
    setError(null)
  }, [updateActiveTab])

  const handleHydraRandom = useCallback(() => {
    const example = getRandomExample()
    updateActiveTab({ code: example.code, name: example.name, modified: false })
  }, [updateActiveTab])

  const handleHydraMutate = useCallback(() => {
    const currentCode = codeRef.current || ''
    const mutated = mutateCode(currentCode, 0.3)
    updateActiveTab({ code: mutated, modified: true })
  }, [updateActiveTab])

  useEffect(() => {
    const handler = (e) => {
      const k = kbdRef.current
      const h = handlerRef.current
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); setLeftOpen(v => !v) }
      if (e.ctrlKey && e.key === '.') { e.preventDefault(); setRightOpen(v => !v) }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); h.handleExportStk?.() }
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); h.handleImportStk?.() }
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); h.handleRefresh?.() }

      if (k.vjMode) {
        const key = e.key.toLowerCase()
        const mappedId = k.shaderKeyMap?.['key_' + key]
        if (mappedId && k.tabs.find(t => t.id === mappedId)) {
          e.preventDefault()
          setActiveTabId(mappedId)
          return
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          const currentIdx = k.tabs.findIndex(t => t.id === k.activeTabId)
          if (currentIdx === -1) return
          const dir = e.key === 'ArrowRight' ? 1 : -1
          const nextIdx = (currentIdx + dir + k.tabs.length) % k.tabs.length
          setActiveTabId(k.tabs[nextIdx].id)
        }
      }

      if (k.performanceMode && !k.showOverlay) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setShowOverlay(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          h.handlePerformanceToggle?.()
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          const currentIdx = k.tabs.findIndex(t => t.id === k.activeTabId)
          if (currentIdx === -1) return
          const dir = e.key === 'ArrowRight' ? 1 : -1
          const nextIdx = (currentIdx + dir + k.tabs.length) % k.tabs.length
          setActiveTabId(k.tabs[nextIdx].id)
        }
      } else if (k.performanceMode && k.showOverlay) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setShowOverlay(false)
        }
      }
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
    const cfg = glitchParamRef.current[name]
    if (cfg?.enabled) {
      const synth = synthRef.current
      if (synth) {
        if (cfg.mode === 'trigger') {
          const prevVal = glitchPrevRef.current[name]
          if (prevVal !== undefined) {
            const delta = Math.abs(value - prevVal)
            if (delta > cfg.sensitivity) {
              synth.playGlitchTrigger(cfg.type, delta / (cfg.sensitivity * 4))
            }
          }
          glitchPrevRef.current[name] = value
        } else if (cfg.mode === 'frequency') {
          if (glitchDragRef.current) {
            synth.updateGlitchContinuous(value)
          } else {
            glitchDragRef.current = true
            synth.startGlitchContinuous(value, cfg)
          }
          clearTimeout(window._glitchDebounce)
          window._glitchDebounce = setTimeout(() => {
            glitchDragRef.current = false
            synth.scheduleStopGlitch(200)
          }, 250)
        }
      }
    }
    setUniformValues(prev => ({ ...prev, [name]: value }))
    const pAnim = paramAnimationRef.current
    const meta = isfMetadataRef.current
    const findInput = (n) => meta?.inputs?.find(i => i.NAME === n)
    const srcInput = findInput(name)
    const srcMin = srcInput?.MIN ?? 0
    const srcMax = srcInput?.MAX ?? 1
    const srcRange = Math.max(0.001, srcMax - srcMin)
    const normVal = (value - srcMin) / srcRange
    const linked = {}
    for (const [pName, pCfg] of Object.entries(pAnim)) {
      if (pCfg.mode === 'link' && (pCfg.links || []).includes(name)) {
        const dstMin = pCfg.min ?? 0
        const dstMax = pCfg.max ?? 1
        linked[pName] = dstMin + normVal * (dstMax - dstMin)
      }
    }
    if (Object.keys(linked).length > 0) {
      setUniformValues(prev => ({ ...prev, ...linked }))
    }
  }, [])

  const handleCcValueChange = useCallback((name, value) => {
    setCcValues(prev => ({ ...prev, [name]: value }))
    const ccChannel = name.replace('u_cc', '')
    const mappedInputs = Object.entries(ccMapping)
      .filter(([_, ch]) => ch === `cc${ccChannel}`)
      .map(([inputName]) => inputName)
    const directMapped = Object.entries(parameterConfig)
      .filter(([_, cfg]) => cfg.cc === parseInt(ccChannel))
      .map(([paramName]) => paramName)
    const allMapped = [...new Set([...mappedInputs, ...directMapped])]
    if (allMapped.length > 0 && isfMetadata?.inputs) {
      setUniformValues(prev => {
        const next = { ...prev }
        for (const inputName of allMapped) {
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
  }, [ccMapping, parameterConfig, isfMetadata])

  const handleCcMappingChange = useCallback((inputName, channel) => {
    setCcMapping(prev => ({ ...prev, [inputName]: channel }))
  }, [])

  const handleParamAnimationChange = useCallback((paramName, config) => {
    setParamAnimation(prev => ({ ...prev, [paramName]: config }))
  }, [])

  const handleParameterConfigChange = useCallback((paramName, config) => {
    setParameterConfig(prev => ({ ...prev, [paramName]: config }))
  }, [])

  const handleParamOscChange = useCallback((paramName, oscAddr) => {
    setParameterConfig(prev => ({
      ...prev,
      [paramName]: { ...prev[paramName], oscAddr }
    }))
  }, [])

  const handleTrigger = useCallback((trigger) => {
    const t = triggerRef.current
    // VJ mode MIDI handling
    if (t.vjMode && trigger.type === 'noteOn' && trigger.velocity > 0) {
      const handled = vjMatrixRef.current?.handleMidiNote(trigger.note)
      if (!handled) {
        const mappedId = t.shaderKeyMap?.['midi_' + trigger.note]
        if (mappedId && t.tabs.find(tab => tab.id === mappedId)) {
          setActiveTabId(mappedId)
        }
      }
    }

    if (trigger.type === 'noteOn' && trigger.velocity > 0) {
      synthRef.current?.noteOn(trigger.note, Math.round(trigger.velocity * 127))
    } else if (trigger.type === 'noteOff') {
      synthRef.current?.noteOff(trigger.note)
    }
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
        return next.slice(-6)
      } else {
        return prev.filter(tr => tr.note !== trigger.note)
      }
    })
    if (trigger.effectId) {
      setFxChain(prev => prev.map(fx => {
        if (fx.id === trigger.effectId) {
          return { ...fx, enabled: trigger.type === 'noteOn' ? true : fx.enabled }
        }
        return fx
      }))
    }
    // Note Trigger
    if (trigger.type === 'noteOn' && trigger.velocity > 0) {
      for (const [paramName, anim] of Object.entries(t.paramAnimation || {})) {
        if (anim?.mode !== 'note') continue
        const nt = anim
        if (!nt.any && !Object.prototype.hasOwnProperty.call(nt.notes || {}, trigger.note)) continue
        const peakFraction = nt.useVelocity
          ? (nt.velocityMin ?? 0) + trigger.velocity * ((nt.velocityMax ?? 1) - (nt.velocityMin ?? 0))
          : (nt.notes?.[trigger.note] ?? nt.fixedValue ?? 1)
        const p = t.hydraParams?.[paramName]
        const input = t.isfMetadata?.inputs?.find(i => i.NAME === paramName)
        if (!p && !input) continue
        const paramMin = p ? p.min : (input.MIN ?? 0)
        const paramMax = p ? p.max : (input.MAX ?? 1)
        noteTriggerRef.current.triggerNote(paramName, peakFraction, paramMin, paramMax)
      }
    }
  }, [])

  const handleSourceSelectImage = useCallback((img) => {
    setSourceType('image')
    setSourceElement(img)
  }, [])

  function createColorbar() {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    const bars = ['#ffffff','#ffff00','#00ffff','#00ff00','#ff00ff','#ff0000','#0000ff','#000000']
    const w = canvas.width / bars.length
    bars.forEach((color, i) => {
      ctx.fillStyle = color
      ctx.fillRect(i * w, 0, w, canvas.height)
    })
    return canvas
  }

  const handleSourceChange = useCallback((type) => {
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
      setSourceElement(createColorbar())
    }
  }, [])

  const handleSourceUpload = useCallback((file) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setSourceType('image')
      setSourceElement(img)
      setUploadedImages(prev => {
        if (prev.some(i => i.name === file.name)) return prev
        return [...prev, { name: file.name, url, element: img }]
      })
    }
    img.src = url
  }, [])

  const handleNew = useCallback(() => {
    if (engineMode === 'hydra') {
      updateActiveTab({ code: DEFAULT_HYDRA_CODE, name: 'untitled.js', modified: false })
    } else {
      updateActiveTab({ code: DEFAULT_SHADER, name: 'untitled.fs', modified: false })
    }
    setIsfMetadata(null)
    setUniformValues({})
    setCcMapping({})
    setFxChain([])
    setError(null)
    setStkfxName('')
  }, [updateActiveTab, engineMode])

  const handleOpen = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.fs,.frag,.glsl,.vert,.txt,.js'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const ext = file.name.split('.').pop().toLowerCase()
        const type = (ext === 'js' || ext === 'txt') ? 'hydra' : 'isf'
        updateActiveTab({ code: ev.target.result, name: file.name, type, modified: false })
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

  const handleLoadFromLibrary = useCallback(() => {
    setShowLibrary(true)
  }, [])

  const handleLibrarySelect = useCallback((source, name) => {
    updateActiveTab({ code: source, name, modified: false })
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
    const { shader, params } = adaptIsfToFx(source, metadata)
    const effectDef = { id, label, category, isIsf: true, source, params, shader }
    registerIsfEffect(id, effectDef)
    const newFx = {
      id, label, enabled: true, isIsf: true, isfSource: source, category,
      paramValues: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v.default ?? 0])),
      paramCc: {}, toggleCc: null,
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

  const handleExportStk = useCallback(async () => {
    try {
      const blob = await exportStk({
        projectName,
        tabs: tabs.map(t => ({ ...t })),
        fxChain: fxChain || [],
        ccValues,
        ccMapping,
        paramAnimation,
        parameterConfig,
        bpm,
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
  }, [projectName, tabs, ccValues, ccMapping, paramAnimation, parameterConfig, bpm, fxChain, consoleConfig])

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
        const restoredTabs = (project.tabs || []).map(t => ({ ...t, id: Date.now() + Math.random(), modified: false }))
        setTabs(restoredTabs.length > 0 ? restoredTabs : [{ id: 1, name: 'untitled.fs', code: DEFAULT_SHADER, type: 'isf', modified: false }])
        if (restoredTabs.length > 0) {
          setActiveTabId(restoredTabs[0].id)
          nextTabIdRef.current = Math.max(...restoredTabs.map(t => t.id)) + 1
        }
        if (project.ccValues) setCcValues(prev => ({ ...prev, ...project.ccValues }))
        if (project.ccMapping) setCcMapping(project.ccMapping)
        if (project.paramAnimation) setParamAnimation(project.paramAnimation)
        if (project.parameterConfig) setParameterConfig(project.parameterConfig)
        if (project.bpm) setBpm(project.bpm)
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

  const handleOverlayClose = useCallback(() => { setShowOverlay(false) }, [])

  const handlePerfBarEnter = useCallback(() => {
    if (perfBarTimerRef.current) clearTimeout(perfBarTimerRef.current)
    setShowPerfBar(true)
  }, [])

  const handlePerfBarLeave = useCallback(() => {
    perfBarTimerRef.current = setTimeout(() => setShowPerfBar(false), 800)
  }, [])

  const handleOverlaySwitchTab = useCallback((tabId) => { setActiveTabId(tabId) }, [])

  const handleOverlayPresetChange = useCallback((idx) => {
    setPfPresetIndex(idx)
    synthRef.current?.setPreset(idx)
  }, [])

  const handleOverlayToggleRandomGen = useCallback(() => { randomGenRef.current?.() }, [])

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
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    const ws = new WebSocket(`ws://${consoleConfig.host}:${consoleConfig.port}`)
    ws.onopen = () => { setConsoleConnected(true); ws.send(payload) }
    ws.onclose = () => { setConsoleConnected(false) }
    ws.onerror = () => { setConsoleConnected(false) }
    wsRef.current = ws
  }, [code, ccValues, uniformValues, triggers, consoleConfig])

  const allUniformValues = useMemo(
    () => ({ ...uniformValues, ...ccValues }),
    [uniformValues, ccValues]
  )

  const handleLeftResizeStart = useCallback((e) => {
    e.preventDefault()
    const sx = e.clientX, sw = leftPanelWidthRef.current
    const parent = e.currentTarget.parentElement.parentElement
    const pw = parent.clientWidth
    const move = ev => setLeftPanelWidth(Math.max(20, Math.min(80, sw + ((ev.clientX - sx) / pw) * 100)))
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [])

  const handleLeftResizeTouch = useCallback((e) => {
    const t = e.touches[0]
    const sx = t.clientX, sw = leftPanelWidthRef.current
    const parent = e.currentTarget.parentElement.parentElement
    const pw = parent.clientWidth
    const move = ev => { ev.preventDefault(); setLeftPanelWidth(Math.max(20, Math.min(80, sw + ((ev.touches[0].clientX - sx) / pw) * 100))) }
    const up = () => { document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up) }
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('touchend', up)
  }, [])

  const handleRightResizeStart = useCallback((e) => {
    e.preventDefault()
    const sx = e.clientX, sw = rightPanelWidthRef.current
    const move = ev => setRightPanelWidth(Math.max(180, Math.min(800, sw - (ev.clientX - sx))))
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [])

  const handleRightResizeTouch = useCallback((e) => {
    const t = e.touches[0]
    const sx = t.clientX, sw = rightPanelWidthRef.current
    const move = ev => { ev.preventDefault(); setRightPanelWidth(Math.max(180, Math.min(800, sw - (ev.touches[0].clientX - sx)))) }
    const up = () => { document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up) }
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('touchend', up)
  }, [])

  handlerRef.current = { handleExportStk, handleImportStk, handleRefresh, handlePerformanceToggle }

  return (
    <ErrorBoundary>
      <div className={`app${performanceMode ? ' performance-mode' : ''}${vjMode ? ' vj-mode' : ''}`}>
        {vjMode ? (
          <div className="vj-topbar">
            <span className="vj-topbar-title">VJ Mode</span>
            <button
              className={`vj-topbar-btn vj-topbar-btn--midi${vjMidiLearn ? ' active' : ''}`}
              onClick={() => setVjMidiLearn(v => !v)}
            >
              {vjMidiLearn ? 'Learn ON' : 'MIDI Learn'}
            </button>
            <div className="vj-topbar-bpm">
              <span className="vj-topbar-label">BPM</span>
              <button className="vj-topbar-btn" onClick={() => setBpm(b => Math.max(40, b - 1))}>-</button>
              <span className="vj-topbar-value">{bpm}</span>
              <button className="vj-topbar-btn" onClick={() => setBpm(b => Math.min(240, b + 1))}>+</button>
            </div>
            <button className="vj-topbar-btn vj-topbar-btn--exit" onClick={() => setVjMode(false)}>
              Exit VJ
            </button>
          </div>
        ) : performanceMode ? (
          <div
            className={`perf-bar ${showPerfBar ? 'visible' : ''}`}
            onMouseEnter={handlePerfBarEnter}
            onMouseLeave={handlePerfBarLeave}
          >
            <button className="toolbar-btn performance-active" onClick={handlePerformanceToggle}>
              Exit TV
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
          performanceMode={performanceMode}
          onPerformanceToggle={handlePerformanceToggle}
          vjMode={vjMode}
          onVjToggle={() => { setVjMode(v => { if (!v) setPerformanceMode(false); return !v }) }}
        />
        )}

        <div className="main">
          <div className="preview-bg">
            <Preview
              key={refreshKey}
              code={code}
              uniformValues={allUniformValues}
              hydraParams={hydraValues}
              fxChain={fxChain}
              onMetadata={handleMetadata}
              onError={handleError}
              sourceType={sourceType}
              sourceElement={sourceElement}
              paramAnimation={paramAnimation}
              bpm={bpm}
              engineMode={engineMode}
              noteTriggerRef={noteTriggerRef}
            />
          </div>

          {!performanceMode && !vjMode && (
          <div
            className={`left-panel${leftOpen ? '' : ' collapsed'}`}
            style={{ width: `${leftPanelWidth}%`, background: `rgba(30, 30, 30, ${panelOpacity})` }}
          >
            <div
              className="panel-resize-handle panel-resize-handle--right"
              onMouseDown={handleLeftResizeStart}
              onTouchStart={handleLeftResizeTouch}
            />
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
                sourceType={sourceType}
                onSourceClick={() => setShowSourcePopup(true)}
                onGallery={() => setShowHydraLibrary(true)}
                onRandom={handleHydraRandom}
                onMutate={handleHydraMutate}
              />
              <div className="editor-context-wrapper" onContextMenu={handleEditorContext}>
                {activeTab?.type === 'hydra' ? (
                  <HydraEditor value={code} onChange={(v) => updateActiveTab({ code: v, modified: true })} onReady={handleEditorReady} />
                ) : (
                  <ShaderEditor value={code} onChange={(v) => updateActiveTab({ code: v, modified: true })} onReady={handleEditorReady} />
                )}
                {moduleMenu && (
                  <ModuleMenu
                    x={moduleMenu.x}
                    y={moduleMenu.y}
                    mode={engineMode}
                    word={moduleMenu.word}
                    onSelect={handleModuleSelect}
                    onCreateSlider={handleCreateSlider}
                    onClose={() => setModuleMenu(null)}
                  />
                )}
              </div>
              {error && <div className="error-bar">{error}</div>}
              <div className="editor-footer">
                <button
                  className={`engine-toggle ${activeTab?.type !== 'hydra' ? 'active' : ''}`}
                  onClick={() => handleSwitchTabType('isf')}
                  title="Switch to ISF mode"
                >ISF</button>
                <button
                  className={`engine-toggle ${activeTab?.type === 'hydra' ? 'active' : ''}`}
                  onClick={() => handleSwitchTabType('hydra')}
                  title="Switch to Hydra mode"
                >Hydra</button>
                <button className="editor-refresh" onClick={handleRefresh} title="Refresh shader">⟳</button>
              </div>
            </div>
          </div>
          )}

          {!vjMode && (
          <div
            className={`right-panel${rightOpen ? '' : ' collapsed'}${performanceMode ? ' perf-hidden' : ''}`}
            style={{ width: `${rightPanelWidth}px`, background: `rgba(37, 37, 38, ${panelOpacity})` }}
          >
            <div
              className="panel-resize-handle panel-resize-handle--left"
              onMouseDown={handleRightResizeStart}
              onTouchStart={handleRightResizeTouch}
            />

            <Controls
              metadata={isfMetadata}
              values={engineMode === 'hydra' ? hydraValues : uniformValues}
              onChange={engineMode === 'hydra' ? handleHydraParamChange : handleControlChange}
              paramAnimation={paramAnimation}
              onParamAnimationChange={handleParamAnimationChange}
              parameterConfig={parameterConfig}
              onParameterConfigChange={handleParameterConfigChange}
              onParamOscChange={handleParamOscChange}
              bpm={bpm}
              onBpmChange={setBpm}
              hydraParams={hydraParams}
              engineMode={engineMode}
              glitchParamConfig={glitchParamConfig}
              onGlitchConfigChange={handleGlitchConfigChange}
              onAnimGlitch={handleAnimGlitch}
              resetBeatKey={resetBeatKey}
              onResetBeat={() => setResetBeatKey(k => k + 1)}
            />

            <CcPanel
              inputs={isfMetadata?.inputs}
              mapping={ccMapping}
              parameterConfig={parameterConfig}
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
              onAnimGlitch={handleAnimGlitch}
              glitchParamConfig={glitchParamConfig}
              onGlitchConfigChange={handleGlitchConfigChange}
              bpm={bpm}
              resetBeatKey={resetBeatKey}
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
              bpm={bpm}
              onBpmChange={setBpm}
            />
            <AudioPanel
              onSynthReady={handleSynthReady}
            />
            <OscPanel
              onCcChange={handleCcValueChange}
              parameterConfig={parameterConfig}
              onOscMessage={(paramName, value) => {
                const input = isfMetadata?.inputs?.find(i => i.NAME === paramName)
                if (input) {
                  const min = input.MIN ?? 0
                  const max = input.MAX ?? 1
                  setUniformValues(prev => ({ ...prev, [paramName]: min + value * (max - min) }))
                } else if (hydraParams?.[paramName]) {
                  const p = hydraParams[paramName]
                  handleHydraParamChange(paramName, p.min + value * (p.max - p.min))
                }
              }}
            />
          </div>
          )}

          {!performanceMode && !vjMode && (
          <>
          <button
            className={`panel-toggle panel-toggle--left${leftOpen ? ' at-edge' : ''}`}
            style={leftOpen ? { left: `${leftPanelWidth}%` } : undefined}
            onClick={() => setLeftOpen(v => !v)}
            title={leftOpen ? 'Hide editor (Ctrl+B)' : 'Show editor (Ctrl+B)'}
          >
            {leftOpen ? '\u25C0' : '\u25B6'}
          </button>
          <button
            className={`panel-toggle panel-toggle--right${rightOpen ? ' at-edge' : ''}`}
            style={rightOpen ? { right: `${rightPanelWidth}px` } : undefined}
            onClick={() => setRightOpen(v => !v)}
            title={rightOpen ? 'Hide controls (Ctrl+.)' : 'Show controls (Ctrl+.)'}
          >
            {rightOpen ? '\u25B6' : '\u25C0'}
          </button>
          <div className="opacity-control">
            <label title="Panel opacity">Op</label>
            <Slider
              value={panelOpacity}
              min={0.1}
              max={1}
              step={0.01}
              onChange={setPanelOpacity}
            />
            <span>{Math.round(panelOpacity * 100)}%</span>
          </div>
          </>
          )}

        {vjMode && (
          <div className="vj-overlay">
            <FloatingPanel key="vj-matrix" title="Shader Matrix" defaultPos={VJ_POSITIONS.matrix}>
              <ShaderMatrix
                ref={vjMatrixRef}
                tabs={tabs}
                activeTabId={activeTabId}
                onSwitchTab={handleSwitchTab}
                shaderKeyMap={shaderKeyMap}
                onShaderKeyMapChange={setShaderKeyMap}
                midiLearnActive={vjMidiLearn}
                setMidiLearnActive={setVjMidiLearn}
              />
            </FloatingPanel>
            <FloatingPanel key="vj-shader" title="Shader Parameters" defaultPos={VJ_POSITIONS.shaderParams}>
              <Controls
                metadata={isfMetadata}
                values={engineMode === 'hydra' ? hydraValues : uniformValues}
                onChange={engineMode === 'hydra' ? handleHydraParamChange : handleControlChange}
                paramAnimation={paramAnimation}
                onParamAnimationChange={handleParamAnimationChange}
                parameterConfig={parameterConfig}
                onParameterConfigChange={handleParameterConfigChange}
                onParamOscChange={handleParamOscChange}
                bpm={bpm}
                onBpmChange={setBpm}
                hydraParams={hydraParams}
                engineMode={engineMode}
                glitchParamConfig={glitchParamConfig}
                onGlitchConfigChange={handleGlitchConfigChange}
                onAnimGlitch={handleAnimGlitch}
                resetBeatKey={resetBeatKey}
                onResetBeat={() => setResetBeatKey(k => k + 1)}
                hideTempo
              />
            </FloatingPanel>
            <FloatingPanel key="vj-cc" title="CC Sliders" defaultPos={VJ_POSITIONS.ccSliders}>
              <div className="vj-cc-section">
                {[1,2,3,4,5,6,7,8].map(ch => (
                  <div key={ch} className="vj-cc-row">
                    <label className="vj-cc-label">CC{ch}</label>
                    <Slider
                      value={ccValues?.[`u_cc${ch}`] ?? 0.5}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) => handleCcValueChange(`u_cc${ch}`, v)}
                    />
                    <span className="td-slider-control-value" style={{ color: '#4fc3f7' }}>
                      {(ccValues?.[`u_cc${ch}`] ?? 0.5).toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </FloatingPanel>
            <FloatingPanel key="vj-tempo" title="Tempo" defaultPos={VJ_POSITIONS.tempo}>
              <TempoPanel
                bpm={bpm}
                onBpmChange={setBpm}
                resetBeatKey={resetBeatKey}
                onResetBeat={() => setResetBeatKey(k => k + 1)}
              />
            </FloatingPanel>
            <FloatingPanel key="vj-fx" title="FX Sliders" defaultPos={VJ_POSITIONS.fxSliders}>
              <FxPanel
                fxChain={fxChain}
                onFxChainChange={setFxChain}
                ccValues={ccValues}
                onSaveStkfx={handleSaveStkfx}
                onLoadStkfx={handleLoadStkfx}
                onExportStk={handleExportStk}
                onImportStk={handleImportStk}
                onLoadIsf={() => setShowIsfLibraryForFx(true)}
                onAnimGlitch={handleAnimGlitch}
                glitchParamConfig={glitchParamConfig}
                onGlitchConfigChange={handleGlitchConfigChange}
                bpm={bpm}
                resetBeatKey={resetBeatKey}
              />
            </FloatingPanel>
          </div>
        )}
        </div>

        {showLibrary && (
          <Suspense fallback={<div className="loading" />}>
          <ISFLibrary
            files={libraryFiles}
            onSelect={handleLibrarySelect}
            onClose={() => setShowLibrary(false)}
          />
          </Suspense>
        )}
        {showIsfLibraryForFx && (
          <Suspense fallback={<div className="loading" />}>
          <ISFLibrary
            files={libraryFiles}
            onSelect={handleIsfSelectForFx}
            onClose={() => setShowIsfLibraryForFx(false)}
          />
          </Suspense>
        )}
        {showHydraLibrary && (
          <Suspense fallback={<div className="loading" />}>
          <HydraLibrary
            onSelect={handleHydraLibrarySelect}
            onClose={() => setShowHydraLibrary(false)}
          />
          </Suspense>
        )}
        {showSourcePopup && (
          <SourcePopup
            sourceType={sourceType}
            sourceElement={sourceElement}
            onSourceChange={handleSourceChange}
            onSourceUpload={handleSourceUpload}
            uploadedImages={uploadedImages}
            onSourceSelectImage={handleSourceSelectImage}
            onClose={() => setShowSourcePopup(false)}
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
          bpm={bpm}
          onBpmChange={setBpm}
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
