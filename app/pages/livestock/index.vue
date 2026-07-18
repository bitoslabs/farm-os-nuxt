<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useListControls, type SortOption } from '~/composables/useListControls'
import type { LivestockProfile, LivestockSpecies, HealthType, ProductType, LivestockStatus } from '~/types/garden'

const store = useGardenStore()
const { livestock, livestockHealth, livestockProduction } = store
const { number, currency, relTime, date: fmtDate } = useFormat()
const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('livestock.title')} · GardenOS` })

const speciesIcon: Record<LivestockSpecies, string> = { chicken: 'i-lucide-egg', duck: 'i-lucide-egg', cow: 'i-lucide-paw-print', pig: 'i-lucide-paw-print', goat: 'i-lucide-paw-print', sheep: 'i-lucide-paw-print', fish: 'i-lucide-fish', other: 'i-lucide-paw-print' }
const statusColor: Record<LivestockStatus, string> = { active: 'success', sold: 'neutral', deceased: 'negative' }
const sevColor: Record<string, string> = { low: 'neutral', medium: 'warning', high: 'negative' }
const healthIcon: Record<HealthType, string> = { vaccination: 'i-lucide-syringe', treatment: 'i-lucide-pill', checkup: 'i-lucide-stethoscope', illness: 'i-lucide-thermometer' }

const totalAnimals = computed(() => livestock.value.reduce((s, l) => s + (l.count || 1), 0))
const activeCount = computed(() => livestock.value.filter((l) => l.status === 'active').reduce((s, l) => s + (l.count || 1), 0))
const speciesCount = computed(() => new Set(livestock.value.map((l) => l.species)).size)
const prodThisMonth = computed(() => {
  const now = new Date()
  return livestockProduction.value.filter((p) => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).reduce((s, p) => s + p.quantity, 0)
})

// ---- tabs ----
const tab = ref<'animals' | 'health' | 'production'>('animals')
const tabs = computed(() => [
  { k: 'animals', l: t('livestock.title'), n: livestock.value.length },
  { k: 'health', l: t('livestock.recentHealth'), n: livestockHealth.value.length },
  { k: 'production', l: t('livestock.recentProduction'), n: livestockProduction.value.length }
] as const)

// ---- animal list: species filter + shared list controls (search / sort / view) ----
const ALL_SPECIES = '__all__'
const speciesFilter = ref(ALL_SPECIES)
const speciesItems = computed(() => [{ label: t('livestock.species') + ': ' + t('common.all'), value: ALL_SPECIES }, ...(['chicken','duck','cow','pig','goat','sheep','fish','other'] as LivestockSpecies[]).map((s) => ({ label: t('enums.species.' + s), value: s }))])
const speciesFiltered = computed(() => livestock.value.filter((l) => speciesFilter.value === ALL_SPECIES || l.species === speciesFilter.value))
const sortOptions = computed<SortOption<LivestockProfile>[]>(() => [
  { key: 'name', label: t('common.name'), value: (l) => l.name },
  { key: 'species', label: t('livestock.species'), value: (l) => l.species },
  { key: 'status', label: t('livestock.status'), value: (l) => l.status },
  { key: 'count', label: t('livestock.count'), value: (l) => l.count },
  { key: 'birth', label: t('livestock.birthDate'), value: (l) => l.birthDate ?? '' }
])
const { search, sortKey, sortDir, viewMode, sortItems, list, applySort } = useListControls<LivestockProfile>({
  items: speciesFiltered,
  search: (l, q) => l.name.toLowerCase().includes(q) || (l.breed || '').toLowerCase().includes(q) || (l.tagId || '').toLowerCase().includes(q),
  sortOptions,
  defaultSortKey: 'name',
  defaultViewMode: 'grid',
  storageKey: 'livestock'
})

// ---- add / edit animal ----
const open = ref(false); const editingId = ref<string | null>(null)
const emptyForm = () => ({ name: '', species: 'chicken' as LivestockSpecies, breed: '', tagId: '', sex: 'female' as 'male' | 'female' | 'mixed', count: 1, birthDate: '', status: 'active' as LivestockStatus, notes: '' })
const form = reactive(emptyForm())
const speciesOpts = computed(() => (['chicken','duck','cow','pig','goat','sheep','fish','other'] as LivestockSpecies[]).map((s) => ({ label: t('enums.species.' + s), value: s })))
const statusOpts = computed(() => (['active','sold','deceased'] as LivestockStatus[]).map((s) => ({ label: t('enums.livestockStatus.' + s), value: s })))
const sexOpts = computed(() => (['male','female','mixed'] as const).map((s) => ({ label: t('enums.sex.' + s), value: s })))
function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); open.value = true }
function openEdit(a: LivestockProfile) { editingId.value = a.id; Object.assign(form, { name: a.name, species: a.species, breed: a.breed || '', tagId: a.tagId || '', sex: a.sex || 'mixed', count: a.count, birthDate: a.birthDate ? a.birthDate.slice(0, 10) : '', status: a.status, notes: a.notes || '' }); open.value = true }
function save() {
  if (!form.name.trim()) return
  const payload = { ...form, birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined }
  if (editingId.value) { store.updateLivestock(editingId.value, payload); toast.add({ title: t('crud.saved'), icon: 'i-lucide-check', color: 'success' }) }
  else { store.addLivestock(payload); toast.add({ title: t('crud.created'), icon: 'i-lucide-plus', color: 'success' }) }
  open.value = false
}

// ---- health log ----
const healthOpen = ref(false)
const healthForm = reactive({ animalId: '', type: 'checkup' as HealthType, severity: 'low' as 'low' | 'medium' | 'high', description: '', cost: 0, vetName: '', date: new Date().toISOString().slice(0, 10) })
const animalItems = computed(() => livestock.value.map((a) => ({ label: `${a.name} (${t('enums.species.' + a.species)})`, value: a.id })))
const healthTypeOpts = computed(() => (['vaccination','treatment','checkup','illness'] as HealthType[]).map((x) => ({ label: t('enums.healthType.' + x), value: x })))
function openHealth(a?: LivestockProfile) { Object.assign(healthForm, { animalId: a?.id || '', type: 'checkup', severity: 'low', description: '', cost: 0, vetName: '', date: new Date().toISOString().slice(0, 10) }); healthOpen.value = true }
function saveHealth() {
  if (!healthForm.animalId || !healthForm.description.trim()) return
  store.addHealthLog({ ...healthForm, cost: healthForm.cost || undefined, date: new Date(healthForm.date).toISOString() })
  healthOpen.value = false; toast.add({ title: t('crud.created'), icon: 'i-lucide-stethoscope', color: 'success' })
}
const delHealth = ref<string | null>(null); const delHealthOpen = ref(false)

// ---- production log ----
const prodOpen = ref(false)
const prodForm = reactive({ animalId: '', product: 'eggs' as ProductType, quantity: 1, unit: 'piece' as const, date: new Date().toISOString().slice(0, 10), notes: '' })
const productOpts = computed(() => (['eggs','milk','wool','meat','offspring','other'] as ProductType[]).map((p) => ({ label: t('enums.product.' + p), value: p })))
const unitOpts = computed(() => ['piece','kg','g','liter','bunch'].map((u) => ({ label: t('enums.unit.' + u), value: u })))
function openProduction(a?: LivestockProfile) { Object.assign(prodForm, { animalId: a?.id || '', product: 'eggs', quantity: 1, unit: 'piece', date: new Date().toISOString().slice(0, 10), notes: '' }); prodOpen.value = true }
function saveProduction() {
  if (!prodForm.animalId) return
  store.addProductionLog({ ...prodForm, date: new Date(prodForm.date).toISOString() })
  prodOpen.value = false; toast.add({ title: t('crud.created'), icon: 'i-lucide-egg', color: 'success' })
}
const delProd = ref<string | null>(null); const delProdOpen = ref(false)

// ---- delete animal ----
const delOpen = ref(false); const delTarget = ref<string | null>(null)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function doDelete() { if (delTarget.value) { store.removeLivestock(delTarget.value); toast.add({ title: t('crud.deleted'), icon: 'i-lucide-trash-2', color: 'warning' }) } }

function animalName(id: string) { return livestock.value.find((a) => a.id === id)?.name || '—' }
function rowActions(a: LivestockProfile) {
  return [[
    { label: t('livestock.healthLog'), icon: 'i-lucide-stethoscope', onSelect: () => openHealth(a) },
    { label: t('livestock.productionLog'), icon: 'i-lucide-egg', onSelect: () => openProduction(a) },
    { label: t('crud.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(a) },
    { label: t('crud.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(a.id) }
  ]]
}
const healthList = computed(() => [...livestockHealth.value].sort((a, b) => b.date.localeCompare(a.date)))
const prodList = computed(() => [...livestockProduction.value].sort((a, b) => b.date.localeCompare(a.date)))
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.operations')" :title="t('livestock.title')" :subtitle="t('livestock.subtitle')">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="openCreate"><UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('livestock.add') }}</span></button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <GlassCard class="p-4" :delay="0.05"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('livestock.totalAnimals') }}</div><AnimatedMetric :value="totalAnimals" :suffix="` ${t('livestock.head')}`" /></GlassCard>
      <GlassCard class="p-4" :delay="0.1"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('livestock.activeAnimals') }}</div><AnimatedMetric :value="activeCount" class="text-positive" /></GlassCard>
      <GlassCard class="p-4" :delay="0.15"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('livestock.species') }}</div><AnimatedMetric :value="speciesCount" /></GlassCard>
      <GlassCard class="p-4" :delay="0.2"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('livestock.recentProduction') }}</div><AnimatedMetric :value="prodThisMonth" :decimals="1" class="text-accent" /></GlassCard>
    </div>

    <!-- tabs -->
    <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app w-fit mb-5">
      <button v-for="tb in tabs" :key="tb.k" class="px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-2" :class="tab === tb.k ? 'bg-surface-2 text-fg' : 'text-muted'" @click="tab = tb.k">{{ tb.l }}<span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-2">{{ tb.n }}</span></button>
    </div>

    <!-- ANIMALS -->
    <template v-if="tab === 'animals'">
      <ListToolbar
        v-model:search="search"
        v-model:sort-key="sortKey"
        v-model:sort-dir="sortDir"
        v-model:view-mode="viewMode"
        :sort-items="sortItems"
        :search-placeholder="t('common.search')"
        class="mb-4"
      >
        <USelect v-model="speciesFilter" :items="speciesItems" class="w-44" />
      </ListToolbar>
      <div v-if="list.length && viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard v-for="a in list" :key="a.id" hover class="p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center"><UIcon :name="speciesIcon[a.species]" class="text-accent text-lg" /></div>
            <div class="flex items-center gap-2">
              <UBadge variant="subtle" :color="statusColor[a.status]">{{ t('enums.livestockStatus.' + a.status) }}</UBadge>
              <UDropdownMenu :items="rowActions(a)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
            </div>
          </div>
          <h3 class="font-semibold text-lg">{{ a.name }}</h3>
          <div class="text-xs text-muted mb-3">{{ t('enums.species.' + a.species) }}<span v-if="a.breed"> · {{ a.breed }}</span> · {{ number(a.count) }} {{ t('livestock.head') }}</div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span v-if="a.tagId" class="flex items-center gap-1"><UIcon name="i-lucide-tag" class="text-[10px]" />{{ a.tagId }}</span>
            <span v-if="a.sex" class="flex items-center gap-1"><UIcon name="i-lucide-venus-mars" class="text-[10px]" />{{ t('enums.sex.' + a.sex) }}</span>
            <span v-if="a.birthDate" class="flex items-center gap-1"><UIcon name="i-lucide-cake" class="text-[10px]" />{{ fmtDate(a.birthDate) }}</span>
          </div>
        </GlassCard>
      </div>

      <!-- TABLE VIEW -->
      <GlassCard v-else-if="list.length" class="overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-muted uppercase tracking-wider border-b border-app">
                <SortableTh :active="sortKey === 'name'" :direction="sortDir" @click="applySort('name')">{{ t('common.name') }}</SortableTh>
                <SortableTh :active="sortKey === 'species'" :direction="sortDir" @click="applySort('species')">{{ t('livestock.species') }}</SortableTh>
                <SortableTh :active="sortKey === 'status'" :direction="sortDir" @click="applySort('status')">{{ t('livestock.status') }}</SortableTh>
                <SortableTh :active="sortKey === 'count'" :direction="sortDir" align="right" @click="applySort('count')">{{ t('livestock.count') }}</SortableTh>
                <SortableTh :active="sortKey === 'birth'" :direction="sortDir" @click="applySort('birth')">{{ t('livestock.birthDate') }}</SortableTh>
                <th class="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in list" :key="a.id" class="border-b border-app last:border-0 transaction-row">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><UIcon :name="speciesIcon[a.species]" class="text-accent" /></div>
                    <div><div class="font-semibold">{{ a.name }}</div><div v-if="a.breed" class="text-xs text-muted">{{ a.breed }}</div></div>
                  </div>
                </td>
                <td class="px-5 py-4 text-muted">{{ t('enums.species.' + a.species) }}</td>
                <td class="px-5 py-4"><UBadge variant="subtle" :color="statusColor[a.status]">{{ t('enums.livestockStatus.' + a.status) }}</UBadge></td>
                <td class="px-5 py-4 text-right">{{ number(a.count) }}</td>
                <td class="px-5 py-4 text-muted whitespace-nowrap">{{ a.birthDate ? fmtDate(a.birthDate) : '—' }}</td>
                <td class="px-5 py-4 text-right">
                  <UDropdownMenu :items="rowActions(a)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>
      <GlassCard v-else><EmptyState icon="i-lucide-egg" :title="search ? t('crud.noResults') : t('livestock.emptyTitle')" :description="search ? '' : t('livestock.emptyDesc')">
        <template v-if="!search" #action><button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="openCreate">{{ t('livestock.add') }}</button></template>
      </EmptyState></GlassCard>
    </template>

    <!-- HEALTH -->
    <template v-else-if="tab === 'health'">
      <div class="flex justify-end mb-3"><button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" :disabled="!livestock.length" @click="openHealth()"><UIcon name="i-lucide-plus" class="text-[10px]" />{{ t('livestock.healthLog') }}</button></div>
      <GlassCard class="overflow-hidden">
        <div v-if="healthList.length" class="divide-y divide-[var(--border)]">
          <div v-for="h in healthList" :key="h.id" class="flex items-center gap-3 p-4 transaction-row">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" :class="h.severity === 'high' ? 'bg-[rgba(248,113,113,0.12)]' : h.severity === 'medium' ? 'bg-[rgba(251,191,36,0.12)]' : 'bg-surface-2'"><UIcon :name="healthIcon[h.type]" class="text-sm" :class="h.severity === 'high' ? 'text-negative' : h.severity === 'medium' ? 'text-warning' : 'text-accent'" /></div>
            <div class="flex-1 min-w-0"><div class="font-semibold truncate">{{ animalName(h.animalId) }} · {{ t('enums.healthType.' + h.type) }}</div><div class="text-xs text-muted truncate">{{ h.description }} · {{ relTime(h.date) }}<span v-if="h.vetName"> · {{ h.vetName }}</span></div></div>
            <UBadge variant="subtle" :color="sevColor[h.severity]">{{ t('enums.priority.' + h.severity) }}</UBadge>
            <span v-if="h.cost" class="text-sm font-semibold text-negative whitespace-nowrap">{{ currency(h.cost) }}</span>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-muted-2 hover:text-negative transition" @click="delHealth = h.id; delHealthOpen = true"><UIcon name="i-lucide-trash-2" class="text-xs" /></button>
          </div>
        </div>
        <EmptyState v-else icon="i-lucide-stethoscope" :title="t('livestock.noHealth')" />
      </GlassCard>
    </template>

    <!-- PRODUCTION -->
    <template v-else>
      <div class="flex justify-end mb-3"><button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" :disabled="!livestock.length" @click="openProduction()"><UIcon name="i-lucide-plus" class="text-[10px]" />{{ t('livestock.productionLog') }}</button></div>
      <GlassCard class="overflow-hidden">
        <div v-if="prodList.length" class="divide-y divide-[var(--border)]">
          <div v-for="p in prodList" :key="p.id" class="flex items-center gap-3 p-4 transaction-row">
            <div class="w-10 h-10 rounded-full bg-[rgba(74,222,128,0.12)] flex items-center justify-center shrink-0"><UIcon name="i-lucide-egg" class="text-positive text-sm" /></div>
            <div class="flex-1 min-w-0"><div class="font-semibold truncate">{{ animalName(p.animalId) }} · {{ t('enums.product.' + p.product) }}</div><div class="text-xs text-muted truncate">{{ relTime(p.date) }}<span v-if="p.notes"> · {{ p.notes }}</span></div></div>
            <div class="font-semibold text-positive whitespace-nowrap">+{{ number(p.quantity, { maximumFractionDigits: 1 }) }} {{ t('enums.unit.' + p.unit) }}</div>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-muted-2 hover:text-negative transition" @click="delProd = p.id; delProdOpen = true"><UIcon name="i-lucide-trash-2" class="text-xs" /></button>
          </div>
        </div>
        <EmptyState v-else icon="i-lucide-egg" :title="t('livestock.noProduction')" />
      </GlassCard>
    </template>

    <!-- animal modal -->
    <UModal v-model:open="open" :title="editingId ? t('crud.edit') : t('livestock.add')">
      <template #body>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('livestock.name')"><UInput v-model="form.name" class="w-full" /></UFormField>
            <UFormField :label="t('livestock.species')"><USelect v-model="form.species" :items="speciesOpts" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('livestock.breed')"><UInput v-model="form.breed" class="w-full" /></UFormField>
            <UFormField :label="t('livestock.tag')"><UInput v-model="form.tagId" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <UFormField :label="t('livestock.sex')"><USelect v-model="form.sex" :items="sexOpts" class="w-full" /></UFormField>
            <UFormField :label="t('livestock.count')"><UInputNumber v-model="form.count" class="w-full" /></UFormField>
            <UFormField :label="t('livestock.status')"><USelect v-model="form.status" :items="statusOpts" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('livestock.birthDate')"><UInput v-model="form.birthDate" type="date" class="w-full" /></UFormField>
          <UFormField :label="t('livestock.notes')"><UTextarea v-model="form.notes" :rows="2" class="w-full" /></UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="open = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="save">{{ t('common.save') }}</button>
        </div>
      </template>
    </UModal>

    <!-- health modal -->
    <UModal v-model:open="healthOpen" :title="t('livestock.healthTitle')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('livestock.animal')"><USelect v-model="healthForm.animalId" :items="animalItems" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('livestock.type')"><USelect v-model="healthForm.type" :items="healthTypeOpts" class="w-full" /></UFormField>
            <UFormField :label="t('livestock.severity')"><USelect v-model="healthForm.severity" :items="[{label:t('enums.priority.low'),value:'low'},{label:t('enums.priority.medium'),value:'medium'},{label:t('enums.priority.high'),value:'high'}]" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('livestock.description')"><UTextarea v-model="healthForm.description" :rows="2" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('livestock.cost')"><UInputNumber v-model="healthForm.cost" :step="0.5" class="w-full" /></UFormField>
            <UFormField :label="t('livestock.vet')"><UInput v-model="healthForm.vetName" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('common.date')"><UInput v-model="healthForm.date" type="date" class="w-full" /></UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="healthOpen = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="saveHealth">{{ t('common.save') }}</button>
        </div>
      </template>
    </UModal>

    <!-- production modal -->
    <UModal v-model:open="prodOpen" :title="t('livestock.productionTitle')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('livestock.animal')"><USelect v-model="prodForm.animalId" :items="animalItems" class="w-full" /></UFormField>
          <div class="grid grid-cols-3 gap-4">
            <UFormField :label="t('livestock.product')" class="col-span-2"><USelect v-model="prodForm.product" :items="productOpts" class="w-full" /></UFormField>
            <UFormField :label="t('common.unit')"><USelect v-model="prodForm.unit" :items="unitOpts" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('livestock.quantity')"><UInputNumber v-model="prodForm.quantity" :step="0.5" class="w-full" /></UFormField>
            <UFormField :label="t('common.date')"><UInput v-model="prodForm.date" type="date" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('livestock.notes')"><UInput v-model="prodForm.notes" class="w-full" /></UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="prodOpen = false">{{ t('common.cancel') }}</button>
          <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="saveProduction">{{ t('common.save') }}</button>
        </div>
      </template>
    </UModal>

    <ConfirmModal v-model:open="delOpen" @confirm="doDelete" />
    <ConfirmModal v-model:open="delHealthOpen" @confirm="() => { if (delHealth) store.removeHealthLog(delHealth) }" />
    <ConfirmModal v-model:open="delProdOpen" @confirm="() => { if (delProd) store.removeProductionLog(delProd) }" />
  </div>
</template>
