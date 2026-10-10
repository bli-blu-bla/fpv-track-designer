import { ClientResponseError } from 'pocketbase'
import { getPocketBase } from './client'
import { AccountError, toAccountError } from './auth'
import { dataUrlToBlob } from './tracks'

/**
 * Writes for collections (namespaces → entries → labels). Server rules allow them only for namespace members.
 * Public reads (entry list, entry data) go through `src/core/api/collections.ts`.
 */

const MAX_NAME_LENGTH = 120

export interface NamespaceLabel {
  id: string
  name: string
  entryId: string
}

export interface EntryInput {
  name: string
  /** `YYYY-MM-DD` or null to clear. */
  eventDay: string | null
  /** Export object; omit to keep the stored track data. */
  data?: unknown
  /** JPEG data URL; omit to keep the stored preview. */
  thumbnail?: string | null
}

/** A label name that another request created in the meantime (unique index on namespace + name). */
export class LabelTakenError extends Error {
  readonly label: string

  constructor(label: string) {
    super(`Label "${label}" already exists`)
    this.name = 'LabelTakenError'
    this.label = label
  }
}

function requireSession() {
  const pb = getPocketBase()
  const userId = pb?.authStore.isValid ? pb.authStore.record?.id : undefined
  if (!pb || !userId) throw new AccountError('unavailable', 'Not signed in')
  return { pb, userId }
}

async function run<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    throw toAccountError(error)
  }
}

function toEntryForm(input: EntryInput): FormData {
  const form = new FormData()
  form.append('name', input.name.trim().slice(0, MAX_NAME_LENGTH))
  form.append('eventDate', input.eventDay ? `${input.eventDay} 00:00:00.000Z` : '')
  if (input.data !== undefined) form.append('data', JSON.stringify(input.data))
  const thumbnail = input.thumbnail ? dataUrlToBlob(input.thumbnail) : null
  if (thumbnail) form.append('thumbnail', thumbnail, 'thumbnail.jpg')
  return form
}

export async function listNamespaceLabels(namespaceId: string): Promise<NamespaceLabel[]> {
  const { pb } = requireSession()
  const records = await run(() => pb.collection('labels').getFullList({
    filter: pb.filter('namespace = {:namespaceId}', { namespaceId }),
    fields: 'id,name,entry',
  }))
  return records.map((record) => ({ id: record.id, name: String(record.name), entryId: String(record.entry) }))
}

export async function createEntry(namespaceId: string, input: EntryInput & { data: unknown }): Promise<string> {
  const { pb, userId } = requireSession()
  const form = toEntryForm(input)
  form.append('namespace', namespaceId)
  form.append('createdBy', userId)
  const record = await run(() => pb.collection('entries').create(form))
  return record.id
}

export async function updateEntry(entryId: string, input: EntryInput): Promise<void> {
  const { pb } = requireSession()
  await run(() => pb.collection('entries').update(entryId, toEntryForm(input)))
}

/** Deletes the entry; its labels go with it (cascade). */
export async function deleteEntry(entryId: string): Promise<void> {
  const { pb } = requireSession()
  await run(() => pb.collection('entries').delete(entryId))
}

export async function createLabel(namespaceId: string, name: string, entryId: string): Promise<void> {
  const { pb } = requireSession()
  try {
    await pb.collection('labels').create({ namespace: namespaceId, name, entry: entryId })
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 400 && JSON.stringify(error.response?.data ?? {}).includes('validation_not_unique')) {
      throw new LabelTakenError(name)
    }
    throw toAccountError(error)
  }
}

/** Moves an existing label to another entry in one update (atomic, keeps the record). */
export async function moveLabel(labelId: string, entryId: string): Promise<void> {
  const { pb } = requireSession()
  await run(() => pb.collection('labels').update(labelId, { entry: entryId }))
}

export async function deleteLabel(labelId: string): Promise<void> {
  const { pb } = requireSession()
  await run(() => pb.collection('labels').delete(labelId))
}
