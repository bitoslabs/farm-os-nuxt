<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { useGardenStore } from '~/composables/useGardenStore'

const { settings, setNotifications } = useSettings()
const store = useGardenStore()
const { t } = useI18n()
const channels = computed(() => [
  { key: 'tasks', title: t('sec.taskReminders'), desc: t('sec.taskRemindersDesc', { n: store.pendingTasks.value.length }), icon: 'i-lucide-list-checks' },
  { key: 'lowStock', title: t('sec.lowStockAlerts'), desc: t('sec.lowStockAlertsDesc', { n: store.lowStockItems.value.length }), icon: 'i-lucide-boxes' },
  { key: 'pests', title: t('sec.pestAlerts'), desc: t('sec.pestAlertsDesc'), icon: 'i-lucide-bug' },
  { key: 'sync', title: t('sec.syncStatus'), desc: t('sec.syncStatusDesc'), icon: 'i-lucide-refresh-cw' }
] as const)
</script>

<template>
  <SettingsSection icon="i-lucide-bell" :title="t('sec.notifTitle')" :description="t('sec.notifDesc')">
    <GlassCard class="p-6">
      <div v-for="ch in channels" :key="ch.key">
        <div class="flex items-center gap-4 py-4 border-b border-app last:border-0">
          <div class="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0"><UIcon :name="ch.icon" class="text-accent" /></div>
          <div class="flex-1"><div class="text-sm font-medium">{{ ch.title }}</div><div class="text-xs text-muted mt-0.5">{{ ch.desc }}</div></div>
          <USwitch :model-value="settings.notifications[ch.key]" @update:model-value="setNotifications({ [ch.key]: $event } as any)" />
        </div>
      </div>
    </GlassCard>
  </SettingsSection>
</template>
