<script setup lang="ts">
import { GARDEN_KINDS } from '~/types/garden-kinds'
const { t } = useI18n()
const version = '0.1.0'
const kindCount = Object.keys(GARDEN_KINDS).length
const features = computed(() => [
  { icon: 'i-lucide-key-round', title: t('sec.featureNostr'), desc: t('sec.featureNostrDesc') },
  { icon: 'i-lucide-wifi-off', title: t('sec.featureOffline'), desc: t('sec.featureOfflineDesc') },
  { icon: 'i-lucide-languages', title: t('sec.featureI18n'), desc: t('sec.featureI18nDesc') },
  { icon: 'i-lucide-palette', title: t('sec.featureTheme'), desc: t('sec.featureThemeDesc') }
])
</script>

<template>
  <SettingsSection icon="i-lucide-info" :title="t('sec.aboutTitle')" :description="t('sec.aboutDesc')">
    <GlassCard class="p-6 mb-4 text-center">
      <div class="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center accent-glow mx-auto mb-4"><span class="display-font text-[var(--bg)] font-bold text-3xl">G</span></div>
      <h3 class="display-font text-xl font-bold">GardenOS</h3>
      <div class="text-xs text-muted mt-1">{{ t('sec.version', { n: version }) }}</div>
      <p class="text-sm text-muted max-w-md mx-auto mt-4 leading-relaxed">{{ t('sec.aboutBody') }}</p>
    </GlassCard>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <GlassCard v-for="f in features" :key="f.title" class="p-4 flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><UIcon :name="f.icon" class="text-accent" /></div><div><div class="text-sm font-semibold">{{ f.title }}</div><div class="text-xs text-muted">{{ f.desc }}</div></div></GlassCard>
    </div>

    <GlassCard class="p-6">
      <div class="flex items-center gap-2 mb-3"><UIcon name="i-lucide-hash" class="text-accent" /><h3 class="font-semibold text-sm">{{ t('sec.kindRegistry') }}</h3></div>
      <p class="text-xs text-muted mb-4">{{ t('sec.kindDesc', { n: kindCount }) }}</p>
      <div class="flex flex-wrap gap-1.5">
        <span v-for="[name, kind] in Object.entries(GARDEN_KINDS).slice(0, 24)" :key="name" class="text-[10px] font-mono px-2 py-1 rounded-md bg-surface-2 text-muted">{{ kind }}</span>
        <span class="text-[10px] px-2 py-1 rounded-md text-muted-2">+{{ kindCount - 24 }}</span>
      </div>
    </GlassCard>

    <div class="flex items-center justify-center gap-4 mt-6 text-xs text-muted">
      <a href="https://nuxt.com" target="_blank" class="hover:text-accent flex items-center gap-1"><UIcon name="i-lucide-external-link" class="text-[10px]" /> Nuxt</a><span>·</span>
      <a href="https://github.com/nostr-protocol/nips" target="_blank" class="hover:text-accent flex items-center gap-1"><UIcon name="i-lucide-external-link" class="text-[10px]" /> Nostr NIPs</a>
    </div>
  </SettingsSection>
</template>
