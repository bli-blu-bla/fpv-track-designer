import { useCallback, useEffect, useState } from 'react'
import { Cloud, CloudOff, CloudUpload, Copy, FolderOpen, HardDrive, ImageOff, Trash2 } from 'lucide-react'

import { useAppStore } from '@/editor/store'
import { loadTrack, listTracks, deleteTrack, saveTrack, loadTrackThumbnail, saveTrackThumbnail, type SavedTrackInfo } from '@/editor/storage'
import { listRemoteTracks, type RemoteTrackSummary } from '@/editor/api/tracks'
import { deleteAccountTrack, downloadTrack, mergeGalleryEntries, type GalleryEntry, type GallerySyncState } from '@/editor/sync/trackSync'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTranslation, type TranslationKey } from '@/i18n'

interface TrackGalleryProps {
  /** Called after a saved track replaced the current one. */
  onTrackOpened?: () => void
}

const SYNC_BADGES: Record<Exclude<GallerySyncState, null>, { key: TranslationKey; icon: typeof Cloud; className: string }> = {
  synced: { key: 'syncStateSynced', icon: Cloud, className: 'text-subtle-foreground' },
  unsynced: { key: 'syncStateUnsynced', icon: CloudOff, className: 'text-amber-400' },
  local: { key: 'syncStateLocal', icon: HardDrive, className: 'text-subtle-foreground' },
  remote: { key: 'syncStateRemote', icon: Cloud, className: 'text-sky-300' },
}

type DeleteTarget = 'local' | 'account' | 'both'

/** Account tracks of the signed-in user; null while signed out or when the list cannot be loaded. */
function useRemoteTracks(userId: string | null, refreshKey: unknown) {
  const [remoteTracks, setRemoteTracks] = useState<RemoteTrackSummary[] | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    const request = userId ? listRemoteTracks() : Promise.resolve(null)
    request
      .then((list) => { if (!cancelled) setRemoteTracks(list) })
      .catch(() => { if (!cancelled) setRemoteTracks(null) })
    return () => {
      cancelled = true
    }
  }, [userId, refreshKey, reloadToken])

  return { remoteTracks, reloadRemoteTracks: useCallback(() => setReloadToken((token) => token + 1), []) }
}

