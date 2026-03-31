import { useState, useCallback, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { aiExecutionEngine, ChatMode, ExecutionOptions } from '../services/AIExecutionEngine'
import { useNodeUpdates } from './useNodeUpdates'
import { useCanvasContext } from '../contexts/CanvasContext'
import type { ExecutionState } from '../types/ai'
import type { NodeData } from '../types'

export function useNodeAI(nodeId: string) {
  const { getNode, getNodes, getEdges } = useReactFlow()
  const { updateContent } = useNodeUpdates(nodeId)
  const { canvasName } = useCanvasContext()

  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle'
  })
  const executionRef = useRef<AbortController | null>(null)

  // 执行AI任务
  const execute = useCallback(async (
    userInput: string,
    hiddenNodeIds: Set<string> = new Set(),
    model?: string,
    onWriteNode?: (nodeId: string, content: string) => void
  ) => {
    const node = getNode(nodeId)
    if (!node) return

    executionRef.current?.abort()
    executionRef.current = new AbortController()

    const nodeData = node.data as unknown as NodeData
    const nodeName = nodeData?.label || '未命名节点'
    const sessionId = Math.random().toString(36).substring(2, 9)

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
      onWriteNode,
    }

    try {
      // Agentic mode: AI may write to multiple nodes via onWriteNode callback
      const result = await aiExecutionEngine.execute(options)
      // If AI returns text content, write it to the current node
      if (result) {
        updateContent(result)
      }
    } catch (error) {
      console.error('AI execution failed:', error)
    }
  }, [nodeId, getNode, getNodes, getEdges, updateContent, canvasName])

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
