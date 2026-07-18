<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { useGardenStore } from '~/composables/useGardenStore'

const { settings, toggleOfflineMode, resetAll } = useSettings()
const store = useGardenStore()
const toast = useToast()
const { t } = useI18n()
const confirmReset = ref(false)

function exportData() {
  const payload = { exportedAt: new Date().toISOString(), settings: settings.value, garden: store.state.value }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `gardenos-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url)
  toast.add({ icon: 'i-lucide-download', color: 'success' })
}
const fileInput = ref<HTMLInputElement | null>(null)
async function onImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
  try { const data = JSON.parse(await file.text()); if (data.garden) store.state.value = data.garden; toast.add({ icon: 'i-lucide-upload', color: 'success' }) } catch { toast.add({ icon: 'i-lucide-alert-circle', color: 'error' }) }
  if (fileInput.value) fileInput.value.value = ''
}
function doReset() { resetAll(); confirmReset.value = false; toast.add({ icon: 'i-lucide-rotate-cw', color: 'warning' }) }
</script>

<template>
  <SettingsSection icon="i-lucide-database" :title="t('sec.dataTitle')" :description="t('sec.dataDesc')">
    <GlassCard class="p-6 space-y-1">
      <div class="flex items-center justify-between gap-4 py-4 border-b border-app">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-wifi-off" class="text-accent" /></div><div><div class="text-sm font-medium">{{ t('sec.offlineMode') }}</div><div class="text-xs text-muted mt-0.5">{{ t('sec.offlineModeDesc') }}</div></div></div>
        <USwitch :model-value="settings.sync.offlineMode" @update:model-value="toggleOfflineMode" />
      </div>
      <div class="flex items-center justify-between gap-4 py-4 border-b border-app">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-download" class="text-accent" /></div><div><div class="text-sm font-medium">{{ t('sec.exportBackup') }}</div><div class="text-xs text-muted mt-0.5">{{ t('sec.exportDesc') }}</div></div></div>
        <button class="btn-ghost px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" @click="exportData"><UIcon name="i-lucide-download" class="text-xs" />{{ t('common.save') }}</button>
      </div>
      <div class="flex items-center justify-between gap-4 py-4 border-b border-app">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-upload" class="text-accent" /></div><div><div class="text-sm font-medium">{{ t('sec.importBackup') }}</div><div class="text-xs text-muted mt-0.5">{{ t('sec.importDesc') }}</div></div></div>
        <button class="btn-ghost px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" @click="fileInput?.click()"><UIcon name="i-lucide-upload" class="text-xs" />{{ t('common.add') }}</button>
        <input ref="fileInput" type="file" accept="application/json" class="hidden" @change="onImport">
      </div>
      <div class="flex items-center justify-between gap-4 py-4">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-[rgba(248,113,113,0.12)] flex items-center justify-center"><UIcon name="i-lucide-trash-2" class="text-negative" /></div><div><div class="text-sm font-medium text-negative">{{ t('sec.resetSettings') }}</div><div class="text-xs text-muted mt-0.5">{{ t('sec.resetDescShort') }}</div></div></div>
        <button class="btn-ghost px-4 py-2 rounded-lg text-sm font-medium text-negative flex items-center gap-2" @click="confirmReset = true"><UIcon name="i-lucide-rotate-ccw" class="text-xs" />{{ t('common.edit') }}</button>
      </div>
    </GlassCard>

    <UModal v-model:open="confirmReset" :title="t('sec.resetTitle')">
      <template #body><p class="text-sm text-muted">{{ t('sec.resetDesc') }}</p></template>
      <template #footer><div class="flex justify-end gap-2 w-full"><button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="confirmReset = false">{{ t('common.cancel') }}</button><button class="px-4 py-2 rounded-lg text-sm font-semibold text-white" style="background: var(--negative)" @click="doReset">{{ t('sec.resetAll') }}</button></div></template>
    </UModal>
  </SettingsSection>
</template>
