import { useState, useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'

interface NodeContextMenuProps {
  nodeId: string
  nodeType: string
  x: number
  y: number
  onUploadMedia: (nodeId: string) => void
  onClose: () => void
}

export function NodeContextMenu({ nodeId, nodeType, x, y, onUploadMedia, onClose }: NodeContextMenuProps) {
  const canUpload = nodeType === 'image' || nodeType === 'video' || nodeType === 'audio'

  const getUploadLabel = () => {
    if (nodeType === 'image') return '上传图片'
    if (nodeType === 'video') return '上传视频'
    if (nodeType === 'audio') return '上传音频'
    return '上传'
  }

  return (
    <div
      className="node-context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000,
      }}
    >
      {canUpload && (
        <button
          className="context-menu-item"
          onClick={() => {
            onUploadMedia(nodeId)
            onClose()
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          {getUploadLabel()}
        </button>
      )}
    </div>
  )
}

interface ImagePreviewModalProps {
  imageUrl: string | null
  onClose: () => void
}

export function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  if (!imageUrl) return null

  return (
    <div className="image-preview-modal" onClick={onClose}>
      <button className="preview-modal-close" onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <img
        src={imageUrl}
        alt=""
        className="preview-modal-img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

interface VideoPreviewModalProps {
  videoUrl: string | null
  onClose: () => void
}

export function VideoPreviewModal({ videoUrl, onClose }: VideoPreviewModalProps) {
  if (!videoUrl) return null

  return (
    <div className="video-preview-modal" onClick={onClose}>
      <button className="preview-modal-close" onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <video
        src={videoUrl}
        className="video-modal-player"
        controls
        autoPlay
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

interface TextNodeEditModalProps {
  nodeId: string
  initialLabel: string
  initialContent: string
  onClose: () => void
}

export function TextNodeEditModal({ nodeId, initialLabel, initialContent, onClose }: TextNodeEditModalProps) {
  const { setNodes } = useReactFlow()
  const [label, setLabel] = useState(initialLabel)
  const [content, setContent] = useState(initialContent)

  const handleSave = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, label, content } }
        }
        return node
      })
    )
    onClose()
  }, [setNodes, nodeId, label, content, onClose])

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal text-node-edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-modal-title">编辑文本节点</h3>

        <div className="field-group" style={{ marginBottom: '16px' }}>
          <label>节点名称</label>
          <div className="input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
            </svg>
            <input
              type="text"
              className="config-input"
              placeholder="输入节点名称"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="field-group" style={{ marginBottom: '16px' }}>
          <label>文本内容</label>
          <textarea
            className="text-node-edit-content"
            placeholder="输入文本内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
        </div>

        <div className="confirm-modal-actions">
          <button className="confirm-modal-btn cancel" onClick={onClose}>
            取消
          </button>
          <button className="confirm-modal-btn confirm" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
