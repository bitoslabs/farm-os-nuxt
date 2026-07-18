<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { ACCENTS } from '~/utils/accents'

const { settings, setAccent, setFontScale, setDensity, setRadius } = useSettings()
const colorMode = useColorMode()
const { t } = useI18n()
const theme = computed({ get: () => colorMode.value as 'dark' | 'light', set: (v) => { colorMode.preference = v } })
const themeOptions = [{ value: 'light', label: t('theme.light'), icon: 'i-lucide-sun' }, { value: 'dark', label: t('theme.dark'), icon: 'i-lucide-moon' }] as const
const fontOptions = [{ value: 'sm', label: 'A', size: '14px' }, { value: 'base', label: 'A', size: '16px' }, { value: 'lg', label: 'A', size: '18px' }, { value: 'xl', label: 'A', size: '20px' }] as const
const densityOptions = computed(() => [{ value: 'comfortable', label: t('theme.comfortable'), icon: 'i-lucide-align-vertical-space-around' }, { value: 'compact', label: t('theme.compact'), icon: 'i-lucide-align-vertical-justify-center' }] as const)
const radiusOptions = computed(() => [{ value: 'sharp', label: t('theme.sharp') }, { value: 'normal', label: t('theme.normal') }, { value: 'soft', label: t('theme.soft') }] as const)
</script>

<template>
  <SettingsSection icon="i-lucide-palette" :title="t('sec.appearanceTitle')" :description="t('sec.appearanceDesc')">
    <GlassCard class="p-6 mb-4">
      <div class="text-xs text-muted uppercase tracking-wider font-semibold mb-4">{{ t('theme.label') }}</div>
      <div class="grid grid-cols-2 gap-3 max-w-md">
        <button v-for="opt in themeOptions" :key="opt.value" class="rounded-xl p-4 border transition flex items-center gap-3" :class="theme === opt.value ? 'border-accent bg-accent-dim' : 'border-app bg-surface hover:bg-surface-2'" @click="theme = opt.value">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="opt.value === 'dark' ? 'bg-[#0a0e0a]' : 'bg-[#f3f6f1]'"><UIcon :name="opt.icon" :class="opt.value === 'dark' ? 'text-[#c4f042]' : 'text-[#4d7c0f]'" /></div>
          <span class="font-medium">{{ opt.label }}</span>
          <UIcon v-if="theme === opt.value" name="i-lucide-check" class="ml-auto text-accent" />
        </button>
      </div>
    </GlassCard>

    <GlassCard class="p-6 mb-4">
      <div class="flex items-center justify-between mb-4"><div class="text-xs text-muted uppercase tracking-wider font-semibold">{{ t('theme.accent') }}</div><span class="text-xs text-muted-2 capitalize">{{ settings.appearance.accentKey }}</span></div>
      <div class="grid grid-cols-6 sm:grid-cols-12 gap-2.5">
        <button v-for="a in ACCENTS" :key="a.key" class="aspect-square rounded-xl border-2 transition relative" :class="settings.appearance.accentKey === a.key ? 'border-[var(--fg)] scale-105' : 'border-transparent hover:scale-105'" :style="{ background: a.swatch }" :title="a.label" @click="setAccent(a.key)"><UIcon v-if="settings.appearance.accentKey === a.key" name="i-lucide-check" class="absolute inset-0 m-auto text-[var(--bg)] text-sm" /></button>
      </div>
    </GlassCard>

    <GlassCard class="p-6 mb-4">
      <div class="flex items-center justify-between mb-4"><div><div class="text-xs text-muted uppercase tracking-wider font-semibold">{{ t('theme.fontSize') }}</div><div class="text-xs text-muted-2 mt-0.5">{{ t('theme.fontSizeHint') }}</div></div></div>
      <div class="grid grid-cols-4 gap-3">
        <button v-for="opt in fontOptions" :key="opt.value" class="rounded-xl p-4 border transition text-center" :class="settings.appearance.fontScale === opt.value ? 'border-accent bg-accent-dim' : 'border-app bg-surface hover:bg-surface-2'" @click="setFontScale(opt.value as any)"><div class="font-bold mb-1" :style="{ fontSize: opt.size }">{{ opt.label }}</div><div class="text-[11px] text-muted">{{ opt.value }}</div></button>
      </div>
    </GlassCard>

    <GlassCard class="p-6">
      <div class="text-xs text-muted uppercase tracking-wider font-semibold mb-4">{{ t('theme.density') }}</div>
      <div class="grid grid-cols-2 gap-3 max-w-md">
        <button v-for="opt in densityOptions" :key="opt.value" class="rounded-xl p-4 border transition flex items-center gap-3" :class="settings.appearance.density === opt.value ? 'border-accent bg-accent-dim' : 'border-app bg-surface hover:bg-surface-2'" @click="setDensity(opt.value as any)"><UIcon :name="opt.icon" class="text-accent" /><span class="font-medium text-sm">{{ opt.label }}</span><UIcon v-if="settings.appearance.density === opt.value" name="i-lucide-check" class="ml-auto text-accent" /></button>
      </div>
    </GlassCard>
    <GlassCard class="p-6">
      <div class="text-xs text-muted uppercase tracking-wider font-semibold mb-4">{{ t('theme.radius') }}</div>
      <div class="grid grid-cols-3 gap-3 max-w-md">
        <button v-for="opt in radiusOptions" :key="opt.value" class="rounded-xl p-4 border transition text-center" :class="settings.appearance.radius === opt.value ? 'border-accent bg-accent-dim' : 'border-app bg-surface hover:bg-surface-2'" @click="setRadius(opt.value)">
          <div class="h-8 mb-2 bg-surface-2" :class="opt.value === 'sharp' ? 'rounded-sm' : opt.value === 'normal' ? 'rounded-lg' : 'rounded-2xl'" />
          <span class="font-medium text-sm">{{ opt.label }}</span>
        </button>
      </div>
    </GlassCard>
  </SettingsSection>
</template>
