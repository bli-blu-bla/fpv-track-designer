import { ClientResponseError, type RecordModel } from 'pocketbase'
import type { NamespaceSummary } from '@/core/api/collections'
import { getPocketBase } from './client'

export interface AccountUser {
  id: string
  email: string
  name: string
}

export interface OAuthProvider {
  name: string
  displayName: string
}

export type AccountErrorKind = 'invalid-credentials' | 'email-taken' | 'invalid-input' | 'network' | 'cancelled' | 'unavailable' | 'unknown'

export class AccountError extends Error {
  readonly kind: AccountErrorKind

  constructor(kind: AccountErrorKind, message: string) {
    super(message)
    this.name = 'AccountError'
    this.kind = kind
  }
}

const USERS = 'users'

function requireClient() {
  const pb = getPocketBase()
  if (!pb) throw new AccountError('unavailable', 'Accounts are not configured')
  return pb
}

function toAccountUser(record: RecordModel | null): AccountUser | null {
  if (!record || record.collectionName !== USERS) return null
  return {
    id: record.id,
    email: typeof record.email === 'string' ? record.email : '',
    name: typeof record.name === 'string' ? record.name : '',
  }
}

function hasFieldError(error: ClientResponseError, field: string, code: string): boolean {
  const data: unknown = error.response?.data
  if (typeof data !== 'object' || data === null) return false
  const fieldError: unknown = Reflect.get(data, field)
  return typeof fieldError === 'object' && fieldError !== null && 'code' in fieldError && fieldError.code === code
}

/** Maps SDK errors to the few cases the UI distinguishes. */
export function toAccountError(error: unknown): AccountError {
  if (error instanceof AccountError) return error
  if (!(error instanceof ClientResponseError)) return new AccountError('unknown', String(error))
  if (error.isAbort) return new AccountError('cancelled', error.message)
  if (error.status === 0) return new AccountError('network', error.message)
  if (hasFieldError(error, 'email', 'validation_not_unique')) return new AccountError('email-taken', error.message)
  if (error.status === 400 && error.url.includes('/auth-with-password')) return new AccountError('invalid-credentials', error.message)
  if (error.status === 400) return new AccountError('invalid-input', error.message)
  return new AccountError('unknown', error.message)
}

async function run<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    throw toAccountError(error)
  }
}

export function isAccountAvailable(): boolean {
  return getPocketBase() !== null
}

export function getCurrentUser(): AccountUser | null {
  const pb = getPocketBase()
  return pb?.authStore.isValid ? toAccountUser(pb.authStore.record) : null
}

/** Calls `listener` whenever the auth state changes (login, logout, refresh, other tab). Returns an unsubscribe function. */
export function onAccountChange(listener: (user: AccountUser | null) => void): () => void {
  const pb = getPocketBase()
  if (!pb) return () => undefined
  return pb.authStore.onChange(() => listener(getCurrentUser()))
}

/** Validates a stored token with the server; clears it when it is no longer accepted. */
export async function refreshSession(): Promise<AccountUser | null> {
  const pb = getPocketBase()
  if (!pb?.authStore.isValid) return null

  try {
    await pb.collection(USERS).authRefresh()
  } catch (error) {
    const accountError = toAccountError(error)
    // Offline: keep the session, the token itself is still valid.
    if (accountError.kind !== 'network') pb.authStore.clear()
  }
  return getCurrentUser()
}

export async function loginWithPassword(email: string, password: string): Promise<AccountUser | null> {
  const pb = requireClient()
  await run(() => pb.collection(USERS).authWithPassword(email, password))
  return getCurrentUser()
}

export async function register(name: string, email: string, password: string): Promise<AccountUser | null> {
  const pb = requireClient()
  await run(() => pb.collection(USERS).create({ name, email, password, passwordConfirm: password }))
  return loginWithPassword(email, password)
}

/** Opens the provider popup. Must be called directly from a click handler (Safari blocks delayed popups). */
export async function loginWithOAuth(provider: string): Promise<AccountUser | null> {
  const pb = requireClient()
  await run(() => pb.collection(USERS).authWithOAuth2({ provider }))
  return getCurrentUser()
}

export async function requestPasswordReset(email: string): Promise<void> {
  const pb = requireClient()
  await run(() => pb.collection(USERS).requestPasswordReset(email))
}

export function logout() {
  getPocketBase()?.authStore.clear()
}

export async function listOAuthProviders(): Promise<OAuthProvider[]> {
  const pb = requireClient()
  const methods = await run(() => pb.collection(USERS).listAuthMethods())
  if (!methods.oauth2.enabled) return []
  return methods.oauth2.providers.map(({ name, displayName }) => ({ name, displayName }))
}

/** Namespaces the signed-in user may manage (members relation). */
export async function listMyNamespaces(userId: string): Promise<NamespaceSummary[]> {
  const pb = requireClient()
  const records = await run(() => pb.collection('namespaces').getFullList({
    filter: pb.filter('members.id ?= {:userId}', { userId }),
    sort: 'name',
    fields: 'id,slug,name',
  }))
  return records.map((record) => ({ id: record.id, slug: String(record.slug), name: String(record.name) }))
}
