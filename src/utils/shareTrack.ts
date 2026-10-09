import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { Config, Track } from '@/types'
import { deserializeTrack } from '@/schemas/track.schema'
import { decodeCompactTrack, encodeCompactTrack } from '@/schemas/compactTrack.schema'

const DEFAULT_VIEWER_DOMAIN = 'https://sharedtrack.fpvooe.com'
/** Current links: lz-string compressed compact track (`schemas/compactTrack.schema.ts`). */
const COMPACT_PAYLOAD_PREFIX = 'c.'
/** Older links: lz-string compressed full export JSON. */
const COMPRESSED_PAYLOAD_PREFIX = 'z.'
const DEFAULT_SHORTENER_ENDPOINT = 'https://n8n.fanaticagentic.com/webhook/shorten-track'
const DEV_SHORTENER_ENDPOINT = '/api/shorten-track'
const SHORTENER_TIMEOUT_MS = 8000

interface ShortenTrackShareUrlOptions {
  endpoint?: string
  timeoutMs?: number
}

function isShortenerResponse(value: unknown): value is { shortUrl: string } {
  return (
    typeof value === 'object'
    && value !== null
    && 'shortUrl' in value
    && typeof value.shortUrl === 'string'
  )
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const decoded = atob(normalized)
  const escaped = Array.from(decoded, (char) => (
    `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`
  )).join('')

  return decodeURIComponent(escaped)
}

export function encodeTrackSharePayload(track: Track, config: Config): string {
  return `${COMPACT_PAYLOAD_PREFIX}${compressToEncodedURIComponent(encodeCompactTrack(track, config))}`
}

function decompressPayload(payload: string): string {
  const decompressed = decompressFromEncodedURIComponent(payload)
  if (!decompressed) throw new Error('Failed to decompress shared track data')
  return decompressed
}

export function decodeTrackSharePayload(payload: string): ReturnType<typeof deserializeTrack> {
  try {
    if (payload.startsWith(COMPACT_PAYLOAD_PREFIX)) {
      return decodeCompactTrack(decompressPayload(payload.slice(COMPACT_PAYLOAD_PREFIX.length)))
    }

    if (payload.startsWith(COMPRESSED_PAYLOAD_PREFIX)) {
      return deserializeTrack(decompressPayload(payload.slice(COMPRESSED_PAYLOAD_PREFIX.length)))
    }

    return deserializeTrack(decodeBase64Url(payload))
  } catch {
    return {
      error: 'Invalid share payload',
      errors: [{ field: 'root', message: 'Failed to decode shared track data' }],
    }
  }
}

export function createTrackShareUrl(track: Track, config: Config, viewerDomain?: string): string {
  const domain = (viewerDomain || DEFAULT_VIEWER_DOMAIN).replace(/\/$/, '')
  return `${domain}/#${encodeTrackSharePayload(track, config)}`
}

export function getTrackShortenerEndpoint(
  isDev = import.meta.env.DEV,
  configuredEndpoint = import.meta.env.VITE_TRACK_SHORTENER_ENDPOINT,
): string {
  return configuredEndpoint || (isDev ? DEV_SHORTENER_ENDPOINT : DEFAULT_SHORTENER_ENDPOINT)
}

export async function shortenTrackShareUrl(
  longUrl: string,
  options: ShortenTrackShareUrlOptions = {},
): Promise<string> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? SHORTENER_TIMEOUT_MS)

  try {
    const response = await fetch(options.endpoint ?? getTrackShortenerEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ longUrl }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Shortener request failed with status ${response.status}`)
    }

    const payload: unknown = await response.json()
    if (!isShortenerResponse(payload) || !isHttpUrl(payload.shortUrl)) {
      throw new Error('Shortener response did not include a valid shortUrl')
    }

    return payload.shortUrl
  } finally {
    window.clearTimeout(timeout)
  }
}
