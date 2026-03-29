import { useMemo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { UpstreamContextManager } from '../services/UpstreamContextManager'

export function useUpstreamPreview(nodeId: string, maxDepth: number = 2) {
  const { getNodes, getEdges } = useReactFlow()

  const upstreamNodes = useMemo(() => {
    return UpstreamContextManager.getUpstreamContent(
      nodeId,
      getNodes(),
      getEdges(),
      maxDepth
    )
  }, [nodeId, maxDepth, getNodes, getEdges])

  const contextPrompt = useMemo(() => {
    return UpstreamContextManager.buildContextPrompt(upstreamNodes)
  }, [upstreamNodes])

  return { upstreamNodes, contextPrompt }
}
