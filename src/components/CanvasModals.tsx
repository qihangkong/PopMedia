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
