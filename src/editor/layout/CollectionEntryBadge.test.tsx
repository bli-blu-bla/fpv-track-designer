import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import type { Track } from '@/core/types'
import { useAppStore } from '@/editor/store'
import { CollectionEntryBadge } from './CollectionEntryBadge'

const updateEntry = vi.hoisted(() => vi.fn(async () => undefined))
vi.mock('@/editor/api/collections', () => ({ updateEntry }))

const NAMESPACE = { id: 'ns0000000000001', slug: 'fpv-linz', name: 'FPV Linz' }

const track: Track = {
  id: 'loaded-track',
  name: 'Training 3. Okt',
  gates: [{ id: 'g1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('standard') }],
  gateSequence: [{ gateId: 'g1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const link = { namespace: NAMESPACE, entryId: 'entry0000000001', entryName: 'Training 3. Okt', trackId: 'loaded-track', publishedUpdatedAt: track.updatedAt }

describe('CollectionEntryBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ currentTrack: track, config: defaultConfig, collectionEntryLink: link, accountNamespaces: [NAMESPACE] })
  })

  it('is hidden without a link or for another track', () => {
    useAppStore.setState({ currentTrack: { ...track, id: 'other' } })
    const { container } = render(<CollectionEntryBadge />)

    expect(container.innerHTML).toBe('')
  })

  it('shows which entry is being edited', () => {
    render(<CollectionEntryBadge />)

    expect(screen.getByRole('button', { name: 'Collection-Eintrag „Training 3. Okt“ in FPV Linz' }).textContent).toContain('FPV Linz')
  })

  it('pushes edits back to the entry', async () => {
    useAppStore.setState({ currentTrack: { ...track, updatedAt: '2026-10-02T00:00:00.000Z' } })
    render(<CollectionEntryBadge captureThumbnail={() => 'data:image/jpeg;base64,AA=='} />)

    fireEvent.click(screen.getByRole('button', { name: /Collection-Eintrag/ }))
    expect(await screen.findByText('Änderungen sind noch nicht im Eintrag.')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Eintrag aktualisieren' }))

    await waitFor(() => expect(screen.getByText('Eintrag aktualisiert.')).not.toBeNull())
    expect(updateEntry).toHaveBeenCalledWith('entry0000000001', expect.objectContaining({ thumbnail: 'data:image/jpeg;base64,AA==' }))
    expect(useAppStore.getState().collectionEntryLink?.publishedUpdatedAt).toBe('2026-10-02T00:00:00.000Z')
    expect(screen.getByText('Der Eintrag entspricht dem Editor-Stand.')).not.toBeNull()
  })

  it('can be unlinked', async () => {
    render(<CollectionEntryBadge />)

    fireEvent.click(screen.getByRole('button', { name: /Collection-Eintrag/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Verknüpfung lösen' }))

    expect(useAppStore.getState().collectionEntryLink).toBeNull()
  })
})
