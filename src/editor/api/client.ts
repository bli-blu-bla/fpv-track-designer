import PocketBase from 'pocketbase'
import { getApiBaseUrl } from '@/core/api/http'

let client: PocketBase | null | undefined

/**
 * Shared PocketBase SDK instance for the editor, or null when `VITE_API_URL` is not set
 * (the editor then runs purely local). The SDK keeps the auth token in localStorage (`pocketbase_auth`).
 */
export function getPocketBase(): PocketBase | null {
  if (client === undefined) {
    const baseUrl = getApiBaseUrl()
    client = baseUrl ? new PocketBase(baseUrl) : null
    // Parallel requests to the same endpoint (e.g. sync uploads) must not cancel each other.
    client?.autoCancellation(false)
  }
  return client
}

/** Test hook: forget the cached instance so the next call reads the environment again. */
export function resetPocketBaseForTests() {
  client = undefined
}
