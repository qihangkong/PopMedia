import { useRef } from 'react'

interface ResizeHandleProps {
  nodeId: string
  onResize: (nodeId: string, width: number, height: number) => void
}

export function ResizeHandle({ nodeId, onResize }: ResizeHandleProps) {
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const nodeRef = useRef<HTMLDivElement | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)

    isDragging.current = true

    const node = document.querySelector(`[data-id="${nodeId}"]`) as HTMLDivElement
    if (node) {
      nodeRef.current = node
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        width: node.offsetWidth,
        height: node.offsetHeight,
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !nodeRef.current) return

    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y

    const newWidth = Math.max(200, startPos.current.width + dx)
    const newHeight = Math.max(100, startPos.current.height + dy)

    nodeRef.current.style.width = `${newWidth}px`
    nodeRef.current.style.height = `${newHeight}px`
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current || !nodeRef.current) return
    isDragging.current = false

    const newWidth = nodeRef.current.offsetWidth
    const newHeight = nodeRef.current.offsetHeight
    onResize(nodeId, newWidth, newHeight)

    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      className="resize-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    </div>
  )
}