<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import type { FinanceRecord } from '~/types/garden'

const store = useGardenStore()
const { finance, financeTrend, plotById } = store
const { settings } = useSettings()
const { currency, relTime } = useFormat()
const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('finance.title')} · GardenOS` })

// ---- category metadata + i18n key map ----
const catKey: Record<string, string> = { 'Produce sale': 'sale', Inputs: 'inputs', Labor: 'labor', Equipment: 'equipment', Seed: 'seed', Other: 'other' }
const catMeta: Record<string, { icon: string; color: string }> = {
  sale: { icon: 'i-lucide-shopping-basket', color: 'var(--positive)' },
  inputs: { icon: 'i-lucide-flask-conical', color: 'var(--info)' },
  labor: { icon: 'i-lucide-users', color: 'var(--warning)' },
  equipment: { icon: 'i-lucide-wrench', color: 'var(--muted)' },
  seed: { icon: 'i-lucide-sprout', color: 'var(--accent)' },
  other: { icon: 'i-lucide-circle-dot', color: 'var(--muted-2)' }
}
const catItems = computed(() => Object.keys(catKey).map((c) => ({ label: t('finance.cats.' + catKey[c]), value: c })))
function catIcon(cat: string) { return (catMeta[catKey[cat] || 'other'] || catMeta.other).icon }
function catColor(cat: string) { return (catMeta[catKey[cat] || 'other'] || catMeta.other).color }
function catLabel(cat: string) { return t('finance.cats.' + (catKey[cat] || 'other')) }

// ---- period filter ----
const period = ref<'all' | 'month' | '3m'>('all')
const periods = computed(() => [
  { k: 'all', l: t('finance.periodAll') }, { k: 'month', l: t('finance.periodMonth') }, { k: '3m', l: t('finance.period3m') }
] as const)
function cutoffMs() {
  const now = Date.now()
  if (period.value === 'month') { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime() }
  if (period.value === '3m') return now - 90 * 86400000
  return 0
}
const periodFinance = computed(() => {
  const c = cutoffMs()
  return c ? finance.value.filter((f) => new Date(f.date).getTime() >= c) : finance.value
})
const pIncome = computed(() => periodFinance.value.filter((f) => f.type === 'income').reduce((s, f) => s + f.amount, 0))
const pExpense = computed(() => periodFinance.value.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0))
const pNet = computed(() => pIncome.value - pExpense.value)
const pMargin = computed(() => pIncome.value ? Math.round((pNet.value / pIncome.value) * 100) : 0)

// ---- transactions list ----
const typeFilter = ref<'all' | 'income' | 'expense'>('all')
const search = ref('')
const list = computed(() => {
  let arr = [...periodFinance.value].sort((a, b) => b.date.localeCompare(a.date))
  if (typeFilter.value !== 'all') arr = arr.filter((f) => f.type === typeFilter.value)
  const q = search.value.toLowerCase().trim()
  if (q) arr = arr.filter((f) => (f.description || f.category).toLowerCase().includes(q) || catLabel(f.category).toLowerCase().includes(q))
  return arr
})

// ---- category breakdown (expenses) ----
const byCategory = computed(() => {
  const map: Record<string, number> = {}
  for (const f of periodFinance.value) if (f.type === 'expense') map[f.category] = (map[f.category] || 0) + f.amount
  const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
  return Object.entries(map).map(([cat, amt]) => ({ cat, amt, pct: Math.round((amt / total) * 100) })).sort((a, b) => b.amt - a.amt)
})

// ---- chart ----
const chartLabels = computed(() => financeTrend.value.map((m) => m.label))
const chartIncome = computed(() => financeTrend.value.map((m) => m.income))
const chartExpense = computed(() => financeTrend.value.map((m) => m.expense))

// ---- add / edit modal ----
const open = ref(false)
const editingId = ref<string | null>(null)
const emptyForm = () => ({ type: 'expense' as 'expense' | 'income', category: 'Inputs', amount: 0, currency: settings.value.locale.currency, description: '', plotId: '', cropId: '', plantingId: '', date: new Date().toISOString().slice(0, 10) })
const form = reactive(emptyForm())
const formCurrency = computed(() => editingId.value ? form.currency : settings.value.locale.currency)
const plotItems = computed(() => store.plots.value.map((p) => ({ label: p.name, value: p.id })))
const cropItems = computed(() => store.crops.value.map((c) => ({ label: c.name, value: c.id })))
const plantingItems = computed(() => store.plantings.value.filter((p) => !form.cropId || p.cropId === form.cropId).map((p) => ({ label: `${store.cropById.value[p.cropId]?.name ?? '—'} · ${store.plotById.value[p.plotId]?.name ?? ''}`, value: p.id })))
function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); open.value = true }
function openEdit(f: FinanceRecord) {
  editingId.value = f.id
  Object.assign(form, { type: f.type, category: f.category, amount: f.amount, currency: f.currency || settings.value.locale.currency, description: f.description || '', plotId: f.plotId || '', cropId: f.cropId || '', plantingId: f.plantingId || '', date: f.date.slice(0, 10) })
  open.value = true
}
function save() {
  if (!form.amount || !form.category) return
  const payload = { type: form.type, category: form.category, amount: form.amount, description: form.description || undefined, currency: formCurrency.value, plotId: form.plotId || undefined, cropId: form.cropId || undefined, plantingId: form.plantingId || undefined, date: new Date(form.date).toISOString() }
  if (editingId.value) { store.updateFinance(editingId.value, payload); toast.add({ title: t('crud.saved'), icon: 'i-lucide-check', color: 'success' }) }
  else { store.addFinance(payload); toast.add({ title: t('crud.created'), icon: 'i-lucide-plus', color: 'success' }) }
  open.value = false
}

// ---- delete ----
const delOpen = ref(false); const delTarget = ref<string | null>(null)
function askDelete(id: string) { delTarget.value = id; delOpen.value = true }
function doDelete() { if (delTarget.value) { store.removeFinance(delTarget.value); toast.add({ title: t('crud.deleted'), icon: 'i-lucide-trash-2', color: 'warning' }) } }
function rowActions(f: FinanceRecord) {
  return [[
    { label: t('crud.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(f) },
    { label: t('crud.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(f.id) }
  ]]
}
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.business')" :title="t('finance.title')" :subtitle="t('finance.subtitle')">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="openCreate"><UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('finance.add') }}</span></button>
      </template>
    </PageHeader>

    <!-- period selector -->
    <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app w-fit mb-5">
      <button v-for="p in periods" :key="p.k" class="px-3 py-1.5 rounded-md text-xs font-medium transition" :class="period === p.k ? 'bg-surface-2 text-fg' : 'text-muted'" @click="period = p.k">{{ p.l }}</button>
    </div>

    <!-- stat cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <GlassCard class="p-5" :delay="0.05">
        <div class="flex items-center justify-between mb-2"><span class="text-xs text-muted uppercase tracking-wider font-semibold flex items-center gap-1.5"><UIcon name="i-lucide-arrow-down-left" class="text-positive" />{{ t('finance.income') }}</span></div>
        <AnimatedMetric :value="pIncome" currency class="text-positive text-3xl" />
      </GlassCard>
      <GlassCard class="p-5" :delay="0.1">
        <div class="flex items-center justify-between mb-2"><span class="text-xs text-muted uppercase tracking-wider font-semibold flex items-center gap-1.5"><UIcon name="i-lucide-arrow-up-right" class="text-negative" />{{ t('finance.expense') }}</span></div>
        <AnimatedMetric :value="pExpense" currency class="text-negative text-3xl" />
      </GlassCard>
      <GlassCard class="p-5" :delay="0.15" :style="{ background: 'linear-gradient(135deg, var(--accent-dim), transparent)' }">
        <div class="flex items-center justify-between mb-2"><span class="text-xs text-muted uppercase tracking-wider font-semibold flex items-center gap-1.5"><UIcon name="i-lucide-trending-up" class="text-accent" />{{ t('finance.net', { n: pMargin }) }}</span></div>
        <AnimatedMetric :value="pNet" currency class="text-3xl" :class="pNet >= 0 ? 'text-accent' : 'text-negative'" />
      </GlassCard>
    </div>

    <!-- trend chart -->
    <GlassCard class="p-6 mb-6" :delay="0.25">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 class="font-semibold">{{ t('dashboard.incomeVsSpending') }}</h2>
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1.5 text-xs text-muted"><span class="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />{{ t('finance.income') }}</span>
          <span class="flex items-center gap-1.5 text-xs text-muted"><span class="w-2.5 h-2.5 rounded-full bg-[var(--negative)]" />{{ t('finance.expense') }}</span>
        </div>
      </div>
      <AreaChart :income="chartIncome" :expense="chartExpense" :labels="chartLabels" :height="220" />
    </GlassCard>

    <!-- list + breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- transactions -->
      <GlassCard class="overflow-hidden lg:col-span-2">
        <div class="flex items-center gap-2 p-3 border-b border-app flex-wrap">
          <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app">
            <button v-for="f in [{k:'all',l:t('common.all')},{k:'income',l:t('finance.income')},{k:'expense',l:t('finance.expense')}]" :key="f.k" class="px-3 py-1.5 rounded-md text-xs font-medium transition" :class="typeFilter === f.k ? 'bg-surface-2 text-fg' : 'text-muted'" @click="typeFilter = f.k as any">{{ f.l }}</button>
          </div>
          <UInput v-model="search" icon="i-lucide-search" :placeholder="t('common.search')" class="flex-1 min-w-[140px]" />
        </div>
        <div v-if="list.length" class="divide-y divide-[var(--border)]">
          <div v-for="f in list" :key="f.id" class="flex items-center gap-3 p-4 transaction-row">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" :style="{ background: `color-mix(in srgb, ${catColor(f.category)} 14%, transparent)` }">
              <UIcon :name="catIcon(f.category)" class="text-sm" :style="{ color: catColor(f.category) }" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate">{{ f.description || catLabel(f.category) }}</div>
              <div class="text-xs text-muted">{{ catLabel(f.category) }}<span v-if="f.plotId"> · {{ plotById[f.plotId]?.name }}</span> · {{ relTime(f.date) }}</div>
            </div>
            <div class="font-semibold whitespace-nowrap" :class="f.type === 'income' ? 'text-positive' : 'text-negative'">{{ f.type === 'income' ? '+' : '−' }}{{ currency(f.amount, f.currency || settings.locale.currency) }}</div>
            <UDropdownMenu :items="rowActions(f)" :content="{ align: 'end' }"><button class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-2 hover:bg-surface hover:text-fg transition"><UIcon name="i-lucide-ellipsis-vertical" /></button></UDropdownMenu>
          </div>
        </div>
        <EmptyState v-else icon="i-lucide-banknote" :title="search ? t('crud.noResults') : t('finance.emptyTitle')" :description="search ? '' : t('finance.emptyDesc')" />
      </GlassCard>

      <!-- by category -->
      <GlassCard class="p-6">
        <div class="flex items-center gap-2 mb-4"><UIcon name="i-lucide-chart-pie" class="text-accent" /><h2 class="font-semibold">{{ t('finance.byCategory') }}</h2></div>
        <div v-if="byCategory.length" class="space-y-4">
          <div v-for="c in byCategory" :key="c.cat">
            <div class="flex items-center justify-between text-sm mb-1.5">
              <span class="flex items-center gap-2 truncate"><UIcon :name="catIcon(c.cat)" class="text-xs" :style="{ color: catColor(c.cat) }" />{{ catLabel(c.cat) }}</span>
              <span class="font-semibold whitespace-nowrap">{{ currency(c.amt) }}</span>
            </div>
            <div class="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700" :style="{ width: `${c.pct}%`, background: catColor(c.cat) }" />
            </div>
            <div class="text-[10px] text-muted-2 mt-0.5 text-right">{{ c.pct }}%</div>
          </div>
        </div>
        <p v-else class="text-sm text-muted-2 text-center py-6">{{ t('finance.noExpense') }}</p>
      </GlassCard>
    </div>

    <!-- add / edit modal -->
    <UModal v-model:open="open" :title="editingId ? t('crud.edit') : t('finance.addTitle')">
      <template #body>
        <div class="space-y-4">
          <!-- type toggle -->
          <div class="grid grid-cols-2 gap-3">
            <button type="button" class="rounded-xl p-3 border-2 transition flex items-center justify-center gap-2 font-semibold text-sm" :class="form.type === 'expense' ? 'border-[var(--negative)] text-negative' : 'border-app text-muted'" @click="form.type = 'expense'">
              <UIcon name="i-lucide-arrow-up-right" />{{ t('finance.expense') }}
            </button>
            <button type="button" class="rounded-xl p-3 border-2 transition flex items-center justify-center gap-2 font-semibold text-sm" :class="form.type === 'income' ? 'border-[var(--positive)] text-positive' : 'border-app text-muted'" @click="form.type = 'income'">
              <UIcon name="i-lucide-arrow-down-left" />{{ t('finance.income') }}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('finance.category')"><USelect v-model="form.category" :items="catItems" class="w-full" /></UFormField>
            <UFormField :label="t('finance.amountLabel', { currency: formCurrency })"><UInputNumber v-model="form.amount" :step="0.01" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('common.date')"><UInput v-model="form.date" type="date" class="w-full" /></UFormField>
          <UFormField :label="t('finance.description')"><UInput v-model="form.description" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('finance.plotOpt')"><USelect v-model="form.plotId" :items="plotItems" class="w-full" /></UFormField>
            <UFormField :label="t('plantings.crop')"><USelect v-model="form.cropId" :items="cropItems" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('plantings.title')"><USelect v-model="form.plantingId" :items="plantingItems" class="w-full" /></UFormField>
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
