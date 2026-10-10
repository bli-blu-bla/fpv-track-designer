import { buildEntryUrl } from '@/core/share/viewerRoute'
import { TrackSketch } from '@/components/TrackSketch'
import type { EntrySummary } from '@/core/api/collections'
import { useTranslation, type TranslationKey } from '@/i18n'
import { formatEventDay, groupCollectionEntries } from './collectionSections'
import type { ViewerCollection as ViewerCollectionData } from './store'

export function LabelChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <li key={label} className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2 py-0.5 font-mono text-[11px] text-sky-200">
          {label}
        </li>
      ))}
    </ul>
  )
}

function EntryCard({ entry, namespace }: { entry: EntrySummary; namespace: string }) {
  const { t, language } = useTranslation()

  return (
    <li>
      <a
        href={buildEntryUrl(namespace, entry.id, window.location.origin)}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-sky-300/40 hover:bg-white/10"
      >
        <div className="aspect-[8/5] bg-slate-900">
          {entry.thumbnailUrl ? (
            <img src={entry.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
          ) : entry.sketchData ? (
            <TrackSketch data={entry.sketchData} className="size-full" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-slate-500">{t('collectionNoPreview')}</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div>
            <h3 className="font-medium text-slate-100 group-hover:text-white">{entry.name}</h3>
            {entry.eventDate && <p className="text-xs text-slate-400">{formatEventDay(entry.eventDate, language)}</p>}
          </div>
          <LabelChips labels={entry.labels} />
        </div>
      </a>
    </li>
  )
}

export function ViewerCollection({ collection }: { collection: ViewerCollectionData }) {
  const { t } = useTranslation()
  const { namespace, entries } = collection
  const sections = groupCollectionEntries(entries)
  const visibleSections = ([
    ['collectionUpcoming', sections.upcoming],
    ['collectionPast', sections.past],
    ['collectionUndated', sections.undated],
  ] as const satisfies readonly (readonly [TranslationKey, EntrySummary[]])[]).filter(([, items]) => items.length > 0)

  return (
    <main className="h-dvh overflow-y-auto bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">FPV Track Viewer</p>
          <h1 className="mt-2 text-3xl font-semibold">{namespace.name}</h1>
          <p className="mt-1 font-mono text-sm text-slate-400">{namespace.slug}</p>
        </header>
        {visibleSections.length === 0 && <p className="text-slate-300">{t('collectionEmpty')}</p>}
        {visibleSections.map(([titleKey, items]) => (
          <section key={titleKey} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{t(titleKey)}</h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((entry) => <EntryCard key={entry.id} entry={entry} namespace={namespace.slug} />)}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
