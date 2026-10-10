import { describe, expect, it } from 'vitest'
import {
  buildCollectionUrl,
  buildEntryUrl,
  buildLabelUrl,
  buildShareUrl,
  parseViewerRoute,
} from './viewerRoute'

const route = (pathname: string, hash = '') => parseViewerRoute({ pathname, hash })

describe('parseViewerRoute', () => {
  it('prefers an inline hash payload over any path', () => {
    expect(route('/', '#c.abc')).toEqual({ kind: 'hash', payload: 'c.abc' })
    expect(route('/s/k7qx2ab9', '#c.abc')).toEqual({ kind: 'hash', payload: 'c.abc' })
  })

  it('parses short links', () => {
    expect(route('/s/k7qx2ab9')).toEqual({ kind: 'share', id: 'k7qx2ab9' })
    expect(route('/s/k7qx2ab9/')).toEqual({ kind: 'share', id: 'k7qx2ab9' })
  })

  it('parses collection, label and entry paths', () => {
    expect(route('/t/fpv-linz')).toEqual({ kind: 'collection', namespace: 'fpv-linz' })
    expect(route('/t/fpv-linz:latest')).toEqual({ kind: 'label', namespace: 'fpv-linz', label: 'latest' })
    expect(route('/t/fpv-linz%3A10-okt-2026')).toEqual({ kind: 'label', namespace: 'fpv-linz', label: '10-okt-2026' })
    expect(route('/t/fpv-linz@abcdefghij12345')).toEqual({ kind: 'entry', namespace: 'fpv-linz', entryId: 'abcdefghij12345' })
  })

  it('returns empty for missing or invalid routes', () => {
    expect(route('/')).toEqual({ kind: 'empty' })
    expect(route('/', '#')).toEqual({ kind: 'empty' })
    expect(route('/s/short')).toEqual({ kind: 'empty' })
    expect(route('/s/UPPER123')).toEqual({ kind: 'empty' })
    expect(route('/t/Bad_Slug')).toEqual({ kind: 'empty' })
    expect(route('/t/fpv-linz:Latest')).toEqual({ kind: 'empty' })
    expect(route('/t/fpv-linz@short')).toEqual({ kind: 'empty' })
    expect(route('/t/%E0%A4%A')).toEqual({ kind: 'empty' })
    expect(route('/x/fpv-linz')).toEqual({ kind: 'empty' })
    expect(route('/t/fpv-linz/extra')).toEqual({ kind: 'empty' })
  })
})

describe('viewer URL builders', () => {
  it('build URLs that parse back to the same route', () => {
    const domain = 'https://sharedtrack.fpvooe.com/'
    const cases = [
      [buildShareUrl('k7qx2ab9', domain), { kind: 'share', id: 'k7qx2ab9' }],
      [buildCollectionUrl('fpv-linz', domain), { kind: 'collection', namespace: 'fpv-linz' }],
      [buildLabelUrl('fpv-linz', 'latest', domain), { kind: 'label', namespace: 'fpv-linz', label: 'latest' }],
      [buildEntryUrl('fpv-linz', 'abcdefghij12345', domain), { kind: 'entry', namespace: 'fpv-linz', entryId: 'abcdefghij12345' }],
    ] as const

    for (const [url, expected] of cases) {
      expect(url.startsWith('https://sharedtrack.fpvooe.com/')).toBe(true)
      const { pathname, hash } = new URL(url)
      expect(parseViewerRoute({ pathname, hash })).toEqual(expected)
    }
  })

  it('falls back to the default viewer domain', () => {
    expect(buildShareUrl('k7qx2ab9')).toBe('https://sharedtrack.fpvooe.com/s/k7qx2ab9')
  })
})
