import { useState, useCallback, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { AIExecutionEngine, ChatMode, ExecutionOptions } from '../services/AIExecutionEngine'
import { useNodeUpdates } from './useNodeUpdates'
import type { ExecutionState } from '../types/ai'

export function useNodeAI(nodeId: string) {
  const { getNode, getNodes, getEdges } = useReactFlow()
  const { updateContent } = useNodeUpdates(nodeId)

  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle'
  })
  const executionRef = useRef<AbortController | null>(null)

  // 执行AI任务
  const execute = useCallback(async (userInput: string, hiddenNodeIds: Set<string> = new Set(), model?: string) => {
    const node = getNode(nodeId)
    if (!node) return

    executionRef.current?.abort()
    executionRef.current = new AbortController()

    const options: ExecutionOptions = {
      mode: ChatMode.NODE_EXECUTE,
      userInput,
      nodeId,
      nodes: getNodes(),
      edges: getEdges(),
      hiddenNodeIds,
      model,
      onStateChange: setExecutionState,
    }

    try {
      const result = await AIExecutionEngine.execute(options)
      // 执行完成后写入节点内容
      updateContent(result)
    } catch (error) {
      console.error('AI execution failed:', error)
    }
  }, [nodeId, getNode, getNodes, getEdges, updateContent])

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
