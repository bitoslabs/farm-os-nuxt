<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useListControls, type SortOption } from '~/composables/useListControls'
import type { Harvest } from '~/types/garden'

const store = useGardenStore()
const { harvests, cropById, plotById, plantings, seasonHarvestKg } = store
const { date, number } = useFormat()
const { t } = useI18n()
const toast = useToast()
const route = useRoute()
useHead({ title: () => `${t('harvest.title')} · GardenOS` })

// Deep-link from Plantings: ?planting=<id> pre-selects a ready planting + opens the modal
onMounted(() => {
  const id = route.query.planting
  if (typeof id === 'string' && plantings.value.some((p) => p.id === id && p.stage === 'ready')) {
    form.plantingId = id
    open.value = true
  }
})

const qualityA = computed(() => harvests.value.filter((h) => h.quality === 'A').length)
const readyPlantings = computed(() => plantings.value.filter((p) => p.stage === 'ready'))

// ---- shared list controls: search + multi-field sort + grid/table ----
const sortOptions = computed<SortOption<Harvest>[]>(() => [
  { key: 'crop', label: t('plantings.crop'), value: (h) => cropById.value[h.cropId]?.name ?? '' },
  { key: 'plot', label: t('plantings.plot'), value: (h) => plotById.value[h.plotId]?.name ?? '' },
  { key: 'date', label: t('common.date'), value: (h) => h.harvestedAt },
  { key: 'qty', label: t('common.quantity'), value: (h) => h.quantity },
  { key: 'grade', label: t('harvest.grade'), value: (h) => h.quality }
])
const { search, sortKey, sortDir, viewMode, sortItems, list, applySort } = useListControls<Harvest>({
  items: harvests,
  search: (h, q) => (cropById.value[h.cropId]?.name ?? '').toLowerCase().includes(q),
  sortOptions,
  defaultSortKey: 'date',
  defaultSortDir: 'desc',
  defaultViewMode: 'table',
  storageKey: 'harvest'
})

