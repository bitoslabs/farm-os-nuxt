<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { useAppLocale } from '~/composables/useAppLocale'

const { settings, setLocale } = useSettings()
const { switchLocale, isSwitching } = useAppLocale()
const { t } = useI18n()
function chooseLang(code: 'en' | 'lo') { return switchLocale(code) }
const languages = [{ value: 'en', label: 'English', flag: '🇬🇧' }, { value: 'lo', label: 'ລາວ (Lao)', flag: '🇱🇦' }] as const
const currencies = ['USD', 'LAK', 'THB', 'VND', 'EUR', 'JPY', 'CNY']
const units = computed(() => [{ value: 'metric', label: t('sec.unitsMetric') }, { value: 'imperial', label: t('sec.unitsImperial') }] as const)
const dates = [{ value: 'dmy', label: '31/12/2025' }, { value: 'mdy', label: '12/31/2025' }, { value: 'ymd', label: '2025-12-31' }] as const
</script>

<template>
  <SettingsSection icon="i-lucide-globe" :title="t('sec.localeTitle')" :description="t('sec.localeDesc')">
    <GlassCard class="p-6 space-y-6">
      <div>
        <div class="text-xs text-muted uppercase tracking-wider font-semibold mb-3">{{ t('sec.language') }}</div>
        <div class="grid grid-cols-2 gap-3 max-w-md">
          <button v-for="l in languages" :key="l.value" class="rounded-xl p-4 border transition flex items-center gap-3" :class="settings.locale.lang === l.value ? 'border-accent bg-accent-dim' : 'border-app bg-surface hover:bg-surface-2'" :disabled="isSwitching" :aria-busy="isSwitching" @click="chooseLang(l.value)"><span class="text-xl">{{ l.flag }}</span><span class="font-medium text-sm">{{ l.label }}</span><UIcon v-if="settings.locale.lang === l.value" name="i-lucide-check" class="ml-auto text-accent" /></button>
        </div>
      </div>
      <div>
        <div class="text-xs text-muted uppercase tracking-wider font-semibold mb-3">{{ t('sec.currency') }}</div>
        <div class="flex flex-wrap gap-2"><button v-for="c in currencies" :key="c" class="px-4 py-2 rounded-lg text-sm font-medium transition border" :class="settings.locale.currency === c ? 'border-accent bg-accent-dim text-accent' : 'border-app bg-surface text-muted hover:bg-surface-2'" @click="setLocale({ currency: c })">{{ c }}</button></div>
      </div>
      <div>
        <div class="text-xs text-muted uppercase tracking-wider font-semibold mb-3">{{ t('sec.measurement') }}</div>
        <div class="grid grid-cols-2 gap-3 max-w-md"><button v-for="u in units" :key="u.value" class="rounded-xl p-4 border transition text-left" :class="settings.locale.unitSystem === u.value ? 'border-accent bg-accent-dim' : 'border-app bg-surface hover:bg-surface-2'" @click="setLocale({ unitSystem: u.value })"><div class="font-medium text-sm">{{ u.label }}</div></button></div>
      </div>
      <div>
        <div class="text-xs text-muted uppercase tracking-wider font-semibold mb-3">{{ t('sec.dateFormat') }}</div>
        <div class="grid grid-cols-3 gap-3"><button v-for="d in dates" :key="d.value" class="rounded-xl p-4 border transition text-center" :class="settings.locale.dateFormat === d.value ? 'border-accent bg-accent-dim' : 'border-app bg-surface hover:bg-surface-2'" @click="setLocale({ dateFormat: d.value })"><div class="font-mono font-semibold text-sm">{{ d.label }}</div></button></div>
      </div>
    </GlassCard>
  </SettingsSection>
</template>
