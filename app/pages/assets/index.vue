<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useListControls, type SortOption } from '~/composables/useListControls'
import type { FarmAsset, AssetCategory, AssetStatus, AssetCondition, MaintenanceType } from '~/types/garden'

const store = useGardenStore()
const { assets, maintenanceHistory, assetById, assetValue, maintenanceDue } = store
const { settings } = useSettings()
const { currency, date: fmtDate, relTime } = useFormat()
const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('assets.title')} · GardenOS` })

// ---- presentation maps ----
const categoryIcon: Record<AssetCategory, string> = {
  equipment: 'i-lucide-tractor', vehicle: 'i-lucide-truck', building: 'i-lucide-warehouse',
  tool: 'i-lucide-wrench', irrigation: 'i-lucide-droplets', other: 'i-lucide-package'
}
const statusColor: Record<AssetStatus, string> = { active: 'success', maintenance: 'warning', retired: 'neutral', lost: 'negative' }
const conditionColor: Record<AssetCondition, string> = { new: 'info', good: 'success', fair: 'warning', poor: 'negative' }
const maintIcon: Record<MaintenanceType, string> = { routine: 'i-lucide-wrench', repair: 'i-lucide-hammer', inspection: 'i-lucide-clipboard-check', upgrade: 'i-lucide-arrow-up-circle' }

function valueOf(a: FarmAsset) { return a.currentValue ?? a.purchaseCost ?? 0 }
function aCurrency(a: FarmAsset) { return a.currency || settings.value.locale.currency }

// ---- aggregates ----
const inService = computed(() => assets.value.filter((a) => a.status === 'active' || a.status === 'maintenance').length)
/** assets whose warranty ends within 30 days (and hasn't already expired) */
const warrantySoon = computed(() => {
  const now = Date.now()
  return assets.value.filter((a) => {
    if (!a.warrantyUntil) return false
    const ms = new Date(a.warrantyUntil).getTime() - now
    return ms <= 30 * 86_400_000 && ms >= 0
  })
})

// ---- reusable list controls (search + multi-field sort + grid/table) ----
const sortOptions = computed<SortOption<FarmAsset>[]>(() => [
  { key: 'name', label: t('common.name'), value: (a) => a.name },
  { key: 'category', label: t('inventory.category'), value: (a) => a.category },
  { key: 'status', label: t('livestock.status'), value: (a) => a.status },
  { key: 'condition', label: t('assets.condition'), value: (a) => a.condition },
  { key: 'value', label: t('assets.currentValue'), value: (a) => valueOf(a) },
  { key: 'purchased', label: t('assets.purchaseDate'), value: (a) => a.purchaseDate ?? '' }
])
const { search, sortKey, sortDir, viewMode, sortItems, list, applySort } = useListControls<FarmAsset>({
  items: assets,
  search: (a, q) => a.name.toLowerCase().includes(q)
    || (a.assetTag || '').toLowerCase().includes(q)
    || (a.serialNumber || '').toLowerCase().includes(q)
    || (a.location || '').toLowerCase().includes(q),
  sortOptions,
  defaultSortKey: 'name',
  defaultViewMode: 'grid',
  storageKey: 'assets'
})

// ---- tabs: register / maintenance history ----
const tab = ref<'register' | 'maintenance'>('register')

// ---- asset create / edit ----
const open = ref(false)
const editingId = ref<string | null>(null)
const emptyForm = () => ({
  name: '', category: 'equipment' as AssetCategory, assetTag: '', serialNumber: '',
  status: 'active' as AssetStatus, condition: 'good' as AssetCondition,
  location: '', assignedTo: '', purchaseDate: '', purchaseCost: 0, currentValue: 0,
  currency: settings.value.locale.currency, warrantyUntil: '', notes: ''
})
const form = reactive(emptyForm())
const formCurrency = computed(() => editingId.value ? form.currency : settings.value.locale.currency)
const categoryOpts = computed(() => (['equipment', 'vehicle', 'building', 'tool', 'irrigation', 'other'] as AssetCategory[]).map((c) => ({ label: t('enums.assetCat.' + c), value: c })))
const statusOpts = computed(() => (['active', 'maintenance', 'retired', 'lost'] as AssetStatus[]).map((s) => ({ label: t('enums.assetStatus.' + s), value: s })))
const conditionOpts = computed(() => (['new', 'good', 'fair', 'poor'] as AssetCondition[]).map((c) => ({ label: t('enums.assetCondition.' + c), value: c })))

function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); open.value = true }
function openEdit(a: FarmAsset) {
  editingId.value = a.id
  Object.assign(form, {
    name: a.name, category: a.category, assetTag: a.assetTag || '', serialNumber: a.serialNumber || '',
    status: a.status, condition: a.condition, location: a.location || '', assignedTo: a.assignedTo || '',
    purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '',
    purchaseCost: a.purchaseCost ?? 0, currentValue: a.currentValue ?? 0,
    currency: a.currency || settings.value.locale.currency,
    warrantyUntil: a.warrantyUntil ? a.warrantyUntil.slice(0, 10) : '', notes: a.notes || ''
  })
  open.value = true
}
function save() {
  if (!form.name.trim()) return
  const payload = {
    name: form.name, category: form.category,
    assetTag: form.assetTag || undefined, serialNumber: form.serialNumber || undefined,
    status: form.status, condition: form.condition,
    location: form.location || undefined, assignedTo: form.assignedTo || undefined,
    purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined,
    purchaseCost: form.purchaseCost || undefined,
    currentValue: form.currentValue || undefined,
    currency: formCurrency.value,
    warrantyUntil: form.warrantyUntil ? new Date(form.warrantyUntil).toISOString() : undefined,
    notes: form.notes || undefined
  }
  if (editingId.value) { store.updateAsset(editingId.value, payload); toast.add({ title: t('crud.saved'), icon: 'i-lucide-check', color: 'success' }) }
  else { store.addAsset(payload); toast.add({ title: t('crud.created'), icon: 'i-lucide-plus', color: 'success' }) }
  open.value = false
}

// ---- delete ----
const delOpen = ref(false); const delTarget = ref<string | null>(null)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function doDelete() { if (delTarget.value) { store.removeAsset(delTarget.value); toast.add({ title: t('crud.deleted'), icon: 'i-lucide-trash-2', color: 'warning' }) } }

// ---- log maintenance (history record) ----
const maintOpen = ref(false)
const maintForm = reactive({ assetId: '', type: 'routine' as MaintenanceType, description: '', date: new Date().toISOString().slice(0, 10), cost: 0, performedBy: '' })
const maintTypeOpts = computed(() => (['routine', 'repair', 'inspection', 'upgrade'] as MaintenanceType[]).map((x) => ({ label: t('enums.maintenanceType.' + x), value: x })))
function openMaintenance(a?: FarmAsset) {
  Object.assign(maintForm, { assetId: a?.id || assets.value[0]?.id || '', type: 'routine', description: '', date: new Date().toISOString().slice(0, 10), cost: 0, performedBy: '' })
  maintOpen.value = true
}
function saveMaintenance() {
  if (!maintForm.assetId || !maintForm.description.trim()) return
  store.addMaintenanceLog({ assetId: maintForm.assetId, type: maintForm.type, description: maintForm.description, date: new Date(maintForm.date).toISOString(), cost: maintForm.cost || undefined, performedBy: maintForm.performedBy || undefined })
  maintOpen.value = false; toast.add({ title: t('crud.created'), icon: 'i-lucide-wrench', color: 'success' })
}
const delMaint = ref<string | null>(null); const delMaintOpen = ref(false)

// ---- create maintenance task (future to-do) ----
const taskOpen = ref(false); const taskAsset = ref<FarmAsset | null>(null)
const taskForm = reactive({ priority: 'medium' as 'low' | 'medium' | 'high', dueAt: '' })
const prioItems = computed(() => [{ label: t('enums.priority.low'), value: 'low' }, { label: t('enums.priority.medium'), value: 'medium' }, { label: t('enums.priority.high'), value: 'high' }])
function openTask(a: FarmAsset) {
  taskAsset.value = a
  Object.assign(taskForm, { priority: 'medium', dueAt: '' })
  taskOpen.value = true
}
function createTask() {
  if (!taskAsset.value) return
  store.addTask({
    title: t('assets.maintenanceTitle', { name: taskAsset.value.name }),
    description: taskAsset.value.assetTag ? `${t('assets.assetTag')}: ${taskAsset.value.assetTag}` : undefined,
    status: 'todo',
    priority: taskForm.priority,
    category: 'maintenance',
    dueAt: taskForm.dueAt ? new Date(taskForm.dueAt).toISOString() : undefined
  })
  taskOpen.value = false
  toast.add({ title: t('assets.maintenanceCreated'), icon: 'i-lucide-wrench', color: 'success' })
}

function rowActions(a: FarmAsset) {
  return [[
    { label: t('assets.logMaintenance'), icon: 'i-lucide-wrench', onSelect: () => openMaintenance(a) },
    { label: t('assets.createTask'), icon: 'i-lucide-list-checks', onSelect: () => openTask(a) },
    { label: t('crud.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(a) },
    { label: t('crud.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(a.id) }
  ]]
}
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.operations')" :title="t('assets.title')" :subtitle="t('assets.subtitle')">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="openCreate"><UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('assets.add') }}</span></button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <GlassCard class="p-4" :delay="0.05"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('assets.registerValue') }}</div><AnimatedMetric :value="assetValue" currency class="text-accent" /></GlassCard>
      <GlassCard class="p-4" :delay="0.1"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('assets.inService') }}</div><AnimatedMetric :value="inService" :suffix="` / ${assets.length}`" /></GlassCard>
      <GlassCard class="p-4" :delay="0.15"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('assets.maintenance') }}</div><AnimatedMetric :value="maintenanceDue.length" :class="maintenanceDue.length ? 'text-warning' : ''" /></GlassCard>
      <GlassCard class="p-4" :delay="0.2"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('assets.warrantySoon') }}</div><AnimatedMetric :value="warrantySoon.length" :class="warrantySoon.length ? 'text-warning' : ''" /></GlassCard>
    </div>

    <!-- tabs -->
    <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app w-fit mb-5">
      <button class="px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-2" :class="tab === 'register' ? 'bg-surface-2 text-fg' : 'text-muted'" @click="tab = 'register'">{{ t('assets.title') }}<span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-2">{{ assets.length }}</span></button>
      <button class="px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-2" :class="tab === 'maintenance' ? 'bg-surface-2 text-fg' : 'text-muted'" @click="tab = 'maintenance'">{{ t('assets.recentMaintenance') }}<span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-2">{{ maintenanceHistory.length }}</span></button>
    </div>

    <!-- REGISTER -->
    <template v-if="tab === 'register'">
      <ListToolbar
        v-model:search="search"
        v-model:sort-key="sortKey"
        v-model:sort-dir="sortDir"
        v-model:view-mode="viewMode"
        :sort-items="sortItems"
        :search-placeholder="t('assets.search')"
        class="mb-4"
      />

      <!-- GRID -->
      <div v-if="list.length && viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard v-for="a in list" :key="a.id" hover class="p-5" :class="a.status === 'maintenance' ? 'border-[var(--warning)]/40' : ''">
          <div class="flex items-start justify-between mb-3">
            <div class="icon-box w-11 h-11 rounded-xl flex items-center justify-center"><UIcon :name="categoryIcon[a.category]" class="text-accent text-lg" /></div>
            <div class="flex items-center gap-2">
              <UBadge variant="subtle" :color="statusColor[a.status]">{{ t('enums.assetStatus.' + a.status) }}</UBadge>
              <UDropdownMenu :items="rowActions(a)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
            </div>
          </div>
          <h3 class="font-semibold text-lg">{{ a.name }}</h3>
          <div class="text-xs text-muted mb-3">{{ t('enums.assetCat.' + a.category) }}<span v-if="a.assetTag"> · {{ a.assetTag }}</span></div>

          <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted mb-3">
            <span v-if="a.location" class="flex items-center gap-1"><UIcon name="i-lucide-map-pin" class="text-[10px]" />{{ a.location }}</span>
            <span v-if="a.assignedTo" class="flex items-center gap-1"><UIcon name="i-lucide-user" class="text-[10px]" />{{ a.assignedTo }}</span>
            <span class="flex items-center gap-1"><UIcon name="i-lucide-gauge" class="text-[10px]" />{{ t('enums.assetCondition.' + a.condition) }}</span>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-app">
            <div>
              <div class="display-font text-xl font-bold">{{ currency(valueOf(a), aCurrency(a)) }}</div>
              <div v-if="a.purchaseCost && a.currentValue != null && a.currentValue < a.purchaseCost" class="text-[10px] text-muted">{{ t('assets.depreciated') }}</div>
            </div>
            <UBadge v-if="a.warrantyUntil" variant="subtle" :color="warrantySoon.some((w) => w.id === a.id) ? 'warning' : 'neutral'"><UIcon name="i-lucide-shield-check" class="mr-1" />{{ fmtDate(a.warrantyUntil) }}</UBadge>
          </div>
        </GlassCard>
      </div>

      <!-- TABLE -->
      <GlassCard v-else-if="list.length" class="overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-muted uppercase tracking-wider border-b border-app">
                <SortableTh :active="sortKey === 'name'" :direction="sortDir" @click="applySort('name')">{{ t('common.name') }}</SortableTh>
                <SortableTh :active="sortKey === 'category'" :direction="sortDir" @click="applySort('category')">{{ t('inventory.category') }}</SortableTh>
                <SortableTh :active="sortKey === 'status'" :direction="sortDir" @click="applySort('status')">{{ t('livestock.status') }}</SortableTh>
                <SortableTh :active="sortKey === 'condition'" :direction="sortDir" @click="applySort('condition')">{{ t('assets.condition') }}</SortableTh>
                <SortableTh :active="sortKey === 'purchased'" :direction="sortDir" @click="applySort('purchased')">{{ t('assets.purchaseDate') }}</SortableTh>
                <SortableTh :active="sortKey === 'value'" :direction="sortDir" align="right" @click="applySort('value')">{{ t('assets.currentValue') }}</SortableTh>
                <th class="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in list" :key="a.id" class="border-b border-app last:border-0 transaction-row">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><UIcon :name="categoryIcon[a.category]" class="text-accent" /></div>
                    <div>
                      <div class="font-semibold">{{ a.name }}</div>
                      <div v-if="a.assetTag || a.serialNumber" class="text-xs text-muted">{{ a.assetTag || '' }}<span v-if="a.assetTag && a.serialNumber"> · </span>{{ a.serialNumber || '' }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 text-muted">{{ t('enums.assetCat.' + a.category) }}</td>
                <td class="px-5 py-4"><UBadge variant="subtle" :color="statusColor[a.status]">{{ t('enums.assetStatus.' + a.status) }}</UBadge></td>
                <td class="px-5 py-4"><UBadge variant="subtle" :color="conditionColor[a.condition]">{{ t('enums.assetCondition.' + a.condition) }}</UBadge></td>
                <td class="px-5 py-4 text-muted">{{ a.purchaseDate ? fmtDate(a.purchaseDate) : '—' }}</td>
                <td class="px-5 py-4 text-right font-semibold">{{ currency(valueOf(a), aCurrency(a)) }}</td>
                <td class="px-5 py-4 text-right">
                  <UDropdownMenu :items="rowActions(a)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard v-else><EmptyState icon="i-lucide-tractor" :title="search ? t('crud.noResults') : t('assets.emptyTitle')" :description="search ? '' : t('assets.emptyDesc')"><template #action><button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="openCreate">{{ t('assets.add') }}</button></template></EmptyState></GlassCard>
    </template>

    <!-- MAINTENANCE HISTORY -->
    <template v-else>
      <div class="flex justify-end mb-3"><button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" :disabled="!assets.length" @click="openMaintenance()"><UIcon name="i-lucide-plus" class="text-[10px]" />{{ t('assets.logMaintenance') }}</button></div>
      <GlassCard class="overflow-hidden">
        <div v-if="maintenanceHistory.length" class="divide-y divide-[var(--border)]">
          <div v-for="m in maintenanceHistory" :key="m.id" class="flex items-center gap-3 p-4 transaction-row">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-surface-2"><UIcon :name="maintIcon[m.type]" class="text-accent text-sm" /></div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate">{{ assetById[m.assetId]?.name ?? '—' }} · {{ t('enums.maintenanceType.' + m.type) }}</div>
              <div class="text-xs text-muted truncate">{{ m.description }} · {{ relTime(m.date) }}<span v-if="m.performedBy"> · {{ m.performedBy }}</span></div>
            </div>
            <span v-if="m.cost" class="text-sm font-semibold text-negative whitespace-nowrap">{{ currency(m.cost) }}</span>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-muted-2 hover:text-negative transition" @click="delMaint = m.id; delMaintOpen = true"><UIcon name="i-lucide-trash-2" class="text-xs" /></button>
          </div>
        </div>
        <EmptyState v-else icon="i-lucide-wrench" :title="t('assets.noMaintenance')" />
      </GlassCard>
    </template>

    <!-- asset modal -->
    <UModal v-model:open="open" :title="editingId ? t('assets.editTitle') : t('assets.addTitle')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('assets.name')"><UInput v-model="form.name" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('inventory.category')"><USelect v-model="form.category" :items="categoryOpts" class="w-full" /></UFormField>
            <UFormField :label="t('livestock.status')"><USelect v-model="form.status" :items="statusOpts" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('assets.assetTag')"><UInput v-model="form.assetTag" class="w-full" /></UFormField>
            <UFormField :label="t('assets.serialNumber')"><UInput v-model="form.serialNumber" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('assets.location')"><UInput v-model="form.location" class="w-full" /></UFormField>
            <UFormField :label="t('assets.assignedTo')"><UInput v-model="form.assignedTo" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('assets.purchaseDate')"><UInput v-model="form.purchaseDate" type="date" class="w-full" /></UFormField>
            <UFormField :label="t('assets.warrantyUntil')"><UInput v-model="form.warrantyUntil" type="date" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <UFormField :label="t('assets.purchaseCost')"><UInputNumber v-model="form.purchaseCost" :step="0.01" class="w-full" /></UFormField>
            <UFormField :label="t('assets.currentValue')" :description="t('assets.currentValueHint')"><UInputNumber v-model="form.currentValue" :step="0.01" class="w-full" /></UFormField>
            <UFormField :label="t('sec.currency')"><UInput v-model="form.currency" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('assets.condition')"><USelect v-model="form.condition" :items="conditionOpts" class="w-full" /></UFormField>
          <UFormField :label="t('common.notes')"><UTextarea v-model="form.notes" :rows="2" class="w-full" /></UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="open = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="save">{{ t('common.save') }}</button>
        </div>
      </template>
    </UModal>

    <!-- maintenance log modal -->
    <UModal v-model:open="maintOpen" :title="t('assets.logMaintenance')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('assets.title')"><USelect v-model="maintForm.assetId" :items="assets.map((a) => ({ label: a.name, value: a.id }))" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('assets.maintenanceType')"><USelect v-model="maintForm.type" :items="maintTypeOpts" class="w-full" /></UFormField>
            <UFormField :label="t('common.date')"><UInput v-model="maintForm.date" type="date" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('assets.description')"><UTextarea v-model="maintForm.description" :rows="2" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('assets.cost')"><UInputNumber v-model="maintForm.cost" :step="0.5" class="w-full" /></UFormField>
            <UFormField :label="t('assets.performedBy')"><UInput v-model="maintForm.performedBy" class="w-full" /></UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="maintOpen = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="saveMaintenance">{{ t('common.save') }}</button>
        </div>
      </template>
    </UModal>

    <!-- create maintenance task modal -->
    <UModal v-model:open="taskOpen" :title="t('assets.createTask')">
      <template #body>
        <div v-if="taskAsset" class="space-y-4">
          <p class="text-sm text-muted">{{ t('assets.maintenanceTitle', { name: taskAsset.name }) }}</p>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('assets.taskPriority')"><USelect v-model="taskForm.priority" :items="prioItems" class="w-full" /></UFormField>
            <UFormField :label="t('assets.taskDue')"><UInput v-model="taskForm.dueAt" type="date" class="w-full" /></UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="taskOpen = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="createTask">{{ t('common.save') }}</button>
        </div>
      </template>
    </UModal>

    <ConfirmModal v-model:open="delOpen" @confirm="doDelete" />
    <ConfirmModal v-model:open="delMaintOpen" @confirm="() => { if (delMaint) store.removeMaintenanceLog(delMaint) }" />
  </div>
</template>
