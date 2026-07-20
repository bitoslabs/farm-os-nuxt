<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { useNostr } from '~/composables/useNostr'

const { settings } = useSettings()
const { status, outboxCount, flushOutbox } = useNostr()

const state = computed(() => {
  if (settings.value.sync.offlineMode) return { label: 'Offline', dot: 'var(--muted-2)', icon: 'i-lucide-wifi-off' }
  if (!status.value.online) return { label: 'Offline', dot: 'var(--muted-2)', icon: 'i-lucide-wifi-off' }
  if (outboxCount.value > 0) return { label: `Queued ${outboxCount.value}`, dot: 'var(--warning)', icon: 'i-lucide-cloud-upload', spin: false }
  if (status.value.pending > 0) return { label: 'Syncing', dot: 'var(--warning)', icon: 'i-lucide-refresh-cw', spin: true }
  if (!settings.value.identity.pubkey) return { label: 'Local only', dot: 'var(--muted-2)', icon: 'i-lucide-cloud-off' }
  if (status.value.failed > 0 && status.value.published === 0) return { label: 'Sync error', dot: 'var(--negative)', icon: 'i-lucide-triangle-alert' }
  return { label: 'Synced', dot: 'var(--positive)', icon: 'i-lucide-check' }
})

const tip = computed(() =>
  `Published: ${status.value.published} · Queued: ${outboxCount.value} · Failed: ${status.value.failed}` +
  (settings.value.sync.offlineMode ? ' · Offline mode' : ''))
</script>

<template>
  <UTooltip :text="tip">
    <button
      class="btn-ghost h-10 px-3 rounded-lg flex items-center gap-2 text-xs font-medium"
      :class="outboxCount > 0 ? 'cursor-pointer' : ''"
      :title="outboxCount > 0 ? 'Click to retry sync' : undefined"
      @click="outboxCount > 0 && flushOutbox()"
    >
      <UIcon :name="state.icon" class="text-xs" :class="state.spin ? 'animate-spin' : ''" />
      <span class="w-2 h-2 rounded-full" :style="{ background: state.dot }" :class="outboxCount > 0 ? 'pulse-dot' : ''" />
      <span class="hidden lg:inline">{{ state.label }}</span>
    </button>
  </UTooltip>
</template>
