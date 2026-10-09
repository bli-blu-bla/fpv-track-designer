import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/editor/store'
import { defaultConfig } from '@/editor/store/configSlice'
import type { Config, Track } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { listTracks, saveTrack } from '@/editor/storage'

import { TrackGallery } from './TrackGallery'

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

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'duplicated-track-id'),
  },
  configurable: true,
})

const createTestTrack = (overrides?: Partial<Track>): Track => ({
  id: 'test-track-id',
  name: 'Test Track',
  gates: [
    {
      id: 'gate-1',
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: createDefaultGateOpenings('standard'),
    },
  ],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 20, height: 15 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

const createTestConfig = (overrides?: Partial<Config>): Config => ({
  ...defaultConfig,
  gateQuantities: { ...defaultConfig.gateQuantities },
  fieldSize: { ...defaultConfig.fieldSize },
  ...overrides,
})

function resetStore() {
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

describe('TrackGallery', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    resetStore()
  })

  it('refreshes saved tracks when the gallery opens', async () => {
    const { rerender } = render(
      <TrackGallery open={false} onOpenChange={vi.fn()} />,
    )

    saveTrack(createTestTrack({ id: 'track-1', name: 'Track 1' }), createTestConfig())
    saveTrack(createTestTrack({ id: 'track-2', name: 'Track 2' }), createTestConfig())

    rerender(<TrackGallery open onOpenChange={vi.fn()} />)

    expect(await screen.findByText('Track 1')).not.toBeNull()
    expect(await screen.findByText('Track 2')).not.toBeNull()
  })

  it('loads the selected track and its saved config', async () => {
    const onOpenChange = vi.fn()
    const savedConfig = createTestConfig({
      fieldSize: { width: 42, height: 24 },
      showFlightPath: false,
    })

    saveTrack(
      createTestTrack({
        id: 'loaded-track',
        name: 'Loaded Track',
        fieldSize: savedConfig.fieldSize,
      }),
      savedConfig,
    )

    render(<TrackGallery open onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: /laden/i }))

    await waitFor(() => expect(useAppStore.getState().currentTrack?.id).toBe('loaded-track'))
    expect(useAppStore.getState().config.fieldSize).toEqual({ width: 42, height: 24 })
    expect(useAppStore.getState().config.showFlightPath).toBe(false)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('asks for confirmation before deleting a saved track', () => {
    saveTrack(createTestTrack({ id: 'track-to-delete', name: 'Delete Me' }), createTestConfig())

    render(<TrackGallery open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /löschen/i }))

    expect(screen.getByText('Gespeicherte Strecke löschen?')).not.toBeNull()
    expect(screen.getByText(/„Delete Me“ wird aus der Galerie entfernt/i)).not.toBeNull()
    expect(listTracks()).toHaveLength(1)
  })

  it('keeps the track when delete confirmation is cancelled', () => {
    saveTrack(createTestTrack({ id: 'track-to-keep', name: 'Keep Me' }), createTestConfig())

    render(<TrackGallery open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /löschen/i }))
    fireEvent.click(screen.getByRole('button', { name: /abbrechen/i }))

    expect(screen.queryByText('Gespeicherte Strecke löschen?')).toBeNull()
    expect(screen.getByText('Keep Me')).not.toBeNull()
    expect(listTracks()).toHaveLength(1)
  })

  it('deletes and refreshes the gallery when confirmed', () => {
    saveTrack(createTestTrack({ id: 'track-to-confirm', name: 'Confirm Delete' }), createTestConfig())

    render(<TrackGallery open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /löschen/i }))
    fireEvent.click(screen.getByRole('button', { name: /strecke löschen/i }))

    expect(screen.queryByText('Confirm Delete')).toBeNull()
    expect(screen.getByText('Noch keine gespeicherten Strecken')).not.toBeNull()
    expect(listTracks()).toHaveLength(0)
  })

  it('duplicates a saved track with a new name and loads the copy', async () => {
    const onOpenChange = vi.fn()
    const savedConfig = createTestConfig({
      fieldSize: { width: 36, height: 18 },
      showOpeningLabels: false,
    })

    saveTrack(
      createTestTrack({
        id: 'track-to-copy',
        name: 'Original Track',
        fieldSize: savedConfig.fieldSize,
      }),
      savedConfig,
    )

    render(<TrackGallery open onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: /duplizieren/i }))
    expect(screen.getByText('Strecke duplizieren')).not.toBeNull()
    expect(screen.getByDisplayValue('Original Track Kopie')).not.toBeNull()

    fireEvent.change(screen.getByLabelText('Neuer Streckenname'), {
      target: { value: 'Version 2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^duplizieren$/i }))

    const tracks = listTracks()
    expect(tracks).toHaveLength(2)
    expect(tracks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'track-to-copy', name: 'Original Track' }),
        expect.objectContaining({ id: 'duplicated-track-id', name: 'Version 2' }),
      ]),
    )
    expect(screen.getByText('Original Track')).not.toBeNull()
    expect(screen.getByText('Version 2')).not.toBeNull()
    await waitFor(() => expect(useAppStore.getState().currentTrack?.id).toBe('duplicated-track-id'))
    expect(useAppStore.getState().currentTrack?.name).toBe('Version 2')
    expect(useAppStore.getState().config.fieldSize).toEqual({ width: 36, height: 18 })
    expect(useAppStore.getState().config.showOpeningLabels).toBe(false)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('confirms the delete dialog when Enter is pressed', () => {
    saveTrack(createTestTrack({ id: 'track-enter-delete', name: 'Enter Delete' }), createTestConfig())

    render(<TrackGallery open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /löschen/i }))
    const confirmationForm = screen.getByText('Gespeicherte Strecke löschen?').closest('form')
    if (!confirmationForm) {
      throw new Error('Expected delete confirmation form to be rendered')
    }
    fireEvent.keyDown(confirmationForm, { key: 'Enter' })

    expect(screen.queryByText('Enter Delete')).toBeNull()
    expect(listTracks()).toHaveLength(0)
  })
})
