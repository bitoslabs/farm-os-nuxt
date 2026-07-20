<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useListControls, type SortOption } from '~/composables/useListControls'
import type { GrowthStage, Planting, PlantingActivity, ActivityType } from '~/types/garden'

const store = useGardenStore()
const { plantings, plotById, cropById } = store
const { date, relTime, number } = useFormat()
const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('plantings.title')} · GardenOS` })

const STAGES: GrowthStage[] = ['planned', 'seeded', 'germinating', 'seedling', 'vegetative', 'flowering', 'fruiting', 'ready', 'harvested']
const stageColor: Record<GrowthStage, string> = { planned: 'text-muted-2', seeded: 'text-info', germinating: 'text-info', seedling: 'text-info', vegetative: 'text-accent', flowering: 'text-warning', fruiting: 'text-warning', ready: 'text-positive', harvested: 'text-muted' }

// ---- status filter (applied before the shared list controls) ----
const filter = ref<'active' | 'ready' | 'all'>('active')
const filterItems = computed(() => [
  { value: 'active', label: t('plantings.tabActive') },
  { value: 'ready', label: t('plantings.tabReady') },
  { value: 'all', label: t('plantings.tabAll') }
] as const)
const tabFiltered = computed(() => {
  if (filter.value === 'ready') return plantings.value.filter((p) => p.stage === 'ready')
  if (filter.value === 'active') return plantings.value.filter((p) => p.stage !== 'harvested')
  return plantings.value
})
const lastCareByPlanting = computed<Record<string, PlantingActivity | undefined>>(() => {
  const latest: Record<string, PlantingActivity | undefined> = {}
  for (const activity of store.activities.value) {
    if (!latest[activity.plantingId] || activity.date > latest[activity.plantingId]!.date) latest[activity.plantingId] = activity
  }
  return latest
})

// ---- shared list controls: search + multi-field sort + grid/table ----
const sortOptions = computed<SortOption<Planting>[]>(() => [
  { key: 'crop', label: t('plantings.crop'), value: (p) => cropById.value[p.cropId]?.name ?? '' },
  { key: 'plot', label: t('plantings.plot'), value: (p) => plotById.value[p.plotId]?.name ?? '' },
  { key: 'stage', label: t('plantings.stage'), value: (p) => STAGES.indexOf(p.stage) },
  { key: 'progress', label: t('plantings.progress'), value: (p) => p.progress },
  { key: 'planted', label: t('plantings.planted'), value: (p) => p.plantedAt }
])
const { search, sortKey, sortDir, viewMode, sortItems, list, applySort } = useListControls<Planting>({
  items: tabFiltered,
  search: (p, q) => (cropById.value[p.cropId]?.name ?? '').toLowerCase().includes(q) || (plotById.value[p.plotId]?.name ?? '').toLowerCase().includes(q),
  sortOptions,
  defaultSortKey: 'planted',
  defaultSortDir: 'desc',
  defaultViewMode: 'grid',
  storageKey: 'plantings'
})

function advance(id: string, stage: GrowthStage) {
  const i = STAGES.indexOf(stage)
  const nextStage = STAGES[Math.min(i + 1, STAGES.length - 1)]
  store.setPlantingStage(id, nextStage)
  toast.add({ title: t('plantings.stageUpdated', { stage: t('enums.stage.' + nextStage) }), icon: 'i-lucide-chevron-right', color: 'info' })
}

const open = ref(false); const editingId = ref<string | null>(null)
const emptyForm = () => ({ plotId: '', cropId: '', method: 'seed' as 'seed' | 'seedling' | 'cutting', stage: 'seeded' as GrowthStage, quantity: 50, unit: 'piece' as const })
const form = reactive({ ...emptyForm(), date: new Date().toISOString().slice(0, 10) })
const plotItems = computed(() => store.plots.value.map((p) => ({ label: p.name, value: p.id })))
const cropItems = computed(() => store.crops.value.map((c) => ({ label: c.name, value: c.id })))
const methodItems = computed(() => [{ label: t('enums.method.seed'), value: 'seed' }, { label: t('enums.method.seedling'), value: 'seedling' }, { label: t('enums.method.cutting'), value: 'cutting' }])
const unitItems = computed(() => ['piece', 'kg', 'g', 'bunch'].map((u) => ({ label: t('enums.unit.' + u), value: u })))
function openCreate() { editingId.value = null; Object.assign(form, { ...emptyForm(), date: new Date().toISOString().slice(0, 10) }); open.value = true }
function openEdit(p: Planting) { editingId.value = p.id; Object.assign(form, { plotId: p.plotId, cropId: p.cropId, method: p.method, stage: p.stage, quantity: p.quantity, unit: p.unit, date: p.plantedAt?.slice(0, 10) ?? '' }); open.value = true }
function save() {
  if (!form.plotId || !form.cropId) return
  const plantedAt = form.date ? new Date(`${form.date}T12:00:00`).toISOString() : new Date().toISOString()
  const planting = { plotId: form.plotId, cropId: form.cropId, method: form.method, stage: form.stage, quantity: form.quantity, unit: form.unit, plantedAt }
  if (editingId.value) { store.updatePlanting(editingId.value, planting); toast.add({ title: t('crud.saved'), icon: 'i-lucide-check', color: 'success' }) }
  else { store.addPlanting(planting); toast.add({ title: t('crud.created'), icon: 'i-lucide-plus', color: 'success' }) }
  open.value = false
}
const delOpen = ref(false); const delTarget = ref<string | null>(null)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function doDelete() { if (delTarget.value) { store.removePlanting(delTarget.value); toast.add({ title: t('crud.deleted'), icon: 'i-lucide-trash-2', color: 'warning' }) } }
function rowActions(p: Planting) {
  type Action = { label: string; icon?: string; color?: string; onSelect: () => void }
  const items: Action[] = [
    { label: t('plantings.viewDetails'), icon: 'i-lucide-eye', onSelect: () => openDetail(p) },
    { label: t('plantings.logActivity'), icon: 'i-lucide-droplets', onSelect: () => openActivity(p) },
    { label: t('crud.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(p) }
  ]
  if (p.stage !== 'ready' && p.stage !== 'harvested') items.push({ label: t('plantings.advance'), icon: 'i-lucide-chevron-right', onSelect: () => advance(p.id, p.stage) })
  if (p.stage === 'ready') items.push({ label: t('plantings.harvest'), icon: 'i-lucide-shopping-basket', onSelect: () => navigateTo(`/harvest?planting=${p.id}`) })
  items.push({ label: t('crud.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(p.id) })
  return [items]
}

// ---- detail modal + growth timeline ----
const detailOpen = ref(false)
const detailId = ref<string | null>(null)
const detailPlanting = computed(() => store.plantings.value.find((p) => p.id === detailId.value) ?? null)
const detailHarvests = computed(() => detailPlanting.value ? store.harvests.value.filter((h) => h.plantingId === detailPlanting.value!.id) : [])
function openDetail(p: Planting) { detailId.value = p.id; detailOpen.value = true }

// ---- activity (care) log ----
const actOpen = ref(false)
const actForm = reactive({ plantingId: '', type: 'watering' as ActivityType, date: new Date().toISOString().slice(0, 10), note: '', inputId: '', inputQty: 0 })
const actTypeItems = computed(() => (['watering', 'fertilizing', 'pest_treatment', 'weeding', 'pruning', 'observation', 'other'] as ActivityType[]).map((x) => ({ label: t('enums.activityType.' + x), value: x })))
const inputItems = computed(() => store.inventory.value.map((i) => ({ label: `${i.name} (${i.stock} ${t('enums.unit.' + i.unit)})`, value: i.id })))
// planting selector — computed so ref lookups use explicit `.value`
const activePlantingItems = computed(() =>
  store.plantings.value
    .filter((p) => p.stage !== 'harvested')
    .map((p) => ({
      label: `${cropById.value[p.cropId]?.name ?? '—'} · ${plotById.value[p.plotId]?.name ?? ''} · ${t('enums.stage.' + p.stage)}`,
      value: p.id
    }))
)
const usesInput = computed(() => actForm.type === 'fertilizing' || actForm.type === 'pest_treatment')
function openActivity(p?: Planting) {
  Object.assign(actForm, { plantingId: p?.id ?? detailPlanting.value?.id ?? '', type: 'watering', date: new Date().toISOString().slice(0, 10), note: '', inputId: '', inputQty: 0 })
  actOpen.value = true
}
function saveActivity() {
  if (!actForm.plantingId) return
  const item = actForm.inputId ? store.inventory.value.find((i) => i.id === actForm.inputId) : undefined
  store.addActivity({
    plantingId: actForm.plantingId,
    type: actForm.type,
    date: new Date(actForm.date).toISOString(),
    note: actForm.note || undefined,
    inputId: (usesInput.value && actForm.inputId) ? actForm.inputId : undefined,
    inputQty: (usesInput.value && actForm.inputId && actForm.inputQty > 0) ? actForm.inputQty : undefined,
    inputUnit: (usesInput.value && item) ? item.unit : undefined
  })
  actOpen.value = false
  toast.add({ title: t('crud.created'), icon: 'i-lucide-droplets', color: 'success' })
}
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.cultivation')" :title="t('plantings.title')" :subtitle="t('plantings.subtitle')">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="openCreate"><UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('plantings.add') }}</span></button>
      </template>
    </PageHeader>

    <ListToolbar
      v-if="viewMode === 'grid' || !list.length"
      v-model:search="search"
      v-model:sort-key="sortKey"
      v-model:sort-dir="sortDir"
      v-model:view-mode="viewMode"
      :sort-items="sortItems"
      :search-placeholder="t('common.search')"
      class="mb-4"
    >
      <template #prepend>
        <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app shrink-0">
          <button v-for="item in filterItems" :key="item.value" class="px-3 py-1 rounded-md text-xs font-medium transition" :class="filter === item.value ? 'bg-surface-2 text-fg' : 'text-muted'" @click="filter = item.value">{{ item.label }}</button>
        </div>
      </template>
    </ListToolbar>

    <!-- GRID VIEW -->
    <div v-if="list.length && viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <GlassCard v-for="p in list" :key="p.id" hover class="p-5 relative" :class="p.stage === 'ready' ? 'border-[var(--accent)]' : ''">
        <div class="flex items-start justify-between mb-3">
          <div class="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-sprout" class="text-accent text-lg" /></div>
          <UDropdownMenu :items="rowActions(p)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
        </div>
        <h3 class="font-semibold text-lg">{{ cropById[p.cropId]?.name ?? '—' }}</h3>
        <div class="text-xs text-muted mb-3">{{ plotById[p.plotId]?.name }} · {{ t('enums.method.' + p.method) }} · {{ t('plantings.planted') }} {{ relTime(p.plantedAt) }}</div>
        <div class="flex items-center justify-between text-xs mb-1.5"><span :class="stageColor[p.stage]" class="font-semibold">{{ t('enums.stage.' + p.stage) }}</span><span class="text-muted">{{ p.progress }}%</span></div>
        <div class="h-2 rounded-full bg-surface-2 overflow-hidden mb-3"><div class="progress-fill" :style="{ width: `${p.progress}%` }" /></div>
        <div class="text-[11px] text-muted mb-3 flex items-center gap-1.5">
          <UIcon name="i-lucide-heart-pulse" class="text-[11px] text-accent" />
          <span>{{ t('plantings.lastCare') }}:</span>
          <span v-if="lastCareByPlanting[p.id]" class="text-fg">{{ t('enums.activityType.' + lastCareByPlanting[p.id]!.type) }} · {{ relTime(lastCareByPlanting[p.id]!.date) }}</span>
          <span v-else>{{ t('plantings.noCare') }}</span>
        </div>
        <div v-if="p.expectedHarvest" class="text-[11px] text-muted mb-3">~{{ date(p.expectedHarvest) }}</div>
        <div class="flex items-center gap-2 pt-1">
          <button v-if="p.stage !== 'harvested'" class="btn-accent px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5" @click="openActivity(p)"><UIcon name="i-lucide-plus" class="text-[10px]" />{{ t('plantings.logActivity') }}</button>
          <button v-if="p.stage !== 'harvested' && p.stage !== 'ready'" class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" @click="advance(p.id, p.stage)"><UIcon name="i-lucide-chevron-right" class="text-[10px]" />{{ t('plantings.advance') }}</button>
          <NuxtLink v-if="p.stage === 'ready'" :to="`/harvest?planting=${p.id}`" class="btn-accent px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"><UIcon name="i-lucide-shopping-basket" class="text-[10px]" />{{ t('plantings.harvest') }}</NuxtLink>
        </div>
      </GlassCard>
    </div>

    <!-- TABLE VIEW -->
    <GlassCard v-else-if="list.length" class="list-workspace overflow-hidden">
      <ListToolbar v-model:search="search" v-model:sort-key="sortKey" v-model:sort-dir="sortDir" v-model:view-mode="viewMode" :sort-items="sortItems" :search-placeholder="t('common.search')" embedded>
        <template #prepend>
          <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app shrink-0">
            <button v-for="item in filterItems" :key="item.value" class="px-3 py-1 rounded-md text-xs font-medium transition" :class="filter === item.value ? 'bg-surface-2 text-fg' : 'text-muted'" @click="filter = item.value">{{ item.label }}</button>
          </div>
        </template>
      </ListToolbar>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-muted uppercase tracking-wider border-b border-app">
              <SortableTh :active="sortKey === 'crop'" :direction="sortDir" @click="applySort('crop')">{{ t('plantings.crop') }}</SortableTh>
              <SortableTh :active="sortKey === 'plot'" :direction="sortDir" @click="applySort('plot')">{{ t('plantings.plot') }}</SortableTh>
              <SortableTh :active="sortKey === 'stage'" :direction="sortDir" @click="applySort('stage')">{{ t('plantings.stage') }}</SortableTh>
              <SortableTh :active="sortKey === 'progress'" :direction="sortDir" align="right" @click="applySort('progress')">{{ t('plantings.progress') }}</SortableTh>
              <SortableTh :active="sortKey === 'planted'" :direction="sortDir" @click="applySort('planted')">{{ t('plantings.planted') }}</SortableTh>
              <th class="px-5 py-3">{{ t('plantings.lastCare') }}</th>
              <th class="px-5 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in list" :key="p.id" class="border-b border-app last:border-0 transaction-row" :class="p.stage === 'ready' ? 'border-l-2 border-l-[var(--accent)]' : ''">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-sprout" class="text-accent" /></div>
                  <div><div class="font-semibold">{{ cropById[p.cropId]?.name ?? '—' }}</div><div class="text-xs text-muted">{{ t('enums.method.' + p.method) }}</div></div>
                </div>
              </td>
              <td class="px-5 py-4 text-muted">{{ plotById[p.plotId]?.name ?? '—' }}</td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2 flex-wrap">
                  <span :class="stageColor[p.stage]" class="font-medium whitespace-nowrap">{{ t('enums.stage.' + p.stage) }}</span>
                  <button v-if="p.stage !== 'harvested' && p.stage !== 'ready'" type="button" class="text-[11px] text-accent font-semibold hover:underline whitespace-nowrap inline-flex items-center gap-0.5" @click="advance(p.id, p.stage)">
                    {{ t('plantings.next') }} <UIcon name="i-lucide-chevron-right" class="text-[10px]" />
                  </button>
                  <NuxtLink v-else-if="p.stage === 'ready'" :to="`/harvest?planting=${p.id}`" class="text-[11px] text-accent font-semibold hover:underline whitespace-nowrap inline-flex items-center gap-0.5">
                    <UIcon name="i-lucide-shopping-basket" class="text-[10px]" />{{ t('plantings.harvest') }}
                  </NuxtLink>
                </div>
              </td>
              <td class="px-5 py-4 text-right">
                <div class="flex items-center gap-2 justify-end"><span class="text-xs text-muted w-8 text-right">{{ p.progress }}%</span><div class="w-20 h-1.5 rounded-full bg-surface-2 overflow-hidden"><div class="progress-fill" :style="{ width: `${p.progress}%` }" /></div></div>
              </td>
              <td class="px-5 py-4 text-muted whitespace-nowrap">{{ relTime(p.plantedAt) }}</td>
              <td class="px-5 py-4">
                <div v-if="lastCareByPlanting[p.id]" class="text-xs whitespace-nowrap">
                  <div class="text-fg">{{ t('enums.activityType.' + lastCareByPlanting[p.id]!.type) }}</div>
                  <div class="text-[11px] text-muted">{{ relTime(lastCareByPlanting[p.id]!.date) }}</div>
                </div>
                <span v-else class="text-xs text-muted-2">{{ t('plantings.noCare') }}</span>
              </td>
              <td class="px-5 py-4 text-right whitespace-nowrap">
                <button v-if="p.stage !== 'harvested'" class="btn-accent px-2.5 py-1.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 mr-1" @click="openActivity(p)"><UIcon name="i-lucide-plus" class="text-[10px]" />{{ t('plantings.logActivity') }}</button>
                <button class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-2 hover:bg-surface hover:text-accent transition" :title="t('plantings.viewDetails')" @click="openDetail(p)"><UIcon name="i-lucide-eye" /></button>
                <UDropdownMenu :items="rowActions(p)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <GlassCard v-else><EmptyState icon="i-lucide-sprout" :title="search ? t('crud.noResults') : t('plantings.emptyTitle')" :description="search ? '' : t('plantings.emptyDesc')" /></GlassCard>

    <UModal v-model:open="open" :title="editingId ? t('crud.edit') : t('plantings.addTitle')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('plantings.crop')"><USelectMenu v-model="form.cropId" :items="cropItems" value-key="value" search-input :placeholder="t('plantings.crop')" class="w-full" /></UFormField>
          <UFormField :label="t('plantings.plot')"><USelectMenu v-model="form.plotId" :items="plotItems" value-key="value" search-input :placeholder="t('plantings.plot')" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('plantings.method')"><USelect v-model="form.method" :items="methodItems" class="w-full" /></UFormField>
            <UFormField :label="t('plantings.initialStage')"><USelect v-model="form.stage" :items="STAGES.map(s => ({ label: t('enums.stage.' + s), value: s }))" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('plantings.plantedDate')" :description="t('plantings.plantedDateOptional')"><UInput v-model="form.date" type="date" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('common.quantity')"><UInputNumber v-model="form.quantity" class="w-full" /></UFormField>
            <UFormField :label="t('common.unit')"><USelect v-model="form.unit" :items="unitItems" class="w-full" /></UFormField>
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

    <!-- detail modal: summary + growth timeline + related harvests -->
    <UModal v-model:open="detailOpen" :title="t('plantings.timeline')" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div v-if="detailPlanting" class="space-y-5">
          <!-- summary -->
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center shrink-0"><UIcon name="i-lucide-sprout" class="text-accent text-lg" /></div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-lg">{{ cropById[detailPlanting.cropId]?.name ?? '—' }}</h3>
              <div class="text-xs text-muted">{{ plotById[detailPlanting.plotId]?.name }} · {{ t('enums.method.' + detailPlanting.method) }} · {{ t('plantings.planted') }} {{ relTime(detailPlanting.plantedAt) }}</div>
            </div>
            <UBadge variant="subtle" :color="detailPlanting.stage === 'ready' ? 'success' : detailPlanting.stage === 'harvested' ? 'neutral' : 'accent'">{{ t('enums.stage.' + detailPlanting.stage) }}</UBadge>
          </div>

          <!-- progress -->
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5"><span class="text-muted">{{ t('plantings.progress') }}</span><span class="font-semibold text-accent">{{ detailPlanting.progress }}%</span></div>
            <div class="h-2 rounded-full bg-surface-2 overflow-hidden"><div class="progress-fill" :style="{ width: `${detailPlanting.progress}%` }" /></div>
          </div>

          <!-- growth timeline -->
          <GrowthTimeline :history="detailPlanting.stageHistory" :current="detailPlanting.stage" :planted-at="detailPlanting.plantedAt" :expected-harvest="detailPlanting.expectedHarvest" />

          <!-- related harvests -->
          <div v-if="detailHarvests.length">
            <div class="text-xs text-muted uppercase tracking-wider mb-2">{{ t('plantings.relatedHarvests') }}</div>
            <div class="space-y-2">
              <div v-for="h in detailHarvests" :key="h.id" class="flex items-center gap-3 text-sm bg-surface-2 rounded-lg px-3 py-2">
                <span class="flex-1 text-muted">{{ date(h.harvestedAt) }}</span>
                <span class="font-semibold text-positive whitespace-nowrap">+{{ number(h.quantity, { maximumFractionDigits: 1 }) }} {{ t('enums.unit.' + h.unit) }}</span>
                <UBadge variant="subtle" :color="h.quality === 'A' ? 'success' : h.quality === 'B' ? 'warning' : 'neutral'">{{ h.quality }}</UBadge>
              </div>
            </div>
          </div>

          <!-- activity / care log -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="text-xs text-muted uppercase tracking-wider">{{ t('plantings.activityLog') }}</div>
              <button class="text-[11px] text-accent font-semibold hover:underline flex items-center gap-1" @click="openActivity()"><UIcon name="i-lucide-plus" class="text-[10px]" />{{ t('plantings.logActivity') }}</button>
            </div>
            <ActivityLog :planting-id="detailPlanting.id" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between items-center gap-2 w-full">
          <button v-if="detailPlanting && detailPlanting.stage !== 'harvested' && detailPlanting.stage !== 'ready'" class="btn-ghost px-4 py-2 rounded-lg text-sm flex items-center gap-1.5" @click="advance(detailPlanting.id, detailPlanting.stage)"><UIcon name="i-lucide-chevron-right" class="text-xs" />{{ t('plantings.advance') }}</button>
          <NuxtLink v-else-if="detailPlanting && detailPlanting.stage === 'ready'" :to="`/harvest?planting=${detailPlanting.id}`" class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"><UIcon name="i-lucide-shopping-basket" class="text-xs" />{{ t('plantings.harvest') }}</NuxtLink>
          <div v-else />
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="detailOpen = false">{{ t('common.close') }}</button>
        </div>
      </template>
    </UModal>

    <!-- activity (care) log modal -->
    <UModal v-model:open="actOpen" :title="t('plantings.logActivity')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('plantings.title')">
            <USelectMenu v-model="actForm.plantingId" :items="activePlantingItems" value-key="value" :search-input="activePlantingItems.length > 8" :placeholder="t('plantings.title')" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('common.type')"><USelect v-model="actForm.type" :items="actTypeItems" class="w-full" /></UFormField>
            <UFormField :label="t('common.date')"><UInput v-model="actForm.date" type="date" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('common.notes')"><UTextarea v-model="actForm.note" :rows="2" class="w-full" /></UFormField>
          <div v-if="usesInput" class="grid grid-cols-2 gap-4">
            <UFormField :label="t('plantings.inputUsed')"><USelectMenu v-model="actForm.inputId" :items="inputItems" value-key="value" :search-input="inputItems.length > 8" :placeholder="t('plantings.inputUsed')" class="w-full" /></UFormField>
            <UFormField :label="t('plantings.qtyUsed')"><UInputNumber v-model="actForm.inputQty" :step="0.1" class="w-full" /></UFormField>
          </div>
          <p v-if="usesInput && actForm.inputId" class="text-[11px] text-muted flex items-center gap-1"><UIcon name="i-lucide-info" class="text-[10px]" />{{ t('plantings.activityHint') }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="actOpen = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!actForm.plantingId" @click="saveActivity">{{ t('common.save') }}</button>
        </div>
      </template>
    </UModal>
  </div>
</template>
