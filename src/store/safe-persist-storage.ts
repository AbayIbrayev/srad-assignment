import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * A `PersistStorage` that refuses to hand back state it cannot vouch for.
 *
 * The default `createJSONStorage` parses whatever is under the key and trusts
 * the result. That is fine until the stored value is truncated, hand-edited,
 * or left behind by an older build of the app — at which point the store
 * rehydrates into a shape the selectors do not expect and the operator gets a
 * blank screen with an exception behind it, every reload, with no way out that
 * does not involve devtools.
 *
 * Losing an unreadable scoreboard is bad. Losing it *and* being unable to
 * start a new one is worse, so anything that fails to read or fails validation
 * is discarded and the app starts empty.
 *
 * Storage access itself is also guarded: `localStorage` throws on access in a
 * private window and when site data is blocked, and a scoreboard that works
 * only for users who allow storage is not a scoreboard that works.
 */
export function createSafePersistStorage<T>(
  getBackingStore: () => Storage | undefined,
  isValidState: (state: unknown) => state is T,
): PersistStorage<T> {
  const withStore = <R,>(run: (store: Storage) => R, fallback: R): R => {
    try {
      const store = getBackingStore()
      return store ? run(store) : fallback
    } catch {
      return fallback
    }
  }

  return {
    getItem: (name) =>
      withStore((store) => {
        const raw = store.getItem(name)
        if (raw === null) return null

        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          discard(store, name)
          return null
        }

        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !('state' in parsed) ||
          !isValidState(parsed.state)
        ) {
          discard(store, name)
          return null
        }

        return parsed as StorageValue<T>
      }, null),

    setItem: (name, value) =>
      withStore((store) => {
        // A quota error must not take the app down with it: the scoreboard
        // keeps working in memory, it just stops surviving a reload.
        store.setItem(name, JSON.stringify(value))
      }, undefined),

    removeItem: (name) => withStore((store) => store.removeItem(name), undefined),
  }
}

function discard(store: Storage, name: string): void {
  try {
    store.removeItem(name)
  } catch {
    // Nothing further to do — the caller already treats this as "no state".
  }
}
