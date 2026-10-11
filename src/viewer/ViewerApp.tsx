import { useEffect, useState } from 'react'
import { CircleHelp, Download, Play, Square } from 'lucide-react'
import { Scene } from '@/scene/Scene'
import { Button } from '@/components/ui/button'
import { serializeTrack } from '@/core/schemas/track.schema'
import { useViewerStore } from './store'
import { useTranslation } from '@/i18n'
import { ViewerHelpDialog } from './ViewerHelpDialog'
import { LabelChips, ViewerCollection } from './ViewerCollection'
import { buildCollectionUrl } from '@/core/share/viewerRoute'
import type { ViewerEntryContext } from './store'

const VIEWER_HELP_COOKIE = 'fpv-track-viewer-help-seen'
const VIEWER_HELP_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function hasViewerHelpCookie() {
  if (typeof document === 'undefined') return true

  return document.cookie
    .split('; ')
    .some((cookie) => cookie.startsWith(`${VIEWER_HELP_COOKIE}=`))
}

function setViewerHelpCookie() {
  if (typeof document === 'undefined') return

  document.cookie = `${VIEWER_HELP_COOKIE}=true; max-age=${VIEWER_HELP_COOKIE_MAX_AGE}; path=/; SameSite=Lax`
}

function EntryContextBar({ context }: { context: ViewerEntryContext }) {
  const { t } = useTranslation()

  return (
    <div className="absolute top-3 left-3 flex max-w-[calc(100%-12rem)] flex-col gap-1.5 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-white backdrop-blur">
      <p className="truncate text-sm">
        <span className="text-white/60">{context.namespace.name}</span>
        <span className="px-1.5 text-white/40">/</span>
        <span className="font-medium">{context.entryName}</span>
      </p>
      <LabelChips labels={context.labels} />
      <a
        href={buildCollectionUrl(context.namespace.slug, window.location.origin)}
        className="text-xs text-sky-300 hover:text-sky-200 hover:underline"
      >
        {t('collectionAllTracks', { name: context.namespace.name })}
      </a>
    </div>
  )
}

function createTrackFileName(trackName: string): string {
  return `${trackName.replace(/\s+/g, '-').toLowerCase()}.json`
}

export function ViewerApp() {
  const { t } = useTranslation()
  const track = useViewerStore((state) => state.track)
  const config = useViewerStore((state) => state.config)
  const error = useViewerStore((state) => state.error)
  const status = useViewerStore((state) => state.status)
  const collection = useViewerStore((state) => state.collection)
  const entryContext = useViewerStore((state) => state.entryContext)
  const [helpOpen, setHelpOpen] = useState(false)
  const [fpvModeActive, setFpvModeActive] = useState(false)

  useEffect(() => {
    if (!track || !config || hasViewerHelpCookie()) return

    setViewerHelpCookie()
    const timeoutId = window.setTimeout(() => setHelpOpen(true), 0)

    return () => window.clearTimeout(timeoutId)
  }, [config, track])

  useEffect(() => {
    if (!fpvModeActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFpvModeActive(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fpvModeActive])

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-slate-100">
        <section className="max-w-md rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/40">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">FPV Track Viewer</p>
          <h1 className="mt-3 text-2xl font-semibold">{t('viewerLoadErrorTitle')}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
        </section>
      </main>
    )
  }

  if (collection) return <ViewerCollection collection={collection} />

  if (!track || !config) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-slate-100">
        <p role="status">{status === 'loading' ? t('viewerLoading') : t('noTrackLoaded')}</p>
      </main>
    )
  }

  const handleExport = () => {
    const json = serializeTrack(track, config, { pretty: true })
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = createTrackFileName(track.name)
    link.click()
    URL.revokeObjectURL(url)
  }

  const fpvDisabled = track.gates.length < 2

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-slate-950">
      <Scene
        track={track}
        config={config}
        fpvModeActive={fpvModeActive}
        onFpvComplete={() => setFpvModeActive(false)}
        showBots
      />
      {entryContext && !fpvModeActive && <EntryContextBar context={entryContext} />}
      <div className="absolute top-3 right-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full border-white/15 bg-black/25 text-white/70 backdrop-blur hover:bg-white/10 hover:text-white"
          onClick={() => setFpvModeActive((active) => !active)}
          disabled={fpvDisabled}
          aria-label={fpvModeActive ? t('fpvStop') : t('fpvStart')}
        >
          {fpvModeActive ? <Square className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full border-white/15 bg-black/25 text-white/70 backdrop-blur hover:bg-white/10 hover:text-white"
          onClick={handleExport}
          aria-label={t('downloadJson')}
        >
          <Download className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full border-white/15 bg-black/25 text-white/70 backdrop-blur hover:bg-white/10 hover:text-white"
          onClick={() => setHelpOpen(true)}
          aria-label={t('openViewerHelp')}
        >
          <CircleHelp className="size-4" />
        </Button>
      </div>
      <a
        href="https://fpvooe.com"
        className="absolute right-3 bottom-3 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-white/60 backdrop-blur transition hover:text-white"
        target="_blank"
        rel="noreferrer"
      >
        fpvooe.com
      </a>
      <ViewerHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </main>
  )
}
