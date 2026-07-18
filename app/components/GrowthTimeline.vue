<script setup lang="ts">
/**
 * GrowthTimeline — vertical growth-journey view for a planting.
 *
 * Renders every growth stage; reached stages show their recorded date (from the
 * planting's stageHistory), the current stage is highlighted, and upcoming
 * stages appear faded. Degrades gracefully when no history exists (synthesises
 * from plantedAt + current stage).
 */
import type { GrowthStage, StageHistoryEntry } from '~/types/garden'

const props = defineProps<{
  history?: StageHistoryEntry[]
  current: GrowthStage
  plantedAt: string
  expectedHarvest?: string
}>()

const { date: fmtDate, relTime } = useFormat()
const { t } = useI18n()

const STAGES: GrowthStage[] = ['planned', 'seeded', 'germinating', 'seedling', 'vegetative', 'flowering', 'fruiting', 'ready', 'harvested']

const icon: Record<GrowthStage, string> = {
  planned: 'i-lucide-calendar-clock',
  seeded: 'i-lucide-circle-dot',
  germinating: 'i-lucide-sparkles',
  seedling: 'i-lucide-sprout',
  vegetative: 'i-lucide-leaf',
  flowering: 'i-lucide-flower-2',
  fruiting: 'i-lucide-cherry',
  ready: 'i-lucide-shopping-basket',
  harvested: 'i-lucide-package-check'
}

const currentIndex = computed(() => STAGES.indexOf(props.current))

/** most recent recorded timestamp for a stage (history may have repeats) */
function dateFor(stage: GrowthStage): string | undefined {
  const entries = props.history?.filter((h) => h.stage === stage)
  if (!entries?.length) return undefined
  return entries[entries.length - 1].at
}

const rows = computed(() => STAGES.map((stage, i) => {
  const reached = i <= currentIndex.value
  const isCurrent = stage === props.current
  // fall back to plantedAt for the very first stage when no explicit record
  const at = dateFor(stage) ?? (stage === 'planned' ? props.plantedAt : undefined)
  return { stage, reached, isCurrent, at, isLast: i === STAGES.length - 1 }
}))
</script>

<template>
  <div>
    <div v-for="r in rows" :key="r.stage" class="flex gap-3">
      <!-- marker + connector -->
      <div class="flex flex-col items-center self-stretch">
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition"
          :class="r.isCurrent ? 'bg-accent-dim ring-2 ring-[var(--accent)]' : r.reached ? 'bg-accent-dim' : 'bg-surface-2'"
        >
          <UIcon
            :name="icon[r.stage]"
            class="text-xs"
            :class="r.reached || r.isCurrent ? 'text-accent' : 'text-muted-2'"
          />
        </div>
        <div
          v-if="!r.isLast"
          class="w-px flex-1 min-h-[12px] my-1"
          :class="r.reached ? 'bg-[var(--accent)]/40' : 'bg-[var(--border)]'"
        />
      </div>

      <!-- label + meta -->
      <div class="pb-4 flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span
            class="text-sm font-medium"
            :class="r.isCurrent ? 'text-fg' : r.reached ? 'text-fg' : 'text-muted-2'"
          >{{ t('enums.stage.' + r.stage) }}</span>
          <UBadge v-if="r.isCurrent" variant="subtle" color="accent" class="text-[10px]">{{ t('plantings.current') }}</UBadge>
        </div>
        <div class="text-xs text-muted mt-0.5">
          <span v-if="r.at">{{ fmtDate(r.at, { month: 'short', day: 'numeric', year: 'numeric' }) }} · {{ relTime(r.at) }}</span>
          <span v-else-if="!r.reached">{{ t('plantings.upcoming') }}</span>
          <span v-else>—</span>
        </div>
      </div>
    </div>

    <!-- expected harvest note -->
    <div v-if="expectedHarvest" class="flex items-center gap-2 mt-2 ml-10 text-xs text-muted">
      <UIcon name="i-lucide-calendar" class="text-[10px]" />
      {{ t('plantings.expectedHarvest') }}: {{ fmtDate(expectedHarvest, { month: 'short', day: 'numeric', year: 'numeric' }) }}
    </div>
  </div>
</template>
