import { useState, useEffect, useRef, useMemo } from 'react'
import { buildModules, getModulesByCategory, MODULE_CATEGORIES } from '../data/moduleRegistry.js'

const MODE_CATEGORIES = {
  hydra: MODULE_CATEGORIES.filter(c => c.id.startsWith('hydra')),
  isf: MODULE_CATEGORIES.filter(c => c.id.startsWith('fx')),
}

export default function ModuleMenu({ x, y, mode, word, onSelect, onCreateSlider, onClose }) {
  const [search, setSearch] = useState('')
  const categories = MODE_CATEGORIES[mode] || MODULE_CATEGORIES
  const [expanded, setExpanded] = useState(() => new Set(categories.map(c => c.id)))
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  const allModules = useMemo(() => buildModules(), [])
  const byCategory = useMemo(() => {
    const filtered = allModules.filter(m => categories.some(c => c.id === m.category))
    return getModulesByCategory(filtered)
  }, [allModules, categories])

  const filtered = useMemo(() => {
    const activeCategories = categories
    if (!search.trim()) {
      const filteredByCat = {}
      for (const cat of activeCategories) {
        if (byCategory[cat.id]) filteredByCat[cat.id] = byCategory[cat.id]
      }
      return { byCategory: filteredByCat, anyMatch: Object.keys(filteredByCat).length > 0 }
    }
    const q = search.toLowerCase()
    const matched = allModules.filter(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))
    const map = {}
    for (const m of matched) {
      if (!map[m.category]) map[m.category] = []
      map[m.category].push(m)
    }
    return { byCategory: map, anyMatch: matched.length > 0 }
  }, [allModules, byCategory, search, categories])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    window.addEventListener('pointerdown', handleClick)
    return () => window.removeEventListener('pointerdown', handleClick)
  }, [onClose])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function toggleCategory(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const menuWidth = 320
  const menuHeight = Math.min(500, window.innerHeight - y - 16)
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8)
  const adjustedY = Math.min(y, window.innerHeight - 16)

  return (
    <div className="module-menu" ref={menuRef} style={{ left: adjustedX, top: adjustedY, width: menuWidth }}>
      <div className="module-menu-search">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search modules..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose?.() }}
        />
      </div>
      <div className="module-menu-list" style={{ maxHeight: menuHeight - 48 }}>
        {mode === 'hydra' && word && (
          <div className="module-menu-slider-create" onClick={() => onCreateSlider?.(word)}>
            <span className="module-menu-slider-icon">{'\u25A0'}</span>
            <span className="module-menu-slider-text">Create slider for <code>{word.text}</code></span>
          </div>
        )}
        {filtered.anyMatch ? (
          categories.filter(cat => filtered.byCategory[cat.id]).map(cat => {
            const items = filtered.byCategory[cat.id] || []
            const isExpanded = expanded.has(cat.id)
            return (
              <div key={cat.id} className="module-menu-category">
                <div className="module-menu-cat-header" onClick={() => toggleCategory(cat.id)}>
                  <span className="module-menu-cat-arrow">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                  <span className="module-menu-cat-icon">{cat.icon}</span>
                  <span className="module-menu-cat-label">{cat.label}</span>
                  <span className="module-menu-cat-count">{items.length}</span>
                </div>
                {isExpanded && items.map(m => (
                  <div
                    key={m.id}
                    className="module-menu-item"
                    onClick={() => onSelect?.(m)}
                  >
                    <span className={`module-menu-item-badge module-menu-item-badge--${m.source}`}>{m.source === 'hydra' ? 'H' : 'F'}</span>
                    <span className="module-menu-item-name">{m.name}</span>
                  </div>
                ))}
              </div>
            )
          })
        ) : (
          <div className="module-menu-empty">No modules found</div>
        )}
      </div>
    </div>
  )
}
