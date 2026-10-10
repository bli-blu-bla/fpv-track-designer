/**
 * Minimal `fetch` wrapper for the public PocketBase API. No SDK, no React.
 * Every failure becomes an `ApiError` whose `kind` callers can branch on.
 */

const DEFAULT_TIMEOUT_MS = 8000

export type ApiErrorKind = 'not-found' | 'bad-request' | 'rate-limited' | 'server' | 'network' | 'not-configured'
/** Which lookup failed for `not-found` errors raised by the client itself. */
export type ApiResource = 'share' | 'namespace' | 'entry' | 'label'

export class ApiError extends Error {
  readonly status: number
  readonly kind: ApiErrorKind
  readonly resource: ApiResource | null

  constructor(kind: ApiErrorKind, status: number, message: string, resource: ApiResource | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.resource = resource
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export interface ApiOptions {
  /** PocketBase origin; defaults to `VITE_API_URL`. */
  baseUrl?: string
  timeoutMs?: number
}

export function getApiBaseUrl(configured = import.meta.env.VITE_API_URL): string {
  return (configured ?? '').replace(/\/+$/, '')
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 404) return 'not-found'
  if (status === 429) return 'rate-limited'
  if (status >= 400 && status < 500) return 'bad-request'
  return 'server'
}

export function resolveBaseUrl(options: ApiOptions): string {
  const baseUrl = getApiBaseUrl(options.baseUrl)
  if (!baseUrl) throw new ApiError('not-configured', 0, 'API URL is not configured')
  return baseUrl
}

/** Performs a JSON request against `path` (starting with `/api/`) and returns the parsed body. */
export async function requestJson(path: string, options: ApiOptions = {}, init: RequestInit = {}): Promise<unknown> {
  const baseUrl = resolveBaseUrl(options)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      signal: controller.signal,
    })
  } catch {
    throw new ApiError('network', 0, 'API is not reachable')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new ApiError(kindForStatus(response.status), response.status, `API request failed with status ${response.status}`)
  }

  try {
    return await response.json()
  } catch {
    throw new ApiError('server', response.status, 'API response is not valid JSON')
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readString(value: Record<string, unknown>, key: string): string {
  const field = value[key]
  if (typeof field !== 'string') throw new ApiError('server', 200, `API response field "${key}" is missing`)
  return field
}