const open = ref(false)
const form = reactive({ plantingId: '', quantity: 1, unit: 'kg' as const, quality: 'A' as 'A' | 'B' | 'C' })
const readyItems = computed(() => readyPlantings.value.map((p) => ({ label: `${cropById.value[p.cropId]?.name} · ${plotById.value[p.plotId]?.name}`, value: p.id })))
const qualityItems = computed(() => [{ label: `${t('harvest.grade')} A`, value: 'A' }, { label: `${t('harvest.grade')} B`, value: 'B' }, { label: `${t('harvest.grade')} C`, value: 'C' }])
function submit() {
  const p = plantings.value.find((x) => x.id === form.plantingId); if (!p) return
  store.addHarvest({ plantingId: p.id, cropId: p.cropId, plotId: p.plotId, quantity: form.quantity, unit: form.unit, quality: form.quality, harvestedAt: new Date().toISOString() })
  store.setPlantingStage(p.id, 'harvested'); open.value = false
  Object.assign(form, { plantingId: '', quantity: 1, unit: 'kg', quality: 'A' })
  toast.add({ title: t('crud.created'), icon: 'i-lucide-shopping-basket', color: 'success' })
}
const delOpen = ref(false); const delTarget = ref<string | null>(null)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function doDelete() { if (delTarget.value) { store.removeHarvest(delTarget.value); toast.add({ title: t('crud.deleted'), icon: 'i-lucide-trash-2', color: 'warning' }) } }
function rowActions(h: Harvest) { return [[{ label: t('crud.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(h.id) }]] }
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.cultivation')" :title="t('harvest.title')" :subtitle="t('harvest.subtitle')">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" :disabled="!readyItems.length" @click="open = true"><UIcon name="i-lucide-shopping-basket" class="text-xs" /><span>{{ t('harvest.record') }}</span></button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <GlassCard class="p-4"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('harvest.seasonTotal') }}</div><div class="display-font text-2xl font-bold text-accent">{{ number(seasonHarvestKg, { maximumFractionDigits: 1 }) }} <span class="text-sm text-muted">kg</span></div></GlassCard>
      <GlassCard class="p-4"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('harvest.count') }}</div><div class="display-font text-2xl font-bold">{{ harvests.length }}</div></GlassCard>
      <GlassCard class="p-4"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('harvest.gradeA') }}</div><div class="display-font text-2xl font-bold text-positive">{{ qualityA }}</div></GlassCard>
    </div>

    <GlassCard v-if="readyPlantings.length" class="p-5 mb-4" :style="{ background: 'linear-gradient(135deg, var(--accent-dim), transparent)' }">
      <div class="flex items-center gap-3"><UIcon name="i-lucide-bell-ring" class="text-accent" /><div class="text-sm">{{ t('harvest.readyBanner', { n: readyPlantings.length }) }}</div></div>
    </GlassCard>

    <ListToolbar
      v-if="viewMode === 'grid' || !list.length"
      v-model:search="search"
      v-model:sort-key="sortKey"
      v-model:sort-dir="sortDir"
      v-model:view-mode="viewMode"
      :sort-items="sortItems"
      :search-placeholder="t('common.search')"
      class="mb-4"
    />

    <!-- GRID VIEW -->
    <div v-if="list.length && viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <GlassCard v-for="h in list" :key="h.id" hover class="p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-shopping-basket" class="text-positive text-lg" /></div>
          <UBadge variant="subtle" :color="h.quality === 'A' ? 'success' : h.quality === 'B' ? 'warning' : 'neutral'">{{ t('harvest.grade') }} {{ h.quality }}</UBadge>
        </div>
        <h3 class="font-semibold text-lg mb-0.5">{{ cropById[h.cropId]?.name ?? '—' }}</h3>
        <div class="text-xs text-muted mb-3">{{ plotById[h.plotId]?.name }} · {{ date(h.harvestedAt) }}</div>
        <div class="display-font text-2xl font-bold text-positive">+{{ number(h.quantity, { maximumFractionDigits: 1 }) }} <span class="text-sm text-muted">{{ t('enums.unit.' + h.unit) }}</span></div>
      </GlassCard>
    </div>

    <!-- TABLE VIEW -->
    <GlassCard v-else-if="list.length" class="list-workspace overflow-hidden">
      <ListToolbar v-model:search="search" v-model:sort-key="sortKey" v-model:sort-dir="sortDir" v-model:view-mode="viewMode" :sort-items="sortItems" :search-placeholder="t('common.search')" embedded />
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-muted uppercase tracking-wider border-b border-app">
              <SortableTh :active="sortKey === 'crop'" :direction="sortDir" @click="applySort('crop')">{{ t('plantings.crop') }}</SortableTh>
              <SortableTh :active="sortKey === 'plot'" :direction="sortDir" @click="applySort('plot')">{{ t('plantings.plot') }}</SortableTh>
              <SortableTh :active="sortKey === 'date'" :direction="sortDir" @click="applySort('date')">{{ t('common.date') }}</SortableTh>
              <SortableTh :active="sortKey === 'qty'" :direction="sortDir" align="right" @click="applySort('qty')">{{ t('common.quantity') }}</SortableTh>
              <SortableTh :active="sortKey === 'grade'" :direction="sortDir" @click="applySort('grade')">{{ t('harvest.grade') }}</SortableTh>
              <th class="px-5 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in list" :key="h.id" class="border-b border-app last:border-0 transaction-row">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-shopping-basket" class="text-positive" /></div>
                  <span class="font-semibold">{{ cropById[h.cropId]?.name ?? '—' }}</span>
                </div>
              </td>
              <td class="px-5 py-4 text-muted">{{ plotById[h.plotId]?.name ?? '—' }}</td>
              <td class="px-5 py-4 text-muted whitespace-nowrap">{{ date(h.harvestedAt) }}</td>
              <td class="px-5 py-4 text-right font-semibold text-positive whitespace-nowrap">+{{ number(h.quantity, { maximumFractionDigits: 1 }) }} {{ t('enums.unit.' + h.unit) }}</td>
              <td class="px-5 py-4"><UBadge variant="subtle" :color="h.quality === 'A' ? 'success' : h.quality === 'B' ? 'warning' : 'neutral'">{{ t('harvest.grade') }} {{ h.quality }}</UBadge></td>
              <td class="px-5 py-4 text-right">
                <UDropdownMenu :items="rowActions(h)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <GlassCard v-else><EmptyState icon="i-lucide-shopping-basket" :title="search ? t('crud.noResults') : t('harvest.emptyTitle')" :description="search ? '' : t('harvest.emptyDesc')" /></GlassCard>

    <UModal v-model:open="open" :title="t('harvest.recordTitle')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('harvest.readyPlanting')"><USelect v-model="form.plantingId" :items="readyItems" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('common.quantity')"><UInputNumber v-model="form.quantity" :step="0.5" class="w-full" /></UFormField>
            <UFormField :label="t('common.unit')"><USelect v-model="form.unit" :items="['kg', 'g', 'piece', 'bunch'].map(u => ({ label: t('enums.unit.' + u), value: u }))" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('harvest.qualityGrade')"><USelect v-model="form.quality" :items="qualityItems" class="w-full" /></UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="open = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="submit">{{ t('harvest.save') }}</button>
        </div>
      </template>
    </UModal>

    <ConfirmModal v-model:open="delOpen" @confirm="doDelete" />
  </div>
</template>
