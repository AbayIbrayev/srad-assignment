import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSafePersistStorage } from './safe-persist-storage'

interface Stored {
  value: string
}

const isStored = (state: unknown): state is Stored =>
  typeof state === 'object' && state !== null && typeof (state as Stored).value === 'string'

const KEY = 'test-key'

describe('createSafePersistStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const storage = () => createSafePersistStorage(() => globalThis.localStorage, isStored)

  it('returns null when nothing is stored', () => {
    expect(storage().getItem(KEY)).toBeNull()
  })

  it('round-trips a valid value', () => {
    storage().setItem(KEY, { state: { value: 'kept' }, version: 1 })

    expect(storage().getItem(KEY)).toEqual({ state: { value: 'kept' }, version: 1 })
  })

  it('discards unparseable JSON and reports no state', () => {
    localStorage.setItem(KEY, '{"state": {"value": "truncated"')

    expect(storage().getItem(KEY)).toBeNull()
    // Removed rather than left in place: otherwise every reload repeats the
    // same failed parse and the operator has no way to clear it from the UI.
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('discards well-formed JSON that fails validation', () => {
    // The shape an older build might have written.
    localStorage.setItem(KEY, JSON.stringify({ state: { value: 42 }, version: 1 }))

    expect(storage().getItem(KEY)).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('discards JSON with no state envelope at all', () => {
    localStorage.setItem(KEY, JSON.stringify(['not', 'an', 'envelope']))

    expect(storage().getItem(KEY)).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('reports no state when there is no backing store', () => {
    const none = createSafePersistStorage<Stored>(() => undefined, isStored)

    expect(none.getItem(KEY)).toBeNull()
    expect(() => none.setItem(KEY, { state: { value: 'x' } })).not.toThrow()
    expect(() => none.removeItem(KEY)).not.toThrow()
  })

  it('survives a backing store that throws on access', () => {
    // A private window, or site data blocked by policy.
    const blocked = createSafePersistStorage<Stored>(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    }, isStored)

    expect(blocked.getItem(KEY)).toBeNull()
    expect(() => blocked.setItem(KEY, { state: { value: 'x' } })).not.toThrow()
  })

  it('survives a write failing, so the app keeps working in memory', () => {
    const quotaExceeded = {
      getItem: () => null,
      setItem: vi.fn(() => {
        throw new DOMException('Quota exceeded.', 'QuotaExceededError')
      }),
      removeItem: () => {},
    } as unknown as Storage

    const full = createSafePersistStorage<Stored>(() => quotaExceeded, isStored)

    expect(() => full.setItem(KEY, { state: { value: 'x' } })).not.toThrow()
  })

  it('removes a stored value on request', () => {
    storage().setItem(KEY, { state: { value: 'kept' } })
    storage().removeItem(KEY)

    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
