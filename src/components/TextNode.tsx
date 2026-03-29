import { useRef, memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { NodeHeader } from './NodeHeader'
import { ResizeHandle } from './ResizeHandle'
import { NodeAIInput } from './NodeAIInput'
import { useNodeUpdates } from '../hooks/useNodeUpdates'
import { NODE_TYPE_MAP } from '../nodeTypes'
import { HANDLE_SIZE } from '../constants'

interface TextNodeProps {
  data: { label: string; type: string; content?: string }
  selected: boolean
  id: string
}

export const TextNode = memo(function TextNode({ data, selected, id }: TextNodeProps) {
  const { updateContent, onResize } = useNodeUpdates(id)
  const meta = NODE_TYPE_MAP[data.type || 'text']
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleContentBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    updateContent(e.target.value)
  }

  return (
    <div
      className={`custom-node text-node${selected ? ' selected' : ''}`}
      data-id={id}
      style={{ width: '100%', height: '100%' }}
    >
      <NodeHeader id={id} type="text" label={data.label} />
      <div className="node-body">
        <textarea
          ref={textareaRef}
          className="text-node-content"
          defaultValue={data.content || ''}
          placeholder={meta?.placeholderText}
          onBlur={handleContentBlur}
          onPointerDown={(e) => e.stopPropagation()}
        />
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