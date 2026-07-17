import { useState, useEffect, useCallback } from 'react'

export default function ISFLibrary({ files, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [contents, setContents] = useState({})

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
    try {
      const res = await fetch(`/ISF/${name}`)
      if (!res.ok) throw new Error('Not found')
      const text = await res.text()
      onSelect?.(text, name)
    } catch (e) {
      // fallback: try loading as raw
      try {
        const res = await fetch(name)
        if (!res.ok) throw new Error('Not found')
        const text = await res.text()
        onSelect?.(text, name)
      } catch (_) {
        alert(`Could not load ${name}`)
      }
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
