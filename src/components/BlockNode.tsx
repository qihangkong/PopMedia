import { useRef, memo, useCallback, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { NodeHeader } from './NodeHeader'
import { ResizeHandle } from './ResizeHandle'
import { NodeAIInput } from './NodeAIInput'
import { useNodeUpdates } from '../hooks/useNodeUpdates'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { HANDLE_SIZE } from '../constants'
import { PlusIcon, TrashIcon, TypeIcon, ImageIcon, VideoIcon, MusicIcon, ChevronDownIcon } from '../icons'
import { uploadFile } from '../utils/tauriApi'
import { useCanvasContext } from '../contexts/CanvasContext'

type BlockType = 'text' | 'image' | 'video' | 'audio'

interface BlockContent {
  id: string
  type: BlockType
  content?: string      // for text
  imageUrl?: string     // for image
  videoUrl?: string     // for video
  audioUrl?: string     // for audio
}

interface BlockNodeProps {
  data: {
    label: string
    type: string
    contents?: BlockContent[]
  }
  selected: boolean
  id: string
}

interface BlockTypeOption {
  type: BlockType
  label: string
  icon: React.ReactNode
}

const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  { type: 'text', label: '文本', icon: <TypeIcon /> },
  { type: 'image', label: '图片', icon: <ImageIcon /> },
  { type: 'video', label: '视频', icon: <VideoIcon /> },
  { type: 'audio', label: '音频', icon: <MusicIcon /> },
]

function TextBlock({
  block,
  onUpdate,
}: {
  block: BlockContent
  onUpdate: (id: string, updates: Partial<BlockContent>) => void
}) {
  return (
    <textarea
      className="block-textarea"
      defaultValue={block.content || ''}
      placeholder="点击编辑文本"
      onBlur={(e) => onUpdate(block.id, { content: e.target.value })}
      onPointerDown={(e) => e.stopPropagation()}
    />
  )
}

