import { useMemo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { UpstreamContextManager } from '../services/UpstreamContextManager'

export function useUpstreamPreview(nodeId: string, maxDepth: number = 2) {
  const { getNodes, getEdges } = useReactFlow()

  // Note: getNodes/getEdges return stable references from useReactFlow's state
  const nodes = getNodes()
  const edges = getEdges()

  const upstreamNodes = useMemo(() => {
    return UpstreamContextManager.getUpstreamContent(nodeId, nodes, edges, maxDepth)
  }, [nodeId, maxDepth, nodes, edges])

  const contextPrompt = useMemo(() => {
    return UpstreamContextManager.buildContextPrompt(upstreamNodes)
  }, [upstreamNodes])

  return { upstreamNodes, contextPrompt }
}
