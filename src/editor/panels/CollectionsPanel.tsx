import { useEffect, useState } from 'react'
import { ExternalLink, ImageOff, Upload } from 'lucide-react'
import { useAppStore } from '@/editor/store'
import { listEntries, type EntrySummary } from '@/core/api/collections'
import { buildCollectionUrl } from '@/core/share/viewerRoute'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/i18n'
import { CollectionEntryDialog } from './CollectionEntryDialog'

interface CollectionsPanelProps {
  captureThumbnail?: () => string | null
}

type EditTarget = { kind: 'publish' } | { kind: 'edit'; entry: EntrySummary }

function formatDay(eventDate: string, language: string) {
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${eventDate.slice(0, 10)}T00:00:00Z`))
}

/** Manage entries and labels of the namespaces the signed-in user is a member of. */
export function CollectionsPanel({ captureThumbnail }: CollectionsPanelProps) {
  const { t, language } = useTranslation()
  const namespaces = useAppStore((state) => state.accountNamespaces)
  const hasTrack = useAppStore((state) => state.currentTrack !== null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const namespace = namespaces.find((item) => item.id === selectedId) ?? namespaces[0] ?? null
  const [entries, setEntries] = useState<EntrySummary[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)

  useEffect(() => {
    if (!namespace) return
    let cancelled = false
    listEntries(namespace)
      .then((list) => {
        if (cancelled) return
        setEntries(list)
        setLoadFailed(false)
      })
      .catch(() => { if (!cancelled) setLoadFailed(true) })
    return () => {
      cancelled = true
    }
  }, [namespace, reloadToken])

  if (!namespace) return null

  const reload = () => setReloadToken((token) => token + 1)

  return (
    <div className="flex flex-col gap-3">
      {namespaces.length > 1 && (
        <Select value={namespace.id} onValueChange={(value) => { setSelectedId(value); setEntries(null) }}>
          <SelectTrigger aria-label={t('collectionsNamespace')} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {namespaces.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{namespace.name}</p>
          <p className="font-mono text-[11px] text-subtle-foreground">{namespace.slug}</p>
        </div>
        <a
          href={buildCollectionUrl(namespace.slug, import.meta.env.VITE_VIEWER_DOMAIN)}
          target="_blank"
          rel="noreferrer"
          aria-label={t('collectionsOpenViewer')}
          title={t('collectionsOpenViewer')}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <Button type="button" onClick={() => setEditTarget({ kind: 'publish' })} disabled={!hasTrack} className="w-full gap-2">
        <Upload />
        {t('collectionsPublish')}
      </Button>

      {loadFailed && <p role="alert" className="text-xs text-destructive">{t('collectionsLoadFailed')}</p>}
      {entries?.length === 0 && <p className="py-6 text-center text-xs text-subtle-foreground">{t('collectionEmpty')}</p>}

      <ul className="flex flex-col gap-2">
        {entries?.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => setEditTarget({ kind: 'edit', entry })}
              className="flex w-full gap-2.5 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted"
            >
              {entry.thumbnailUrl ? (
                <img src={entry.thumbnailUrl} alt="" className="aspect-[16/10] w-16 shrink-0 rounded bg-muted object-cover" />
              ) : (
                <span className="flex aspect-[16/10] w-16 shrink-0 items-center justify-center rounded bg-muted">
                  <ImageOff className="size-4 text-subtle-foreground" />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-[13px] font-medium">{entry.name}</span>
                {entry.eventDate && <span className="font-mono text-[11px] text-subtle-foreground">{formatDay(entry.eventDate, language)}</span>}
                {entry.labels.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {entry.labels.map((label) => (
                      <span key={label} className="rounded-full bg-primary/12 px-1.5 font-mono text-[10px] text-amber-400">{label}</span>
                    ))}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <CollectionEntryDialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (open) return
          setEditTarget(null)
          reload()
        }}
        namespace={namespace}
        entry={editTarget?.kind === 'edit' ? editTarget.entry : null}
        entries={entries ?? []}
        captureThumbnail={captureThumbnail}
        onChanged={reload}
      />
    </div>
  )
}
