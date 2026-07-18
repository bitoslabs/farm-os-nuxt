import { useSettings } from '~/composables/useSettings'
import type { EventTemplate } from '~/utils/event-builders'
import { idbGetAll, idbSet, idbDel, cacheEvent } from '~/utils/db'

/**
 * Nostr relay client with offline support.
 *  - Lazy SimplePool over configured relays.
 *  - Signs with nsec (finalizeEvent) or NIP-07.
 *  - Outbox queue: signed events are persisted to IndexedDB when offline and
 *    flushed on reconnect / when relays become reachable.
 *  - Reads: loadFromRelays + subscribeToAuthor for live sync.
 * Client-only (ssr: false).
 */

let pool: any = null
let flushPromise: Promise<number> | null = null
async function getPool() {
  if (!pool) { const mod = await import('nostr-tools/pool'); pool = new mod.SimplePool() }
  return pool
}
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}
function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}
function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

export interface PublishResult {
  ok: boolean
  queued?: boolean
  reason?: 'not-signed-in' | 'read-only' | 'locked' | 'offline-mode' | 'no-relays' | 'sign-failed' | 'publish-failed' | 'offline'
  eventId?: string
}

interface OutboxItem { id: string; event: any; createdAt: number }

const GARDEN_SYNC_KINDS = [
  5, 32000, 32001, 32010, 32012, 32030, 32040, 32050, 32090, 32091, 32060, 32061, 32062
]

