import { useGardenStore } from '~/composables/useGardenStore'
import { useNostr } from '~/composables/useNostr'
import { useSettings } from '~/composables/useSettings'
import { loadSnapshot, loadSnapshotFor, loadCachedEvents, saveSnapshotFor } from '~/utils/db'
import { mergeEvents } from '~/utils/event-parsers'
import { emptyState } from '~/utils/emptyState'

/**
 * Offline-first Nostr sync (client only):
 *  1. Hydrate the garden store from IndexedDB (survives refresh/offline).
 *  2. Persist every store change to IndexedDB (debounced).
 *  3. When signed in, pull the author's events from relays + merge, then live-subscribe.
 *  4. On reconnect (online event), flush the queued outbox.
 */
export default defineNuxtPlugin(async () => {
  const store = useGardenStore()
  const nostr = useNostr()
  const { settings, isLoggedIn } = useSettings()

  // 1. load outbox + apply persisted garden snapshot
  await nostr.loadOutbox()
  const snapshot = await loadSnapshot<any>()
  if (snapshot && snapshot.plots && snapshot.farm) {
    store.state.value = snapshot
  }

  // 2. persist on change (debounced)
  let saveTimer: any
  watch(() => store.state.value, () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const owner = settings.value.identity.pubkey || 'local'
      saveSnapshotFor(owner, store.state.value)
    }, 400)
  }, { deep: true })

  // 3. relay sync when logged in
  let unsub: (() => void) | null = null
  let retryTimer: ReturnType<typeof setInterval> | null = null
  async function syncFromRelays() {
    if (unsub) { try { unsub() } catch {} unsub = null }
    const pubkey = settings.value.identity.pubkey
    if (!isLoggedIn.value || !pubkey) return

    // Switch to the account's local cache before asking relays. This prevents
    // a second identity from seeing the previous identity's garden.
    const accountSnapshot = await loadSnapshotFor<any>(pubkey)
    store.state.value = accountSnapshot?.plots && accountSnapshot.farm
      ? accountSnapshot
      : emptyState()
    const cached = (await loadCachedEvents(pubkey)).sort((a: any, b: any) => a.created_at - b.created_at)
    if (cached.length) mergeEvents(store.state.value, cached as any[])

    // initial pull
    try {
      const events = await nostr.loadFromRelays(pubkey)
      if (events.length) {
        const added = mergeEvents(store.state.value, events)
        if (added) saveSnapshotFor(pubkey, store.state.value)
      }
    } catch { /* relay error — keep local */ }

    // live subscription for new/updated events
    unsub = nostr.subscribeToAuthor(pubkey, (e) => {
      const n = mergeEvents(store.state.value, [e])
      if (n) saveSnapshotFor(pubkey, store.state.value)
    })
  }

  // 4. online/offline handling
  function setOnline() {
    if (typeof navigator !== 'undefined') nostr.status.value.online = navigator.onLine
  }
  if (import.meta.client) {
    setOnline()
    window.addEventListener('online', () => { setOnline(); nostr.flushOutbox().then(() => syncFromRelays()) })
    window.addEventListener('offline', setOnline)

    // A relay can be unavailable while the browser is still online. Retry
    // queued events periodically; flushOutbox has a lock so manual retry,
    // reconnect retry, and this timer cannot publish the same batch twice.
    retryTimer = setInterval(() => {
      if (nostr.outboxCount.value > 0 && nostr.status.value.online) nostr.flushOutbox()
    }, 15_000)
  }

  // run sync after the app is ready, and whenever the identity changes
  onNuxtReady(() => {
    nostr.flushOutbox()     // flush anything queued from a prior offline session
    syncFromRelays()
  })
  watch(() => [settings.value.identity.pubkey, settings.value.identity.method], () => syncFromRelays())
})
