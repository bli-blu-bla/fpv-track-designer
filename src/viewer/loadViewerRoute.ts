import { getEntry, getEntryByLabel, getNamespace, listEntries, type EntryDetail } from '@/core/api/collections'
import { isApiError } from '@/core/api/http'
import { getShare } from '@/core/api/shares'
import { decodeCompactTrack } from '@/core/schemas/compactTrack.schema'
import { parseTrackExport } from '@/core/schemas/track.schema'
import { decodeTrackSharePayload } from '@/core/share/shareTrack'
import type { ViewerRoute } from '@/core/share/viewerRoute'
import { translateOutsideReact, type TranslationKey } from '@/i18n'
import { useViewerStore } from './store'

type LoadableRoute = Exclude<ViewerRoute, { kind: 'hash' } | { kind: 'empty' }>

const NOT_FOUND_KEYS: Record<LoadableRoute['kind'], TranslationKey> = {
  share: 'viewerShareNotFound',
  label: 'viewerLabelNotFound',
  entry: 'viewerEntryNotFound',
  collection: 'viewerCollectionNotFound',
}

function errorKeyFor(route: LoadableRoute, error: unknown): TranslationKey {
  if (!isApiError(error)) return 'viewerInvalidPayload'
  if (error.kind !== 'not-found') return 'viewerServerUnreachable'
  if (error.resource === 'namespace') return 'viewerCollectionNotFound'
  return NOT_FOUND_KEYS[route.kind]
}

function showEntry(entry: EntryDetail) {
  const { setTrackData, setError } = useViewerStore.getState()
  const result = parseTrackExport(entry.data)
  if ('error' in result) {
    setError(translateOutsideReact('viewerInvalidPayload'))
    return
  }

  setTrackData(result.track, result.config, { namespace: entry.namespace, entryName: entry.name, labels: entry.labels })
}

async function loadRemoteRoute(route: LoadableRoute) {
  const { setTrackData, setCollection, setError } = useViewerStore.getState()

  switch (route.kind) {
    case 'share': {
      const { payload } = await getShare(route.id)
      const result = decodeCompactTrack(payload)
      if ('error' in result) setError(translateOutsideReact('viewerInvalidPayload'))
      else setTrackData(result.track, result.config)
      return
    }
    case 'label':
      showEntry(await getEntryByLabel(route.namespace, route.label))
      return
    case 'entry':
      showEntry(await getEntry(route.namespace, route.entryId))
      return
    case 'collection': {
      const namespace = await getNamespace(route.namespace)
      setCollection({ namespace, entries: await listEntries(namespace) })
    }
  }
}

/** Resolves a parsed viewer URL into the viewer store. Never throws. */
export async function loadViewerRoute(route: ViewerRoute): Promise<void> {
  const { setLoading, setTrackData, setError } = useViewerStore.getState()

  if (route.kind === 'empty') {
    setError(translateOutsideReact('viewerMissingPayload'))
    return
  }

  if (route.kind === 'hash') {
    const result = decodeTrackSharePayload(route.payload)
    if ('error' in result) setError(translateOutsideReact('viewerInvalidPayload'))
    else setTrackData(result.track, result.config)
    return
  }

  setLoading()
  try {
    await loadRemoteRoute(route)
  } catch (error) {
    setError(translateOutsideReact(errorKeyFor(route, error), 'label' in route ? { label: route.label } : undefined))
  }
}
