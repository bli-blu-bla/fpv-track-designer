import { describe, expect, it, vi } from 'vitest'
import { applyLabelPlan, isValidLabelName, normalizeLabelName, planLabelChanges } from './labelPlan'

const api = vi.hoisted(() => ({
  createLabel: vi.fn(async () => undefined),
  deleteLabel: vi.fn(async () => undefined),
  moveLabel: vi.fn(async () => undefined),
}))
vi.mock('@/editor/api/collections', () => api)

const labels = [
  { id: 'l-latest', name: 'latest', entryId: 'entry-old' },
  { id: 'l-okt', name: '10-okt-2026', entryId: 'entry-me' },
  { id: 'l-final', name: 'final', entryId: 'entry-me' },
]

describe('label names', () => {
  it('normalizes and validates label input', () => {
    expect(normalizeLabelName('  10 Okt 2026 ')).toBe('10-okt-2026')
    expect(isValidLabelName('latest')).toBe(true)
    expect(isValidLabelName('v1.2_rc-3')).toBe(true)
    expect(isValidLabelName('-latest')).toBe(false)
    expect(isValidLabelName('fpv:latest')).toBe(false)
  })
})

describe('planLabelChanges', () => {
  it('creates new labels and moves taken ones for a new entry', () => {
    expect(planLabelChanges(['latest', 'training'], null, labels)).toEqual({
      create: ['training'],
      move: [labels[0]],
      remove: [],
    })
  })

  it('keeps, removes and moves labels of an existing entry', () => {
    expect(planLabelChanges(['10-okt-2026', 'latest'], 'entry-me', labels)).toEqual({
      create: [],
      move: [labels[0]],
      remove: [labels[2]],
    })
  })
})

describe('applyLabelPlan', () => {
  it('removes, moves (update) and creates in order', async () => {
    const calls: string[] = []
    api.deleteLabel.mockImplementation(async () => { calls.push('delete') })
    api.moveLabel.mockImplementation(async () => { calls.push('move') })
    api.createLabel.mockImplementation(async () => { calls.push('create') })

    await applyLabelPlan('ns1', 'entry-me', { create: ['new'], move: [labels[0]], remove: [labels[2]] })

    expect(calls).toEqual(['delete', 'move', 'create'])
    expect(api.moveLabel).toHaveBeenCalledWith('l-latest', 'entry-me')
    expect(api.createLabel).toHaveBeenCalledWith('ns1', 'new', 'entry-me')
  })
})
