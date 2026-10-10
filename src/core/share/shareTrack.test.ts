import { describe, expect, it } from 'vitest'
import { defaultConfig } from '@/core/defaultConfig'
import type { Track } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { serializeTrack } from '@/core/schemas/track.schema'
import { compressToEncodedURIComponent } from 'lz-string'
import {
  createTrackShareUrl,
  decodeTrackSharePayload,
  encodeTrackSharePayload,
} from './shareTrack'

const createTestTrack = (): Track => ({
  id: 'share-track',
  name: 'Share Track',
  gates: [
    {
      id: 'gate-1',
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: createDefaultGateOpenings('standard'),
    },
  ],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

function encodeLegacyBase64Url(value: string): string {
  const encoded = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_match, hex: string) => (
    String.fromCharCode(Number.parseInt(hex, 16))
  ))

  return btoa(encoded)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

describe('shareTrack helpers', () => {
  it('round-trips a track through a share URL hash payload', () => {
    const track = createTestTrack()
    const shareUrl = createTrackShareUrl(track, defaultConfig, 'https://sharedtrack.fpvooe.com/')
    const payload = shareUrl.split('#')[1]

    expect(shareUrl.startsWith('https://sharedtrack.fpvooe.com/#')).toBe(true)
    expect(payload).toBe(encodeTrackSharePayload(track, defaultConfig))
    expect(payload?.startsWith('c.')).toBe(true)

    const decoded = decodeTrackSharePayload(payload)
    expect('error' in decoded).toBe(false)
    if ('error' in decoded) return
    expect(decoded.track.name).toBe('Share Track')
    expect(decoded.track.gates).toHaveLength(1)
    expect(decoded.config.fieldSize).toEqual(defaultConfig.fieldSize)
  })

  it('keeps lz-string compressed full-JSON share payloads readable', () => {
    const track = createTestTrack()
    const payload = `z.${compressToEncodedURIComponent(serializeTrack(track, defaultConfig))}`

    const decoded = decodeTrackSharePayload(payload)

    expect('error' in decoded).toBe(false)
    if ('error' in decoded) return
    expect(decoded.track.id).toBe('share-track')
  })

  it('keeps legacy base64 share payloads readable', () => {
    const track = createTestTrack()
    const legacyPayload = encodeLegacyBase64Url(serializeTrack(track, defaultConfig))

    const decoded = decodeTrackSharePayload(legacyPayload)

    expect('error' in decoded).toBe(false)
    if ('error' in decoded) return
    expect(decoded.track.id).toBe('share-track')
    expect(decoded.config.sky).toBe('day')
    expect(decoded.config.quality).toBe('simple')
  })

  it('compresses larger share payloads below the legacy base64 size', () => {
    const track: Track = {
      ...createTestTrack(),
      gates: Array.from({ length: 24 }, (_, index) => ({
        id: `gate-${index + 1}`,
        type: index % 2 === 0 ? 'standard' : 'h-gate',
        position: { x: index * 2, y: 0, z: index % 3 },
        rotation: (index % 12) * 30,
        openings: createDefaultGateOpenings(index % 2 === 0 ? 'standard' : 'h-gate'),
      })),
      gateSequence: Array.from({ length: 24 }, (_, index) => ({
        gateId: `gate-${index + 1}`,
        openingId: 'main',
        reverse: index % 3 === 0,
      })),
    }
    const json = serializeTrack(track, defaultConfig)

    expect(encodeTrackSharePayload(track, defaultConfig).length).toBeLessThan(encodeLegacyBase64Url(json).length)
  })

  it('returns a validation error for invalid payloads', () => {
    const decoded = decodeTrackSharePayload('invalid-payload')

    expect('error' in decoded).toBe(true)
    if (!('error' in decoded)) return
    expect(decoded.errors[0]?.field).toBe('root')
  })
})
