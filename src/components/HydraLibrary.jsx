import { useState, useEffect } from 'react'
import { HYDRA_EXAMPLES, HYDRA_CATEGORIES } from '../data/hydraExamples.js'

export default function HydraLibrary({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = HYDRA_EXAMPLES.filter(e => {
    const matchesCategory = activeCategory === 'All' || e.category === activeCategory
    const matchesSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleKey(e) {
    if (e.key === 'Escape') onClose?.()
  }

  return (
    <div className="library-overlay" onClick={onClose}>
      <div className="library-modal" onClick={e => e.stopPropagation()}>
        <div className="library-header">
          <h2>Hydra Gallery</h2>
          <input
            type="text"
            placeholder="Search sketches..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <button onClick={onClose} className="library-close">Close</button>
        </div>

        <div className="hydra-category-bar">
          {HYDRA_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`hydra-category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="library-list">
          {filtered.length === 0 && (
            <div className="library-empty">No sketches found</div>
          )}
          {filtered.map((example, i) => (
            <div
              key={i}
              className="library-item"
              onClick={() => onSelect?.(example.code, example.name)}
            >
              <span className="hydra-example-name">{example.name}</span>
              <span className="hydra-example-category">{example.category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
