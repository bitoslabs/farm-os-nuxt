<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useListControls, type SortOption } from '~/composables/useListControls'
import type { Plot, SpaceType } from '~/types/garden'

const store = useGardenStore()
const { plots, plantings, cropById } = store
const { number } = useFormat()
const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('land.title')} · GardenOS` })

const typeIcon: Record<SpaceType, string> = { field: 'i-lucide-wheat', plot: 'i-lucide-square-dashed', bed: 'i-lucide-grid-2x2', greenhouse: 'i-lucide-home', container: 'i-lucide-box' }
const totalArea = computed(() => plots.value.reduce((s, p) => s + (p.areaUnit === 'ha' ? p.area * 10000 : p.area), 0))
function plantingFor(plotId: string) { return plantings.value.find((p) => p.plotId === plotId && p.stage !== 'harvested') }

// ---- reusable list controls ----
const sortOptions = computed<SortOption<Plot>[]>(() => [
  { key: 'name', label: t('common.name'), value: (p) => p.name },
  { key: 'type', label: t('common.type'), value: (p) => p.type },
  { key: 'area', label: t('land.area'), value: (p) => p.areaUnit === 'ha' ? p.area * 10000 : p.area },
  { key: 'zone', label: t('land.zone'), value: (p) => p.zone ?? '' }
])
const { search, sortKey, sortDir, viewMode, sortItems, list, applySort } = useListControls<Plot>({
  items: plots,
  search: (p, q) => p.name.toLowerCase().includes(q) || (p.type || '').includes(q) || (p.zone || '').toLowerCase().includes(q),
  sortOptions,
  defaultSortKey: 'name',
  defaultViewMode: 'grid',
  storageKey: 'land'
})

// form (create + edit unified)
const open = ref(false)
const editingId = ref<string | null>(null)
const emptyForm = () => ({ name: '', type: 'bed' as SpaceType, area: 10, areaUnit: 'm²' as 'm²' | 'ha', soilType: 'Loam', sunExposure: 'full' as Plot['sunExposure'], zone: 'Garden' })
const form = reactive(emptyForm())
const typeItems = computed(() => [{ label: t('enums.landType.field'), value: 'field' }, { label: t('enums.landType.plot'), value: 'plot' }, { label: t('enums.landType.bed'), value: 'bed' }, { label: t('enums.landType.greenhouse'), value: 'greenhouse' }, { label: t('enums.landType.container'), value: 'container' }])
const sunItems = computed(() => [{ label: t('land.fullSun'), value: 'full' }, { label: t('land.partialShade'), value: 'partial' }, { label: t('land.shade'), value: 'shade' }])
function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); open.value = true }
function openEdit(p: Plot) { editingId.value = p.id; Object.assign(form, { name: p.name, type: p.type, area: p.area, areaUnit: p.areaUnit, soilType: p.soilType || 'Loam', sunExposure: p.sunExposure || 'full', zone: p.zone || 'Garden' }); open.value = true }
function save() {
  if (!form.name.trim()) return
  if (editingId.value) { store.updatePlot(editingId.value, { ...form }); toast.add({ title: t('crud.saved'), icon: 'i-lucide-check', color: 'success' }) }
  else { store.addPlot({ ...form }); toast.add({ title: t('crud.created'), icon: 'i-lucide-plus', color: 'success' }) }
  open.value = false
}

// delete
const delOpen = ref(false)
const delTarget = ref<string | null>(null)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function doDelete() { if (delTarget.value) { store.removePlot(delTarget.value); toast.add({ title: t('crud.deleted'), icon: 'i-lucide-trash-2', color: 'warning' }) } }

function rowActions(p: Plot) {
  return [[
    { label: t('crud.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(p) },
    { label: t('crud.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(p.id) }
  ]]
}
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.cultivation')" :title="t('land.title')" :subtitle="t('land.subtitle')">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="openCreate"><UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('land.add') }}</span></button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <GlassCard class="p-4" :delay="0.05"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('land.totalSpaces') }}</div><AnimatedMetric :value="plots.length" /></GlassCard>
      <GlassCard class="p-4" :delay="0.1"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('land.cultivatedArea') }}</div><AnimatedMetric :value="totalArea" suffix=" m²" :decimals="0" /></GlassCard>
      <GlassCard class="p-4" :delay="0.15"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('land.activeCrops') }}</div><AnimatedMetric :value="plots.filter(p => p.activeCropId).length" /></GlassCard>
    </div>

    <ListToolbar
      v-if="viewMode === 'grid' || !list.length"
      v-model:search="search"
      v-model:sort-key="sortKey"
      v-model:sort-dir="sortDir"
      v-model:view-mode="viewMode"
      :sort-items="sortItems"
      :search-placeholder="t('common.search')"
      :delay="0.2"
      class="mb-4"
    />

    <!-- GRID VIEW -->
    <div v-if="list.length && viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <GlassCard v-for="(plot, index) in list" :key="plot.id" hover class="p-5 relative" :style="{ '--motion-delay': `${Math.min(0.55, 0.3 + index * 0.05)}s` }">
        <div class="flex items-start justify-between mb-4">
          <div class="icon-box w-10 h-10 rounded-xl flex items-center justify-center"><UIcon :name="typeIcon[plot.type]" class="text-accent" /></div>
          <UDropdownMenu :items="rowActions(plot)" :content="{ align: 'end' }">
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button>
          </UDropdownMenu>
        </div>
        <h3 class="font-semibold text-lg mb-1">{{ plot.name }}</h3>
        <div class="text-xs text-muted mb-4">{{ plot.area }} {{ plot.areaUnit }} · {{ plot.soilType }}</div>
        <template v-if="plantingFor(plot.id)">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-muted">{{ cropById[plantingFor(plot.id)!.cropId]?.name }}</span>
            <span class="text-accent font-semibold">{{ t('enums.stage.' + plantingFor(plot.id)!.stage) }}</span>
          </div>
          <div class="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div class="progress-fill" :style="{ width: `${plantingFor(plot.id)!.progress}%` }" /></div>
        </template>
        <div v-else class="text-sm text-muted-2 italic">{{ t('land.fallow') }}</div>
        <div v-if="plot.zone" class="mt-4 pt-4 border-t border-app flex items-center gap-2 text-xs text-muted"><UIcon name="i-lucide-map-pin" class="text-[10px]" /> {{ plot.zone }}</div>
      </GlassCard>
    </div>

    <!-- TABLE VIEW -->
    <GlassCard v-else-if="list.length" class="list-workspace overflow-hidden" :delay="0.2">
      <ListToolbar
        v-model:search="search"
        v-model:sort-key="sortKey"
        v-model:sort-dir="sortDir"
        v-model:view-mode="viewMode"
        :sort-items="sortItems"
        :search-placeholder="t('common.search')"
        embedded
      />
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-muted uppercase tracking-wider border-b border-app">
              <SortableTh :active="sortKey === 'name'" :direction="sortDir" @click="applySort('name')">{{ t('common.name') }}</SortableTh>
              <SortableTh :active="sortKey === 'type'" :direction="sortDir" @click="applySort('type')">{{ t('common.type') }}</SortableTh>
              <SortableTh :active="sortKey === 'area'" :direction="sortDir" align="right" @click="applySort('area')">{{ t('land.area') }}</SortableTh>
              <SortableTh :active="sortKey === 'zone'" :direction="sortDir" @click="applySort('zone')">{{ t('land.zone') }}</SortableTh>
              <th class="px-5 py-3 font-semibold">{{ t('land.soilType') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('land.activeCrops') }}</th>
              <th class="px-5 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="plot in list" :key="plot.id" class="border-b border-app last:border-0 transaction-row">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><UIcon :name="typeIcon[plot.type]" class="text-accent" /></div>
                  <span class="font-semibold">{{ plot.name }}</span>
                </div>
              </td>
              <td class="px-5 py-4 text-muted">{{ t('enums.landType.' + plot.type) }}</td>
              <td class="px-5 py-4 text-right">{{ number(plot.area) }} {{ plot.areaUnit }}</td>
              <td class="px-5 py-4 text-muted">{{ plot.zone || '—' }}</td>
              <td class="px-5 py-4 text-muted">{{ plot.soilType || '—' }}</td>
              <td class="px-5 py-4">
                <template v-if="plantingFor(plot.id)">
                  <div class="font-medium">{{ cropById[plantingFor(plot.id)!.cropId]?.name }}</div>
                  <div class="text-[11px] text-accent">{{ t('enums.stage.' + plantingFor(plot.id)!.stage) }} · {{ plantingFor(plot.id)!.progress }}%</div>
                </template>
                <span v-else class="text-muted-2 italic">{{ t('land.fallow') }}</span>
              </td>
              <td class="px-5 py-4 text-right">
                <UDropdownMenu :items="rowActions(plot)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <GlassCard v-else :delay="0.3"><EmptyState icon="i-lucide-map-pin" :title="search ? t('crud.noResults') : t('land.emptyTitle')" :description="search ? '' : t('land.emptyDesc')">
      <template v-if="!search" #action><button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="openCreate">{{ t('land.add') }}</button></template>
    </EmptyState></GlassCard>

    <!-- create / edit -->
    <UModal v-model:open="open" :title="editingId ? t('crud.edit') : t('land.add')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('common.name')"><UInput v-model="form.name" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('common.type')"><USelect v-model="form.type" :items="typeItems" class="w-full" /></UFormField>
            <UFormField :label="t('land.sun')"><USelect v-model="form.sunExposure" :items="sunItems" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('land.area')"><UInputNumber v-model="form.area" class="w-full" /></UFormField>
            <UFormField :label="t('common.unit')"><USelect v-model="form.areaUnit" :items="['m²', 'ha']" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('land.soilType')"><UInput v-model="form.soilType" class="w-full" /></UFormField>
            <UFormField :label="t('land.zone')"><UInput v-model="form.zone" class="w-full" /></UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="open = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="save">{{ t('common.save') }}</button>
        </div>
      </template>
    </UModal>

    <ConfirmModal v-model:open="delOpen" @confirm="doDelete" />
  </div>
</template>
