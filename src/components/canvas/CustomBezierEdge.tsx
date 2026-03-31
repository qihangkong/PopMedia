import { Position, EdgeProps, getBezierPath } from '@xyflow/react'
import { EDGE_OFFSET } from '../../constants'

function getOffset(pos: Position): { x: number; y: number } {
  switch (pos) {
    case Position.Left:
      return { x: EDGE_OFFSET, y: 0 }
    case Position.Right:
      return { x: -EDGE_OFFSET, y: 0 }
    case Position.Top:
      return { x: 0, y: -EDGE_OFFSET }
    case Position.Bottom:
      return { x: 0, y: EDGE_OFFSET }
    default:
      return { x: 0, y: 0 }
  }
}

export function CustomBezierEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  selected,
  style,
}: EdgeProps) {
  const sourceOff = getOffset(sourcePosition)
  const targetOff = getOffset(targetPosition)

  const [edgePath] = getBezierPath({
    sourceX: sourceX + sourceOff.x,
    sourceY: sourceY + sourceOff.y,
    sourcePosition,
    targetX: targetX + targetOff.x,
    targetY: targetY + targetOff.y,
    targetPosition,
  })

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={selected ? '#3b82f6' : '#ffffff'}
        strokeWidth={2}
        style={{
          transition: 'stroke 0.2s',
          ...style,
        }}
      />
    </>
  )
}

export const edgeTypes = {
  bezier: CustomBezierEdge,
}