function formatSavedDate(iso: string, language: string): string {
  return new Date(iso).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/** Saved tracks with preview images; lives in the "Meine Tracks" side panel. */
export function TrackGallery({ onTrackOpened }: TrackGalleryProps) {
  const { t, language } = useTranslation()
  const currentTrack = useAppStore((state) => state.currentTrack)
  const replaceTrack = useAppStore((state) => state.replaceTrack)
  const setConfig = useAppStore((state) => state.setConfig)
  const requestDestructiveAction = useAppStore((state) => state.requestDestructiveAction)
  const accountUserId = useAppStore((state) => state.accountUser?.id ?? null)
  const syncTrack = useAppStore((state) => state.syncTrack)
  const lastSync = useAppStore((state) => state.trackSyncStatus?.state === 'synced' ? state.trackSyncStatus : null)
  const [tracks, setTracks] = useState<SavedTrackInfo[]>(() => listTracks())
  const { remoteTracks, reloadRemoteTracks } = useRemoteTracks(accountUserId, lastSync)
  const [trackToDelete, setTrackToDelete] = useState<GalleryEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [trackToDuplicate, setTrackToDuplicate] = useState<GalleryEntry | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const refreshTracks = useCallback(() => setTracks(listTracks()), [])

  useEffect(() => {
    window.addEventListener('track-saved', refreshTracks)
    return () => window.removeEventListener('track-saved', refreshTracks)
  }, [refreshTracks])

  const entries = mergeGalleryEntries(tracks, remoteTracks, accountUserId)

  const handleLoad = (entry: GalleryEntry) => {
    setActionError(null)
    void requestDestructiveAction('load').then(async (proceed) => {
      if (!proceed) return

      // Account-only tracks are downloaded (validated, stored locally) after confirmation.
      const result = entry.local
        ? loadTrack(entry.id)
        : entry.remote ? await downloadTrack(entry.remote.id).catch(() => null) : null
      if (result) {
        setConfig(result.config)
        replaceTrack(result.track)
        onTrackOpened?.()
      } else if (!entry.local) {
        setActionError(t('galleryLoadFailed'))
      }
      refreshTracks()
      if (!entry.local) reloadRemoteTracks()
    })
  }

  const handleUpload = (entry: GalleryEntry) => {
    const saved = loadTrack(entry.id)
    if (!saved) return
    setActionError(null)
    void syncTrack(saved.track, saved.config, loadTrackThumbnail(entry.id)).then(() => {
      const status = useAppStore.getState().trackSyncStatus
      if (status?.trackId === entry.id && status.state === 'failed') setActionError(t('galleryActionFailed'))
    })
  }

  const handleDeleteClick = (entry: GalleryEntry) => {
    setTrackToDelete(entry)
  }

  const handleDuplicateClick = (track: GalleryEntry) => {
    setTrackToDuplicate(track)
    setDuplicateName(`${track.name} ${t('copySuffix')}`)
  }

  const handleDuplicateDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTrackToDuplicate(null)
      setDuplicateName('')
    }
  }

  const handleDeleteDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTrackToDelete(null)
    }
  }

  const handleDeleteConfirm = (target: DeleteTarget = 'local') => {
    if (!trackToDelete) return
    const { id, local, remote } = trackToDelete
    setTrackToDelete(null)
    setActionError(null)

    if (local && target !== 'account') deleteTrack(id)
    refreshTracks()
    if (remote && target !== 'local') {
      void deleteAccountTrack(id, remote.id)
        .catch(() => setActionError(t('galleryActionFailed')))
        .finally(reloadRemoteTracks)
    }
  }

  const handleDuplicateConfirm = () => {
    if (!trackToDuplicate) return

    const saved = loadTrack(trackToDuplicate.id)
    if (!saved) {
      setTrackToDuplicate(null)
      setDuplicateName('')
      refreshTracks()
      return
    }

    const now = new Date().toISOString()
    const copiedTrack = {
      ...saved.track,
      id: crypto.randomUUID(),
      name: duplicateName.trim() || `${trackToDuplicate.name} ${t('copySuffix')}`,
      createdAt: now,
      updatedAt: now,
    }

    // Persist the duplicate to localStorage immediately so it appears in the
    // gallery list even if the user cancels switching to it.
    saveTrack(copiedTrack, saved.config)
    const thumbnail = loadTrackThumbnail(trackToDuplicate.id)
    if (thumbnail) saveTrackThumbnail(copiedTrack.id, thumbnail)
    window.dispatchEvent(new CustomEvent('track-saved'))
    setTrackToDuplicate(null)
    setDuplicateName('')
    refreshTracks()

    void requestDestructiveAction('duplicate').then((proceed) => {
      if (!proceed) return

      setConfig(saved.config)
      replaceTrack(copiedTrack)
      onTrackOpened?.()
    })
  }

  const iconButtonClass = 'flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'

  return (
    <>
      {actionError && <p role="alert" className="mb-2 text-xs text-destructive">{actionError}</p>}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <FolderOpen className="size-8 text-subtle-foreground" />
          <p className="text-xs text-subtle-foreground">{t('noSavedTracks')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {entries.map((trackInfo) => {
            const isCurrent = currentTrack?.id === trackInfo.id
            const thumbnail = (trackInfo.local ? loadTrackThumbnail(trackInfo.id) : null) ?? trackInfo.remote?.thumbnailUrl ?? null
            const badge = trackInfo.syncState ? SYNC_BADGES[trackInfo.syncState] : null
            const canUpload = trackInfo.syncState === 'local' || trackInfo.syncState === 'unsynced'
            const meta = [
              trackInfo.gateCount !== undefined ? t('galleryObjects', { count: trackInfo.gateCount }) : null,
              trackInfo.poleCount !== undefined ? t('polesCount', { count: trackInfo.poleCount }) : null,
              formatSavedDate(trackInfo.updatedAt, language),
            ].filter(Boolean).join(' · ')

            return (
              <li
                key={trackInfo.id}
                className={cn(
                  'overflow-hidden rounded-lg border transition-colors',
                  isCurrent ? 'border-ring' : 'border-border hover:bg-muted',
                )}
              >
                <button
                  type="button"
                  onClick={() => handleLoad(trackInfo)}
                  aria-label={`${trackInfo.name} – ${t('load')}`}
                  className="block w-full text-left"
                >
                  {thumbnail ? (
                    <img src={thumbnail} alt="" className="aspect-[16/10] w-full bg-muted object-cover" />
                  ) : (
                    <span className="flex aspect-[16/10] w-full items-center justify-center bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_8px,#1f1f23_8px_16px)]">
                      <ImageOff className="size-5 text-subtle-foreground" />
                    </span>
                  )}
                </button>
                <div className="flex items-start gap-2 p-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{trackInfo.name}</span>
                      {isCurrent && (
                        <span className="shrink-0 rounded-full bg-foreground px-[7px] py-px text-[11px] font-medium text-background">
                          {t('current')}
                        </span>
                      )}
                    </div>
                    <span className="truncate font-mono text-[11px] text-subtle-foreground">{meta}</span>
                    {badge && (
                      <span className={cn('flex items-center gap-1 text-[11px]', badge.className)}>
                        <badge.icon className="size-3" aria-hidden="true" />
                        {t(badge.key)}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canUpload && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" onClick={() => handleUpload(trackInfo)} aria-label={t('syncUpload')} className={iconButtonClass}>
                            <CloudUpload className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{t('syncUpload')}</TooltipContent>
                      </Tooltip>
                    )}
                    {trackInfo.local && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" onClick={() => handleDuplicateClick(trackInfo)} aria-label={t('duplicate')} className={iconButtonClass}>
                            <Copy className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{t('duplicate')}</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(trackInfo)}
                          aria-label={t('delete')}
                          className={cn(iconButtonClass, 'hover:border-destructive/35 hover:bg-destructive/10 hover:text-red-400')}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t('delete')}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={trackToDelete !== null} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!trackToDelete?.local || !trackToDelete.remote) handleDeleteConfirm('both')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (!trackToDelete?.local || !trackToDelete.remote)) {
                event.preventDefault()
                handleDeleteConfirm('both')
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('deleteSavedTrackTitle')}</DialogTitle>
              <DialogDescription>
                {!trackToDelete
                  ? t('deleteSavedTrackDescription')
                  : trackToDelete.local && trackToDelete.remote
                    ? t('deleteSyncedTrackDescription', { name: trackToDelete.name })
                    : trackToDelete.remote
                      ? t('deleteRemoteTrackDescription', { name: trackToDelete.name })
                      : t('deleteNamedSavedTrackDescription', { name: trackToDelete.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteDialogOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              {trackToDelete?.local && trackToDelete.remote ? (
                <>
                  <Button type="button" variant="outline" onClick={() => handleDeleteConfirm('local')}>{t('deleteFromDevice')}</Button>
                  <Button type="button" variant="outline" onClick={() => handleDeleteConfirm('account')}>{t('deleteFromAccount')}</Button>
                  <Button type="button" variant="destructive" onClick={() => handleDeleteConfirm('both')}>{t('deleteEverywhere')}</Button>
                </>
              ) : (
                <Button type="submit" variant="destructive" autoFocus>
                  {t('deleteTrack')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={trackToDuplicate !== null} onOpenChange={handleDuplicateDialogOpenChange}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleDuplicateConfirm()
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('duplicateTrackTitle')}</DialogTitle>
              <DialogDescription>
                {t('duplicateTrackDescription', { name: trackToDuplicate?.name ?? t('thisTrack') })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="duplicate-track-name">{t('newTrackName')}</Label>
              <Input
                id="duplicate-track-name"
                value={duplicateName}
                onChange={(event) => setDuplicateName(event.target.value)}
                placeholder={t('duplicateNamePlaceholder')}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDuplicateDialogOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              <Button type="submit">
                {t('duplicate')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
