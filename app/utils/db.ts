/**
 * Tiny promise-based IndexedDB wrapper (no dependencies).
 * Stores:  kv (garden-state snapshot) · outbox (pending signed events) · events (seen-ids)
 */
const DB_NAME = 'gardenos'
const DB_VERSION = 1
const STORES = ['kv', 'outbox', 'events'] as const
type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB unavailable'))
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
  return dbPromise
}

export async function idbGet<T = any>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const r = db.transaction(store, 'readonly').objectStore(store).get(key)
    r.onsuccess = () => resolve(r.result as T)
    r.onerror = () => reject(r.error)
  })
}

export async function idbSet(store: StoreName, key: IDBValidKey, value: any): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const r = db.transaction(store, 'readwrite').objectStore(store).put(value, key)
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  })
}

export async function idbGetAll<T = any>(store: StoreName): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const r = db.transaction(store, 'readonly').objectStore(store).getAll()
    r.onsuccess = () => resolve(r.result as T[])
    r.onerror = () => reject(r.error)
  })
}

export async function idbDel(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const r = db.transaction(store, 'readwrite').objectStore(store).delete(key)
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  })
}

export async function idbClear(store: StoreName): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const r = db.transaction(store, 'readwrite').objectStore(store).clear()
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  })
}

/** Convenience: load the persisted garden-state snapshot (or undefined). */
export async function loadSnapshot<T = any>(): Promise<T | undefined> {
  return loadSnapshotFor<T>('local')
}

/** Convenience: persist the garden-state snapshot. */
export async function saveSnapshot(state: any): Promise<void> {
  return saveSnapshotFor('local', state)
}

/** Persist a snapshot in an identity-specific slot so accounts cannot leak data into each other. */
export async function saveSnapshotFor(owner: string, state: any): Promise<void> {
  try { await idbSet('kv', `gardenState:${owner || 'local'}`, state) } catch { /* quota / private mode */ }
}

export async function loadSnapshotFor<T = any>(owner = 'local'): Promise<T | undefined> {
  try { return await idbGet<T>('kv', `gardenState:${owner || 'local'}`) } catch { return undefined }
}

/** Cache signed/received events so relay reads can be resumed offline. */
export async function cacheEvent(event: any): Promise<void> {
  if (!event?.id) return
  try { await idbSet('events', event.id, event) } catch { /* quota / private mode */ }
}

export async function loadCachedEvents<T = any>(owner?: string): Promise<T[]> {
  try {
    const events = await idbGetAll<T & { pubkey?: string }>('events')
    return owner ? events.filter((event) => event.pubkey === owner) : events
  } catch { return [] }
}
