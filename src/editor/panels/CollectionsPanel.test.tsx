import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import type { EntrySummary } from '@/core/api/collections'
import type { Track } from '@/core/types'
import { useAppStore } from '@/editor/store'
import { serializeTrack } from '@/core/schemas/track.schema'
import { ToolRail } from '@/editor/layout/ToolRail'
import { CollectionsPanel } from './CollectionsPanel'

const NAMESPACE = { id: 'ns0000000000001', slug: 'fpv-linz', name: 'FPV Linz' }

const coreApi = vi.hoisted(() => ({ listEntries: vi.fn(), getEntry: vi.fn() }))
const editorApi = vi.hoisted(() => ({
  listNamespaceLabels: vi.fn(),
  createEntry: vi.fn(async () => 'entry-new000000'),
  updateEntry: vi.fn(async () => undefined),
  deleteEntry: vi.fn(async () => undefined),
  createLabel: vi.fn(async () => undefined),
  moveLabel: vi.fn(async () => undefined),
  deleteLabel: vi.fn(async () => undefined),
}))
vi.mock('@/core/api/collections', async (importOriginal) => ({ ...await importOriginal<typeof import('@/core/api/collections')>(), ...coreApi }))
vi.mock('@/editor/api/collections', async (importOriginal) => ({ ...await importOriginal<typeof import('@/editor/api/collections')>(), ...editorApi }))

const track: Track = {
  id: 'track-1',
  name: 'Training 10. Oktober',
  gates: [{ id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('standard') }],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
}

const entry = (id: string, name: string, labels: string[] = []): EntrySummary => ({
  id, name, labels, eventDate: '2026-10-03T00:00:00.000Z', thumbnailUrl: null, sketchData: null, updated: '2026-10-03T00:00:00.000Z',
})

const OLD = entry('entry-old000000', 'Training 3. Okt', ['latest'])

