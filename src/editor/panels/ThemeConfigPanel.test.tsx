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

  it('switches the sky and the graphics quality', () => {
    render(<ThemeConfigPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Dämmerung' }))
    fireEvent.click(screen.getByRole('button', { name: /Realistisch/ }))

    expect(useAppStore.getState().config).toMatchObject({ sky: 'dusk', quality: 'realistic' })
  })

  it('offers four skies and two quality levels', () => {
    render(<ThemeConfigPanel />)

    for (const name of ['Tag', 'Dämmerung', 'Nacht', 'Studio']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    expect(screen.getAllByRole('button')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Tag' }).getAttribute('aria-pressed')).toBe('true')
  })
})
