import { useState, useRef, useCallback } from 'react'

export default function FloatingPanel({
  title,
  children,
  defaultPos,
  className,
  onClose,
  style,
}) {
  const [pos, setPos] = useState(defaultPos || { x: 20, y: 20 })
  const [size, setSize] = useState(null)
  const dragging = useRef(null)
  const resizing = useRef(null)
  const panelRef = useRef(null)
  const posRef = useRef(pos)
  posRef.current = pos

  const handleDragStart = useCallback((e) => {
    if (e.target.closest('.fp-close') || e.target.closest('.fp-resize-handle')) return
    e.preventDefault()
    const p = posRef.current
    const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    dragging.current = { ox: cx - p.x, oy: cy - p.y }
    const move = (ev) => {
      const mx = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0
      const my = ev.clientY ?? ev.touches?.[0]?.clientY ?? 0
      setPos({ x: Math.max(0, mx - dragging.current.ox), y: Math.max(0, my - dragging.current.oy) })
    }
    const up = () => {
      dragging.current = null
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('touchend', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('touchend', up)
  }, [])

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = panelRef.current?.getBoundingClientRect()
    const sx = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const sy = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    resizing.current = { sx, sy, sw: rect?.width || 300, sh: rect?.height || 200 }
    const move = (ev) => {
      const mx = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0
      const my = ev.clientY ?? ev.touches?.[0]?.clientY ?? 0
      setSize({
        width: Math.max(150, resizing.current.sw + (mx - resizing.current.sx)),
        height: Math.max(100, resizing.current.sh + (my - resizing.current.sy)),
      })
    }
    const up = () => {
      resizing.current = null
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('touchend', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('touchend', up)
  }, [])

  return (
    <div
      ref={panelRef}
      className={`fp-window ${className || ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: size?.width,
        height: size?.height,
        ...style,
      }}
    >
      <div
        className="fp-titlebar"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <span className="fp-title">{title}</span>
        {onClose && (
          <button className="fp-close" onClick={onClose} title="Close panel">&times;</button>
        )}
      </div>
      <div className="fp-body">
        {children}
      </div>
      <div
        className="fp-resize-handle"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      />
    </div>
  )
}
