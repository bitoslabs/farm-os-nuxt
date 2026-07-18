<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useListControls, type SortOption } from '~/composables/useListControls'
import type { CropVariety } from '~/types/garden'

const store = useGardenStore()
const { crops } = store
const { number } = useFormat()
const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('crops.title')} · GardenOS` })

const familyColor: Record<string, string> = { Solanaceae: 'text-negative', Poaceae: 'text-positive', Asteraceae: 'text-warning', Lamiaceae: 'text-info', Cucurbitaceae: 'text-accent' }

// ---- reusable list controls ----
const sortOptions = computed<SortOption<CropVariety>[]>(() => [
  { key: 'name', label: t('common.name'), value: (c) => c.name },
  { key: 'family', label: t('crops.family'), value: (c) => c.family },
  { key: 'maturity', label: t('crops.maturity'), value: (c) => c.daysToMaturity },
  { key: 'spacing', label: t('crops.spacing'), value: (c) => c.spacingCm }
])
const { search, sortKey, sortDir, viewMode, sortItems, list, applySort } = useListControls<CropVariety>({
  items: crops,
  search: (c, q) => c.name.toLowerCase().includes(q) || c.species.toLowerCase().includes(q) || c.family.toLowerCase().includes(q),
  sortOptions,
  defaultSortKey: 'name',
  defaultViewMode: 'table',
  storageKey: 'crops'
})

const open = ref(false)
const editingId = ref<string | null>(null)
const emptyForm = () => ({ name: '', species: '', family: '', daysToMaturity: 60, spacingCm: 30, season: ['wet', 'dry'] as ('wet' | 'dry')[] })
const form = reactive(emptyForm())
const seasonOptions = computed(() => [{ label: t('enums.season.wet'), value: 'wet' }, { label: t('enums.season.dry'), value: 'dry' }])
function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); open.value = true }
function openEdit(c: CropVariety) { editingId.value = c.id; Object.assign(form, { name: c.name, species: c.species, family: c.family, daysToMaturity: c.daysToMaturity, spacingCm: c.spacingCm, season: [...c.season] }); open.value = true }
function save() {
  if (!form.name.trim()) return
  if (editingId.value) { store.updateCrop(editingId.value, { ...form }); toast.add({ title: t('crud.saved'), icon: 'i-lucide-check', color: 'success' }) }
  else { store.addCrop({ ...form } as Omit<CropVariety, 'id'>); toast.add({ title: t('crud.created'), icon: 'i-lucide-plus', color: 'success' }) }
  open.value = false
}
const delOpen = ref(false); const delTarget = ref<string | null>(null)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function doDelete() { if (delTarget.value) { store.removeCrop(delTarget.value); toast.add({ title: t('crud.deleted'), icon: 'i-lucide-trash-2', color: 'warning' }) } }
function rowActions(c: CropVariety) { return [[{ label: t('crud.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(c) }, { label: t('crud.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(c.id) }]] }
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.cultivation')" :title="t('crops.title')" :subtitle="t('crops.subtitle')">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="openCreate"><UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('crops.add') }}</span></button>
      </template>
    </PageHeader>

    <ListToolbar
      v-model:search="search"
      v-model:sort-key="sortKey"
      v-model:sort-dir="sortDir"
      v-model:view-mode="viewMode"
      :sort-items="sortItems"
      :search-placeholder="t('crops.search')"
      class="mb-4"
    />

    <!-- GRID VIEW -->
    <div v-if="list.length && viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <GlassCard v-for="crop in list" :key="crop.id" hover class="p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-wheat" class="text-accent" /></div>
          <UDropdownMenu :items="rowActions(crop)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
        </div>
        <h3 class="font-semibold mb-0.5">{{ crop.name }}</h3>
        <div class="text-xs text-muted italic mb-3">{{ crop.species }}</div>
        <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          <span class="flex flex-col"><span class="text-[10px] text-muted uppercase tracking-wider">{{ t('crops.family') }}</span><span :class="familyColor[crop.family] ?? 'text-fg'" class="font-medium">{{ crop.family }}</span></span>
          <span class="flex flex-col"><span class="text-[10px] text-muted uppercase tracking-wider">{{ t('crops.maturity') }}</span><span class="font-medium">{{ number(crop.daysToMaturity) }} {{ t('crops.days') }}</span></span>
          <span class="flex flex-col"><span class="text-[10px] text-muted uppercase tracking-wider">{{ t('crops.spacing') }}</span><span class="font-medium">{{ number(crop.spacingCm) }} cm</span></span>
        </div>
        <div class="flex gap-1 mt-3"><UBadge v-for="s in crop.season" :key="s" variant="subtle" :color="s === 'wet' ? 'info' : 'warning'">{{ t('enums.season.' + s) }}</UBadge></div>
      </GlassCard>
    </div>

    <!-- TABLE VIEW -->
    <GlassCard v-else-if="list.length" class="overflow-hidden mb-6">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-muted uppercase tracking-wider border-b border-app">
              <SortableTh :active="sortKey === 'name'" :direction="sortDir" @click="applySort('name')">{{ t('nav.crops') }}</SortableTh>
              <SortableTh :active="sortKey === 'family'" :direction="sortDir" @click="applySort('family')">{{ t('crops.family') }}</SortableTh>
              <SortableTh :active="sortKey === 'maturity'" :direction="sortDir" align="right" @click="applySort('maturity')">{{ t('crops.maturity') }}</SortableTh>
              <SortableTh :active="sortKey === 'spacing'" :direction="sortDir" align="right" @click="applySort('spacing')">{{ t('crops.spacing') }}</SortableTh>
              <th class="px-5 py-3 font-semibold">{{ t('crops.season') }}</th>
              <th class="px-5 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="crop in list" :key="crop.id" class="border-b border-app last:border-0 transaction-row">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-wheat" class="text-accent" /></div>
                  <div><div class="font-semibold">{{ crop.name }}</div><div class="text-xs text-muted italic">{{ crop.species }}</div></div>
                </div>
              </td>
              <td class="px-5 py-4" :class="familyColor[crop.family] ?? 'text-fg'">{{ crop.family }}</td>
              <td class="px-5 py-4 text-right">{{ number(crop.daysToMaturity) }} <span class="text-muted">{{ t('crops.days') }}</span></td>
              <td class="px-5 py-4 text-right">{{ number(crop.spacingCm) }} <span class="text-muted">cm</span></td>
              <td class="px-5 py-4"><div class="flex gap-1"><UBadge v-for="s in crop.season" :key="s" variant="subtle" :color="s === 'wet' ? 'info' : 'warning'">{{ t('enums.season.' + s) }}</UBadge></div></td>
              <td class="px-5 py-4 text-right">
                <UDropdownMenu :items="rowActions(crop)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <GlassCard v-else><EmptyState icon="i-lucide-wheat" :title="search ? t('crud.noResults') : t('crops.emptyTitle')" :description="search ? '' : t('crops.emptyDesc')" /></GlassCard>

    <UModal v-model:open="open" :title="editingId ? t('crud.edit') : t('crops.addTitle')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('crops.commonName')"><UInput v-model="form.name" class="w-full" /></UFormField>
          <UFormField :label="t('crops.species')"><UInput v-model="form.species" class="w-full" /></UFormField>
          <UFormField :label="t('crops.family')"><UInput v-model="form.family" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('crops.daysToMaturity')"><UInputNumber v-model="form.daysToMaturity" class="w-full" /></UFormField>
            <UFormField :label="t('crops.spacingCm')"><UInputNumber v-model="form.spacingCm" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('crops.seasons')"><USelectMenu v-model="form.season" :items="seasonOptions" multiple class="w-full" /></UFormField>
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
