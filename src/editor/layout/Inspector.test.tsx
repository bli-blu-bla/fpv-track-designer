import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import type { Gate, Track } from '@/core/types'
import { useAppStore } from '@/editor/store'

import { Inspector } from './Inspector'

const gate = (id: string, type: Gate['type'], x: number): Gate => ({
  id,
  type,
  position: { x, y: 0, z: 0 },
  rotation: 0,
  openings: createDefaultGateOpenings(type, id),
})

const track = (): Track => ({
  id: 't',
  name: 'T',
  gates: [gate('a', 'standard', 0), gate('b', 'flag', 4), gate('c', 'standard', 8)],
  gateSequence: [
    { gateId: 'a', openingId: 'main', reverse: false },
    { gateId: 'b', openingId: 'main', reverse: false },
    { gateId: 'c', openingId: 'main', reverse: false },
  ],
  fieldSize: { width: 30, height: 15 },
  createdAt: '',
  updatedAt: '',
})

describe('Inspector', () => {
  beforeEach(() => {
    useAppStore.setState({ config: defaultConfig, currentTrack: null, selectedGateId: null, selectedGateIds: [], past: [], future: [] })
    useAppStore.getState().setTrack(track())
  })

  it('shows track stats without a selection', () => {
    render(<Inspector />)

    expect(screen.getByText('Objekte').nextSibling?.textContent).toBe('3')
    expect(screen.getByText('Stangen').nextSibling?.textContent).toBe('8')
    expect(screen.getByText('Feld').nextSibling?.textContent).toBe('30×15')
  })

  it('edits position, rotation and pass order of the selected gate', () => {
    useAppStore.getState().selectGate('b')
    render(<Inspector />)

    expect(screen.getByRole('heading', { name: 'Flaggen-Gate 2' })).not.toBeNull()
    expect(screen.getByText('Durchflug 2 / 3')).not.toBeNull()

    const [xInput] = screen.getAllByRole('spinbutton')
    fireEvent.change(xInput, { target: { value: '99' } })
    fireEvent.blur(xInput)
    expect(useAppStore.getState().currentTrack?.gates[1].position.x).toBe(15)

    fireEvent.click(screen.getByRole('button', { name: '90°' }))
    expect(useAppStore.getState().currentTrack?.gates[1].rotation).toBe(90)

    fireEvent.click(screen.getByRole('button', { name: 'Später durchfliegen' }))
    expect(useAppStore.getState().currentTrack?.gateSequence.map((entry) => entry.gateId)).toEqual(['a', 'c', 'b'])
  })

  it('duplicates the selected gate next to it and selects the copy', () => {
    useAppStore.getState().selectGate('a')
    render(<Inspector />)

    fireEvent.click(screen.getByRole('button', { name: 'Duplizieren' }))

    const { currentTrack, selectedGateId } = useAppStore.getState()
    expect(currentTrack?.gates).toHaveLength(4)
    expect(currentTrack?.gates[1].id).toBe(selectedGateId)
    expect(currentTrack?.gates[1].position.x).toBe(1.5)
    expect(currentTrack?.gateSequence[1].gateId).toBe(selectedGateId)
  })

  it('opens the delete confirmation', () => {
    useAppStore.getState().selectGate('c')
    render(<Inspector />)

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(useAppStore.getState().isDeleteDialogOpen).toBe(true)
  })
})
