import { useSettings } from '~/composables/useSettings'

/**
 * Settings persistence + appearance application (client only).
 *  - Loads saved settings from localStorage before first paint.
 *  - Applies accent + font-size + density to <html>.
 *  - Re-applies accent whenever the theme toggles (dark/light use different bases).
 *  - Persists any setting change back to localStorage.
 */
export default defineNuxtPlugin(async () => {
  const { settings, loadFromStorage, saveToStorage, applyAppearance } = useSettings()
  const colorMode = useColorMode()
  const i18n = useNuxtApp().$i18n

  // 1. Hydrate from storage
  loadFromStorage()

  // 2. Apply stored language (user choice wins over browser detection)
  if (settings.value.locale.lang && settings.value.locale.lang !== i18n.locale.value) {
    // setLocale loads messages before changing the active locale.
    await i18n.setLocale(settings.value.locale.lang)
  }

  // 2. Apply appearance for the current theme
  applyAppearance(colorMode.value === 'dark' ? 'dark' : 'light')

  // 3. Re-apply accent when the theme changes
  watch(() => colorMode.value, (mode) => {
    applyAppearance(mode === 'dark' ? 'dark' : 'light')
  })

  // 4. Re-apply appearance when accent / font / density / radius change
  watch(
    () => [settings.value.appearance.accentKey, settings.value.appearance.fontScale, settings.value.appearance.density, settings.value.appearance.radius],
    () => applyAppearance(colorMode.value === 'dark' ? 'dark' : 'light')
  )

  // 5. Persist any change
  watch(settings, () => saveToStorage(), { deep: true })
})
