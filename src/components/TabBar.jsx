import { useRef, useEffect, useState } from 'react'

export default function TabBar({ tabs, activeTabId, onSwitch, onClose, onNew, onOpen, onExport, onDownload, onRename }) {
  const scrollRef = useRef(null)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [tabs.length])

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  function handleDoubleClick(tab) {
    setEditingId(tab.id)
    setEditValue(tab.name)
  }

  function handleRenameSubmit() {
    if (editingId !== null && editValue.trim()) {
      onRename?.(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  function handleRenameKeyDown(e) {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') setEditingId(null)
  }

  return (
    <div className="tabbar">
      <div className="tabbar-scroll" ref={scrollRef}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tabbar-tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSwitch(tab.id)}
          >
            <span className="tabbar-tab-name" onDoubleClick={() => handleDoubleClick(tab)}>
              {editingId === tab.id ? (
                <input
                  ref={inputRef}
                  className="tabbar-rename-input"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={handleRenameKeyDown}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  {tab.modified && <span className="tabbar-modified">{'\u25CF'} </span>}
                  {tab.name}
                </>
              )}
            </span>
            {editingId !== tab.id && (
              <button
                className="tabbar-close"
                onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
                title="Close tab"
              >
                {'\u2715'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="tabbar-actions">
        <button className="tabbar-action" onClick={onOpen} title="Open .fs file">Open</button>
        <button className="tabbar-action" onClick={onDownload} title="Download .fs (Save As)">Download</button>
        <button className="tabbar-new" onClick={onNew} title="New tab">{'\u2795'}</button>
      </div>
    </div>
  )
}
