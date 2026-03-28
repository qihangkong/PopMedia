import { useRef, memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { NodeHeader } from './NodeHeader'
import { ResizeHandle } from './ResizeHandle'
import { useNodeUpdates } from '../hooks/useNodeUpdates'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { UploadIcon, DeleteIcon } from '../icons'
import { uploadFile } from '../utils/tauriApi'
import { HANDLE_SIZE } from '../constants'

interface VideoNodeProps {
  data: { label: string; type: string; videoUrl?: string }
  selected: boolean
  id: string
}

export const VideoNode = memo(function VideoNode({ data, selected, id }: VideoNodeProps) {
  const { updateVideoUrl, onResize } = useNodeUpdates(id)
  const displayVideoUrl = useMediaUrl(data.videoUrl)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const dispatchPreviewEvent = (eventName: string, detail: Record<string, unknown>) => {
    const event = new CustomEvent(eventName, { detail, bubbles: true })
    window.dispatchEvent(event)
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const path = await uploadFile(file.name, bytes)
      console.log(`[VideoNode] uploaded to`, path)
      updateVideoUrl(path)
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  return (
    <div
      className={`custom-node video-node${selected ? ' selected' : ''}`}
      data-id={id}
      style={{ width: '100%', height: '100%' }}
      onContextMenu={(e) => {
        e.preventDefault()
        const event = new CustomEvent('nodeContextMenu', {
          detail: { nodeId: id, nodeType: 'video', x: e.clientX, y: e.clientY },
          bubbles: true,
        })
        e.currentTarget.dispatchEvent(event)
      }}
    >
      <NodeHeader id={id} type="video" label={data.label} />
      <div className="node-body">
        {displayVideoUrl ? (
          <div className="video-preview-wrapper">
            <video
              src={displayVideoUrl}
              className="node-media-preview"
              preload="metadata"
              controls
            />
            <button
              className="video-preview-btn"
              title="全屏预览视频"
              onClick={(e) => {
                e.stopPropagation()
                dispatchPreviewEvent('previewVideo', { videoUrl: displayVideoUrl })
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        ) : uploading ? (
          <div className="placeholder-text media-placeholder">
            <div className="upload-spinner" />
            <span>上传中...</span>
          </div>
        ) : (
          <div
            className="placeholder-text media-placeholder"
            onClick={() => videoFileInputRef.current?.click()}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>点击上传视频</span>
          </div>
        )}
      </div>
      <div className="node-actions">
        <button
          className="node-action-btn"
          title="上传视频"
          onClick={(e) => {
            e.stopPropagation()
            videoFileInputRef.current?.click()
          }}
        >
          <UploadIcon />
        </button>
        {data.videoUrl && (
          <button
            className="node-action-btn delete-btn"
            title="删除视频"
            onClick={(e) => {
              e.stopPropagation()
              if (data.videoUrl) URL.revokeObjectURL(data.videoUrl)
              updateVideoUrl('')
            }}
          >
            <DeleteIcon />
          </button>
        )}
      </div>
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
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
    </div>
  )
})