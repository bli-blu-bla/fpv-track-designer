import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveTrack, loadTrack, listTracks, deleteTrack, autoSave, loadTrackThumbnail, saveTrackThumbnail } from './storage'
import type { Track, Config } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

const createTestTrack = (overrides?: Partial<Track>): Track => ({
  id: 'test-track-id',
  name: 'Test Track',
  gates: [
    { id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('standard') },
  ],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 100, height: 100 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

const createTestConfig = (): Config => ({
  gateQuantities: {
    standard: 6,
    'h-gate': 2,
    'double-h': 1,
    hurdle: 1,
    dive: 1,
    double: 1,
    ladder: 1,
    'start-finish': 1,
    flag: 1,
    'flag-small': 0,
    'octagonal-tunnel': 1,
  },
  fieldSize: { width: 100, height: 100 },
  snapGatesToGrid: false,
  snapGridSize: 0.3,
  showFlightPath: true,
  showOpeningLabels: true,
  showGrid: false,
  theme: 'minimal',
})

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('saveTrack', () => {
    it('should save track to localStorage', () => {
      const track = createTestTrack()
      const config = createTestConfig()

      saveTrack(track, config)

      expect(localStorage.setItem).toHaveBeenCalled()
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'fpv-track-test-track-id',
        expect.any(String)
      )
    })

    it('should update track list when saving', () => {
      const track = createTestTrack()
      const config = createTestConfig()

      saveTrack(track, config)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'fpv-track-list',
        expect.any(String)
      )
    })

    it('should update existing track in list', () => {
      const track = createTestTrack({ name: 'Original Name' })
      const config = createTestConfig()

      saveTrack(track, config)
      saveTrack({ ...track, name: 'Updated Name' }, config)

      const list = listTracks()
      expect(list).toHaveLength(1)
      expect(list[0].name).toBe('Updated Name')
    })
  })

  describe('loadTrack', () => {
    it('should return null for non-existent track', () => {
      const result = loadTrack('non-existent')
      expect(result).toBeNull()
    })

    it('should load saved track', () => {
      const track = createTestTrack()
      const config = createTestConfig()

      saveTrack(track, config)
      const result = loadTrack('test-track-id')

      expect(result).not.toBeNull()
      expect(result?.track.id).toBe('test-track-id')
      expect(result?.track.name).toBe('Test Track')
      expect(result?.config.fieldSize).toEqual({ width: 100, height: 100 })
      expect(result?.config.snapGridSize).toBe(0.3)
    })
  })

  describe('listTracks', () => {
    it('should return empty array when no tracks', () => {
      const tracks = listTracks()
      expect(tracks).toEqual([])
    })

    it('should list all saved tracks', () => {
      const track1 = createTestTrack({ id: 'track-1', name: 'Track 1' })
      const track2 = createTestTrack({ id: 'track-2', name: 'Track 2' })
      const config = createTestConfig()

      saveTrack(track1, config)
      saveTrack(track2, config)

      const tracks = listTracks()
      expect(tracks).toHaveLength(2)
      expect(tracks.map(t => t.name)).toContain('Track 1')
      expect(tracks.map(t => t.name)).toContain('Track 2')
    })
  })

  describe('deleteTrack', () => {
    it('should remove track from storage', () => {
      const track = createTestTrack()
      const config = createTestConfig()

      saveTrack(track, config)
      deleteTrack('test-track-id')

      expect(loadTrack('test-track-id')).toBeNull()
    })

    it('should remove track from list', () => {
      const track = createTestTrack()
      const config = createTestConfig()

      saveTrack(track, config)
      deleteTrack('test-track-id')

      const tracks = listTracks()
      expect(tracks).toHaveLength(0)
    })
  })

  describe('autoSave', () => {
    it('should save track with updated timestamp', () => {
      const track = createTestTrack()
      const config = createTestConfig()

      autoSave(track, config)

      expect(localStorage.setItem).toHaveBeenCalled()
    })

    it('should not throw on auto-save failure', () => {
      const track = createTestTrack()
      const config = createTestConfig()

      // Mock localStorage.setItem to throw
      vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      })

      expect(() => autoSave(track, config)).not.toThrow()
    })
  })

  describe('thumbnails and gallery stats', () => {
    it('stores gate and pole counts in the list and the thumbnail under its own key', () => {
      const track = createTestTrack()
      saveTrack(track, createTestConfig(), { thumbnail: 'data:image/jpeg;base64,AAAA' })

      expect(listTracks()[0]).toMatchObject({ gateCount: track.gates.length })
      expect(typeof listTracks()[0].poleCount).toBe('number')
      expect(loadTrackThumbnail(track.id)).toBe('data:image/jpeg;base64,AAAA')
    })

    it('keeps the previous thumbnail when saving without one', () => {
      const track = createTestTrack()
      saveTrack(track, createTestConfig(), { thumbnail: 'data:image/jpeg;base64,AAAA' })
      saveTrack({ ...track, name: 'Renamed' }, createTestConfig())

      expect(loadTrackThumbnail(track.id)).toBe('data:image/jpeg;base64,AAAA')
    })

    it('rejects anything that is not a JPEG data URL', () => {
      saveTrackThumbnail('x', 'javascript:alert(1)')
      localStorage.setItem('fpv-track-thumb-y', 'https://example.com/a.png')

      expect(loadTrackThumbnail('x')).toBeNull()
      expect(loadTrackThumbnail('y')).toBeNull()
    })

    it('removes the thumbnail together with the track', () => {
      const track = createTestTrack()
      saveTrack(track, createTestConfig(), { thumbnail: 'data:image/jpeg;base64,AAAA' })

      deleteTrack(track.id)

      expect(loadTrackThumbnail(track.id)).toBeNull()
    })
  })
})
