import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultConfig } from '@/core/defaultConfig'
import type { Track } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { useViewerStore } from './store'
import { ViewerApp } from './ViewerApp'

const createObjectURL = vi.fn<(_: Blob | MediaSource) => string>(() => 'blob:viewer-track')
const revokeObjectURL = vi.fn<(_: string) => void>()
const anchorClick = vi.fn<() => void>()

vi.mock('@/scene/Scene', () => ({
  Scene: ({
    gateComponent,
    onGroundClick,
    fpvModeActive,
    onFpvComplete,
  }: {
    gateComponent?: unknown
    onGroundClick?: () => void
    fpvModeActive?: boolean
    onFpvComplete?: () => void
  }) => (
    <div
      data-testid="viewer-scene"
      data-readonly={String(gateComponent === undefined && onGroundClick === undefined)}
      data-fpv-active={String(fpvModeActive)}
    >
      <button type="button" onClick={onFpvComplete}>Complete FPV</button>
    </div>
  ),
}))

const createTestTrack = (gateCount = 1): Track => ({
  id: 'viewer-track',
  name: 'Viewer Track',
  gates: Array.from({ length: gateCount }, (_, index) => ({
    id: `gate-${index + 1}`,
    type: 'standard',
    position: { x: index * 5, y: 0, z: 0 },
    rotation: 0,
    openings: createDefaultGateOpenings('standard'),
  })),
  gateSequence: Array.from({ length: gateCount }, (_, index) => ({
    gateId: `gate-${index + 1}`,
    openingId: 'main',
    reverse: false,
  })),
  fieldSize: { width: 30, height: 15 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

describe('ViewerApp', () => {
  beforeEach(() => {
    useViewerStore.getState().reset()
    document.cookie = 'fpv-track-viewer-help-seen=; max-age=0; path=/'
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    anchorClick.mockClear()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    HTMLAnchorElement.prototype.click = anchorClick
  })

  it('renders a German error state', () => {
    useViewerStore.getState().setError('Der geteilte Track-Link ist ungültig.')

    render(<ViewerApp />)

    expect(screen.getByText('Track kann nicht geladen werden')).not.toBeNull()
    expect(screen.getByText('Der geteilte Track-Link ist ungültig.')).not.toBeNull()
  })

  it('renders the scene in read-only mode without editor UI labels', () => {
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    expect(screen.getByTestId('viewer-scene').getAttribute('data-readonly')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Speichern' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Galerie' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Einstellungen' })).toBeNull()
    expect(screen.getByRole('button', { name: 'FPV-Flug starten' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Track als JSON herunterladen' })).not.toBeNull()
  })

  it('starts and stops the FPV flight from the viewer controls', () => {
    useViewerStore.getState().setTrackData(createTestTrack(2), defaultConfig)

    render(<ViewerApp />)

    expect(screen.getByTestId('viewer-scene').getAttribute('data-fpv-active')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'FPV-Flug starten' }))
    expect(screen.getByTestId('viewer-scene').getAttribute('data-fpv-active')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'FPV-Flug stoppen' }))
    expect(screen.getByTestId('viewer-scene').getAttribute('data-fpv-active')).toBe('false')
  })

  it('stops the FPV flight with Escape in viewer mode', () => {
    useViewerStore.getState().setTrackData(createTestTrack(2), defaultConfig)

    render(<ViewerApp />)

    fireEvent.click(screen.getByRole('button', { name: 'FPV-Flug starten' }))
    expect(screen.getByTestId('viewer-scene').getAttribute('data-fpv-active')).toBe('true')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByTestId('viewer-scene').getAttribute('data-fpv-active')).toBe('false')
  })

  it('stops the FPV flight when the scene reports completion', () => {
    useViewerStore.getState().setTrackData(createTestTrack(2), defaultConfig)

    render(<ViewerApp />)

    fireEvent.click(screen.getByRole('button', { name: 'FPV-Flug starten' }))
    expect(screen.getByTestId('viewer-scene').getAttribute('data-fpv-active')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Complete FPV' }))
    expect(screen.getByTestId('viewer-scene').getAttribute('data-fpv-active')).toBe('false')
  })

  it('downloads the viewed track as importable JSON', async () => {
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    fireEvent.click(screen.getByRole('button', { name: 'Track als JSON herunterladen' }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    if (!(blob instanceof Blob)) throw new Error('Expected JSON export to create a Blob')
    expect(await blob.text()).toContain('Viewer Track')
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:viewer-track')
  })

  it('shows viewer help on first valid track load', async () => {
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    await waitFor(() => expect(screen.getByText('Viewer-Hilfe')).not.toBeNull())
    expect(screen.getByText('Linke Maustaste gedrückt halten und ziehen')).not.toBeNull()
    expect(screen.getByText('Rechte Maustaste ziehen oder Space + linke Maustaste ziehen')).not.toBeNull()
  })

  it('does not show viewer help automatically after the first visit', async () => {
    document.cookie = 'fpv-track-viewer-help-seen=true; path=/'
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    await waitFor(() => expect(screen.queryByText('Viewer-Hilfe')).toBeNull())
    expect(screen.getByRole('button', { name: 'Viewer-Hilfe öffnen' })).not.toBeNull()
  })

  it('opens viewer help from the help button', async () => {
    document.cookie = 'fpv-track-viewer-help-seen=true; path=/'
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    render(<ViewerApp />)

    fireEvent.click(screen.getByRole('button', { name: 'Viewer-Hilfe öffnen' }))

    expect(await screen.findByText('Viewer-Hilfe')).not.toBeNull()
  })

  it('shows a loading state while a remote track loads', () => {
    render(<ViewerApp />)

    expect(screen.getByRole('status').textContent).toBe('Track wird geladen …')
  })

  it('renders a collection overview grouped by event date', () => {
    const namespace = { id: 'ns0000000000001', slug: 'fpv-linz', name: 'FPV Linz' }
    const entry = (id: string, name: string, eventDate: string | null, labels: string[] = []) => ({
      id, name, eventDate, labels, thumbnailUrl: null, updated: '2026-01-01T00:00:00.000Z',
    })
    useViewerStore.getState().setCollection({
      namespace,
      entries: [
        entry('entry0000000001', 'Future Race', '2999-01-01T00:00:00.000Z', ['next']),
        entry('entry0000000002', 'Old Training', '2000-01-01T00:00:00.000Z', ['latest']),
        entry('entry0000000003', 'Sketch', null),
      ],
    })

    render(<ViewerApp />)

    expect(screen.getByRole('heading', { level: 1, name: 'FPV Linz' })).not.toBeNull()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Kommende', 'Vergangene', 'Ohne Datum'])
    expect(screen.getByRole('link', { name: /Old Training/ }).getAttribute('href')).toBe(`${window.location.origin}/t/fpv-linz@entry0000000002`)
    expect(screen.getByText('latest')).not.toBeNull()
    expect(screen.queryByTestId('viewer-scene')).toBeNull()
  })

  it('shows the collection context above a collection entry', () => {
    document.cookie = 'fpv-track-viewer-help-seen=true; path=/'
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig, {
      namespace: { id: 'ns0000000000001', slug: 'fpv-linz', name: 'FPV Linz' },
      entryName: 'Training 10. Oktober',
      labels: ['latest'],
    })

    render(<ViewerApp />)

    expect(screen.getByText('Training 10. Oktober')).not.toBeNull()
    expect(screen.getByText('latest')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Alle Tracks von FPV Linz' }).getAttribute('href')).toBe(`${window.location.origin}/t/fpv-linz`)
  })
})
