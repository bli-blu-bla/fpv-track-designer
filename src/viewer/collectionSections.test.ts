import { describe, expect, it } from 'vitest'
import type { EntrySummary } from '@/core/api/collections'
import { formatEventDay, groupCollectionEntries } from './collectionSections'

const entry = (id: string, eventDate: string | null): EntrySummary => ({
  id,
  name: id,
  eventDate,
  labels: [],
  thumbnailUrl: null,
  sketchData: null,
  updated: '2026-10-01T00:00:00.000Z',
})

describe('groupCollectionEntries', () => {
  it('splits entries into upcoming (asc), past (desc) and undated', () => {
    const today = new Date(2026, 9, 10, 15, 30)
    const sections = groupCollectionEntries([
      entry('past-old', '2026-09-01T00:00:00.000Z'),
      entry('undated', null),
      entry('next-month', '2026-11-05T00:00:00.000Z'),
      entry('today', '2026-10-10T00:00:00.000Z'),
      entry('yesterday', '2026-10-09T00:00:00.000Z'),
    ], today)

    expect(sections.upcoming.map((item) => item.id)).toEqual(['today', 'next-month'])
    expect(sections.past.map((item) => item.id)).toEqual(['yesterday', 'past-old'])
    expect(sections.undated.map((item) => item.id)).toEqual(['undated'])
  })
})

describe('formatEventDay', () => {
  it('formats the calendar day independent of the local time zone', () => {
    expect(formatEventDay('2026-10-10T00:00:00.000Z', 'de')).toBe('10. Oktober 2026')
    expect(formatEventDay('2026-10-10T00:00:00.000Z', 'en')).toBe('October 10, 2026')
  })
})