describe('CollectionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ currentTrack: track, config: defaultConfig, isTrackModified: false, accountNamespaces: [NAMESPACE] })
    coreApi.listEntries.mockResolvedValue([OLD])
    editorApi.listNamespaceLabels.mockResolvedValue([{ id: 'label-latest', name: 'latest', entryId: OLD.id }])
  })

  it('shows the rail entry only for namespace members', () => {
    const rail = (showCollections: boolean) => render(
      <TooltipProvider>
        <ToolRail activePanel={null} onPanelToggle={() => undefined} onShareClick={() => undefined} shareDisabled onShortcutsClick={() => undefined} showCollections={showCollections} />
      </TooltipProvider>,
    )

    rail(false)
    expect(screen.queryByRole('button', { name: 'Collections' })).toBeNull()
    rail(true)
    expect(screen.getByRole('button', { name: 'Collections' })).not.toBeNull()
  })

  it('lists entries with labels', async () => {
    render(<CollectionsPanel />)

    expect(await screen.findByText('Training 3. Okt')).not.toBeNull()
    expect(screen.getByText('latest')).not.toBeNull()
    expect(coreApi.listEntries).toHaveBeenCalledWith(NAMESPACE)
  })

  it('publishes the current track and moves "latest" after confirmation', async () => {
    render(<CollectionsPanel captureThumbnail={() => 'data:image/jpeg;base64,AA=='} />)
    await screen.findByText('Training 3. Okt')

    fireEvent.click(screen.getByRole('button', { name: 'Aktuellen Track veröffentlichen' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Name')).toHaveProperty('value', 'Training 10. Oktober')
    fireEvent.change(within(dialog).getByLabelText('Datum (optional)'), { target: { value: '2026-10-10' } })
    const labelInput = within(dialog).getByLabelText('Labels')
    fireEvent.change(labelInput, { target: { value: 'Latest' } })
    fireEvent.keyDown(labelInput, { key: 'Enter' })
    fireEvent.change(labelInput, { target: { value: '10 okt 2026' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Veröffentlichen' }))

    expect(await screen.findByText('Label „latest“ liegt auf „Training 3. Okt“. Verschieben?')).not.toBeNull()
    expect(editorApi.createEntry).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Verschieben' }))

    await waitFor(() => expect(editorApi.createLabel).toHaveBeenCalledWith(NAMESPACE.id, '10-okt-2026', 'entry-new000000'))
    expect(editorApi.createEntry).toHaveBeenCalledWith(NAMESPACE.id, expect.objectContaining({
      name: 'Training 10. Oktober',
      eventDay: '2026-10-10',
      thumbnail: 'data:image/jpeg;base64,AA==',
      data: expect.objectContaining({ track: expect.objectContaining({ name: 'Training 10. Oktober' }) }),
    }))
    expect(editorApi.moveLabel).toHaveBeenCalledWith('label-latest', 'entry-new000000')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps the entry and labels when the move is cancelled', async () => {
    render(<CollectionsPanel />)
    await screen.findByText('Training 3. Okt')

    fireEvent.click(screen.getByRole('button', { name: 'Aktuellen Track veröffentlichen' }))
    const labelInput = within(await screen.findByRole('dialog')).getByLabelText('Labels')
    fireEvent.change(labelInput, { target: { value: 'latest' } })
    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichen' }))
    await screen.findByText('Label „latest“ liegt auf „Training 3. Okt“. Verschieben?')
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(editorApi.createEntry).not.toHaveBeenCalled()
    expect(editorApi.moveLabel).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Veröffentlichen' })).not.toBeNull()
  })

  it('edits an entry: rename, remove a label, delete', async () => {
    editorApi.listNamespaceLabels.mockResolvedValue([{ id: 'label-latest', name: 'latest', entryId: OLD.id }])
    render(<CollectionsPanel />)

    fireEvent.click(await screen.findByRole('button', { name: /Training 3. Okt/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Training 3. Oktober' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Label „latest“ entfernen' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(editorApi.deleteLabel).toHaveBeenCalledWith('label-latest'))
    expect(editorApi.updateEntry).toHaveBeenCalledWith(OLD.id, { name: 'Training 3. Oktober', eventDay: '2026-10-03' })

    fireEvent.click(await screen.findByRole('button', { name: /Training 3. Okt/ }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eintrag löschen' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Eintrag löschen' }))
    await waitFor(() => expect(editorApi.deleteEntry).toHaveBeenCalledWith(OLD.id))
  })

  it('asks again when a label was taken in parallel', async () => {
    const { LabelTakenError } = await import('@/editor/api/collections')
    editorApi.listNamespaceLabels
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'label-race', name: 'race', entryId: OLD.id }])
    editorApi.createLabel.mockRejectedValueOnce(new LabelTakenError('race'))
    render(<CollectionsPanel />)
    await screen.findByText('Training 3. Okt')

    fireEvent.click(screen.getByRole('button', { name: 'Aktuellen Track veröffentlichen' }))
    fireEvent.change(within(await screen.findByRole('dialog')).getByLabelText('Labels'), { target: { value: 'race' } })
    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichen' }))

    expect(await screen.findByText('Label „race“ liegt auf „Training 3. Okt“. Verschieben?')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Verschieben' }))
    await waitFor(() => expect(editorApi.moveLabel).toHaveBeenCalledWith('label-race', 'entry-new000000'))
    expect(editorApi.createEntry).toHaveBeenCalledTimes(1)
  })

  it('loads an entry into the editor under the entry name and links it', async () => {
    coreApi.getEntry.mockResolvedValue({ ...OLD, namespace: NAMESPACE, data: JSON.parse(serializeTrack({ ...track, name: 'Old Track Name' }, defaultConfig)) })
    render(<CollectionsPanel />)

    fireEvent.click(await screen.findByRole('button', { name: /Training 3. Okt/ }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'In Editor laden' }))

    await waitFor(() => expect(useAppStore.getState().currentTrack?.name).toBe('Training 3. Okt'))
    const { currentTrack, collectionEntryLink } = useAppStore.getState()
    expect(currentTrack?.id).not.toBe(track.id)
    expect(collectionEntryLink).toMatchObject({ namespace: NAMESPACE, entryId: OLD.id, entryName: 'Training 3. Okt', trackId: currentTrack?.id })
    expect(collectionEntryLink?.publishedUpdatedAt).toBe(currentTrack?.updatedAt)
  })
})
