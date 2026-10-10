import { LABEL_NAME_PATTERN, NAMESPACE_SLUG_PATTERN, RECORD_ID_PATTERN } from '@/core/api/collections'
import { SHARE_ID_PATTERN } from '@/core/api/shares'

/**
 * Viewer URLs:
 *   /#c.…                  inline payload (no server; takes precedence)
 *   /s/<id>                anonymous short link
 *   /t/<ns>                collection overview
 *   /t/<ns>:<label>        entry behind a label, e.g. /t/fpv-linz:latest
 *   /t/<ns>@<entryId>      one entry
 */
export type ViewerRoute =
  | { kind: 'hash'; payload: string }
  | { kind: 'share'; id: string }
  | { kind: 'label'; namespace: string; label: string }
  | { kind: 'entry'; namespace: string; entryId: string }
  | { kind: 'collection'; namespace: string }
  | { kind: 'empty' }

export const DEFAULT_VIEWER_DOMAIN = 'https://sharedtrack.fpvooe.com'

const EMPTY_ROUTE: ViewerRoute = { kind: 'empty' }

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function parseCollectionPath(value: string): ViewerRoute {
  const labelIndex = value.indexOf(':')
  const entryIndex = value.indexOf('@')

  if (labelIndex >= 0) {
    const namespace = value.slice(0, labelIndex)
    const label = value.slice(labelIndex + 1)
    return NAMESPACE_SLUG_PATTERN.test(namespace) && LABEL_NAME_PATTERN.test(label)
      ? { kind: 'label', namespace, label }
      : EMPTY_ROUTE
  }

  if (entryIndex >= 0) {
    const namespace = value.slice(0, entryIndex)
    const entryId = value.slice(entryIndex + 1)
    return NAMESPACE_SLUG_PATTERN.test(namespace) && RECORD_ID_PATTERN.test(entryId)
      ? { kind: 'entry', namespace, entryId }
      : EMPTY_ROUTE
  }

  return NAMESPACE_SLUG_PATTERN.test(value) ? { kind: 'collection', namespace: value } : EMPTY_ROUTE
}

export function parseViewerRoute(location: { pathname: string; hash: string }): ViewerRoute {
  const payload = location.hash.replace(/^#/, '')
  if (payload) return { kind: 'hash', payload }

  const segments = location.pathname.split('/').filter(Boolean)
  if (segments.length !== 2) return EMPTY_ROUTE

  const [prefix, rawValue] = segments
  const value = safeDecode(rawValue)
  if (value === null) return EMPTY_ROUTE

  if (prefix === 's') return SHARE_ID_PATTERN.test(value) ? { kind: 'share', id: value } : EMPTY_ROUTE
  if (prefix === 't') return parseCollectionPath(value)
  return EMPTY_ROUTE
}

export function normalizeViewerDomain(viewerDomain?: string): string {
  return (viewerDomain || DEFAULT_VIEWER_DOMAIN).replace(/\/+$/, '')
}

export function buildShareUrl(id: string, viewerDomain?: string): string {
  return `${normalizeViewerDomain(viewerDomain)}/s/${id}`
}

export function buildCollectionUrl(namespace: string, viewerDomain?: string): string {
  return `${normalizeViewerDomain(viewerDomain)}/t/${namespace}`
}

export function buildLabelUrl(namespace: string, label: string, viewerDomain?: string): string {
  return `${buildCollectionUrl(namespace, viewerDomain)}:${label}`
}

export function buildEntryUrl(namespace: string, entryId: string, viewerDomain?: string): string {
  return `${buildCollectionUrl(namespace, viewerDomain)}@${entryId}`
}
