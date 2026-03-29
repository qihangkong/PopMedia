import { useRef, memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { NodeHeader } from './NodeHeader'
import { ResizeHandle } from './ResizeHandle'
import { NodeAIInput } from './NodeAIInput'
import { useNodeUpdates } from '../hooks/useNodeUpdates'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { useCanvasContext } from '../contexts/CanvasContext'
import { UploadIcon, DeleteIcon } from '../icons'
import { uploadFile } from '../utils/tauriApi'
import { HANDLE_SIZE } from '../constants'

interface ImageNodeProps {
  data: { label: string; type: string; imageUrl?: string }
  selected: boolean
  id: string
}

export const ImageNode = memo(function ImageNode({ data, selected, id }: ImageNodeProps) {
  const { updateImageUrl, onResize } = useNodeUpdates(id)
  const displayImageUrl = useMediaUrl(data.imageUrl)
  const imageFileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { onPreviewImage } = useCanvasContext()

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const path = await uploadFile(file.name, bytes)
      console.log(`[ImageNode] uploaded to`, path)
      updateImageUrl(path)
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  return (
    <div
      className={`custom-node image-node${selected ? ' selected' : ''}`}
      data-id={id}
      style={{ width: '100%', height: '100%' }}
    >
      <NodeHeader id={id} type="image" label={data.label} />
      <div className="node-body">
        {displayImageUrl ? (
          <div className="image-preview-wrapper">
            <img
              src={displayImageUrl}
              alt=""
              className="node-image-preview"
              draggable={false}
            />
            <button
              className="image-preview-btn"
              title="预览图片"
              onClick={(e) => {
                e.stopPropagation()
                onPreviewImage(displayImageUrl)
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        ) : uploading ? (
          <div className="placeholder-text image-placeholder">
            <div className="upload-spinner" />
            <span>上传中...</span>
          </div>
        ) : (
          <div
            className="placeholder-text image-placeholder"
            onClick={() => imageFileInputRef.current?.click()}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>点击上传图片</span>
          </div>
        )}
      </div>
      <div className="node-actions">
        <button
          className="node-action-btn"
          title="上传图片"
          onClick={(e) => {
            e.stopPropagation()
            imageFileInputRef.current?.click()
          }}
        >
          <UploadIcon />
        </button>
        {data.imageUrl && (
          <button
            className="node-action-btn delete-btn"
            title="删除图片"
            onClick={(e) => {
              e.stopPropagation()
              updateImageUrl('')
            }}
          >
            <DeleteIcon />
          </button>
        )}
      </div>
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleMediaUpload}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="node-handle"
        style={{
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          border: '2px solid #6366f1',
          background: '#2a2a2a',
        }}
      />
      <ResizeHandle nodeId={id} onResize={onResize} />
      <NodeAIInput nodeId={id} visible={selected} />
    </div>
  )
})