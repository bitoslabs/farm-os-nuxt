/** Locale-aware formatting helpers shared across the app. */

export function useFormat() {
  const { locale } = useI18n()
  const { settings } = useSettings()
  const localeTag = computed(() => locale.value === 'lo' ? 'lo-LA' : 'en-US')

  /** Format using the selected app currency unless a record currency is supplied. */
  function currency(amount: number, currencyCode = settings.value.locale.currency, opts: Intl.NumberFormatOptions = {}) {
    return new Intl.NumberFormat(localeTag.value, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
      ...opts
    }).format(amount)
  }

  /** Compact currency for space-constrained UI (for example, dashboard KPI cards). */
  function compactCurrency(amount: number, currencyCode = settings.value.locale.currency) {
    if (Math.abs(amount) < 1_000_000) return currency(amount, currencyCode, { maximumFractionDigits: currencyCode === 'LAK' ? 0 : 2 })
    return new Intl.NumberFormat(localeTag.value, {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(amount)
  }

  function number(n: number, opts: Intl.NumberFormatOptions = {}) {
    return new Intl.NumberFormat(localeTag.value, opts).format(n)
  }

  function date(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
    return new Date(iso).toLocaleDateString(localeTag.value, opts)
  }

  function relTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const day = 86_400_000
    const fmt = new Intl.RelativeTimeFormat(localeTag.value, { numeric: 'auto' })
    if (diff < 0) {
      const d = Math.round(-diff / day)
      return fmt.format(d, 'day')
    }
    const d = Math.round(diff / day)
    if (d < 7) return fmt.format(-d, 'day')
    return new Date(iso).toLocaleDateString(localeTag.value, { month: 'short', day: 'numeric' })
  }

  function greeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  function todayLabel() {
    return new Date().toLocaleDateString(localeTag.value, {
      weekday: 'long', month: 'long', day: 'numeric'
    })
  }

  return { currency, compactCurrency, number, date, relTime, greeting, todayLabel }
}
