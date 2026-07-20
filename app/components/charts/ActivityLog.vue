<script setup lang="ts">
/**
 * ActivityLog — chronological care history for a planting (kind 32013).
 *
 * Shows watering / fertilizing / pest-treatment / weeding / pruning /
 * observation entries with their date, note, and any inventory input consumed.
 * Self-contained: reads the store for the given planting and handles its own
 * deletes. Drop into any planting detail view.
 */
import { useGardenStore } from '~/composables/useGardenStore'
import type { ActivityType, PlantingActivity } from '~/types/garden'

const props = defineProps<{
  plantingId: string
  /** pass false to hide per-row delete buttons (read-only contexts) */
  deletable?: boolean
}>()

const store = useGardenStore()
const { date: fmtDate, relTime } = useFormat()
const { t } = useI18n()

const icon: Record<ActivityType, string> = {
  watering: 'i-lucide-droplets',
  fertilizing: 'i-lucide-flask-conical',
  pest_treatment: 'i-lucide-spray-can',
  weeding: 'i-lucide-shovel',
  pruning: 'i-lucide-scissors',
  observation: 'i-lucide-eye',
  other: 'i-lucide-circle-dot'
}
const color: Record<ActivityType, string> = {
  watering: 'info',
  fertilizing: 'success',
  pest_treatment: 'warning',
  weeding: 'neutral',
  pruning: 'neutral',
  observation: 'info',
  other: 'neutral'
}
const tint: Record<ActivityType, string> = {
  watering: 'text-info',
  fertilizing: 'text-positive',
  pest_treatment: 'text-warning',
  weeding: 'text-muted',
  pruning: 'text-muted',
  observation: 'text-info',
  other: 'text-muted'
}

const items = computed<PlantingActivity[]>(() =>
  [...store.activities.value]
    .filter((a) => a.plantingId === props.plantingId)
    .sort((a, b) => b.date.localeCompare(a.date))
)

const delTarget = ref<string | null>(null)
const delOpen = ref(false)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function inputName(id?: string) {
  if (!id) return ''
  return store.inventory.value.find((i) => i.id === id)?.name ?? ''
}
</script>

<template>
  <div>
    <div v-if="items.length" class="space-y-2">
      <div
        v-for="a in items"
        :key="a.id"
        class="flex items-start gap-3 bg-surface-2 rounded-lg px-3 py-2.5"
      >
        <div class="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
          <UIcon :name="icon[a.type]" class="text-sm" :class="tint[a.type]" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <UBadge variant="subtle" :color="color[a.type]" class="text-[10px]">{{ t('enums.activityType.' + a.type) }}</UBadge>
            <span class="text-xs text-muted whitespace-nowrap">{{ fmtDate(a.date) }} · {{ relTime(a.date) }}</span>
          </div>
          <p v-if="a.note" class="text-sm text-fg mt-1 leading-snug">{{ a.note }}</p>
          <div v-if="a.inputId && a.inputQty" class="text-[11px] text-muted mt-1 flex items-center gap-1">
            <UIcon name="i-lucide-flask-conical" class="text-[10px]" />
            {{ inputName(a.inputId) }} · −{{ a.inputQty }} {{ a.inputUnit }}
          </div>
        </div>
        <button
          v-if="deletable !== false"
          class="w-7 h-7 rounded-md flex items-center justify-center text-muted-2 hover:text-negative transition shrink-0"
          @click="askDelete(a.id)"
        >
          <UIcon name="i-lucide-trash-2" class="text-xs" />
        </button>
      </div>
    </div>
    <p v-else class="text-sm text-muted-2 text-center py-4">{{ t('plantings.noActivity') }}</p>

    <ConfirmModal v-model:open="delOpen" @confirm="() => { if (delTarget) store.removeActivity(delTarget) }" />
  </div>
</template>
