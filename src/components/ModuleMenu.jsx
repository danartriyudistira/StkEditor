import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { buildModules, getModulesByCategory, MODULE_CATEGORIES, IPO_GROUPS } from '../data/moduleRegistry.js'

const MODE_CATEGORIES = {
  hydra: MODULE_CATEGORIES.filter(c => c.id.startsWith('hydra')),
  isf: MODULE_CATEGORIES.filter(c => c.id.startsWith('fx')),
  html: [],
}

function groupCategories(categories) {
  const order = ['input', 'process', 'output', 'examples', 'fx']
  const grouped = []
  for (const groupId of order) {
    const cats = categories.filter(c => c.group === groupId)
    if (cats.length > 0) {
      const groupDef = IPO_GROUPS.find(g => g.id === groupId)
      grouped.push({ groupId, groupDef: groupDef || null, categories: cats })
    }
  }
  const uncategorized = categories.filter(c => !order.includes(c.group))
  if (uncategorized.length > 0) {
    grouped.push({ groupId: '_other', groupDef: null, categories: uncategorized })
  }
  return grouped
}

/** Build a flat array of { type, id, label, data } for keyboard navigation */
function buildNavItems(categories, filtered, expanded, mode, word, isSearch) {
  const items = []
  let idx = 0

  if (mode === 'hydra' && word) {
    items.push({ type: 'slider', id: '__slider', label: `Create slider for ${word.text}`, idx: idx++, data: word })
  }

  const catsToShow = isSearch
    ? categories.filter(cat => filtered.byCategory[cat.id])
    : groupCategories(categories).flatMap(g => g.categories).filter(cat => filtered.byCategory[cat.id])

  for (const cat of catsToShow) {
    const catItems = filtered.byCategory[cat.id] || []
    items.push({ type: 'category', id: cat.id, label: cat.label, idx: idx++, expandable: true, expanded: expanded.has(cat.id), cat })

    if (expanded.has(cat.id)) {
      for (const m of catItems) {
        items.push({ type: 'module', id: m.id, label: m.name, idx: idx++, module: m })
      }
    }
  }
  return items
}

