import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountUser } from '@/editor/api/auth'
import { createEditorStore } from './index'

const api = vi.hoisted(() => ({
  isAccountAvailable: vi.fn(() => true),
  getCurrentUser: vi.fn<() => AccountUser | null>(() => null),
  onAccountChange: vi.fn<(listener: (user: AccountUser | null) => void) => () => void>(() => () => undefined),
  refreshSession: vi.fn<() => Promise<AccountUser | null>>(async () => null),
  loginWithPassword: vi.fn<(email: string, password: string) => Promise<AccountUser | null>>(),
  register: vi.fn<(name: string, email: string, password: string) => Promise<AccountUser | null>>(),
  loginWithOAuth: vi.fn<(provider: string) => Promise<AccountUser | null>>(),
  logout: vi.fn(),
  listMyNamespaces: vi.fn(async () => [{ id: 'ns1', slug: 'fpv-linz', name: 'FPV Linz' }]),
}))

vi.mock('@/editor/api/auth', () => api)

const USER: AccountUser = { id: 'user1', email: 'pilot@example.test', name: 'Pilot' }

describe('accountSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.isAccountAvailable.mockReturnValue(true)
    api.getCurrentUser.mockReturnValue(null)
    api.refreshSession.mockResolvedValue(null)
  })

  it('stays disabled without a configured API', () => {
    api.isAccountAvailable.mockReturnValue(false)
    const store = createEditorStore()

    store.getState().initAccount()

    expect(store.getState().accountStatus).toBe('disabled')
    expect(api.refreshSession).not.toHaveBeenCalled()
  })

  it('restores a stored session and loads namespaces', async () => {
    api.getCurrentUser.mockReturnValue(USER)
    api.refreshSession.mockResolvedValue(USER)
    const store = createEditorStore()

    store.getState().initAccount()
    expect(store.getState().accountStatus).toBe('checking')

    await vi.waitFor(() => expect(store.getState().accountNamespaces).toHaveLength(1))
    expect(store.getState()).toMatchObject({ accountStatus: 'signed-in', accountUser: USER })
    expect(api.listMyNamespaces).toHaveBeenCalledTimes(1)
    expect(api.onAccountChange).toHaveBeenCalledTimes(1)
  })

  it('ignores a refresh that finishes after cleanup (StrictMode double mount)', async () => {
    let resolveRefresh: (user: AccountUser | null) => void = () => undefined
    api.refreshSession.mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve }))
    const store = createEditorStore()

    const cleanup = store.getState().initAccount()
    cleanup()
    resolveRefresh(USER)
    await Promise.resolve()

    expect(api.onAccountChange).not.toHaveBeenCalled()
    expect(store.getState().accountUser).toBeNull()
  })

  it('signs in, reacts to auth changes and signs out', async () => {
    let notify: (user: AccountUser | null) => void = () => undefined
    api.onAccountChange.mockImplementation((listener) => {
      notify = listener
      return () => undefined
    })
    api.loginWithPassword.mockResolvedValue(USER)
    const store = createEditorStore()
    store.getState().initAccount()
    await vi.waitFor(() => expect(store.getState().accountStatus).toBe('signed-out'))

    await store.getState().login('pilot@example.test', 'secret123')
    expect(store.getState()).toMatchObject({ accountStatus: 'signed-in', accountUser: USER })
    await vi.waitFor(() => expect(store.getState().accountNamespaces).toHaveLength(1))

    notify(null)
    expect(store.getState()).toMatchObject({ accountStatus: 'signed-out', accountUser: null, accountNamespaces: [] })

    notify(USER)
    store.getState().logout()
    expect(api.logout).toHaveBeenCalled()
    expect(store.getState()).toMatchObject({ accountStatus: 'signed-out', accountUser: null })
  })

  it('propagates login errors to the caller', async () => {
    api.loginWithPassword.mockRejectedValue(new Error('nope'))
    const store = createEditorStore()

    await expect(store.getState().login('a@b.test', 'x')).rejects.toThrow('nope')
    expect(store.getState().accountUser).toBeNull()
  })

  it('keeps the account usable when namespaces cannot be loaded', async () => {
    api.listMyNamespaces.mockRejectedValueOnce(new Error('offline'))
    api.register.mockResolvedValue(USER)
    const store = createEditorStore()

    await store.getState().register('Pilot', USER.email, 'secret123')

    expect(store.getState()).toMatchObject({ accountStatus: 'signed-in', accountNamespaces: [] })
  })
})
