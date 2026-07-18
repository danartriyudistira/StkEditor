import { useState, useEffect, useCallback } from 'react'

export default function ISFLibrary({ files, onSelect, onClose }) {
  const [search, setSearch] = useState('')

  const filtered = files.filter(f =>
    f.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 200)

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleKey(e) {
    if (e.key === 'Escape') onClose?.()
  }

  const loadFile = useCallback(async (name) => {
    const base = import.meta.env.BASE_URL || '/'
    try {
      const url = `${base}ISF/${encodeURIComponent(name)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      onSelect?.(text, name)
    } catch (e) {
      console.error('Failed to load shader:', name, e)
      alert(`Could not load ${name}: ${e.message}`)
    }
  }, [onSelect])

  return (
    <div className="library-overlay" onClick={onClose}>
      <div className="library-modal" onClick={e => e.stopPropagation()}>
        <div className="library-header">
          <h2>ISF Library</h2>
          <input
            type="text"
            placeholder="Search shaders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <button onClick={onClose} className="library-close">Close</button>
        </div>

        <div className="library-list">
          {filtered.length === 0 && (
            <div className="library-empty">No shaders found</div>
          )}
          {filtered.map(name => (
            <div
              key={name}
              className="library-item"
              onClick={() => loadFile(name)}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
