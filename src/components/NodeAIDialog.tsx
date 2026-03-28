import { useState, useCallback, useRef, useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'

interface NodeAIDialogProps {
  nodeId: string
  onSend: (message: string) => void
  onClose: () => void
}

export function NodeAIDialog({ nodeId, onSend, onClose }: NodeAIDialogProps) {
  const { getNode, getViewport } = useReactFlow()
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const node = getNode(nodeId)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleAutoResize = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  }

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSend(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px'
      }
    }
  }, [message, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }, [handleSend, onClose])

  if (!node) return null

  const viewport = getViewport()
  // 将节点位置（画布坐标）转换为屏幕坐标
  const screenX = node.position.x * viewport.zoom + viewport.x
  const screenY = node.position.y * viewport.zoom + viewport.y
  const nodeWidth = (node.measured?.width ?? node.width ?? 200) * viewport.zoom
  const nodeHeight = (node.measured?.height ?? node.height ?? 100) * viewport.zoom

  return (
    <div
      className="node-ai-dialog"
      style={{
        position: 'fixed',
        left: screenX + (nodeWidth - 460) / 2,
        top: screenY + nodeHeight + 8,
        width: 460,
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="node-ai-dialog-input-wrapper">
        <textarea
          ref={textareaRef}
          className="node-ai-dialog-textarea"
          placeholder="向 AI 询问关于此节点的问题..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            handleAutoResize()
          }}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="node-ai-dialog-send"
          onClick={handleSend}
          disabled={!message.trim()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}