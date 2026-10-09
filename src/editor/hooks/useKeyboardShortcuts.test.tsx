import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/editor/store'
import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import type { Track } from '@/core/types'

import { useKeyboardShortcuts } from './useKeyboardShortcuts'

const resetStore = () => {
  useAppStore.setState({
    config: defaultConfig,
    currentTrack: null,
    selectedGateId: null,
    selectedGateIds: [],
    isDeleteDialogOpen: false,
    isDraggingGate: false,
    past: [],
    future: [],
  })
}

const ShortcutHarness = ({
  onShuffle,
}: {
  onShuffle?: () => void
}) => {
  useKeyboardShortcuts({
    onShuffle,
  })

  return null
}

describe('useKeyboardShortcuts', () => {
  it('dispatches shuffle via S', () => {
    const onShuffle = vi.fn()

    resetStore()

    render(<ShortcutHarness onShuffle={onShuffle} />)

    fireEvent.keyDown(window, { key: 's' })
    expect(onShuffle).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'S' })
    expect(onShuffle).toHaveBeenCalledTimes(2)
  })

  describe('arrow keys on a selected gate', () => {
    const loadTrack = () => {
      resetStore()
      const track: Track = {
        id: 't',
        name: 'T',
        gates: [{ id: 'g1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('standard') }],
        gateSequence: [{ gateId: 'g1', openingId: 'main', reverse: false }],
        fieldSize: { width: 30, height: 15 },
        createdAt: '',
        updatedAt: '',
      }
      useAppStore.getState().setTrack(track)
    }
    const gate = () => useAppStore.getState().currentTrack!.gates[0]

    it('move, raise and rotate the selection', () => {
      loadTrack()
      useAppStore.getState().selectGate('g1')
      render(<ShortcutHarness />)

      fireEvent.keyDown(window, { key: 'ArrowRight' })
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      expect(gate().position.x).toBeCloseTo(0.1)
      expect(gate().position.z).toBeCloseTo(-0.1)

      fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true })
      expect(gate().position.y).toBeCloseTo(0.1)

      fireEvent.keyDown(window, { key: 'ArrowLeft', shiftKey: true })
      expect(gate().rotation).toBe(355)
    })

    it('does nothing without a selection or while typing', () => {
      loadTrack()
      render(<><ShortcutHarness /><input aria-label="field" /></>)

      fireEvent.keyDown(window, { key: 'ArrowRight' })
      expect(gate().position.x).toBe(0)

      useAppStore.getState().selectGate('g1')
      fireEvent.keyDown(document.querySelector('input')!, { key: 'ArrowRight' })
      expect(gate().position.x).toBe(0)
    })

    it('folds a held key into one undo step', () => {
      loadTrack()
      useAppStore.getState().selectGate('g1')
      render(<ShortcutHarness />)
      const historyBefore = useAppStore.getState().past.length

      fireEvent.keyDown(window, { key: 'ArrowRight' })
      fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true })
      fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true })

      expect(gate().position.x).toBeCloseTo(0.3)
      expect(useAppStore.getState().past).toHaveLength(historyBefore + 1)

      useAppStore.getState().undo()
      expect(gate().position.x).toBe(0)
    })
  })
})
