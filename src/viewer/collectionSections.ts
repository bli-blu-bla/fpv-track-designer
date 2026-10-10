import type { EntrySummary } from '@/core/api/collections'

export interface CollectionSections {
  upcoming: EntrySummary[]
  past: EntrySummary[]
  undated: EntrySummary[]
}

/** Event dates are calendar days stored as midnight UTC; compare by their `YYYY-MM-DD` part. */
export function toEventDay(eventDate: string): string {
  return eventDate.slice(0, 10)
}

export function toLocalDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Upcoming (today or later) ascending, past descending, entries without a date last. */
export function groupCollectionEntries(entries: EntrySummary[], today = new Date()): CollectionSections {
  const todayDay = toLocalDay(today)
  const byDay = (a: EntrySummary, b: EntrySummary) => toEventDay(a.eventDate ?? '').localeCompare(toEventDay(b.eventDate ?? ''))
  const dated = entries.filter((entry) => entry.eventDate !== null)

  return {
    upcoming: dated.filter((entry) => toEventDay(entry.eventDate ?? '') >= todayDay).sort(byDay),
    past: dated.filter((entry) => toEventDay(entry.eventDate ?? '') < todayDay).sort((a, b) => byDay(b, a)),
    undated: entries.filter((entry) => entry.eventDate === null),
  }
}

export function formatEventDay(eventDate: string, language: string): string {
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${toEventDay(eventDate)}T00:00:00Z`))
}
