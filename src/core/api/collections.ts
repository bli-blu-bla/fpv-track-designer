import { ApiError, isRecord, readString, requestJson, resolveBaseUrl, type ApiOptions, type ApiResource } from './http'

/** Mirrors the field patterns in pocketbase/pb_migrations. */
export const NAMESPACE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/
export const LABEL_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/
export const RECORD_ID_PATTERN = /^[a-z0-9]{15}$/

const MAX_PAGE_SIZE = 500

export interface NamespaceSummary {
  id: string
  slug: string
  name: string
}

export interface EntrySummary {
  id: string
  name: string
  /** ISO timestamp or null when the entry has no event date. */
  eventDate: string | null
  labels: string[]
  thumbnailUrl: string | null
  updated: string
}

export interface EntryDetail extends EntrySummary {
  namespace: NamespaceSummary
  /** Raw export object; validate with `parseTrackExport()`. */
  data: unknown
}

/** PocketBase stores dates as `YYYY-MM-DD HH:mm:ss.sssZ`; empty string means unset. */
export function toIsoDate(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value.replace(' ', 'T') : null
}

function notFound(resource: ApiResource): ApiError {
  return new ApiError('not-found', 404, `${resource} not found`, resource)
}

function query(params: Record<string, string>): string {
  return new URLSearchParams(params).toString()
}

function readItems(body: unknown): Record<string, unknown>[] {
  if (!isRecord(body) || !Array.isArray(body.items)) throw new ApiError('server', 200, 'API response has no items')
  return body.items.filter(isRecord)
}

function toNamespace(record: Record<string, unknown>): NamespaceSummary {
  return { id: readString(record, 'id'), slug: readString(record, 'slug'), name: readString(record, 'name') }
}

export function getFileUrl(baseUrl: string, collection: string, recordId: string, filename: unknown): string | null {
  if (typeof filename !== 'string' || filename === '') return null
  return `${baseUrl}/api/files/${collection}/${recordId}/${encodeURIComponent(filename)}`
}

function toEntrySummary(record: Record<string, unknown>, labels: string[], baseUrl: string): EntrySummary {
  const id = readString(record, 'id')
  return {
    id,
    name: readString(record, 'name'),
    eventDate: toIsoDate(record.eventDate),
    labels: [...labels].sort(),
    thumbnailUrl: getFileUrl(baseUrl, 'entries', id, record.thumbnail),
    updated: toIsoDate(record.updated) ?? '',
  }
}

async function listLabels(filter: string, options: ApiOptions): Promise<{ name: string; entry: string }[]> {
  const body = await requestJson(
    `/api/collections/labels/records?${query({ filter, perPage: String(MAX_PAGE_SIZE), skipTotal: '1', fields: 'name,entry' })}`,
    options,
  )
  return readItems(body).map((item) => ({ name: readString(item, 'name'), entry: readString(item, 'entry') }))
}

export async function getNamespace(slug: string, options: ApiOptions = {}): Promise<NamespaceSummary> {
  if (!NAMESPACE_SLUG_PATTERN.test(slug)) throw notFound('namespace')

  const body = await requestJson(
    `/api/collections/namespaces/records?${query({ filter: `slug='${slug}'`, perPage: '1', skipTotal: '1', fields: 'id,slug,name' })}`,
    options,
  )
  const [record] = readItems(body)
  if (!record) throw notFound('namespace')
  return toNamespace(record)
}

/** Accepts a slug or an already loaded namespace (saves one request). */
export async function listEntries(namespaceOrSlug: string | NamespaceSummary, options: ApiOptions = {}): Promise<EntrySummary[]> {
  const baseUrl = resolveBaseUrl(options)
  const namespace = typeof namespaceOrSlug === 'string' ? await getNamespace(namespaceOrSlug, options) : namespaceOrSlug
  const [entriesBody, labels] = await Promise.all([
    requestJson(
      `/api/collections/entries/records?${query({
        filter: `namespace='${namespace.id}'`,
        perPage: String(MAX_PAGE_SIZE),
        skipTotal: '1',
        sort: '-created',
        fields: 'id,name,eventDate,thumbnail,updated',
      })}`,
      options,
    ),
    listLabels(`namespace='${namespace.id}'`, options),
  ])

  return readItems(entriesBody).map((record) => {
    const id = readString(record, 'id')
    return toEntrySummary(record, labels.filter((label) => label.entry === id).map((label) => label.name), baseUrl)
  })
}

async function loadEntry(namespace: NamespaceSummary, entryId: string, options: ApiOptions): Promise<EntryDetail> {
  const baseUrl = resolveBaseUrl(options)
  const record = await requestJson(`/api/collections/entries/records/${entryId}`, options)
  if (!isRecord(record) || record.namespace !== namespace.id) throw notFound('entry')

  const labels = await listLabels(`entry='${entryId}'`, options)
  return {
    ...toEntrySummary(record, labels.map((label) => label.name), baseUrl),
    namespace,
    data: record.data,
  }
}

export async function getEntry(namespaceSlug: string, entryId: string, options: ApiOptions = {}): Promise<EntryDetail> {
  if (!RECORD_ID_PATTERN.test(entryId)) throw notFound('entry')
  return loadEntry(await getNamespace(namespaceSlug, options), entryId, options)
}

export async function getEntryByLabel(namespaceSlug: string, label: string, options: ApiOptions = {}): Promise<EntryDetail> {
  if (!LABEL_NAME_PATTERN.test(label)) throw notFound('label')

  const namespace = await getNamespace(namespaceSlug, options)
  const [match] = await listLabels(`namespace='${namespace.id}' && name='${label}'`, options)
  if (!match) throw notFound('label')
  return loadEntry(namespace, match.entry, options)
}
