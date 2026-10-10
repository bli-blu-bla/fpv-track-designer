import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { serializeTrack } from '@/core/schemas/track.schema'
import type { Track } from '@/core/types'
import { TrackSketch } from './TrackSketch'

const track: Track = {
  id: 'sketch',
  name: 'Sketch Track',
  gates: [
    { id: 'g1', type: 'standard', position: { x: -5, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('standard') },
    { id: 'g2', type: 'standard', position: { x: 5, y: 0, z: 2 }, rotation: 90, openings: createDefaultGateOpenings('standard') },
  ],
  gateSequence: [
    { gateId: 'g1', openingId: 'main', reverse: false },
    { gateId: 'g2', openingId: 'main', reverse: false },
  ],
  fieldSize: { width: 30, height: 20 },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

describe('TrackSketch', () => {
  it('draws the field, one line per gate and the lap', () => {
    const { container } = render(<TrackSketch data={JSON.parse(serializeTrack(track, defaultConfig))} />)

    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('-16.5 -11.5 33 23')
    expect(svg?.getAttribute('aria-label')).toBe('Sketch Track')
    expect(container.querySelectorAll('line')).toHaveLength(2)
    expect(container.querySelector('polygon')?.getAttribute('points')).toBe('-5,0 5,2')
    // Rotation 90° turns the gate width onto the z axis.
    const rotated = container.querySelectorAll('line')[1]
    expect(Number(rotated.getAttribute('x1'))).toBeCloseTo(5)
    expect(Number(rotated.getAttribute('y1'))).toBeCloseTo(2.6)
  })

  it('renders nothing for invalid data', () => {
    const { container } = render(<TrackSketch data={{ version: '2.1.0', track: { gates: 'x' } }} />)

    expect(container.innerHTML).toBe('')
  })
})
