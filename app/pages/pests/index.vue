<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'

const store = useGardenStore()
const { plotById } = store
const { relTime } = useFormat()
const { t } = useI18n()
useHead({ title: () => `${t('pests.title')} · GardenOS` })

const sightings = ref([
  { id: 'ps1', pest: 'Aphids', plotId: 'plot_chili', severity: 'medium', at: new Date(Date.now() - 2 * 86400000).toISOString(), treated: true, note: 'Clusters on new shoots' },
  { id: 'ps2', pest: 'Powdery Mildew', plotId: 'plt_greenhouse1', severity: 'low', at: new Date(Date.now() - 5 * 86400000).toISOString(), treated: true, note: 'White spots on lower leaves' },
  { id: 'ps3', pest: 'Fruit Fly', plotId: 'plt_greenhouse1', severity: 'high', at: new Date(Date.now() - 1 * 86400000).toISOString(), treated: false, note: 'Damage on ripening tomatoes' }
])
const sevColor: Record<string, string> = { low: 'success', medium: 'warning', high: 'negative' }
const openCount = computed(() => sightings.value.filter((s) => !s.treated).length)
function markTreated(id: string) { const s = sightings.value.find((x) => x.id === id); if (s) s.treated = true }
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.environment')" :title="t('pests.title')" :subtitle="t('pests.subtitle', { n: openCount })" />

    <GlassCard class="p-5 mb-6" :style="{ background: 'linear-gradient(135deg, rgba(248,113,113,0.10), transparent)' }">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-bug" class="text-negative text-lg" />
        <div class="text-sm"><span class="font-semibold">{{ t('pests.ipmTitle') }}</span> <span class="text-muted">{{ t('pests.ipmDesc') }}</span></div>
      </div>
    </GlassCard>

    <div class="space-y-3">
      <GlassCard v-for="s in sightings" :key="s.id" class="p-5">
        <div class="flex items-center gap-4 flex-wrap">
          <div class="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-bug" :class="s.severity === 'high' ? 'text-negative' : s.severity === 'medium' ? 'text-warning' : 'text-positive'" class="text-lg" />
          </div>
          <div class="flex-1 min-w-[140px]">
            <div class="flex items-center gap-2">
              <span class="font-semibold">{{ s.pest }}</span>
              <UBadge variant="subtle" :color="sevColor[s.severity]" class="capitalize">{{ s.severity }}</UBadge>
            </div>
            <div class="text-xs text-muted mt-0.5"><UIcon name="i-lucide-map-pin" class="inline text-[10px]" /> {{ plotById[s.plotId]?.name ?? 'Unknown' }} · {{ relTime(s.at) }}</div>
            <div v-if="s.note" class="text-xs text-muted mt-1 italic">"{{ s.note }}"</div>
          </div>
          <div>
            <UBadge v-if="s.treated" variant="subtle" color="success"><UIcon name="i-lucide-check" class="mr-1" />{{ t('pests.treated') }}</UBadge>
            <button v-else class="btn-accent px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5" @click="markTreated(s.id)"><UIcon name="i-lucide-spray-can" class="text-[10px]" />{{ t('pests.recordTreatment') }}</button>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
</template>
