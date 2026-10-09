import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { useAppStore } from '@/editor/store'

import { GateLibraryPanel } from './GateLibraryPanel'
import { LayersPanel } from './LayersPanel'

function loadTrackWithStartGate() {
  useAppStore.setState({ config: defaultConfig, currentTrack: null, selectedGateId: null, selectedGateIds: [] })
  useAppStore.getState().setTrack({
      id: 't',
      name: 'T',
      gates: [{ id: 'sf', type: 'start-finish', position: { x: 5, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('start-finish') }],
      gateSequence: [{ gateId: 'sf', openingId: 'main', reverse: false }],
      fieldSize: { width: 30, height: 15 },
      createdAt: '',
      updatedAt: '',
    })
}

describe('GateLibraryPanel', () => {
  beforeEach(loadTrackWithStartGate)

  it('places a gate in the field center, appends it to the lap and selects it', () => {
    render(<GateLibraryPanel />)

    fireEvent.click(screen.getByRole('button', { name: /Leiter-Gate/ }))

    const { currentTrack, selectedGateId } = useAppStore.getState()
    expect(currentTrack?.gates[1]).toMatchObject({ type: 'ladder', position: { x: 0, y: 0, z: 0 } })
    expect(currentTrack?.gates[1].id).toBe(selectedGateId)
    expect(currentTrack?.gateSequence.at(-1)?.gateId).toBe(selectedGateId)
  })

  it('disables the start/finish gate once one is placed', () => {
    render(<GateLibraryPanel />)

    expect(screen.getByRole('button', { name: /Start\/Ziel-Gate/ })).toHaveProperty('disabled', true)
  })

  it('filters by category and search text', () => {
    render(<GateLibraryPanel />)

    fireEvent.click(screen.getByRole('tab', { name: 'Flaggen' }))
    expect(screen.queryByRole('button', { name: /Leiter-Gate/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Flaggen-Gate klein/ })).not.toBeNull()

    fireEvent.change(screen.getByLabelText('Objekte suchen…'), { target: { value: 'klein' } })
    expect(screen.getAllByRole('button').filter((button) => button.textContent?.includes('Flaggen-Gate'))).toHaveLength(1)
  })
})

describe('LayersPanel', () => {
  beforeEach(loadTrackWithStartGate)

  it('selects a gate from the list', () => {
    render(<LayersPanel />)

    fireEvent.click(screen.getByRole('button', { name: /Start\/Ziel-Gate/ }))

    expect(useAppStore.getState().selectedGateIds).toEqual(['sf'])
  })
})