export function useNostr() {
  const { settings } = useSettings()

  const status = useState<{ online: boolean; pending: number; published: number; failed: number; lastError?: string; lastEventAt?: number }>('nostr-status', () => ({ online: true, pending: 0, published: 0, failed: 0 }))
  const log = useState<{ id: string; kind: number; at: number; result: 'ok' | 'queued' | 'fail' }[]>('nostr-log', () => [])
  const outbox = useState<OutboxItem[]>('nostr-outbox', () => [])

  const canSign = computed(() => (settings.value.identity.method === 'nsec' && !!settings.value.identity.secretKey) || settings.value.identity.method === 'nip07')
  const outboxCount = computed(() => outbox.value.length)

  function writeRelays() { return settings.value.relays.filter((r) => r.enabled && r.write).map((r) => r.url) }
  function readRelays() { return settings.value.relays.filter((r) => r.enabled && r.read).map((r) => r.url) }

  async function signEvent(template: EventTemplate) {
    const id = settings.value.identity
    const pubkey = id.pubkey!
    const unsigned = { kind: template.kind, pubkey, created_at: Math.floor(Date.now() / 1000), tags: template.tags, content: template.content, id: '', sig: '' }
    if (id.method === 'nsec' && id.secretKey) {
      const { finalizeEvent } = await import('nostr-tools/pure')
      return finalizeEvent(unsigned, hexToBytes(id.secretKey))
    }
    if (id.method === 'nip07' && typeof window !== 'undefined' && (window as any).nostr) {
      return await (window as any).nostr.signEvent(unsigned)
    }
    throw new Error('no-signing-key')
  }

  function pushLog(kind: number, result: 'ok' | 'queued' | 'fail', id = '') {
    log.value.unshift({ id: id || uuid(), kind, at: Date.now(), result })
    log.value = log.value.slice(0, 50)
  }

  // ---- outbox persistence ----
  async function loadOutbox() {
    try { outbox.value = (await idbGetAll<OutboxItem>('outbox')) ?? [] } catch { outbox.value = [] }
    status.value.pending = outbox.value.length
  }
  async function queueEvent(event: any) {
    const item: OutboxItem = { id: uuid(), event, createdAt: Date.now() }
    outbox.value = [...outbox.value, item]
    status.value.pending = outbox.value.length
    try { await idbSet('outbox', item.id, item) } catch {}
  }
  async function dropQueued(id: string) {
    outbox.value = outbox.value.filter((i) => i.id !== id)
    status.value.pending = outbox.value.length
    try { await idbDel('outbox', id) } catch {}
  }

  // ---- publish (with offline queueing) ----
  async function publish(template: EventTemplate): Promise<PublishResult> {
    if (!settings.value.identity.pubkey) return { ok: false, reason: 'not-signed-in' }
    if (!canSign.value) return { ok: false, reason: 'read-only' }
    if (settings.value.identity.encrypted && !settings.value.identity.secretKey) return { ok: false, reason: 'locked' }

    let signed: any
    try { signed = await signEvent(template) } catch { status.value.failed++; status.value.lastError = 'sign failed'; return { ok: false, reason: 'sign-failed' } }
    await cacheEvent(signed)

    // offline / disabled → queue
    if (settings.value.sync.offlineMode) { await queueEvent(signed); pushLog(signed.kind, 'queued', signed.id); return { ok: true, queued: true, reason: 'offline-mode', eventId: signed.id } }
    if (!isOnline()) { await queueEvent(signed); pushLog(signed.kind, 'queued', signed.id); return { ok: true, queued: true, reason: 'offline', eventId: signed.id } }

    const relays = writeRelays()
    if (!relays.length) { await queueEvent(signed); pushLog(signed.kind, 'queued', signed.id); return { ok: true, queued: true, reason: 'no-relays', eventId: signed.id } }

    status.value.pending++
    try {
      const p = await getPool()
      const results = await Promise.allSettled(p.publish(relays, signed))
      status.value.pending = Math.max(0, status.value.pending - 1)
      const okCount = results.filter((r) => r.status === 'fulfilled').length
      if (okCount === 0) { await queueEvent(signed); status.value.failed++; pushLog(signed.kind, 'fail', signed.id); return { ok: false, queued: true, reason: 'publish-failed', eventId: signed.id } }
      status.value.published++; status.value.lastEventAt = Date.now(); pushLog(signed.kind, 'ok', signed.id)
      return { ok: true, eventId: signed.id }
    } catch (e: any) {
      status.value.pending = Math.max(0, status.value.pending - 1)
      status.value.failed++; status.value.lastError = e?.message
      await queueEvent(signed)
      return { ok: false, queued: true, reason: 'publish-failed', eventId: signed.id }
    }
  }

  function publishQuiet(template: EventTemplate) {
    publish(template).catch(() => {})
  }

  // ---- flush queued events when back online ----
  async function flushOutbox(): Promise<number> {
    if (flushPromise) return flushPromise
    flushPromise = flushOutboxInternal()
    try { return await flushPromise } finally { flushPromise = null }
  }

  async function flushOutboxInternal(): Promise<number> {
    if (!canSign.value || settings.value.sync.offlineMode || !isOnline()) return 0
    const relays = writeRelays()
    if (!relays.length) return 0
    const p = await getPool()
    let flushed = 0
    for (const item of [...outbox.value]) {
      try {
        const results = await Promise.allSettled(p.publish(relays, item.event))
        if (results.some((r) => r.status === 'fulfilled')) { await dropQueued(item.id); await cacheEvent(item.event); status.value.published++; status.value.lastEventAt = Date.now(); flushed++ }
      } catch { /* keep queued */ }
    }
    if (flushed) pushLog(0, 'ok', 'flush-' + flushed)
    return flushed
  }

  // ---- reads ----
  async function fetchEvents(filter: Record<string, any>, timeoutMs = 3000): Promise<any[]> {
    const relays = readRelays()
    if (!relays.length) return []
    const p = await getPool()
    try { return await p.querySync(relays, filter, { timeout: timeoutMs }) } catch { return [] }
  }

  async function fetchProfile(pubkey: string) {
    const events = await fetchEvents({ kinds: [0], authors: [pubkey], limit: 1 })
    if (!events.length) return null
    try { return JSON.parse(events[0].content) } catch { return null }
  }

  /** Pull the author's GardenOS events (addressable + logs) from read relays. */
  async function loadFromRelays(pubkey: string): Promise<any[]> {
    const events = await fetchEvents({ authors: [pubkey], kinds: GARDEN_SYNC_KINDS, limit: 300 })
    await Promise.all(events.map(cacheEvent))
    return events.sort((a, b) => a.created_at - b.created_at)
  }

  /** Live subscription for new events from this author. Returns an unsubscribe fn. */
  function subscribeToAuthor(pubkey: string, onEvent: (e: any) => void): (() => void) | null {
    const relays = readRelays()
    if (!relays.length) return null
    let sub: any = null
    let cancelled = false
    ;(async () => {
      const p = await getPool()
      sub = p.subscribeMany(relays, [{ authors: [pubkey], kinds: GARDEN_SYNC_KINDS, since: Math.floor(Date.now() / 1000) }], {
        onevent: (e: any) => onEvent(e)
      })
      if (cancelled) { try { sub?.close() } catch {} }
    })()
    return () => { cancelled = true; try { sub?.close() } catch {} }
  }

  /** NIP-09 deletion of an addressable entity, broadcast (queued if offline). */
  function deleteAddressable(kind: number, d: string): Promise<PublishResult> {
    const pubkey = settings.value.identity.pubkey
    if (!pubkey) return Promise.resolve({ ok: false, reason: 'not-signed-in' })
    return publish({ kind: 5, content: '', tags: [['a', `${kind}:${pubkey}:${d}`]] })
  }

  return {
    status, log, outbox, outboxCount, canSign,
    publish, publishQuiet, flushOutbox, loadOutbox,
    fetchEvents, fetchProfile, loadFromRelays, subscribeToAuthor, deleteAddressable,
    writeRelays, readRelays
  }
}
