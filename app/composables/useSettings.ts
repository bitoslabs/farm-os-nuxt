import { applyAccent } from '~/utils/accents'
import { generateKeyPair, parseKey, encodeNpub, isNip07Available, nip07GetPublicKey, encryptSecretKey, decryptSecretKey } from '~/utils/nostr'

/**
 * Global app settings — persisted to localStorage (see plugins/settings.client.ts).
 * The Nostr identity, relay pool, appearance, locale, and notification prefs all
 * live here so any component can read/mutate them.
 */

export interface Relay {
  url: string
  read: boolean
  write: boolean
  enabled: boolean
}

export interface Identity {
  method: 'none' | 'nip07' | 'nsec' | 'npub'
  pubkey?: string
  npub?: string
  /** secret key (hex) — only stored for nsec logins. In-memory only when encrypted. */
  secretKey?: string
  /** NIP-49 ncryptsec1… for at-rest storage when a passphrase is set. */
  secretKeyEncrypted?: string
  /** true when the key is protected by a passphrase (encrypt-at-rest on). */
  encrypted?: boolean
  name?: string
  picture?: string
  about?: string
}

export interface Settings {
  appearance: {
    accentKey: string
    fontScale: 'sm' | 'base' | 'lg' | 'xl'
    density: 'comfortable' | 'compact'
    radius: 'sharp' | 'normal' | 'soft'
  }
  identity: Identity
  relays: Relay[]
  locale: {
    lang: 'en' | 'lo'
    currency: string
    unitSystem: 'metric' | 'imperial'
    dateFormat: 'dmy' | 'mdy' | 'ymd'
  }
  notifications: {
    tasks: boolean
    lowStock: boolean
    pests: boolean
    sync: boolean
  }
  sync: {
    offlineMode: boolean
  }
}

const STORAGE_KEY = 'gardenos:settings'

export const DEFAULT_RELAYS: Relay[] = [
  { url: 'wss://relay.damus.io', read: true, write: true, enabled: true },
  { url: 'wss://nos.lol', read: true, write: true, enabled: true },
  { url: 'wss://relay.nostr.band', read: true, write: false, enabled: true }
]

const DEFAULTS: Settings = {
  appearance: { accentKey: 'lime', fontScale: 'base', density: 'comfortable', radius: 'normal' },
  identity: { method: 'none' },
  relays: DEFAULT_RELAYS,
  locale: { lang: 'en', currency: 'USD', unitSystem: 'metric', dateFormat: 'dmy' },
  notifications: { tasks: true, lowStock: true, pests: true, sync: true },
  sync: { offlineMode: false }
}

