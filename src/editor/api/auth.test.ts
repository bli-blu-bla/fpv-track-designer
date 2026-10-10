import { describe, expect, it } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import { AccountError, toAccountError } from './auth'

const responseError = (status: number, url: string, data: Record<string, unknown> = {}, isAbort = false) =>
  new ClientResponseError({ status, url, response: { data }, isAbort })

describe('toAccountError', () => {
  it('maps PocketBase responses to UI error kinds', () => {
    expect(toAccountError(responseError(400, 'https://pb.test/api/collections/users/auth-with-password')).kind).toBe('invalid-credentials')
    expect(toAccountError(responseError(400, 'https://pb.test/api/collections/users/records', { email: { code: 'validation_not_unique' } })).kind).toBe('email-taken')
    expect(toAccountError(responseError(400, 'https://pb.test/api/collections/users/records', { password: { code: 'validation_min_text_constraint' } })).kind).toBe('invalid-input')
    expect(toAccountError(responseError(0, 'https://pb.test/api/collections/users/records')).kind).toBe('network')
    expect(toAccountError(responseError(0, '', {}, true)).kind).toBe('cancelled')
    expect(toAccountError(responseError(500, 'https://pb.test/api/x')).kind).toBe('unknown')
  })

  it('keeps AccountErrors and wraps anything else', () => {
    const error = new AccountError('unavailable', 'off')
    expect(toAccountError(error)).toBe(error)
    expect(toAccountError('boom').kind).toBe('unknown')
  })
})
