import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './http'
import { createShare, getShare } from './shares'

const options = { baseUrl: 'https://pb.test/' }

function mockFetch(...responses: (Response | Error)[]) {
  const fetchMock = vi.fn()
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response)
    else fetchMock.mockResolvedValueOnce(response)
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

async function expectApiError(promise: Promise<unknown>, kind: ApiError['kind'], status: number) {
  const error = await promise.then(() => null, (reason: unknown) => reason)
  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ kind, status })
}

describe('shares API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a share and posts the payload as JSON', async () => {
    const fetchMock = mockFetch(json({ id: 'k7qx2ab9' }, 201))

    await expect(createShare('[2,"x"]', options)).resolves.toEqual({ id: 'k7qx2ab9' })
    expect(fetchMock).toHaveBeenCalledWith('https://pb.test/api/shares', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ payload: '[2,"x"]' }),
    }))
  })

  it('loads a share payload', async () => {
    const fetchMock = mockFetch(json({ payload: '[2,"x"]' }))

    await expect(getShare('k7qx2ab9', options)).resolves.toEqual({ payload: '[2,"x"]' })
    expect(fetchMock.mock.calls[0][0]).toBe('https://pb.test/api/shares/k7qx2ab9')
  })

  it('maps HTTP status codes to error kinds', async () => {
    mockFetch(json({}, 404), json({}, 400), json({}, 429), json({}, 500))

    await expectApiError(getShare('k7qx2ab9', options), 'not-found', 404)
    await expectApiError(createShare('x', options), 'bad-request', 400)
    await expectApiError(createShare('x', options), 'rate-limited', 429)
    await expectApiError(createShare('x', options), 'server', 500)
  })

  it('reports network failures and malformed responses', async () => {
    mockFetch(new TypeError('Failed to fetch'), json({ id: 'NOT-VALID' }), new Response('nope', { status: 200 }))

    await expectApiError(createShare('x', options), 'network', 0)
    await expectApiError(createShare('x', options), 'server', 200)
    await expectApiError(getShare('k7qx2ab9', options), 'server', 200)
  })

  it('rejects invalid ids and a missing API URL without a request', async () => {
    const fetchMock = mockFetch()

    await expectApiError(getShare('../users', options), 'not-found', 404)
    await expectApiError(createShare('x', { baseUrl: '' }), 'not-configured', 0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