function ImageBlock({
  block,
  onUpdate,
}: {
  block: BlockContent
  onUpdate: (id: string, updates: Partial<BlockContent>) => void
}) {
  const imageFileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const displayImageUrl = useMediaUrl(block.imageUrl)
  const { onPreviewImage } = useCanvasContext()

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const path = await uploadFile(file.name, bytes)
      onUpdate(block.id, { imageUrl: path })
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  return (
    <>
      {displayImageUrl ? (
        <div className="block-media-preview">
          <img
            src={displayImageUrl}
            alt=""
            className="block-image-preview"
            draggable={false}
          />
          <div className="block-media-actions">
            <button
              className="block-media-btn"
              title="预览图片"
              onClick={(e) => {
                e.stopPropagation()
                onPreviewImage(displayImageUrl)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button
              className="block-media-btn delete-btn"
              title="删除图片"
              onClick={(e) => {
                e.stopPropagation()
                onUpdate(block.id, { imageUrl: '' })
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : uploading ? (
        <div className="block-media-placeholder">
          <div className="upload-spinner" />
          <span>上传中...</span>
        </div>
      ) : (
        <div
          className="block-media-placeholder"
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
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleMediaUpload}
      />
    </>
  )
}

function VideoBlock({
  block,
  onUpdate,
}: {
  block: BlockContent
  onUpdate: (id: string, updates: Partial<BlockContent>) => void
}) {
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const displayVideoUrl = useMediaUrl(block.videoUrl)
  const { onPreviewVideo } = useCanvasContext()

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const path = await uploadFile(file.name, bytes)
      onUpdate(block.id, { videoUrl: path })
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  return (
    <>
      {displayVideoUrl ? (
        <div className="block-media-preview">
          <video
            src={displayVideoUrl}
            className="block-video-preview"
            preload="metadata"
            controls
          />
          <div className="block-media-actions">
            <button
              className="block-media-btn"
              title="全屏预览"
              onClick={(e) => {
                e.stopPropagation()
                onPreviewVideo(displayVideoUrl)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button
              className="block-media-btn delete-btn"
              title="删除视频"
              onClick={(e) => {
                e.stopPropagation()
                if (block.videoUrl) URL.revokeObjectURL(block.videoUrl)
                onUpdate(block.id, { videoUrl: '' })
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : uploading ? (
        <div className="block-media-placeholder">
          <div className="upload-spinner" />
          <span>上传中...</span>
        </div>
      ) : (
        <div
          className="block-media-placeholder"
          onClick={() => videoFileInputRef.current?.click()}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <span>点击上传视频</span>
        </div>
      )}
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleMediaUpload}
      />
    </>
  )
}

function AudioBlock({
  block,
  onUpdate,
}: {
  block: BlockContent
  onUpdate: (id: string, updates: Partial<BlockContent>) => void
}) {
  const audioFileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const displayAudioUrl = useMediaUrl(block.audioUrl)

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const path = await uploadFile(file.name, bytes)
      onUpdate(block.id, { audioUrl: path })
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  return (
    <>
      {displayAudioUrl ? (
        <div className="block-audio-preview">
          <audio
            src={displayAudioUrl}
            controls
            className="block-audio-player"
            preload="metadata"
          />
          <button
            className="block-media-btn delete-btn"
            title="删除音频"
            onClick={(e) => {
              e.stopPropagation()
              if (block.audioUrl) URL.revokeObjectURL(block.audioUrl)
              onUpdate(block.id, { audioUrl: '' })
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : uploading ? (
        <div className="block-media-placeholder">
          <div className="upload-spinner" />
          <span>上传中...</span>
        </div>
      ) : (
        <div
          className="block-media-placeholder"
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
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleMediaUpload}
      />
    </>
  )
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  text: '文本',
  image: '图片',
  video: '视频',
  audio: '音频',
}

export const BlockNode = memo(function BlockNode({ data, selected, id }: BlockNodeProps) {
  const { updateContents, onResize } = useNodeUpdates(id)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showTypeMenu, setShowTypeMenu] = useState(false)

  const contents: BlockContent[] = data.contents && data.contents.length > 0
    ? data.contents
    : []

  const handleUpdateBlock = useCallback((blockId: string, updates: Partial<BlockContent>) => {
    const newContents = contents.map((block) =>
      block.id === blockId ? { ...block, ...updates } : block
    )
    updateContents(newContents)
  }, [contents, updateContents])

  const handleAddBlock = useCallback((type: BlockType) => {
    const newBlock: BlockContent = {
      id: `block-${Date.now()}`,
      type,
    }
    const newContents = [...contents, newBlock]
    updateContents(newContents)
    setShowTypeMenu(false)
  }, [contents, updateContents])

  const handleDeleteBlock = useCallback((blockId: string) => {
    const newContents = contents.filter((block) => block.id !== blockId)
    updateContents(newContents)
  }, [contents, updateContents])

  const renderBlockContent = (block: BlockContent) => {
    switch (block.type) {
      case 'text':
        return <TextBlock block={block} onUpdate={handleUpdateBlock} />
      case 'image':
        return <ImageBlock block={block} onUpdate={handleUpdateBlock} />
      case 'video':
        return <VideoBlock block={block} onUpdate={handleUpdateBlock} />
      case 'audio':
        return <AudioBlock block={block} onUpdate={handleUpdateBlock} />
      default:
        return null
    }
  }

  return (
    <div
      className={`custom-node block-node${selected ? ' selected' : ''}`}
      data-id={id}
      style={{ width: '100%', height: '100%' }}
    >
      <NodeHeader id={id} type="block" label={data.label} />
      <div className="node-body block-node-body" ref={containerRef}>
        <div className="block-container">
          {contents.map((block, index) => (
            <div key={block.id} className={`block-item block-item-${block.type}`}>
              <div className="block-item-header">
                <div className="block-item-type">
                  {block.type === 'text' && <TypeIcon />}
                  {block.type === 'image' && <ImageIcon />}
                  {block.type === 'video' && <VideoIcon />}
                  {block.type === 'audio' && <MusicIcon />}
                  <span>{BLOCK_TYPE_LABELS[block.type]} {index + 1}</span>
                </div>
                <button
                  className="block-delete-btn"
                  onClick={() => handleDeleteBlock(block.id)}
                  title="删除此区块"
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="block-item-content">
                {renderBlockContent(block)}
              </div>
            </div>
          ))}
          <div className="block-add-wrapper">
            <button
              className="block-add-btn"
              onClick={() => setShowTypeMenu(!showTypeMenu)}
            >
              <PlusIcon />
              <span>添加区块</span>
              <ChevronDownIcon />
            </button>
            {showTypeMenu && (
              <div className="block-type-menu">
                {BLOCK_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    className="block-type-option"
                    onClick={() => handleAddBlock(option.type)}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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