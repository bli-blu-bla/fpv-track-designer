import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/editor/store'
import { defaultConfig } from '@/core/defaultConfig'

import { ThemeConfigPanel } from './ThemeConfigPanel'

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

describe('ThemeConfigPanel', () => {
  beforeEach(() => {
    resetStore()
  })

  it('updates the active theme when a theme option is selected', () => {
    render(<ThemeConfigPanel />)

    fireEvent.click(screen.getByRole('button', { name: /Nacht/i }))

    expect(useAppStore.getState().config.theme).toBe('night')
  })

it('offers only the supported theme options', () => {
  render(<ThemeConfigPanel />)

  expect(screen.getByRole('button', { name: /Minimal Standard/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Realistisch/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Nacht/i })).toBeTruthy()

  expect(screen.getAllByRole('button')).toHaveLength(3)
})
})
