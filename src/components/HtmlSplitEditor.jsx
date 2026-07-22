import { useState, useRef } from 'react'
import Editor from '@monaco-editor/react'

let registered = false
function ensureTheme(monaco) {
  if (registered) return
  registered = true
  monaco.editor.defineTheme('html-split-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'tag', foreground: '569cd6' },
      { token: 'attribute.name', foreground: '9cdcfe' },
      { token: 'attribute.value', foreground: 'ce9178' },
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'keyword', foreground: 'c586c0' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'delimiter', foreground: '808080' },
    ],
    colors: { 'editor.background': '#1e1e1e' },
  })
}

const EDITOR_OPTIONS = {
  fontSize: 12,
  fontFamily: "'Fira Code', 'Consolas', monospace",
  minimap: { enabled: false },
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
  tabSize: 2,
  renderWhitespace: 'none',
  contextmenu: false,
  bracketPairColorization: { enabled: true },
}

const PANELS = [
  { key: 'htmlCode', label: 'HTML', lang: 'html', defaultCode: '<h1>Hello World</h1>' },
  { key: 'cssCode', label: 'CSS', lang: 'css', defaultCode: 'body {\n  background: #111;\n  color: #eee;\n}' },
  { key: 'jsCode', label: 'JS', lang: 'javascript', defaultCode: 'console.log("Hello!");' },
]

function combineOutput(html, css, js) {
  return '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + html + '\n<script>\n' + js + '\n</script>\n</body>\n</html>'
}

export default function HtmlSplitEditor({ htmlCode, cssCode, jsCode, onChange, onReady }) {
  const [collapsed, setCollapsed] = useState({ cssCode: false, jsCode: false })
  const [heights, setHeights] = useState({ htmlCode: 55, cssCode: 22, jsCode: 23 })
  const editorsRef = useRef({})
  const firstMountRef = useRef({ htmlCode: false, cssCode: false, jsCode: false })

  function handleCodeChange(key, val) {
    const codes = { htmlCode: htmlCode || '', cssCode: cssCode || '', jsCode: jsCode || '', [key]: val }
    onChange?.(codes.htmlCode, codes.cssCode, codes.jsCode, combineOutput(codes.htmlCode, codes.cssCode, codes.jsCode))
  }

  function toggleCollapse(panelKey) {
    setCollapsed(prev => {
      const next = { ...prev, [panelKey]: !prev[panelKey] }
      if (next[panelKey]) {
        setHeights(h => ({ ...h, [panelKey]: Math.max(h[panelKey], 1) }))
      } else {
        setHeights(h => {
          const was = prev.cssCode ? (prev.jsCode ? 3 : 4) : (prev.jsCode ? 4 : 22)
          return { ...h, [panelKey]: was }
        })
      }
      return next
    })
  }

  function handleMouseDown(panelKey, e) {
    e.preventDefault()
    const startY = e.clientY
    const startH = heights[panelKey]
    const containerH = e.currentTarget.parentElement.clientHeight
    const move = (ev) => {
      const dy = ev.clientY - startY
      const pct = Math.max(5, Math.min(70, ((startH / 100) * containerH + dy) / containerH * 100))
      setHeights(prev => ({ ...prev, [panelKey]: Math.round(pct) }))
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  function handleMount(panelKey, editor, monaco) {
    ensureTheme(monaco)
    monaco.editor.setTheme('html-split-dark')
    editorsRef.current[panelKey] = editor
    if (!firstMountRef.current[panelKey]) {
      firstMountRef.current[panelKey] = true
      if (panelKey === 'htmlCode') {
        editor.focus()
        onReady?.(editor)
      }
    }
  }

  function getDistributedHeights() {
    const h = { ...heights }
    const collapsedKeys = Object.keys(collapsed).filter(k => collapsed[k])
    if (collapsedKeys.length === 0) return h
    const totalFixed = collapsedKeys.reduce((sum, k) => sum + h[k], 0)
    const openKeys = PANELS.filter(p => !collapsed[p.key])
    const openTotal = openKeys.reduce((sum, p) => sum + h[p.key], 0)
    if (openTotal <= 0) return h
    for (const p of openKeys) {
      h[p.key] = Math.round(h[p.key] + (totalFixed / openKeys.length))
    }
    return h
  }

  const distHeights = getDistributedHeights()

  return (
    <div className="html-split-editor">
      {PANELS.map((panel, i) => {
        const isCollapsed = collapsed[panel.key]
        const isLast = i === PANELS.length - 1
        const heightPct = distHeights[panel.key]
        return (
          <div key={panel.key} className="html-split-row" style={{ flex: isCollapsed ? '0 0 auto' : `0 0 ${heightPct}%` }}>
            <div className="html-split-header" onClick={() => toggleCollapse(panel.key)}>
              <span className="html-split-arrow">{isCollapsed ? '\u25B6' : '\u25BC'}</span>
              <span className="html-split-label">{panel.label}</span>
              {isCollapsed && (
                <span className="html-split-preview">
                  {(panel.key === 'htmlCode' ? htmlCode : panel.key === 'cssCode' ? cssCode : jsCode || '').slice(0, 60)}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <div className="html-split-body">
                <Editor
                  height="100%"
                  language={panel.lang}
                  value={panel.key === 'htmlCode' ? htmlCode : panel.key === 'cssCode' ? cssCode : jsCode}
                  onChange={(v) => handleCodeChange(panel.key, v || '')}
                  onMount={(editor, monaco) => handleMount(panel.key, editor, monaco)}
                  theme="html-split-dark"
                  options={EDITOR_OPTIONS}
                />
              </div>
            )}
            {!isLast && !isCollapsed && (
              <div
                className="html-split-resize"
                onMouseDown={(e) => handleMouseDown(panel.key, e)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
