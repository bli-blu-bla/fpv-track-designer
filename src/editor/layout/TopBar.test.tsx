import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import type { Track } from '@/core/types'
import { useAppStore } from '@/editor/store'

import { TopBar } from './TopBar'

const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
})

const createTrack = (): Track => ({
  id: 'track-1',
  name: 'Vereinsrennen',
  gates: [{ id: 'g1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('standard') }],
  gateSequence: [{ gateId: 'g1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

const resetStore = () => {
  useAppStore.setState({
    config: defaultConfig,
    currentTrack: null,
    isTrackModified: false,
    past: [],
    future: [],
  })
}

const renderTopBar = ({
  fpvModeActive = false,
  fpvDisabled = false,
  onFpvToggle = vi.fn<() => void>(),
  onShuffle = vi.fn<() => void>(),
} = {}) => {
  const onShortcutsClick = vi.fn<() => void>()

  render(
    <TooltipProvider>
      <TopBar
        onShortcutsClick={onShortcutsClick}
        onShuffle={onShuffle}
        fpvModeActive={fpvModeActive}
        fpvDisabled={fpvDisabled}
        onFpvToggle={onFpvToggle}
      />
    </TooltipProvider>,
  )

  return { onFpvToggle, onShortcutsClick, onShuffle }
}

describe('TopBar', () => {
  beforeEach(() => {
    resetStore()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('toggles FPV flight from the primary button', () => {
    const { onFpvToggle } = renderTopBar()

    fireEvent.click(screen.getByRole('button', { name: 'FPV-Flug' }))

    expect(onFpvToggle).toHaveBeenCalledTimes(1)
  })

  it('shows the stop label while flying', () => {
    renderTopBar({ fpvModeActive: true })

    expect(screen.getByRole('button', { name: 'FPV stoppen' })).not.toBeNull()
  })

  it('disables undo and redo without history', () => {
    renderTopBar()

    expect(screen.getByRole('button', { name: 'Rückgängig' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Wiederholen' })).toHaveProperty('disabled', true)
  })

  it('triggers shuffle', () => {
    const { onShuffle } = renderTopBar()

    fireEvent.click(screen.getByRole('button', { name: 'Strecke shuffeln' }))

    expect(onShuffle).toHaveBeenCalledTimes(1)
  })

  it('renames the track on blur and marks it unsaved', () => {
    useAppStore.getState().setTrack(createTrack())
    renderTopBar()

    const nameInput = screen.getByLabelText('Streckenname')
    expect(screen.getByLabelText('Gespeichert')).not.toBeNull()

    fireEvent.change(nameInput, { target: { value: 'Halle Training' } })
    fireEvent.blur(nameInput)

    expect(useAppStore.getState().currentTrack?.name).toBe('Halle Training')
    expect(screen.getByRole('button', { name: 'Ungespeicherte Änderungen – jetzt speichern' })).not.toBeNull()
  })

  it('offers JSON export and import in the export menu', () => {
    useAppStore.getState().setTrack(createTrack())
    renderTopBar()

    fireEvent.click(screen.getByRole('button', { name: 'Exportieren' }))

    expect(screen.getByRole('button', { name: 'Als JSON' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Importieren…' })).not.toBeNull()
  })

  it('switches header labels to English via the language toggle', () => {
    renderTopBar()

    fireEvent.click(screen.getByRole('button', { name: 'Sprache auf Englisch umstellen' }))

    expect(screen.getByRole('button', { name: 'Switch language to German' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'FPV flight' })).not.toBeNull()
    expect(window.localStorage.getItem('fpv-track-designer-language')).toBe('en')
  })
})
