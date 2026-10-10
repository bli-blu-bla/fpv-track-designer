import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '@/editor/store'
import { getEntry, type EntrySummary, type NamespaceSummary } from '@/core/api/collections'
import { parseTrackExport, serializeTrack } from '@/core/schemas/track.schema'
import { buildEntryUrl, buildLabelUrl } from '@/core/share/viewerRoute'
import { createEntry, deleteEntry, LabelTakenError, listNamespaceLabels, updateEntry, type NamespaceLabel } from '@/editor/api/collections'
import { applyLabelPlan, isValidLabelName, normalizeLabelName, planLabelChanges, type LabelPlan } from '@/editor/collections/labelPlan'
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
import { useTranslation } from '@/i18n'

type Step = 'form' | 'confirm-move' | 'confirm-delete'

interface CollectionEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  namespace: NamespaceSummary
  /** null publishes the current editor track as a new entry. */
  entry: EntrySummary | null
  /** All entries of the namespace, to name the current owner of a label. */
  entries: EntrySummary[]
  captureThumbnail?: () => string | null
  /** Called after anything changed on the server. */
  onChanged: () => void
}

function initialName(entry: EntrySummary | null, trackName: string | undefined) {
  return entry?.name ?? trackName ?? ''
}

/** Publish (entry = null) or edit a collection entry, incl. label moves with confirmation. */
export function CollectionEntryDialog(props: CollectionEntryDialogProps) {
  const { open, onOpenChange } = props
  // Remount per opened entry so the form starts from the entry's current values.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <EntryDialogContent key={props.entry?.id ?? 'new'} {...props} />}
    </Dialog>
  )
}

