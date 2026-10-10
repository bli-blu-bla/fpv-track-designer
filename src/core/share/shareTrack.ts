import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { Config, Track } from '@/core/types'
import { deserializeTrack } from '@/core/schemas/track.schema'
import { decodeCompactTrack, encodeCompactTrack } from '@/core/schemas/compactTrack.schema'
import { normalizeViewerDomain } from './viewerRoute'

/** Current links: lz-string compressed compact track (`schemas/compactTrack.schema.ts`). */
const COMPACT_PAYLOAD_PREFIX = 'c.'
/** Older links: lz-string compressed full export JSON. */
const COMPRESSED_PAYLOAD_PREFIX = 'z.'

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
  return `${normalizeViewerDomain(viewerDomain)}/#${encodeTrackSharePayload(track, config)}`
}
