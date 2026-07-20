/**
 * Nostr identity helpers — thin wrappers around nostr-tools/pure + nip19,
 * plus NIP-07 (browser extension) support. All crypto here is isomorphic, so
 * these are SSR-safe except where the `window.nostr` extension is used.
 */
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import * as nip19 from 'nostr-tools/nip19'
import type { Event } from 'nostr-tools/core'

export type KeyType = 'nsec' | 'npub' | 'hex-sk' | 'hex-pk' | 'unknown'

export interface ParsedKey {
  type: KeyType
  /** hex public key (always present for valid keys) */
  pubkey: string
  /** hex secret key (only for private-key inputs) */
  secretKey?: string
}

/** Detect & parse a key in any common format: nsec1…, npub1…, hex sk/pk. */
export function parseKey(input: string): ParsedKey | null {
  const value = input.trim()
  if (!value) return null

  // bech32 (nsec / npub)
  if (value.startsWith('nsec1') || value.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(value)
      if (decoded.type === 'nsec') {
        const sk = decoded.data as Uint8Array
        const skHex = bytesToHex(sk)
        return { type: 'nsec', pubkey: getPublicKey(sk), secretKey: skHex }
      }
      if (decoded.type === 'npub') {
        return { type: 'npub', pubkey: hexFromBytesOrString(decoded.data) }
      }
    } catch {
      return null
    }
  }

  // hex (64 chars)
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    // Distinguish sk from pk heuristically: try as sk → derive pk; if it parses, treat as sk.
    // We can't reliably tell sk vs pk by content, so we ask the caller; default to pubkey.
    return { type: 'hex-pk', pubkey: value.toLowerCase() }
  }

  return null
}

/** Generate a brand-new nsec + npub keypair. */
export function generateKeyPair() {
  const sk = generateSecretKey()
  const skHex = bytesToHex(sk)
  return {
    secretKey: skHex,
    pubkey: getPublicKey(sk),
    nsec: nip19.nsecEncode(sk),
    npub: nip19.npubEncode(getPublicKey(sk))
  }
}

export function encodeNpub(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey)
  } catch {
    return pubkey
  }
}

export function encodeNsec(secretKeyHex: string): string {
  try {
    return nip19.nsecEncode(hexToBytes(secretKeyHex))
  } catch {
    return secretKeyHex
  }
}

export function shortenNpub(npub: string, pad = 10): string {
  if (npub.length <= pad * 2 + 6) return npub
  return `${npub.slice(0, pad)}…${npub.slice(-pad)}`
}

// ---- NIP-07 browser extension ----
export function isNip07Available(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).nostr?.getPublicKey === 'function'
}

export async function nip07GetPublicKey(): Promise<string> {
  const w = (window as any).nostr
  const pk: string = await w.getPublicKey()
  return pk
}

export async function nip07SignEvent(event: Partial<Event>): Promise<Event> {
  const w = (window as any).nostr
  return await w.signEvent(event)
}

// ---- NIP-49 key encryption at rest ----
export async function encryptSecretKey(secretKeyHex: string, password: string): Promise<string> {
  const { encrypt } = await import('nostr-tools/nip49')
  return encrypt(hexToBytes(secretKeyHex), password) // ncryptsec1…
}

export async function decryptSecretKey(ncryptsec: string, password: string): Promise<string> {
  const { decrypt } = await import('nostr-tools/nip49')
  return bytesToHex(decrypt(ncryptsec, password))
}

// ---- misc ----
function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return hex
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function hexFromBytesOrString(data: unknown): string {
  if (typeof data === 'string') return data
  if (data instanceof Uint8Array) return bytesToHex(data)
  return String(data)
}

/** Build a minimal unsigned Nostr event template from the identity. */
export function buildEventTemplate(kind: number, content: string, tags: string[][], pubkey: string) {
  return {
    kind,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
    id: '',
    sig: ''
  }
}
