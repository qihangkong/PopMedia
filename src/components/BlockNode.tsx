import { useRef, memo, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { NodeHeader } from './NodeHeader'
import { ResizeHandle } from './ResizeHandle'
import { NodeAIInput } from './NodeAIInput'
import { useNodeUpdates } from '../hooks/useNodeUpdates'
import { NODE_TYPE_MAP } from '../nodeTypes'
import { HANDLE_SIZE } from '../constants'
import { PlusIcon, TrashIcon } from '../icons'

interface BlockContent {
  id: string
  content: string
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

export const BlockNode = memo(function BlockNode({ data, selected, id }: BlockNodeProps) {
  const { updateContents, onResize } = useNodeUpdates(id)
  const meta = NODE_TYPE_MAP[data.type || 'block']
  const containerRef = useRef<HTMLDivElement>(null)

  // 初始化 contents 数组
  const contents = data.contents && data.contents.length > 0
    ? data.contents
    : []

  const handleContentBlur = useCallback((blockId: string, value: string) => {
    const newContents = contents.map((block) =>
      block.id === blockId ? { ...block, content: value } : block
    )
    updateContents(newContents)
  }, [contents, updateContents])

  const handleAddBlock = useCallback(() => {
    const newBlock: BlockContent = {
      id: `block-${Date.now()}`,
      content: '',
    }
    const newContents = [...contents, newBlock]
    updateContents(newContents)
  }, [contents, updateContents])

  const handleDeleteBlock = useCallback((blockId: string) => {
    if (contents.length <= 1) return // 至少保留一个 block
    const newContents = contents.filter((block) => block.id !== blockId)
    updateContents(newContents)
  }, [contents, updateContents])

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
            <div key={block.id} className="block-item">
              <div className="block-item-header">
                <span className="block-item-index">Block {index + 1}</span>
                {contents.length > 1 && (
                  <button
                    className="block-delete-btn"
                    onClick={() => handleDeleteBlock(block.id)}
                    title="删除此区块"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
              <textarea
                className="block-textarea"
                defaultValue={block.content}
                placeholder={meta?.placeholderText || '点击编辑内容'}
                onBlur={(e) => handleContentBlur(block.id, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
          ))}
          <button className="block-add-btn" onClick={handleAddBlock}>
            <PlusIcon />
            <span>添加区块</span>
          </button>
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