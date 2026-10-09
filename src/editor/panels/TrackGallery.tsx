import { useCallback, useEffect, useState } from 'react'
import { Copy, FolderOpen, ImageOff, Trash2 } from 'lucide-react'

import { useAppStore } from '@/editor/store'
import { loadTrack, listTracks, deleteTrack, saveTrack, loadTrackThumbnail, saveTrackThumbnail, type SavedTrackInfo } from '@/editor/storage'

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
import { useTranslation } from '@/i18n'

interface TrackGalleryProps {
  /** Called after a saved track replaced the current one. */
  onTrackOpened?: () => void
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
  const [tracks, setTracks] = useState<SavedTrackInfo[]>(() => listTracks())
  const [trackToDelete, setTrackToDelete] = useState<SavedTrackInfo | null>(null)
  const [trackToDuplicate, setTrackToDuplicate] = useState<SavedTrackInfo | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const refreshTracks = useCallback(() => setTracks(listTracks()), [])

  useEffect(() => {
    window.addEventListener('track-saved', refreshTracks)
    return () => window.removeEventListener('track-saved', refreshTracks)
  }, [refreshTracks])

  const handleLoad = (id: string) => {
    void requestDestructiveAction('load').then((proceed) => {
      if (!proceed) return

      const result = loadTrack(id)
      if (result) {
        setConfig(result.config)
        replaceTrack(result.track)
        onTrackOpened?.()
      }
      refreshTracks()
    })
  }

  const handleDeleteClick = (track: SavedTrackInfo) => {
    setTrackToDelete(track)
  }

  const handleDuplicateClick = (track: SavedTrackInfo) => {
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

  const handleDeleteConfirm = () => {
    if (!trackToDelete) return
    deleteTrack(trackToDelete.id)
    setTrackToDelete(null)
    refreshTracks()
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
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <FolderOpen className="size-8 text-subtle-foreground" />
          <p className="text-xs text-subtle-foreground">{t('noSavedTracks')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {[...tracks].reverse().map((trackInfo) => {
            const isCurrent = currentTrack?.id === trackInfo.id
            const thumbnail = loadTrackThumbnail(trackInfo.id)
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
                  onClick={() => handleLoad(trackInfo.id)}
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
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" onClick={() => handleDuplicateClick(trackInfo)} aria-label={t('duplicate')} className={iconButtonClass}>
                          <Copy className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t('duplicate')}</TooltipContent>
                    </Tooltip>
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
              handleDeleteConfirm()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleDeleteConfirm()
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('deleteSavedTrackTitle')}</DialogTitle>
              <DialogDescription>
                {trackToDelete
                  ? t('deleteNamedSavedTrackDescription', { name: trackToDelete.name })
                  : t('deleteSavedTrackDescription')}
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
              <Button type="submit" variant="destructive" autoFocus>
                {t('deleteTrack')}
              </Button>
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
