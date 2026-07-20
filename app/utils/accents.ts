/**
 * Accent color system.
 * Each preset provides a bright variant (dark theme) and a deep variant (light
 * theme). At runtime we derive the full token set (--accent, --accent-2,
 * --accent-hover, --accent-dim, --accent-glow, --accent-contrast) from the
 * active base and write them to <html>, overriding the static CSS defaults.
 */

export interface AccentPreset {
  key: string
  label: string
  /** base hex for dark theme (bright) */
  dark: string
  /** base hex for light theme (deep) */
  light: string
  swatch: string // for the picker UI
}

export const ACCENTS: AccentPreset[] = [
  { key: 'neutral', label: 'Neutral', dark: '#a3a3a3', light: '#525252', swatch: '#a3a3a3' },
  { key: 'lime', label: 'Lime', dark: '#c4f042', light: '#4d7c0f', swatch: '#c4f042' },
  { key: 'emerald', label: 'Emerald', dark: '#34d399', light: '#059669', swatch: '#34d399' },
  { key: 'teal', label: 'Teal', dark: '#2dd4bf', light: '#0d9488', swatch: '#2dd4bf' },
  { key: 'cyan', label: 'Cyan', dark: '#22d3ee', light: '#0891b2', swatch: '#22d3ee' },
  { key: 'sky', label: 'Sky', dark: '#38bdf8', light: '#0284c7', swatch: '#38bdf8' },
  { key: 'indigo', label: 'Indigo', dark: '#818cf8', light: '#4f46e5', swatch: '#818cf8' },
  { key: 'violet', label: 'Violet', dark: '#a78bfa', light: '#7c3aed', swatch: '#a78bfa' },
  { key: 'fuchsia', label: 'Fuchsia', dark: '#e879f9', light: '#c026d3', swatch: '#e879f9' },
  { key: 'pink', label: 'Pink', dark: '#f472b6', light: '#db2777', swatch: '#f472b6' },
  { key: 'rose', label: 'Rose', dark: '#fb7185', light: '#e11d48', swatch: '#fb7185' },
  { key: 'orange', label: 'Orange', dark: '#fb923c', light: '#ea580c', swatch: '#fb923c' },
  { key: 'amber', label: 'Amber', dark: '#fbbf24', light: '#d97706', swatch: '#fbbf24' }
]

export const DEFAULT_ACCENT = 'lime'

export function getPreset(key: string): AccentPreset {
  return ACCENTS.find((a) => a.key === key) ?? ACCENTS[0]
}

/** Relative luminance (0–1) of a hex color, for contrast decisions. */
export function luminance(hex: string): number {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Write the derived accent tokens for the given preset + theme to <html>. */
export function applyAccent(presetKey: string, mode: 'dark' | 'light') {
  if (typeof document === 'undefined') return
  const preset = getPreset(presetKey)
  const base = mode === 'dark' ? preset.dark : preset.light
  const root = document.documentElement

  root.style.setProperty('--accent', base)
  // accent-2: slightly darker shade
  root.style.setProperty('--accent-2', `color-mix(in srgb, ${base} 82%, black)`)
  // hover: brighten on dark, deepen on light
  root.style.setProperty('--accent-hover', mode === 'dark'
    ? `color-mix(in srgb, ${base} 78%, white)`
    : `color-mix(in srgb, ${base} 88%, black)`)
  root.style.setProperty('--accent-dim', `color-mix(in srgb, ${base} 15%, transparent)`)
  root.style.setProperty('--accent-glow', `color-mix(in srgb, ${base} 38%, transparent)`)
  // contrast text on the accent: dark text for bright accents, light for deep
  const contrast = luminance(base) > 0.55 ? '#0a0e0a' : '#f6faf2'
  root.style.setProperty('--accent-contrast', contrast)
}

/** Remove inline accent overrides so the static CSS defaults (lime) return. */
export function clearAccent() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const k of ['--accent', '--accent-2', '--accent-hover', '--accent-dim', '--accent-glow', '--accent-contrast']) {
    root.style.removeProperty(k)
  }
}
