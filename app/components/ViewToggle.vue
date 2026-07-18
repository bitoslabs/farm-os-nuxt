<script setup lang="ts">
/**
 * ViewToggle — segmented grid / table switch.
 * Standalone so it can live in a toolbar, a page header's action slot, or
 * wherever a layout choice is needed. Purely presentational.
 */
import type { ViewMode } from '~/composables/useListControls'

defineProps<{ modelValue: ViewMode }>()
const emit = defineEmits<{ 'update:modelValue': [ViewMode] }>()

const { t } = useI18n()

const modes: { k: ViewMode; icon: string; titleKey: string }[] = [
  { k: 'grid', icon: 'i-lucide-layout-grid', titleKey: 'listControls.grid' },
  { k: 'table', icon: 'i-lucide-table-2', titleKey: 'listControls.table' }
]

function select(k: ViewMode) {
  emit('update:modelValue', k)
}
</script>

<template>
  <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app">
    <button
      v-for="m in modes"
      :key="m.k"
      type="button"
      :title="t(m.titleKey)"
      :aria-label="t(m.titleKey)"
      :aria-pressed="modelValue === m.k"
      class="w-6 h-6 rounded-md flex items-center justify-center transition"
      :class="modelValue === m.k ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'"
      @click="select(m.k)"
    >
      <UIcon :name="m.icon" />
    </button>
  </div>
</template>
