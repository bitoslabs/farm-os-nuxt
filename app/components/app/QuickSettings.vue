<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { useAppLocale } from '~/composables/useAppLocale'
import { ACCENTS } from '~/utils/accents'

/**
 * Quick-settings popover (header). One-tap access to the most-used prefs:
 * theme, accent, language, font size, radius, density, and offline mode — plus a link to full
 * settings. Triggered by the sliders icon in the app bar.
 */
const open = ref(false)
const colorMode = useColorMode()
const { settings, setAccent, setFontScale, setDensity, setRadius, toggleOfflineMode } = useSettings()
const { switchLocale, isSwitching } = useAppLocale()

const themePref = computed({
  get: () => colorMode.preference as 'light' | 'dark' | 'system',
  set: (v) => { colorMode.preference = v }
})
const themeOpts = [
  { value: 'light', label: 'Light', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'Dark', icon: 'i-lucide-moon' },
  { value: 'system', label: 'Auto', icon: 'i-lucide-monitor' }
] as const

const langOpts = [
  { value: 'en', label: 'EN', full: 'English' },
  { value: 'lo', label: 'LO', full: 'ລາວ' }
] as const
function chooseLang(code: 'en' | 'lo') { return switchLocale(code) }
const fontOpts = [
  { value: 'sm', label: 'A−' },
  { value: 'base', label: 'A' },
  { value: 'lg', label: 'A+' },
  { value: 'xl', label: 'A++' }
] as const
const radiusOpts = [
  { value: 'sharp', key: 'theme.sharp' },
  { value: 'normal', key: 'theme.normal' },
  { value: 'soft', key: 'theme.soft' }
] as const

const densityOpts = [
  { value: 'comfortable', key: 'theme.comfortable' },
  { value: 'compact', key: 'theme.compact' }
] as const
const offline = computed({
  get: () => settings.value.sync.offlineMode,
  set: () => toggleOfflineMode()
})
</script>

<template>
  <UPopover v-model:open="open" :content="{ align: 'end', sideOffset: 8 }" :ui="{ content: 'w-72 p-0' }">
    <button
      class="btn-ghost w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
      :aria-label="$t('header.openMenu')"
      :title="$t('header.quickSettings')"
    >
      <UIcon name="i-lucide-sliders-horizontal" class="text-base" />
    </button>

    <template #content>
      <div class="p-4 w-72">
        <!-- Theme -->
        <div class="mb-4">
          <div class="text-[10px] font-semibold text-muted-2 uppercase tracking-[0.15em] mb-2">{{ $t('theme.label') }}</div>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="o in themeOpts" :key="o.value"
              class="rounded-lg py-2 flex flex-col items-center gap-1 transition border"
              :class="themePref === o.value ? 'border-accent bg-accent-dim text-fg' : 'border-app bg-surface text-muted hover:bg-surface-2'"
              @click="themePref = o.value"
            >
              <UIcon :name="o.icon" class="text-sm" />
              <span class="text-[11px] font-medium">{{ o.label }}</span>
            </button>
          </div>
        </div>

        <!-- Accent -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-semibold text-muted-2 uppercase tracking-[0.15em]">{{ $t('theme.accent') }}</span>
            <span class="text-[10px] text-muted-2 capitalize">{{ settings.appearance.accentKey }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="a in ACCENTS" :key="a.key"
              class="w-6 h-6 rounded-full border-2 transition relative"
              :class="settings.appearance.accentKey === a.key ? 'border-[var(--fg)] scale-110' : 'border-transparent hover:scale-110'"
              :style="{ background: a.swatch }"
              :title="a.label"
              @click="setAccent(a.key)"
            >
              <UIcon v-if="settings.appearance.accentKey === a.key" name="i-lucide-check" class="absolute inset-0 m-auto text-[10px]" style="color: var(--bg)" />
            </button>
          </div>
        </div>

        <!-- Language -->
        <div class="mb-4">
          <div class="text-[10px] font-semibold text-muted-2 uppercase tracking-[0.15em] mb-2">{{ $t('settings.locale') }}</div>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="l in langOpts" :key="l.value"
              class="rounded-lg py-2 px-2 flex items-center justify-center gap-2 transition border text-sm font-medium"
              :class="settings.locale.lang === l.value ? 'border-accent bg-accent-dim text-fg' : 'border-app bg-surface text-muted hover:bg-surface-2'"
              :disabled="isSwitching"
              :aria-busy="isSwitching"
              @click="chooseLang(l.value)"
            >
              <span>{{ l.full }}</span>
            </button>
          </div>
        </div>

        <!-- Quick toggles -->
        <div class="border-t border-app pt-3 space-y-1">
          <div class="py-2">
            <div class="flex items-center gap-2.5 mb-2"><UIcon name="i-lucide-type" class="text-muted text-sm" /><span class="text-sm">{{ $t('theme.fontSize') }}</span></div>
            <div class="grid grid-cols-4 gap-1.5">
              <button v-for="o in fontOpts" :key="o.value" class="rounded-lg py-1.5 border text-xs font-semibold transition" :class="settings.appearance.fontScale === o.value ? 'border-accent bg-accent-dim text-fg' : 'border-app bg-surface text-muted hover:bg-surface-2'" @click="setFontScale(o.value)">{{ o.label }}</button>
            </div>
          </div>
          <div class="py-2">
            <div class="flex items-center gap-2.5 mb-2"><UIcon name="i-lucide-corner-up-left" class="text-muted text-sm" /><span class="text-sm">{{ $t('theme.radius') }}</span></div>
            <div class="grid grid-cols-3 gap-1.5">
              <button v-for="o in radiusOpts" :key="o.value" class="rounded-lg py-1.5 border text-[11px] font-medium transition" :class="settings.appearance.radius === o.value ? 'border-accent bg-accent-dim text-fg' : 'border-app bg-surface text-muted hover:bg-surface-2'" @click="setRadius(o.value)">{{ $t(o.key) }}</button>
            </div>
          </div>
          <div class="py-2">
            <div class="flex items-center gap-2.5 mb-2"><UIcon name="i-lucide-align-vertical-justify-center" class="text-muted text-sm" /><span class="text-sm">{{ $t('theme.density') }}</span></div>
            <div class="grid grid-cols-2 gap-1.5">
              <button v-for="o in densityOpts" :key="o.value" class="rounded-lg py-1.5 border text-[11px] font-medium transition" :class="settings.appearance.density === o.value ? 'border-accent bg-accent-dim text-fg' : 'border-app bg-surface text-muted hover:bg-surface-2'" @click="setDensity(o.value)">{{ $t(o.key) }}</button>
            </div>
          </div>
          <div class="flex items-center justify-between py-2">
            <div class="flex items-center gap-2.5">
              <UIcon name="i-lucide-wifi-off" class="text-muted text-sm" />
              <span class="text-sm">{{ $t('sec.offlineMode') }}</span>
            </div>
            <USwitch v-model="offline" />
          </div>
        </div>

        <!-- Footer -->
        <NuxtLink to="/settings/appearance" class="mt-3 pt-3 border-t border-app flex items-center justify-center gap-2 text-sm font-semibold text-accent hover:underline" @click="open = false">
          <UIcon name="i-lucide-settings-2" class="text-xs" />
          {{ $t('settings.title') }}
        </NuxtLink>
      </div>
    </template>
  </UPopover>
</template>