export function useSettings() {
  const settings = useState<Settings>('settings', () => structuredClone(DEFAULTS))

  const isLoggedIn = computed(() => settings.value.identity.method !== 'none' && !!settings.value.identity.pubkey)
  const npub = computed(() => settings.value.identity.npub ?? (settings.value.identity.pubkey ? encodeNpub(settings.value.identity.pubkey) : ''))

  // ---- Appearance ----
  function setAccent(key: string) {
    settings.value.appearance.accentKey = key
  }
  function setFontScale(scale: Settings['appearance']['fontScale']) {
    settings.value.appearance.fontScale = scale
  }
  function setDensity(density: Settings['appearance']['density']) {
    settings.value.appearance.density = density
  }
  function setRadius(radius: Settings['appearance']['radius']) {
    settings.value.appearance.radius = radius
  }

  // ---- Identity / login ----
  async function loginWithNsec(nsecOrHex: string): Promise<{ ok: boolean; error?: string }> {
    const parsed = parseKey(nsecOrHex)
    if (!parsed || (parsed.type !== 'nsec' && parsed.type !== 'hex-sk')) {
      // also accept a raw hex secret key
      if (/^[0-9a-fA-F]{64}$/.test(nsecOrHex.trim())) {
        const { getPublicKey } = await import('nostr-tools/pure')
        settings.value.identity = {
          method: 'nsec', secretKey: nsecOrHex.trim().toLowerCase(),
          pubkey: getPublicKey(nsecOrHex.trim().toLowerCase())
        }
        settings.value.identity.npub = encodeNpub(settings.value.identity.pubkey!)
        return { ok: true }
      }
      return { ok: false, error: 'Invalid nsec / private key' }
    }
    settings.value.identity = {
      method: 'nsec',
      pubkey: parsed.pubkey,
      secretKey: parsed.secretKey,
      npub: encodeNpub(parsed.pubkey)
    }
    return { ok: true }
  }

  async function loginWithNpub(npubOrHex: string): Promise<{ ok: boolean; error?: string }> {
    const parsed = parseKey(npubOrHex)
    if (!parsed) return { ok: false, error: 'Invalid npub / public key' }
    settings.value.identity = {
      method: 'npub',
      pubkey: parsed.pubkey,
      npub: encodeNpub(parsed.pubkey)
    }
    return { ok: true }
  }

  async function loginWithExtension(): Promise<{ ok: boolean; error?: string }> {
    if (!isNip07Available()) {
      return { ok: false, error: 'No NIP-07 extension detected. Install nos2x / Alby.' }
    }
    try {
      const pubkey = await nip07GetPublicKey()
      settings.value.identity = { method: 'nip07', pubkey, npub: encodeNpub(pubkey) }
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Extension rejected the request' }
    }
  }

  function generateNewIdentity() {
    const kp = generateKeyPair()
    settings.value.identity = {
      method: 'nsec', pubkey: kp.pubkey, secretKey: kp.secretKey, nsec: kp.nsec, npub: kp.npub
    }
    return kp
  }

  function updateProfile(patch: Partial<Identity>) {
    settings.value.identity = { ...settings.value.identity, ...patch }
  }

  function logout() {
    settings.value.identity = { method: 'none' }
  }

  // ---- Passphrase lock (NIP-49 encrypt-at-rest) ----
  const locked = computed(() => settings.value.identity.encrypted === true && !settings.value.identity.secretKey)

  async function setPassphrase(password: string): Promise<{ ok: boolean; error?: string }> {
    const sk = settings.value.identity.secretKey
    if (!sk) return { ok: false, error: 'No private key loaded' }
    if (!password) return { ok: false, error: 'Enter a passphrase' }
    try {
      settings.value.identity.secretKeyEncrypted = await encryptSecretKey(sk, password)
      settings.value.identity.encrypted = true
      return { ok: true }
    } catch (e: any) { return { ok: false, error: e?.message ?? 'Encryption failed' } }
  }
  async function unlock(password: string): Promise<{ ok: boolean; error?: string }> {
    const enc = settings.value.identity.secretKeyEncrypted
    if (!enc) return { ok: false, error: 'No encrypted key' }
    try {
      settings.value.identity.secretKey = await decryptSecretKey(enc, password)
      return { ok: true }
    } catch { return { ok: false, error: 'Wrong passphrase' } }
  }
  function lock() {
    if (settings.value.identity.encrypted) settings.value.identity.secretKey = undefined
  }
  function disableEncryption() {
    settings.value.identity.encrypted = false
    settings.value.identity.secretKeyEncrypted = undefined
  }

  // ---- Relays ----
  function addRelay(url: string) {
    const u = url.trim()
    if (!u || settings.value.relays.some((r) => r.url === u)) return
    settings.value.relays.push({ url: u, read: true, write: true, enabled: true })
  }
  function updateRelay(url: string, patch: Partial<Relay>) {
    const i = settings.value.relays.findIndex((r) => r.url === url)
    if (i !== -1) settings.value.relays[i] = { ...settings.value.relays[i], ...patch }
  }
  function removeRelay(url: string) {
    settings.value.relays = settings.value.relays.filter((r) => r.url !== url)
  }

  // ---- Locale / notifications / sync ----
  function setLocale(patch: Partial<Settings['locale']>) {
    settings.value.locale = { ...settings.value.locale, ...patch }
  }
  function setNotifications(patch: Partial<Settings['notifications']>) {
    settings.value.notifications = { ...settings.value.notifications, ...patch }
  }
  function toggleOfflineMode() {
    settings.value.sync.offlineMode = !settings.value.sync.offlineMode
  }

  // ---- Persistence helpers (used by the client plugin) ----
  function loadFromStorage() {
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<Settings>
      settings.value = deepMerge(structuredClone(DEFAULTS), saved)
    } catch { /* ignore corrupt storage */ }
  }

  function saveToStorage() {
    if (typeof localStorage === 'undefined') return
    try {
      // `settings.value` is a Vue reactive proxy, which cannot be passed to
      // structuredClone. JSON is also the localStorage format, so this turns
      // it into plain data at the persistence boundary.
      const toSave = JSON.parse(JSON.stringify(settings.value)) as Settings
      // Never persist the plaintext key when encrypt-at-rest is enabled.
      if (toSave.identity.encrypted) delete toSave.identity.secretKey
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch { /* ignore unavailable storage or non-serializable state */ }
  }

  function resetAll() {
    settings.value = structuredClone(DEFAULTS)
  }

  /** Apply accent + font-size to the document for the current color mode. */
  function applyAppearance(mode: 'dark' | 'light') {
    applyAccent(settings.value.appearance.accentKey, mode)
    if (typeof document !== 'undefined') {
      const scale = { sm: '14px', base: '16px', lg: '18px', xl: '20px' }[settings.value.appearance.fontScale]
      const radius = { sharp: '0.125rem', normal: '0.25rem', soft: '0.5rem' }[settings.value.appearance.radius]
      document.documentElement.style.fontSize = scale
      // Nuxt UI derives its rounded-* utilities and component shapes from this token.
      document.documentElement.style.setProperty('--ui-radius', radius)
      document.documentElement.dataset.density = settings.value.appearance.density
      document.documentElement.dataset.radius = settings.value.appearance.radius
    }
  }

  return {
    settings,
    isLoggedIn,
    npub,
    // appearance
    setAccent, setFontScale, setDensity, setRadius, applyAppearance,
    // identity
    loginWithNsec, loginWithNpub, loginWithExtension, generateNewIdentity, updateProfile, logout,
    locked, setPassphrase, unlock, lock, disableEncryption,
    // relays
    addRelay, updateRelay, removeRelay,
    // locale / notifications / sync
    setLocale, setNotifications, toggleOfflineMode,
    // persistence
    loadFromStorage, saveToStorage, resetAll
  }
}

function deepMerge<T>(base: T, override: any): T {
  if (!override || typeof override !== 'object') return base
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) }
  for (const k of Object.keys(override)) {
    if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k]) && out[k] && typeof out[k] === 'object') {
      out[k] = deepMerge(out[k], override[k])
    } else if (override[k] !== undefined) {
      out[k] = override[k]
    }
  }
  return out as T
}
