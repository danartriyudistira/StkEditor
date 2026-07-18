import { useRef, useEffect } from 'react'

export default function TabBar({ tabs, activeTabId, onSwitch, onClose, onNew, onOpen, onSave, onDownload }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [tabs.length])

  return (
    <div className="tabbar">
      <div className="tabbar-actions">
        <button className="tabbar-action" onClick={onOpen} title="Open .fs file">Open</button>
        <button className="tabbar-action" onClick={onSave} title="Save (overwrite)">Save</button>
        <button className="tabbar-action" onClick={onDownload} title="Download .fs (Save As)">Download</button>
        <div className="tabbar-sep" />
      </div>
      <div className="tabbar-scroll" ref={scrollRef}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tabbar-tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSwitch(tab.id)}
          >
            <span className="tabbar-tab-name">
              {tab.modified && <span className="tabbar-modified">{'\u25CF'} </span>}
              {tab.name}
            </span>
            <button
              className="tabbar-close"
              onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
              title="Close tab"
            >
              {'\u2715'}
            </button>
          </div>
        ))}
      </div>
      <button className="tabbar-new" onClick={onNew} title="New tab">
        {'\u2795'}
      </button>
    </div>
  )
}
