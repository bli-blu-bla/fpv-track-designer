import type { StateCreator } from 'zustand'
import type { NamespaceSummary } from '@/core/api/collections'
import * as accountApi from '@/editor/api/auth'
import type { AccountUser } from '@/editor/api/auth'
import type { AppState } from './types'

/** `disabled`: no API configured, the editor stays purely local and shows no account UI. */
export type AccountStatus = 'disabled' | 'checking' | 'signed-out' | 'signed-in'

export interface AccountSlice {
  accountUser: AccountUser | null
  accountStatus: AccountStatus
  /** Namespaces the user is a member of (collections they may manage). */
  accountNamespaces: NamespaceSummary[]
  /** Reads the stored session, subscribes to auth changes and validates the token. Returns an unsubscribe function. */
  initAccount: () => () => void
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  loginWithOAuth: (provider: string) => Promise<void>
  logout: () => void
  refreshAccountNamespaces: () => Promise<void>
}

export const createAccountSlice: StateCreator<AppState, [], [], AccountSlice> = (set, get) => {
  const applyUser = (user: AccountUser | null) => {
    const previousId = get().accountUser?.id
    set({
      accountUser: user,
      accountStatus: user ? 'signed-in' : 'signed-out',
      ...(user?.id === previousId ? {} : { accountNamespaces: [] }),
    })
    if (user && user.id !== previousId) void get().refreshAccountNamespaces()
  }

  return {
    accountUser: null,
    accountStatus: 'disabled',
    accountNamespaces: [],
    initAccount: () => {
      if (!accountApi.isAccountAvailable()) {
        set({ accountStatus: 'disabled', accountUser: null, accountNamespaces: [] })
        return () => undefined
      }

      // Validate the stored token first; subscribe afterwards so the refresh itself is not applied twice.
      let disposed = false
      let unsubscribe: () => void = () => undefined
      set({ accountStatus: accountApi.getCurrentUser() ? 'checking' : 'signed-out', accountUser: null })
      void accountApi.refreshSession().then((user) => {
        if (disposed) return
        applyUser(user)
        unsubscribe = accountApi.onAccountChange(applyUser)
      })
      return () => {
        disposed = true
        unsubscribe()
      }
    },
    login: async (email, password) => {
      applyUser(await accountApi.loginWithPassword(email, password))
    },
    register: async (name, email, password) => {
      applyUser(await accountApi.register(name, email, password))
    },
    loginWithOAuth: async (provider) => {
      applyUser(await accountApi.loginWithOAuth(provider))
    },
    logout: () => {
      accountApi.logout()
      set({ accountUser: null, accountStatus: 'signed-out', accountNamespaces: [] })
    },
    refreshAccountNamespaces: async () => {
      const user = get().accountUser
      if (!user) return
      try {
        const namespaces = await accountApi.listMyNamespaces(user.id)
        if (get().accountUser?.id === user.id) set({ accountNamespaces: namespaces })
      } catch {
        // Not fatal: the collections panel simply stays hidden until the next refresh.
      }
    },
  }
}
