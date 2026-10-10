import { useMemo } from 'react'
import { GATE_BASE_WIDTH } from '@/core/constants/gateDimensions'
import { GATE_DEFINITIONS } from '@/core/gates/gateDefinitions'
import { parseTrackExport } from '@/core/schemas/track.schema'
import { cn } from '@/lib/utils'

const FIELD_PADDING_M = 1.5

interface TrackSketchProps {
  /** Raw export object; anything invalid renders nothing. */
  data: unknown
  className?: string
}

/**
 * Top-down 2D sketch of a track (field, gates, lap order) for entries without a preview image.
 * Same orientation as the 3D top view: x to the right, z downwards, gate width along its local x axis.
 */
export function TrackSketch({ data, className }: TrackSketchProps) {
  const track = useMemo(() => {
    const result = parseTrackExport(data)
    return 'error' in result ? null : result.track
  }, [data])

  if (!track) return null

  const { width, height } = track.fieldSize
  const gateById = new Map(track.gates.map((gate) => [gate.id, gate]))
  const lap = track.gateSequence
    .flatMap((entry) => gateById.get(entry.gateId) ?? [])
    .filter((gate, index, list) => gate !== list[index - 1])
  const lapPoints = lap.map((gate) => `${gate.position.x},${gate.position.z}`).join(' ')

  return (
    <svg
      viewBox={`${-width / 2 - FIELD_PADDING_M} ${-height / 2 - FIELD_PADDING_M} ${width + FIELD_PADDING_M * 2} ${height + FIELD_PADDING_M * 2}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={track.name}
      className={cn('bg-slate-900', className)}
    >
      <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={0.5} fill="#14532d" fillOpacity={0.35} stroke="#4ade80" strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {lap.length > 1 && (
        <polygon points={lapPoints} fill="none" stroke="#fbbf24" strokeOpacity={0.55} strokeWidth={1.25} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      )}
      {track.gates.map((gate) => {
        const angle = (gate.rotation * Math.PI) / 180
        const halfX = (Math.cos(angle) * GATE_BASE_WIDTH) / 2
        const halfZ = (-Math.sin(angle) * GATE_BASE_WIDTH) / 2
        return (
          <line
            key={gate.id}
            x1={gate.position.x - halfX}
            y1={gate.position.z - halfZ}
            x2={gate.position.x + halfX}
            y2={gate.position.z + halfZ}
            stroke={GATE_DEFINITIONS[gate.type].isStartFinish ? '#fbbf24' : '#e2e8f0'}
            strokeWidth={3}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}
