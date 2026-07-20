import type { Settings } from '~/composables/useSettings'
import { useSettings } from '~/composables/useSettings'

type AppLocale = Settings['locale']['lang']

// A module-level queue is shared by the quick settings popover and the full
// locale settings page. This prevents two rapid clicks from completing out of
// order and leaving the UI and persisted preference on different languages.
let localeSwitchQueue: Promise<void> = Promise.resolve()
let pendingLocaleSwitches = 0

export function useAppLocale() {
  const { settings, setLocale } = useSettings()
  const { locale, setLocale: setI18nLocale } = useI18n()
  const isSwitching = useState('app-locale-switching', () => false)
  async function switchLocale(code: AppLocale) {
    pendingLocaleSwitches += 1
    isSwitching.value = true

    const switchTask = localeSwitchQueue.then(async () => {
      // setLocale is intentionally awaited: @nuxtjs/i18n loads the message
      // bundle before it changes the active locale.
      if (locale.value !== code) await setI18nLocale(code)
      setLocale({ lang: code })
    })

    // Keep the queue usable after a failed network/dynamic import operation.
    localeSwitchQueue = switchTask.catch(() => undefined)

    try {
      await switchTask
    } finally {
      pendingLocaleSwitches -= 1
      if (pendingLocaleSwitches === 0) isSwitching.value = false
    }
  }

  return { settings, locale, isSwitching, switchLocale }
}
