import { useState } from 'react'
import { CalendarDays, ExternalLink, Loader2, Unlink, Upload } from 'lucide-react'
import { useAppStore } from '@/editor/store'
import { serializeTrack } from '@/core/schemas/track.schema'
import { buildEntryUrl } from '@/core/share/viewerRoute'
import { updateEntry } from '@/editor/api/collections'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n'

interface CollectionEntryBadgeProps {
  captureThumbnail?: () => string | null
}

type UpdateState = 'idle' | 'saving' | 'saved' | 'failed'

/** TopBar chip shown while the current track was loaded from a collection entry; pushes edits back to it. */
export function CollectionEntryBadge({ captureThumbnail }: CollectionEntryBadgeProps) {
  const { t } = useTranslation()
  const link = useAppStore((state) => state.collectionEntryLink)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const isMember = useAppStore((state) => state.accountNamespaces.some((namespace) => namespace.id === state.collectionEntryLink?.namespace.id))
  const setCollectionEntryLink = useAppStore((state) => state.setCollectionEntryLink)
  const [open, setOpen] = useState(false)
  const [updateState, setUpdateState] = useState<UpdateState>('idle')

  if (!link || !currentTrack || currentTrack.id !== link.trackId) return null

  const hasChanges = currentTrack.updatedAt !== link.publishedUpdatedAt
  const label = t('collectionEditingLabel', { entry: link.entryName, namespace: link.namespace.name })

  const handleUpdate = () => {
    const { currentTrack: track, config } = useAppStore.getState()
    if (!track) return
    setUpdateState('saving')
    updateEntry(link.entryId, { data: JSON.parse(serializeTrack(track, config)), thumbnail: captureThumbnail?.() ?? null })
      .then(() => {
        setCollectionEntryLink({ ...link, publishedUpdatedAt: track.updatedAt })
        setUpdateState('saved')
      })
      .catch(() => setUpdateState('failed'))
  }

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) setUpdateState('idle') }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="flex h-7 max-w-44 shrink-0 items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 text-[12px] font-medium text-sky-300 transition-colors hover:bg-sky-400/20"
        >
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="truncate">{link.namespace.name}</span>
          {hasChanges && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-amber-400" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-72 gap-0 border-border bg-background p-3 shadow-xl shadow-black/50">
        <p className="text-xs font-semibold text-muted-foreground">{t('collectionEditingHeading')}</p>
        <p className="mt-1 text-[13px]">{t('collectionEditingDescription', { entry: link.entryName, namespace: link.namespace.name })}</p>
        <p className={cn('mt-2 text-xs', hasChanges ? 'text-amber-400' : 'text-subtle-foreground')}>
          {hasChanges ? t('collectionEditingChanged') : t('collectionEditingCurrent')}
        </p>
        {updateState === 'saved' && <p role="status" className="mt-1 text-xs text-muted-foreground">{t('collectionEditingUpdated')}</p>}
        {updateState === 'failed' && <p role="alert" className="mt-1 text-xs text-destructive">{t('entryActionFailed')}</p>}
        {!isMember && <p className="mt-1 text-xs text-muted-foreground">{t('collectionEditingNoAccess', { namespace: link.namespace.name })}</p>}

        <div className="mt-3 flex flex-col gap-1.5">
          {isMember && (
            <Button type="button" size="sm" className="gap-2" onClick={handleUpdate} disabled={!hasChanges || updateState === 'saving'}>
              {updateState === 'saving' ? <Loader2 className="animate-spin" /> : <Upload />}
              {t('collectionEditingUpdate')}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" className="gap-2" asChild>
            <a href={buildEntryUrl(link.namespace.slug, link.entryId, import.meta.env.VITE_VIEWER_DOMAIN)} target="_blank" rel="noreferrer">
              <ExternalLink />
              {t('collectionEditingOpenViewer')}
            </a>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-2 text-muted-foreground"
            onClick={() => {
              setOpen(false)
              setCollectionEntryLink(null)
            }}
          >
            <Unlink />
            {t('collectionEditingDetach')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
