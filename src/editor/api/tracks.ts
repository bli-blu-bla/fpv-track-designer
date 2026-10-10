import type { RecordModel } from 'pocketbase'
import { toIsoDate } from '@/core/api/collections'
import { getPocketBase } from './client'
import { AccountError, toAccountError } from './auth'

/** The signed-in user's synced tracks (`tracks` collection). Raw `data` is validated by callers via `parseTrackExport()`. */

const TRACKS = 'tracks'
const MAX_NAME_LENGTH = 120
const SUMMARY_FIELDS = 'id,clientId,name,updated,thumbnail,collectionId,collectionName'

export interface RemoteTrackSummary {
  id: string
  clientId: string
  name: string
  /** ISO timestamp of the last server-side change; used for conflict detection. */
  updated: string
  thumbnailUrl: string | null
}

export interface RemoteTrack extends RemoteTrackSummary {
  data: unknown
}

export interface RemoteTrackInput {
  clientId: string
  name: string
  /** Export object (`JSON.parse(serializeTrack(...))`). */
  data: unknown
  /** JPEG data URL; omitted keeps the stored thumbnail. */
  thumbnail?: string | null
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

function toSummary(record: RecordModel): RemoteTrackSummary {
  const pb = getPocketBase()
  const thumbnail = typeof record.thumbnail === 'string' ? record.thumbnail : ''
  return {
    id: record.id,
    clientId: String(record.clientId),
    name: String(record.name),
    updated: toIsoDate(record.updated) ?? '',
    thumbnailUrl: thumbnail && pb ? pb.files.getURL(record, thumbnail) : null,
  }
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl)
  if (!match) return null
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0))
  return new Blob([bytes], { type: match[1] })
}

function toFormData(input: RemoteTrackInput, userId: string): FormData {
  const form = new FormData()
  form.append('owner', userId)
  form.append('clientId', input.clientId)
  form.append('name', input.name.slice(0, MAX_NAME_LENGTH))
  form.append('data', JSON.stringify(input.data))
  const thumbnail = input.thumbnail ? dataUrlToBlob(input.thumbnail) : null
  if (thumbnail) form.append('thumbnail', thumbnail, 'thumbnail.jpg')
  return form
}

export async function listRemoteTracks(): Promise<RemoteTrackSummary[]> {
  const { pb } = requireSession()
  const records = await run(() => pb.collection(TRACKS).getFullList({ sort: '-updated', fields: SUMMARY_FIELDS }))
  return records.map(toSummary)
}

export async function findRemoteTrack(clientId: string): Promise<RemoteTrackSummary | null> {
  const { pb, userId } = requireSession()
  const records = await run(() => pb.collection(TRACKS).getList(1, 1, {
    filter: pb.filter('owner = {:userId} && clientId = {:clientId}', { userId, clientId }),
    fields: SUMMARY_FIELDS,
    skipTotal: true,
  }))
  return records.items[0] ? toSummary(records.items[0]) : null
}

export async function getRemoteTrack(id: string): Promise<RemoteTrack> {
  const { pb } = requireSession()
  const record = await run(() => pb.collection(TRACKS).getOne(id))
  return { ...toSummary(record), data: record.data }
}

export async function createRemoteTrack(input: RemoteTrackInput): Promise<RemoteTrackSummary> {
  const { pb, userId } = requireSession()
  return toSummary(await run(() => pb.collection(TRACKS).create(toFormData(input, userId))))
}

export async function updateRemoteTrack(id: string, input: RemoteTrackInput): Promise<RemoteTrackSummary> {
  const { pb, userId } = requireSession()
  return toSummary(await run(() => pb.collection(TRACKS).update(id, toFormData(input, userId))))
}

export async function deleteRemoteTrack(id: string): Promise<void> {
  const { pb } = requireSession()
  await run(() => pb.collection(TRACKS).delete(id))
}

/** Downloads a remote thumbnail as a JPEG data URL for the local gallery; null on any failure. */
export async function fetchThumbnailDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
