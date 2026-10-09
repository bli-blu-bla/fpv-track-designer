import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/editor/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultConfig } from '@/editor/store/configSlice'
import * as generator from '@/core/track/generator'
import type { Track } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'

import { LeftToolPanel } from './LeftToolPanel'

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

const createMockTrack = (id: string): Track => ({
  id,
  name: `Track ${id}`,
  gates: [
    {
      id: `${id}-gate`,
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: createDefaultGateOpenings('standard'),
    },
  ],
  gateSequence: [{ gateId: `${id}-gate`, openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

const renderPanel = () =>
  render(
    <TooltipProvider>
      <LeftToolPanel />
    </TooltipProvider>,
  )

describe('LeftToolPanel', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('calls generateTrack and setTrack from Mischen', async () => {
    const trackByShuffle = createMockTrack('shuffle')

    const generateTrackMock = vi
      .spyOn(generator, 'generateTrack')
      .mockReturnValueOnce(trackByShuffle)

    renderPanel()

    const shuffleButton = screen.getByRole('button', { name: 'Shuffle' })

    fireEvent.click(shuffleButton)
    await waitFor(() => expect(generateTrackMock).toHaveBeenCalledTimes(1))
    expect(generateTrackMock).toHaveBeenCalledWith(useAppStore.getState().config)
    expect(useAppStore.getState().currentTrack?.id).toBe('shuffle')
  })

  it('renders Track Teilen between Speichern and Galerie', () => {
    renderPanel()

    const buttonNames = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))

    expect(buttonNames).toEqual(['Shuffle', 'Speichern', 'Track Teilen', 'Galerie', 'Einstellungen', 'Design'])
    expect(screen.queryByRole('button', { name: 'Neue Strecke' })).toBeNull()
  })

  it('disables Track Teilen when no track is loaded', () => {
    renderPanel()

    expect(screen.getByRole('button', { name: 'Track Teilen' })).toHaveProperty('disabled', true)
  })

  it('opens a share dialog and keeps the long viewer URL when the short URL arrives', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ shortUrl: 'http://go.fpvooe.com/viMbW' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    useAppStore.setState({ currentTrack: createMockTrack('share') })

    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Track Teilen' }))

    const longShareInput = screen.getByLabelText('Langer Link')
    const shortShareInput = screen.getByLabelText('Teilbarer Link')
    expect(longShareInput).toHaveProperty('value')
    expect((longShareInput as HTMLInputElement).value.startsWith('https://sharedtrack.fpvooe.com/#')).toBe(true)
    expect(shortShareInput).toHaveProperty('value', '')

    await waitFor(() => expect(shortShareInput).toHaveProperty('value', 'http://go.fpvooe.com/viMbW'))
    expect((longShareInput as HTMLInputElement).value.startsWith('https://sharedtrack.fpvooe.com/#')).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/shorten-track',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })
})
