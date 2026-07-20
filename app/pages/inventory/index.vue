<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useListControls, type SortOption } from '~/composables/useListControls'
import type { InventoryItem } from '~/types/garden'

const store = useGardenStore()
const { settings } = useSettings()
const { inventory, lowStockItems } = store
const { currency, number } = useFormat()
const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('inventory.title')} · GardenOS` })

const totalValue = computed(() => inventory.value.reduce((s, i) => s + i.stock * i.costPerUnit, 0))
const catIcon: Record<string, string> = { seed: 'i-lucide-sprout', fertilizer: 'i-lucide-flask-conical', pesticide: 'i-lucide-spray-can', soil: 'i-lucide-mountain', tool: 'i-lucide-wrench' }
function stockPct(item: { stock: number; reorderLevel: number }) { return Math.min(100, Math.round((item.stock / (item.reorderLevel * 2 || 1)) * 100)) }
function isLow(item: { stock: number; reorderLevel: number }) { return item.stock <= item.reorderLevel }

// ---- reusable list controls: search + multi-field sort + grid/table view ----
const sortOptions = computed<SortOption<InventoryItem>[]>(() => [
  { key: 'name', label: t('common.name'), value: (i) => i.name },
  { key: 'category', label: t('inventory.category'), value: (i) => i.category },
  { key: 'stock', label: t('inventory.inStock'), value: (i) => i.stock },
  { key: 'reorder', label: t('inventory.lowStock'), value: (i) => i.reorderLevel },
  { key: 'cost', label: t('inventory.costPerUnitShort'), value: (i) => i.costPerUnit },
  { key: 'value', label: t('inventory.value'), value: (i) => i.stock * i.costPerUnit }
])
const { search, sortKey, sortDir, viewMode, sortItems, list, applySort } = useListControls<InventoryItem>({
  items: inventory,
  search: (i, q) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q),
  sortOptions,
  defaultSortKey: 'name',
  defaultViewMode: 'grid',
  storageKey: 'inventory'
})

// add / edit
const open = ref(false); const editingId = ref<string | null>(null)
const emptyForm = () => ({ name: '', category: 'seed' as InventoryItem['category'], unit: 'kg' as InventoryItem['unit'], stock: 0, reorderLevel: 10, costPerUnit: 1, currency: settings.value.locale.currency })
const form = reactive(emptyForm())
const formCurrency = computed(() => editingId.value ? form.currency : settings.value.locale.currency)
const catItems = computed(() => (['seed','fertilizer','pesticide','soil','tool'] as const).map((c) => ({ label: t('enums.inputCat.' + c), value: c })))
const unitItems = computed(() => ['kg', 'g', 'piece', 'bunch', 'liter'].map((u) => ({ label: t('enums.unit.' + u), value: u })))
function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); open.value = true }
function openEdit(it: InventoryItem) { editingId.value = it.id; Object.assign(form, { name: it.name, category: it.category, unit: it.unit, stock: it.stock, reorderLevel: it.reorderLevel, costPerUnit: it.costPerUnit, currency: it.currency || settings.value.locale.currency }); open.value = true }
function save() {
  if (!form.name.trim()) return
  if (editingId.value) { store.updateInventory(editingId.value, { ...form }); toast.add({ title: t('crud.saved'), icon: 'i-lucide-check', color: 'success' }) }
  else { store.addInventory({ ...form, currency: formCurrency.value }); toast.add({ title: t('crud.created'), icon: 'i-lucide-plus', color: 'success' }) }
  open.value = false
}

// restock
const restockOpen = ref(false); const restockItem = ref<InventoryItem | null>(null); const addQty = ref(0)
function openRestock(it: InventoryItem) { restockItem.value = it; addQty.value = 0; restockOpen.value = true }
function doRestock() { if (restockItem.value && addQty.value > 0) { store.updateInventory(restockItem.value.id, { stock: restockItem.value.stock + addQty.value }); toast.add({ icon: 'i-lucide-package-plus', color: 'success' }) } restockOpen.value = false }

// delete
const delOpen = ref(false); const delTarget = ref<string | null>(null)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function doDelete() { if (delTarget.value) { store.removeInventory(delTarget.value); toast.add({ title: t('crud.deleted'), icon: 'i-lucide-trash-2', color: 'warning' }) } }

// convert a durable inventory item into an asset register entry
function convertToAsset(it: InventoryItem) {
  store.convertInventoryToAsset(it.id)
  toast.add({ title: t('inventory.converted'), icon: 'i-lucide-tractor', color: 'success' })
  navigateTo('/assets')
}
function rowActions(it: InventoryItem) { return [[{ label: t('inventory.restock'), icon: 'i-lucide-package-plus', onSelect: () => openRestock(it) }, { label: t('inventory.convertToAsset'), icon: 'i-lucide-tractor', onSelect: () => convertToAsset(it) }, { label: t('crud.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(it) }, { label: t('crud.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(it.id) }]] }
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.operations')" :title="t('inventory.title')" :subtitle="t('inventory.subtitle')">
      <template #actions>
        <div class="flex items-center gap-2">
          <span v-if="lowStockItems.length" class="text-xs px-2.5 py-1.5 rounded-md bg-[rgba(248,113,113,0.12)] text-negative font-semibold">{{ t('inventory.lowBadge', { n: lowStockItems.length }) }}</span>
          <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="openCreate"><UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('common.add') }}</span></button>
        </div>
      </template>
    </PageHeader>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <GlassCard class="p-4" :delay="0.05"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('inventory.items') }}</div><AnimatedMetric :value="inventory.length" /></GlassCard>
      <GlassCard class="p-4" :delay="0.1"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('inventory.stockValue') }}</div><AnimatedMetric :value="totalValue" currency /></GlassCard>
      <GlassCard class="p-4" :delay="0.15"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('inventory.lowStock') }}</div><AnimatedMetric :value="lowStockItems.length" class="text-negative" /></GlassCard>
    </div>

    <ListToolbar
      v-if="viewMode === 'grid' || !list.length"
      v-model:search="search"
      v-model:sort-key="sortKey"
      v-model:sort-dir="sortDir"
      v-model:view-mode="viewMode"
      :sort-items="sortItems"
      :search-placeholder="t('inventory.search')"
      class="mb-4"
    />

    <!-- GRID VIEW -->
    <div v-if="list.length && viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <GlassCard v-for="item in list" :key="item.id" hover class="p-5" :class="isLow(item) ? 'border-[var(--negative)]/30' : ''">
        <div class="flex items-start justify-between mb-3">
          <div class="icon-box w-10 h-10 rounded-xl flex items-center justify-center"><UIcon :name="catIcon[item.category] ?? 'i-lucide-box'" class="text-accent" /></div>
          <UDropdownMenu :items="rowActions(item)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
        </div>
        <h3 class="font-semibold mb-1">{{ item.name }}</h3>
        <div class="flex items-baseline gap-2 mb-3"><span class="display-font text-2xl font-bold">{{ number(item.stock) }}</span><span class="text-xs text-muted">{{ t('enums.unit.' + item.unit) }} {{ t('inventory.inStock') }}</span></div>
        <div class="h-1.5 rounded-full bg-surface-2 overflow-hidden mb-3"><div class="h-full rounded-full transition-all duration-700" :style="{ width: `${stockPct(item)}%`, background: isLow(item) ? 'var(--negative)' : 'linear-gradient(90deg, var(--accent-2), var(--accent))' }" /></div>
        <div class="flex items-center justify-between"><span class="text-xs text-muted">{{ currency(item.costPerUnit, item.currency || settings.locale.currency) }}/{{ t('enums.unit.' + item.unit) }}</span><span v-if="isLow(item)" class="text-[11px] text-negative font-semibold">{{ t('inventory.reorder', { n: item.reorderLevel }) }}</span></div>
      </GlassCard>
    </div>

    <!-- TABLE VIEW -->
    <GlassCard v-else-if="list.length" class="list-workspace overflow-hidden">
      <ListToolbar v-model:search="search" v-model:sort-key="sortKey" v-model:sort-dir="sortDir" v-model:view-mode="viewMode" :sort-items="sortItems" :search-placeholder="t('inventory.search')" embedded />
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-muted uppercase tracking-wider border-b border-app">
              <SortableTh :active="sortKey === 'name'" :direction="sortDir" @click="applySort('name')">{{ t('common.name') }}</SortableTh>
              <SortableTh :active="sortKey === 'category'" :direction="sortDir" @click="applySort('category')">{{ t('inventory.category') }}</SortableTh>
              <SortableTh :active="sortKey === 'stock'" :direction="sortDir" align="right" @click="applySort('stock')">{{ t('inventory.inStock') }}</SortableTh>
              <SortableTh :active="sortKey === 'reorder'" :direction="sortDir" align="right" @click="applySort('reorder')">{{ t('inventory.lowStock') }}</SortableTh>
              <SortableTh :active="sortKey === 'cost'" :direction="sortDir" align="right" @click="applySort('cost')">{{ t('inventory.costPerUnitShort') }}</SortableTh>
              <SortableTh :active="sortKey === 'value'" :direction="sortDir" align="right" @click="applySort('value')">{{ t('inventory.value') }}</SortableTh>
              <th class="px-5 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id" class="border-b border-app last:border-0 transaction-row" :class="isLow(item) ? 'border-l-2 border-l-[var(--negative)]' : ''">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><UIcon :name="catIcon[item.category] ?? 'i-lucide-box'" class="text-accent" /></div>
                  <span class="font-semibold">{{ item.name }}</span>
                </div>
              </td>
              <td class="px-5 py-4 text-muted">{{ t('enums.inputCat.' + item.category) }}</td>
              <td class="px-5 py-4 text-right">
                <span class="font-semibold" :class="isLow(item) ? 'text-negative' : ''">{{ number(item.stock) }}</span>
                <span class="text-muted text-xs"> {{ t('enums.unit.' + item.unit) }}</span>
              </td>
              <td class="px-5 py-4 text-right text-muted">{{ number(item.reorderLevel) }}</td>
              <td class="px-5 py-4 text-right text-muted">{{ currency(item.costPerUnit, item.currency || settings.locale.currency) }}</td>
              <td class="px-5 py-4 text-right font-semibold">{{ currency(item.stock * item.costPerUnit, item.currency || settings.locale.currency) }}</td>
              <td class="px-5 py-4 text-right">
                <UDropdownMenu :items="rowActions(item)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <!-- EMPTY -->
    <GlassCard v-else><EmptyState icon="i-lucide-boxes" :title="search ? t('crud.noResults') : t('inventory.title')" :description="search ? '' : t('inventory.subtitle')"><template #action><button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="openCreate">{{ t('common.add') }}</button></template></EmptyState></GlassCard>

    <UModal v-model:open="open" :title="editingId ? t('crud.edit') : t('common.add')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('common.name')"><UInput v-model="form.name" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('tasks.category')"><USelect v-model="form.category" :items="catItems" class="w-full" /></UFormField>
            <UFormField :label="t('common.unit')"><USelect v-model="form.unit" :items="unitItems" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <UFormField :label="t('inventory.inStock')"><UInputNumber v-model="form.stock" class="w-full" /></UFormField>
            <UFormField :label="t('inventory.lowStock')"><UInputNumber v-model="form.reorderLevel" class="w-full" /></UFormField>
            <UFormField :label="t('inventory.costPerUnit', { currency: formCurrency })"><UInputNumber v-model="form.costPerUnit" :step="0.1" class="w-full" /></UFormField>
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

    <UModal v-model:open="restockOpen" :title="t('inventory.restockTitle', { name: restockItem?.name ?? '' })">
      <template #body><UFormField :label="t('inventory.qtyToAdd')"><UInputNumber v-model="addQty" :step="1" class="w-full" /></UFormField></template>
      <template #footer><div class="flex justify-end gap-2 w-full"><button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="restockOpen = false">{{ t('common.cancel') }}</button><button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="doRestock">{{ t('inventory.addStock') }}</button></div></template>
    </UModal>

    <ConfirmModal v-model:open="delOpen" @confirm="doDelete" />
  </div>
</template>