export default function ModuleMenu({ x, y, mode, word, onSelect, onCreateSlider, onClose }) {
  const [search, setSearch] = useState('')
  const categories = MODE_CATEGORIES[mode] || MODULE_CATEGORIES
  const [expanded, setExpanded] = useState(() => new Set(categories.map(c => c.id)))
  const [focusIdx, setFocusIdx] = useState(0)
  const inputRef = useRef(null)
  const menuRef = useRef(null)
  const listRef = useRef(null)

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

  const isSearch = search.trim().length > 0
  const navItems = useMemo(() => buildNavItems(categories, filtered, expanded, mode, word, isSearch),
    [categories, filtered, expanded, mode, word, isSearch])

  useEffect(() => {
    const el = inputRef.current
    if (el && document.activeElement !== el) {
      el.focus()
    }
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
    if (navItems.length === 0) return
    if (focusIdx >= navItems.length) setFocusIdx(navItems.length - 1)
  }, [navItems.length, focusIdx])

  /** Keyboard navigation handled on the menu container itself */
  const handleMenuKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose?.()
      return
    }

    if (navItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIdx(prev => Math.min(prev + 1, navItems.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIdx(prev => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = navItems[focusIdx]
      if (item) {
        if (item.type === 'module') onSelect?.(item.module)
        else if (item.type === 'slider') onCreateSlider?.(item.data)
        else if (item.type === 'category' && item.expandable) toggleCategory(item.id)
      }
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const item = navItems[focusIdx]
      if (item && item.type === 'category' && item.expandable && !item.expanded) {
        toggleCategory(item.id)
      }
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const item = navItems[focusIdx]
      if (item && item.type === 'category' && item.expandable && item.expanded) {
        toggleCategory(item.id)
      }
      return
    }
  }, [onClose, navItems, focusIdx, onSelect, onCreateSlider])

  useEffect(() => {
    if (navItems.length === 0 || focusIdx < 0) return
    const el = listRef.current?.querySelector(`[data-nav-idx="${focusIdx}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [focusIdx, navItems.length])

  function toggleCategory(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const menuWidth = 380
  const menuHeight = Math.min(540, window.innerHeight - y - 16)
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8)
  const adjustedY = Math.min(y, window.innerHeight - 16)

  function renderSearchMode() {
    if (!search.trim()) return null

    const matchedCategories = categories.filter(cat => filtered.byCategory[cat.id])
    let globalIdx = mode === 'hydra' && word ? 1 : 0

    return (
      <>
        {mode === 'hydra' && word && (
          <div
            data-nav-idx={0}
            className={'module-menu-slider-create' + (focusIdx === 0 ? ' module-menu-item--focused' : '')}
            onClick={() => onCreateSlider?.(word)}
            onMouseEnter={() => setFocusIdx(0)}
          >
            <span className="module-menu-slider-icon">{'\u25A0'}</span>
            <span className="module-menu-slider-text">Create slider for <code>{word.text}</code></span>
          </div>
        )}
        {matchedCategories.map(cat => {
          const items = filtered.byCategory[cat.id] || []
          const isExpanded = expanded.has(cat.id)
          const catIdx = globalIdx++
          const focused = catIdx === focusIdx

          return (
            <div key={cat.id} className="module-menu-category" style={{ borderLeftColor: cat.color }}>
              <div
                data-nav-idx={catIdx}
                className={'module-menu-cat-header' + (focused ? ' module-menu-item--focused' : '')}
                onClick={() => toggleCategory(cat.id)}
                onMouseEnter={() => setFocusIdx(catIdx)}
              >
                <span className="module-menu-cat-arrow">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                <span className="module-menu-cat-icon" style={{ color: cat.color }}>{cat.icon}</span>
                <span className="module-menu-cat-label">{cat.label}</span>
                <span className="module-menu-cat-count">{items.length}</span>
              </div>
              {isExpanded && items.map(m => {
                const mIdx = globalIdx++
                return renderItem(m, cat, mIdx)
              })}
            </div>
          )
        })}
      </>
    )
  }

  function renderItem(m, cat, forcedIdx) {
    const idx = forcedIdx !== undefined ? forcedIdx : null
    const focused = idx !== null && idx === focusIdx
    return (
      <div
        key={m.id}
        data-nav-idx={idx}
        className={'module-menu-item' + (focused ? ' module-menu-item--focused' : '')}
        onClick={() => onSelect?.(m)}
        title={m.description}
      >
        <span className="module-menu-item-badge" style={{ background: cat.color, color: '#fff' }}>{m.source === 'hydra' ? 'H' : 'F'}</span>
        <span className="module-menu-item-name">{m.name}</span>
        <span className="module-menu-item-desc">{m.description}</span>
      </div>
    )
  }

  function renderIPOView() {
    const grouped = groupCategories(categories)
    let globalIdx = mode === 'hydra' && word ? 1 : 0

    return (
      <>
        {mode === 'hydra' && word && (
          <div
            data-nav-idx={0}
            className={'module-menu-slider-create' + (focusIdx === 0 ? ' module-menu-item--focused' : '')}
            onClick={() => onCreateSlider?.(word)}
            onMouseEnter={() => setFocusIdx(0)}
          >
            <span className="module-menu-slider-icon">{'\u25A0'}</span>
            <span className="module-menu-slider-text">Create slider for <code>{word.text}</code></span>
          </div>
        )}
        {grouped.map(({ groupId, groupDef, categories: groupCats }) => {
          const activeCats = groupCats.filter(cat => filtered.byCategory[cat.id])
          if (activeCats.length === 0) return null

          return (
            <div key={groupId} className="module-menu-ipo-group">
              {groupDef && (
                <div className="module-menu-ipo-header" style={{ borderLeftColor: groupDef.color }}>
                  <span className="module-menu-ipo-label" style={{ color: groupDef.color }}>{groupDef.label}</span>
                </div>
              )}
              {activeCats.map(cat => {
                const items = filtered.byCategory[cat.id] || []
                const isExpanded = expanded.has(cat.id)
                const catIdx = globalIdx++
                const focused = catIdx === focusIdx

                return (
                  <div key={cat.id} className="module-menu-category" style={{ borderLeftColor: cat.color }}>
                    <div
                      data-nav-idx={catIdx}
                      className={'module-menu-cat-header' + (focused ? ' module-menu-item--focused' : '')}
                      onClick={() => toggleCategory(cat.id)}
                      onMouseEnter={() => setFocusIdx(catIdx)}
                    >
                      <span className="module-menu-cat-arrow">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                      <span className="module-menu-cat-icon" style={{ color: cat.color }}>{cat.icon}</span>
                      <span className="module-menu-cat-label">{cat.label}</span>
                      <span className="module-menu-cat-count">{items.length}</span>
                    </div>
                    {isExpanded && items.map(m => {
                      const mIdx = globalIdx++
                      return renderItem(m, cat, mIdx)
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div className="module-menu" ref={menuRef} tabIndex={-1} onKeyDown={handleMenuKeyDown} style={{ left: adjustedX, top: adjustedY, width: menuWidth, outline: 'none' }}>
      <div className="module-menu-search">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search modules... (arrows, enter)"
          value={search}
          onChange={e => { setSearch(e.target.value); setFocusIdx(0) }}
        />
      </div>
      <div className="module-menu-list" ref={listRef} style={{ maxHeight: menuHeight - 48 }}>
        {filtered.anyMatch ? (
          search.trim() ? renderSearchMode() : renderIPOView()
        ) : (
          <div className="module-menu-empty">No modules found</div>
        )}
      </div>
    </div>
  )
}
