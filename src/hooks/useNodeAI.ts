import { useState, useCallback, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { aiExecutionEngine, ChatMode, ExecutionOptions, WriteNodeData } from '../services/AIExecutionEngine'
import { useNodeUpdates } from './useNodeUpdates'
import { useCanvasContext } from '../contexts/CanvasContext'
import type { ExecutionState } from '../types/ai'
import type { NodeData } from '../types'

export function useNodeAI(nodeId: string) {
  const { getNode, getNodes, getEdges, setNodes } = useReactFlow()
  const { updateContent } = useNodeUpdates(nodeId)
  const { canvasName } = useCanvasContext()

  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle'
  })
  const executionRef = useRef<AbortController | null>(null)

  // Track content written via write_node tool
  const contentWrittenViaToolRef = useRef(false)

  // 执行AI任务
  const execute = useCallback(async (
    userInput: string,
    hiddenNodeIds: Set<string> = new Set(),
    model?: string,
    onWriteNode?: (nodeId: string, data: WriteNodeData) => void
  ) => {
    const node = getNode(nodeId)
    if (!node) return

    executionRef.current?.abort()
    executionRef.current = new AbortController()

    const nodeData = node.data as unknown as NodeData
    const nodeName = nodeData?.label || '未命名节点'
    const sessionId = Math.random().toString(36).substring(2, 9)

    // Reset flag at start of execution
    contentWrittenViaToolRef.current = false

    // Default onWriteNode uses updateContent for the current node
    const handleWriteNode = onWriteNode || ((targetNodeId: string, data: WriteNodeData) => {
      // Only update if writing to the current node
      if (targetNodeId === nodeId) {
        contentWrittenViaToolRef.current = true
        // Directly update React Flow state
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === nodeId) {
              return { ...n, data: { ...n.data, ...data } }
            }
            return n
          })
        )
      }
    })

    const options: ExecutionOptions = {
      mode: ChatMode.NODE_AGENTIC,
      userInput,
      nodeId,
      nodes: getNodes(),
      edges: getEdges(),
      hiddenNodeIds,
      model,
      canvasName,
      nodeName,
      sessionId,
      onStateChange: setExecutionState,
      onWriteNode: handleWriteNode,
    }

    try {
      // Agentic mode: AI may write to multiple nodes via onWriteNode callback
      const result = await aiExecutionEngine.execute(options)
      // Only update with AI's final response if content wasn't written via write_node tool
      // This prevents overwriting the actual content with AI's response text like "完成"
      if (result && !contentWrittenViaToolRef.current) {
        updateContent(result)
      }
    } catch (error) {
      console.error('AI execution failed:', error)
    }
  }, [nodeId, getNode, getNodes, getEdges, setNodes, updateContent, canvasName])

  // 取消执行
  const cancel = useCallback(() => {
    executionRef.current?.abort()
    setExecutionState({ status: 'idle' })
  }, [])

  // 重置状态
  const reset = useCallback(() => {
    setExecutionState({ status: 'idle' })
  }, [])

  return {
    executionState,
    execute,
    cancel,
    reset,
    isExecuting: executionState.status === 'generating' || executionState.status === 'pending'
  }
}