function EntryDialogContent({ onOpenChange, namespace, entry, entries, captureThumbnail, onChanged }: CollectionEntryDialogProps) {
  const { t } = useTranslation()
  const currentTrack = useAppStore((state) => state.currentTrack)
  const config = useAppStore((state) => state.config)
  const replaceTrack = useAppStore((state) => state.replaceTrack)
  const setConfig = useAppStore((state) => state.setConfig)
  const requestDestructiveAction = useAppStore((state) => state.requestDestructiveAction)
  const setCollectionEntryLink = useAppStore((state) => state.setCollectionEntryLink)

  const [name, setName] = useState(() => initialName(entry, currentTrack?.name))
  const [eventDay, setEventDay] = useState(entry?.eventDate?.slice(0, 10) ?? '')
  const [labels, setLabels] = useState<string[]>(entry?.labels ?? [])
  const [labelDraft, setLabelDraft] = useState('')
  const [labelError, setLabelError] = useState<string | null>(null)
  const [replaceData, setReplaceData] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [pendingPlan, setPendingPlan] = useState<LabelPlan | null>(null)
  // Set once a new entry exists, so a retry after a label conflict does not publish twice.
  const [createdEntryId, setCreatedEntryId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const viewerDomain = import.meta.env.VITE_VIEWER_DOMAIN
  const entryId = entry?.id ?? createdEntryId
  const entryNameById = new Map(entries.map((item) => [item.id, item.name]))

  const addLabel = (raw: string) => {
    const normalized = normalizeLabelName(raw)
    if (!normalized) return true
    if (!isValidLabelName(normalized)) {
      setLabelError(t('entryLabelInvalid', { label: normalized }))
      return false
    }
    setLabelError(null)
    setLabels((current) => current.includes(normalized) ? current : [...current, normalized])
    return true
  }

  const handleLabelKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    if (addLabel(labelDraft)) setLabelDraft('')
  }

  const trackData = (): unknown => (currentTrack ? JSON.parse(serializeTrack(currentTrack, config)) : null)

  const commit = async (plan: LabelPlan, desired: string[]) => {
    let id = entryId
    const base = { name, eventDay: eventDay || null }

    if (!id) {
      id = await createEntry(namespace.id, { ...base, data: trackData(), thumbnail: captureThumbnail?.() ?? null })
      setCreatedEntryId(id)
    } else if (entry) {
      await updateEntry(id, replaceData ? { ...base, data: trackData(), thumbnail: captureThumbnail?.() ?? null } : base)
    }

    try {
      await applyLabelPlan(namespace.id, id, plan)
    } catch (reason) {
      if (!(reason instanceof LabelTakenError)) throw reason
      // Someone set the label in parallel: ask again with fresh data.
      await prepare(id, desired)
      return
    }

    onChanged()
    onOpenChange(false)
  }

  /** Plans label changes against the server state; asks before moving labels from other entries. */
  const prepare = async (forEntryId: string | null, desired: string[]) => {
    const plan = planLabelChanges(desired, forEntryId, await listNamespaceLabels(namespace.id))
    if (plan.move.length > 0) {
      setPendingPlan(plan)
      setStep('confirm-move')
      return
    }
    await commit(plan, desired)
  }

  const runAction = (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    action()
      .catch(() => setError(t('entryActionFailed')))
      .finally(() => setBusy(false))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    // Pick up a label that is still typed in the field.
    const draft = normalizeLabelName(labelDraft)
    if (draft && !isValidLabelName(draft)) {
      setLabelError(t('entryLabelInvalid', { label: draft }))
      return
    }
    const desired = draft && !labels.includes(draft) ? [...labels, draft] : labels
    setLabels(desired)
    setLabelDraft('')
    if (!name.trim() || (!entry && !currentTrack)) return
    runAction(() => prepare(entryId, desired))
  }

  const handleDelete = () => {
    if (!entry) return
    runAction(async () => {
      await deleteEntry(entry.id)
      onChanged()
      onOpenChange(false)
    })
  }

  const handleLoadInEditor = () => {
    if (!entry) return
    void requestDestructiveAction('load').then((proceed) => {
      if (!proceed) return
      runAction(async () => {
        const detail = await getEntry(namespace.slug, entry.id)
        const result = parseTrackExport(detail.data)
        if ('error' in result) throw new Error(result.error)
        // A new id keeps the copy apart from the publisher's personal track with the same id;
        // the entry name makes it obvious in the TopBar which entry is being edited.
        const trackId = crypto.randomUUID()
        setConfig(result.config)
        replaceTrack({ ...result.track, id: trackId, name: entry.name })
        setCollectionEntryLink({
          namespace,
          entryId: entry.id,
          entryName: entry.name,
          trackId,
          publishedUpdatedAt: useAppStore.getState().currentTrack?.updatedAt ?? '',
        })
        onOpenChange(false)
      })
    })
  }

  const copyLink = (url: string) => {
    void navigator.clipboard.writeText(url)
      .then(() => setNotice(t('entryLinkCopied')))
      .catch(() => setError(t('copyLinkError')))
  }

  if (step === 'confirm-move' && pendingPlan) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('entryMoveTitle')}</DialogTitle>
          <DialogDescription asChild>
            <ul className="space-y-1">
              {pendingPlan.move.map((label: NamespaceLabel) => (
                <li key={label.id}>
                  {t('entryMoveItem', { label: label.name, entry: entryNameById.get(label.entryId) ?? t('entryUnknown') })}
                </li>
              ))}
            </ul>
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setStep('form')} disabled={busy}>{t('cancel')}</Button>
          <Button type="button" onClick={() => runAction(() => commit(pendingPlan, labels))} disabled={busy}>{t('entryMoveConfirm')}</Button>
        </DialogFooter>
      </DialogContent>
    )
  }

  if (step === 'confirm-delete' && entry) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('entryDelete')}</DialogTitle>
          <DialogDescription>{t('entryDeleteConfirm', { name: entry.name })}</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setStep('form')} disabled={busy}>{t('cancel')}</Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>{t('entryDelete')}</Button>
        </DialogFooter>
      </DialogContent>
    )
  }

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{entry ? t('entryDialogEditTitle') : t('entryDialogPublishTitle')}</DialogTitle>
        <DialogDescription>
          {entry
            ? t('entryDialogEditDescription', { namespace: namespace.name })
            : t('entryDialogPublishDescription', { namespace: namespace.name })}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entry-name">{t('entryName')}</Label>
          <Input id="entry-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entry-date">{t('entryEventDate')}</Label>
          <Input id="entry-date" type="date" value={eventDay} onChange={(event) => setEventDay(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entry-labels">{t('entryLabels')}</Label>
          {labels.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {labels.map((label) => (
                <li key={label} className="flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-2 font-mono text-[11px]">
                  {label}
                  <button
                    type="button"
                    aria-label={t('entryLabelRemove', { label })}
                    className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setLabels((current) => current.filter((item) => item !== label))}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Input
            id="entry-labels"
            value={labelDraft}
            placeholder={t('entryLabelsPlaceholder')}
            onChange={(event) => setLabelDraft(event.target.value.toLowerCase())}
            onKeyDown={handleLabelKeyDown}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">{t('entryLabelsHint')}</p>
          {labelError && <p className="text-xs text-destructive">{labelError}</p>}
        </div>

        {entry && (
          <>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={replaceData} onChange={(event) => setReplaceData(event.target.checked)} disabled={!currentTrack} />
              {t('entryReplaceData')}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleLoadInEditor} disabled={busy}>{t('entryLoadInEditor')}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => copyLink(buildEntryUrl(namespace.slug, entry.id, viewerDomain))}>
                {t('entryCopyLink')}
              </Button>
              {entry.labels.map((label) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-mono"
                  aria-label={t('entryCopyLabelLink', { label })}
                  onClick={() => copyLink(buildLabelUrl(namespace.slug, label, viewerDomain))}
                >
                  {namespace.slug}:{label}
                </Button>
              ))}
            </div>
          </>
        )}

        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          {entry ? (
            <Button type="button" variant="destructive" onClick={() => setStep('confirm-delete')} disabled={busy}>{t('entryDelete')}</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={busy || !name.trim() || (!entry && !currentTrack)}>
              {entry ? t('save') : t('entryPublish')}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
