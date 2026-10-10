import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/editor/store'
import { AccountError } from '@/editor/api/auth'
import { AccountMenu } from './AccountMenu'

const listOAuthProviders = vi.hoisted(() => vi.fn(async () => [{ name: 'discord', displayName: 'Discord' }]))

vi.mock('@/editor/api/auth', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/editor/api/auth')>(),
  listOAuthProviders,
}))

const USER = { id: 'user1', email: 'pilot@example.test', name: 'Pilot' }

describe('AccountMenu', () => {
  beforeEach(() => {
    useAppStore.setState({ accountStatus: 'signed-out', accountUser: null, accountNamespaces: [] })
  })

  it('renders nothing when accounts are disabled', () => {
    useAppStore.setState({ accountStatus: 'disabled' })

    const { container } = render(<AccountMenu />)

    expect(container.innerHTML).toBe('')
  })

  it('signs in with email and password from the dialog', async () => {
    const login = vi.fn(async () => {
      useAppStore.setState({ accountStatus: 'signed-in', accountUser: USER })
    })
    useAppStore.setState({ login })

    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
    expect(await screen.findByRole('button', { name: 'Discord' })).not.toBeNull()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: ' pilot@example.test ' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'secret123' } })
    fireEvent.submit(screen.getByLabelText('Passwort').closest('form') as HTMLFormElement)

    await waitFor(() => expect(login).toHaveBeenCalledWith('pilot@example.test', 'secret123'))
    expect(await screen.findByRole('button', { name: 'Konto: Pilot' })).not.toBeNull()
  })

  it('shows a readable error for wrong credentials', async () => {
    useAppStore.setState({ login: vi.fn(async () => { throw new AccountError('invalid-credentials', 'bad') }) })

    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'pilot@example.test' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'wrong' } })
    fireEvent.submit(screen.getByLabelText('Passwort').closest('form') as HTMLFormElement)

    expect((await screen.findByRole('alert')).textContent).toBe('E-Mail oder Passwort ist falsch.')
  })

  it('registers through the second tab', async () => {
    const register = vi.fn(async () => undefined)
    useAppStore.setState({ register })

    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Registrieren' }))
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Pilot' } })
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'pilot@example.test' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'secret123' } })
    fireEvent.submit(screen.getByLabelText('Passwort').closest('form') as HTMLFormElement)

    await waitFor(() => expect(register).toHaveBeenCalledWith('Pilot', 'pilot@example.test', 'secret123'))
  })

  it('shows the user menu with namespaces and signs out', async () => {
    const logout = vi.fn()
    useAppStore.setState({
      accountStatus: 'signed-in',
      accountUser: USER,
      accountNamespaces: [{ id: 'ns1', slug: 'fpv-linz', name: 'FPV Linz' }],
      logout,
    })

    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'Konto: Pilot' }))

    expect(await screen.findByText('FPV Linz')).not.toBeNull()
    expect(screen.getByText('pilot@example.test')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }))
    expect(logout).toHaveBeenCalled()
  })
})
