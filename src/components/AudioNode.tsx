import { useRef, memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { NodeHeader } from './NodeHeader'
import { ResizeHandle } from './ResizeHandle'
import { NodeAIInput } from './NodeAIInput'
import { useNodeUpdates } from '../hooks/useNodeUpdates'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { UploadIcon, DeleteIcon } from '../icons'
import { uploadFile } from '../utils/tauriApi'
import { HANDLE_SIZE } from '../constants'

interface AudioNodeProps {
  data: { label: string; type: string; audioUrl?: string }
  selected: boolean
  id: string
}

export const AudioNode = memo(function AudioNode({ data, selected, id }: AudioNodeProps) {
  const { updateAudioUrl, onResize } = useNodeUpdates(id)
  const displayAudioUrl = useMediaUrl(data.audioUrl)
  const audioFileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const path = await uploadFile(file.name, bytes)
      console.log(`[AudioNode] uploaded to`, path)
      updateAudioUrl(path)
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  return (
    <div
      className={`custom-node audio-node${selected ? ' selected' : ''}`}
      data-id={id}
      style={{ width: '100%', height: '100%' }}
      onContextMenu={(e) => {
        e.preventDefault()
        const event = new CustomEvent('nodeContextMenu', {
          detail: { nodeId: id, nodeType: 'audio', x: e.clientX, y: e.clientY },
          bubbles: true,
        })
        e.currentTarget.dispatchEvent(event)
      }}
    >
      <NodeHeader id={id} type="audio" label={data.label} />
      <div className="node-body">
        {displayAudioUrl ? (
          <div className="audio-preview-wrapper">
            <audio
              src={displayAudioUrl}
              controls
              className="node-media-preview"
              preload="metadata"
            />
          </div>
        ) : uploading ? (
          <div className="placeholder-text media-placeholder">
            <div className="upload-spinner" />
            <span>上传中...</span>
          </div>
        ) : (
          <div
            className="placeholder-text media-placeholder"
            onClick={() => audioFileInputRef.current?.click()}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span>点击上传音频</span>
          </div>
        )}
      </div>
      <div className="node-actions">
        <button
          className="node-action-btn"
          title="上传音频"
          onClick={(e) => {
            e.stopPropagation()
            audioFileInputRef.current?.click()
          }}
        >
          <UploadIcon />
        </button>
        {data.audioUrl && (
          <button
            className="node-action-btn delete-btn"
            title="删除音频"
            onClick={(e) => {
              e.stopPropagation()
              if (data.audioUrl) URL.revokeObjectURL(data.audioUrl)
              updateAudioUrl('')
            }}
          >
            <DeleteIcon />
          </button>
        )}
      </div>
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
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