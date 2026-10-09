import { useCallback, useEffect, useState } from 'react'
import { Copy, Trash2, Play, RefreshCw, Ghost } from 'lucide-react'

import { useAppStore } from '@/store'
import { loadTrack, listTracks, deleteTrack, saveTrack, type SavedTrackInfo } from '@/utils/storage'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/i18n'

interface TrackGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TrackGallery({ open, onOpenChange }: TrackGalleryProps) {
  const { t } = useTranslation()
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
    if (open) {
      const timeoutId = window.setTimeout(refreshTracks, 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [open, refreshTracks])

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
        onOpenChange(false)
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
    window.dispatchEvent(new CustomEvent('track-saved'))
    setTrackToDuplicate(null)
    setDuplicateName('')
    refreshTracks()

    void requestDestructiveAction('duplicate').then((proceed) => {
      if (!proceed) return

      setConfig(saved.config)
      replaceTrack(copiedTrack)
      onOpenChange(false)
    })
  }

  const refresh = refreshTracks

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[min(100dvw,24rem)] sm:max-w-md">
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>{t('galleryTitle')}</SheetTitle>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={refresh}
            title={t('refresh')}
          >
            <RefreshCw />
          </Button>
        </SheetHeader>

        <Separator />

        <ScrollArea className="min-h-0 flex-1 pr-4">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Ghost className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('noSavedTracks')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-4">
              {tracks.map((trackInfo) => {
                const isCurrent = currentTrack?.id === trackInfo.id
                return (
                  <Card
                    key={trackInfo.id}
                    className={
                      isCurrent
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-border/50'
                    }
                  >
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-foreground">
                            {trackInfo.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(trackInfo.updatedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px]">
                            {t('current')}
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-2 sm:flex sm:items-center">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleLoad(trackInfo.id)}
                          className="sm:flex-1"
                        >
                          <Play />
                          {t('load')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateClick(trackInfo)}
                          className="w-full sm:w-auto"
                        >
                          <Copy />
                          {t('duplicate')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(trackInfo)}
                          className="w-full sm:w-auto"
                        >
                          <Trash2 />
                          {t('delete')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </ScrollArea>
        </SheetContent>
      </Sheet>

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
