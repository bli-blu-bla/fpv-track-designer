import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/editor/store'
import { defaultConfig } from '@/editor/store/configSlice'

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
})
