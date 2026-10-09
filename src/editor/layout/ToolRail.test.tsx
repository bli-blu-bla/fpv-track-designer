import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/editor/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultConfig } from '@/core/defaultConfig'
import type { Track } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { useShareTrack } from '@/editor/hooks/useShareTrack'
import { ShareTrackDialog } from '@/editor/panels/ShareTrackDialog'

import { ToolRail } from './ToolRail'
import type { SidePanelId } from './sidePanels'

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

function RailWithShare({ activePanel = null, onPanelToggle = () => undefined }: {
  activePanel?: SidePanelId | null
  onPanelToggle?: (panel: SidePanelId) => void
}) {
  const { share, dialogProps } = useShareTrack()
  const hasTrack = useAppStore((state) => state.currentTrack !== null)

  return (
    <TooltipProvider>
      <ToolRail
        activePanel={activePanel}
        onPanelToggle={onPanelToggle}
        onShareClick={share}
        shareDisabled={!hasTrack}
        onShortcutsClick={() => undefined}
      />
      <ShareTrackDialog {...dialogProps} />
    </TooltipProvider>
  )
}

describe('ToolRail', () => {
  beforeEach(() => {
    useAppStore.setState({ config: defaultConfig, currentTrack: null })
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('lists panels, gallery, share and shortcuts in rail order', () => {
    render(<RailWithShare />)

    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))

    expect(names).toEqual(['Bibliothek', 'Ebenen', 'Meine Tracks', 'Track Teilen', 'Feld', 'Darstellung', 'Tastenkürzel'])
  })

  it('marks the active panel and reports toggles', () => {
    const onPanelToggle = vi.fn<(panel: SidePanelId) => void>()
    render(<RailWithShare activePanel="layers" onPanelToggle={onPanelToggle} />)

    expect(screen.getByRole('button', { name: 'Ebenen' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Feld' }))
    fireEvent.click(screen.getByRole('button', { name: 'Meine Tracks' }))

    expect(onPanelToggle).toHaveBeenCalledWith('field')
    expect(onPanelToggle).toHaveBeenCalledWith('tracks')
  })

  it('disables sharing when no track is loaded', () => {
    render(<RailWithShare />)

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

    render(<RailWithShare />)

    fireEvent.click(screen.getByRole('button', { name: 'Track Teilen' }))

    const longShareInput = screen.getByLabelText('Langer Link')
    const shortShareInput = screen.getByLabelText('Teilbarer Link')
    expect((longShareInput as HTMLInputElement).value.startsWith('https://sharedtrack.fpvooe.com/#')).toBe(true)
    expect(shortShareInput).toHaveProperty('value', '')

    await waitFor(() => expect(shortShareInput).toHaveProperty('value', 'http://go.fpvooe.com/viMbW'))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/shorten-track',
      expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' } }),
    )
  })
})
