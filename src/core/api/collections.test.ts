import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './http'
import { getEntry, getEntryByLabel, getNamespace, listEntries } from './collections'

const options = { baseUrl: 'https://pb.test' }
const NAMESPACE = { id: 'ns0000000000001', slug: 'fpv-linz', name: 'FPV Linz' }
const ENTRY_ID = 'entry0000000001'
const OTHER_ENTRY_ID = 'entry0000000002'
const TRACK_DATA = { version: '2.1.0', track: { gates: [] }, config: {} }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const items = (...records: unknown[]) => json({ items: records })

/** Routes requests by collection so call order does not matter for parallel requests. */
function mockApi(routes: Record<string, () => Response>) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input)
    const match = Object.keys(routes).find((prefix) => url.startsWith(`https://pb.test${prefix}`))
    return match ? routes[match]() : json({}, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function queryOf(fetchMock: ReturnType<typeof mockApi>, prefix: string): URLSearchParams {
  const call = fetchMock.mock.calls.find(([input]) => String(input).startsWith(`https://pb.test${prefix}`))
  return new URL(String(call?.[0])).searchParams
}

const entryRecord = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Entry ${id}`,
  namespace: NAMESPACE.id,
  eventDate: '2026-10-10 00:00:00.000Z',
  thumbnail: 'thumb_abc.jpg',
  updated: '2026-10-09 12:00:00.000Z',
  data: TRACK_DATA,
  ...overrides,
})

describe('collections API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads a namespace by slug', async () => {
    const fetchMock = mockApi({ '/api/collections/namespaces/records?': () => items(NAMESPACE) })

    await expect(getNamespace('fpv-linz', options)).resolves.toEqual(NAMESPACE)
    expect(queryOf(fetchMock, '/api/collections/namespaces/').get('filter')).toBe("slug='fpv-linz'")
  })

  it('throws not-found for unknown or invalid namespaces', async () => {
    const fetchMock = mockApi({ '/api/collections/namespaces/records?': () => items() })

    await expect(getNamespace('unknown', options)).rejects.toMatchObject({ kind: 'not-found', status: 404 })
    await expect(getNamespace("x' || '1'='1", options)).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('lists entries with their labels, dates and thumbnail URLs', async () => {
    const fetchMock = mockApi({
      '/api/collections/namespaces/records?': () => items(NAMESPACE),
      '/api/collections/entries/records?': () => items(
        entryRecord(ENTRY_ID),
        entryRecord(OTHER_ENTRY_ID, { eventDate: '', thumbnail: '' }),
      ),
      '/api/collections/labels/records?': () => items(
        { name: 'latest', entry: ENTRY_ID },
        { name: '10-okt-2026', entry: ENTRY_ID },
      ),
    })

    await expect(listEntries('fpv-linz', options)).resolves.toEqual([
      {
        id: ENTRY_ID,
        name: `Entry ${ENTRY_ID}`,
        eventDate: '2026-10-10T00:00:00.000Z',
        labels: ['10-okt-2026', 'latest'],
        thumbnailUrl: `https://pb.test/api/files/entries/${ENTRY_ID}/thumb_abc.jpg`,
        updated: '2026-10-09T12:00:00.000Z',
      },
      {
        id: OTHER_ENTRY_ID,
        name: `Entry ${OTHER_ENTRY_ID}`,
        eventDate: null,
        labels: [],
        thumbnailUrl: null,
        updated: '2026-10-09T12:00:00.000Z',
      },
    ])
    expect(queryOf(fetchMock, '/api/collections/entries/').get('filter')).toBe(`namespace='${NAMESPACE.id}'`)
  })

  it('loads an entry with raw data and namespace', async () => {
    mockApi({
      '/api/collections/namespaces/records?': () => items(NAMESPACE),
      [`/api/collections/entries/records/${ENTRY_ID}`]: () => json(entryRecord(ENTRY_ID)),
      '/api/collections/labels/records?': () => items({ name: 'latest', entry: ENTRY_ID }),
    })

    await expect(getEntry('fpv-linz', ENTRY_ID, options)).resolves.toMatchObject({
      id: ENTRY_ID,
      namespace: NAMESPACE,
      labels: ['latest'],
      data: TRACK_DATA,
    })
  })

  it('treats an entry from another namespace as not found', async () => {
    mockApi({
      '/api/collections/namespaces/records?': () => items(NAMESPACE),
      [`/api/collections/entries/records/${ENTRY_ID}`]: () => json(entryRecord(ENTRY_ID, { namespace: 'otherns00000001' })),
    })

    await expect(getEntry('fpv-linz', ENTRY_ID, options)).rejects.toMatchObject({ kind: 'not-found' })
    await expect(getEntry('fpv-linz', 'not-an-id', options)).rejects.toMatchObject({ kind: 'not-found' })
  })

  it('resolves a label to its entry', async () => {
    const fetchMock = mockApi({
      '/api/collections/namespaces/records?': () => items(NAMESPACE),
      '/api/collections/labels/records?': () => items({ name: 'latest', entry: ENTRY_ID }),
      [`/api/collections/entries/records/${ENTRY_ID}`]: () => json(entryRecord(ENTRY_ID)),
    })

    await expect(getEntryByLabel('fpv-linz', 'latest', options)).resolves.toMatchObject({ id: ENTRY_ID, labels: ['latest'] })
    expect(queryOf(fetchMock, '/api/collections/labels/').get('filter')).toBe(`namespace='${NAMESPACE.id}' && name='latest'`)
  })

  it('throws not-found for unknown labels', async () => {
    mockApi({
      '/api/collections/namespaces/records?': () => items(NAMESPACE),
      '/api/collections/labels/records?': () => items(),
    })

    await expect(getEntryByLabel('fpv-linz', 'missing', options)).rejects.toMatchObject({ kind: 'not-found' })
    await expect(getEntryByLabel('fpv-linz', 'Not Valid', options)).rejects.toMatchObject({ kind: 'not-found' })
  })

  it('passes through server and network errors', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(json({}, 500))
      .mockRejectedValueOnce(new TypeError('offline')))

    await expect(listEntries('fpv-linz', options)).rejects.toMatchObject({ kind: 'server', status: 500 })
    await expect(listEntries('fpv-linz', options)).rejects.toMatchObject({ kind: 'network', status: 0 })
  })
})
