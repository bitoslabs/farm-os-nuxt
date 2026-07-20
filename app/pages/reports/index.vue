<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import type { FinanceRecord } from '~/types/garden'

const store = useGardenStore()
const { finance, plots, crops, plantings, harvests, cropById, plotById } = store
const { currency, number } = useFormat()
const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('reports.title')} · GardenOS` })

// ---- filters ----
const groupBy = ref<'crop' | 'plot' | 'planting' | 'category' | 'month' | 'season'>('crop')
const groupOpts = computed(() => [
  { label: t('reports.gCrop'), value: 'crop' }, { label: t('reports.gPlot'), value: 'plot' },
  { label: t('reports.gPlanting'), value: 'planting' }, { label: t('reports.gCategory'), value: 'category' },
  { label: t('reports.gMonth'), value: 'month' }, { label: t('reports.gSeason'), value: 'season' }
])
const period = ref<'all' | 'month' | '3m'>('all')
const periods = computed(() => [
  { k: 'all', l: t('finance.periodAll') }, { k: 'month', l: t('finance.periodMonth') }, { k: '3m', l: t('finance.period3m') }
] as const)
const typeFilter = ref<'all' | 'income' | 'expense'>('all')
const ALL_FILTER = '__all__'
const plotFilter = ref(ALL_FILTER)
const cropFilter = ref(ALL_FILTER)

function cutoffMs() {
  if (period.value === 'month') { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime() }
  if (period.value === '3m') return Date.now() - 90 * 86400000
  return 0
}
function monthLabel(iso: string) { return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) }
function seasonOf(iso: string) { const d = new Date(iso); const wet = d.getMonth() >= 4 && d.getMonth() <= 9; return `${d.getFullYear()} ${wet ? t('reports.wet') : t('reports.dry')}` }

function groupKey(f: FinanceRecord): string {
  switch (groupBy.value) {
    case 'plot': return f.plotId ? (plotById.value[f.plotId]?.name ?? t('reports.uncategorized')) : t('reports.uncategorized')
    case 'crop': return f.cropId ? (cropById.value[f.cropId]?.name ?? t('reports.uncategorized')) : t('reports.uncategorized')
    case 'planting': return f.plantingId ? (cropById.value[plantings.value.find((p) => p.id === f.plantingId)?.cropId ?? '']?.name ?? t('reports.uncategorized')) : t('reports.uncategorized')
    case 'category': return f.category
    case 'month': return monthLabel(f.date)
    case 'season': return seasonOf(f.date)
  }
}

const filtered = computed(() => {
  const c = cutoffMs()
  return finance.value.filter((f) => {
    if (c && new Date(f.date).getTime() < c) return false
    if (typeFilter.value !== 'all' && f.type !== typeFilter.value) return false
    if (plotFilter.value !== ALL_FILTER && f.plotId !== plotFilter.value) return false
    if (cropFilter.value !== ALL_FILTER && f.cropId !== cropFilter.value) return false
    return true
  })
})

const groups = computed(() => {
  const map: Record<string, { income: number; expense: number; count: number }> = {}
  for (const f of filtered.value) {
    const k = groupKey(f)
    map[k] ??= { income: 0, expense: 0, count: 0 }
    if (f.type === 'income') map[k].income += f.amount
    else map[k].expense += f.amount
    map[k].count++
  }
  return Object.entries(map).map(([label, v]) => ({ label, ...v, net: v.income - v.expense })).sort((a, b) => b.net - a.net)
})

const totalIncome = computed(() => filtered.value.filter((f) => f.type === 'income').reduce((s, f) => s + f.amount, 0))
const totalExpense = computed(() => filtered.value.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0))
const totalNet = computed(() => totalIncome.value - totalExpense.value)
const totalMargin = computed(() => totalIncome.value ? Math.round((totalNet.value / totalIncome.value) * 100) : 0)

const maxAbsNet = computed(() => Math.max(1, ...groups.value.map((g) => Math.abs(g.net))))

// ---- harvest yield by crop (production context) ----
const harvestByCrop = computed(() => {
  const map: Record<string, { qty: number; count: number }> = {}
  for (const h of harvests.value) {
    const name = cropById.value[h.cropId]?.name ?? t('reports.uncategorized')
    map[name] ??= { qty: 0, count: 0 }
    map[name].qty += h.quantity
    map[name].count++
  }
  return Object.entries(map).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.qty - a.qty)
})

// ---- CSV export ----
function exportCsv() {
  const header = [t('reports.group'), t('finance.income'), t('finance.expense'), t('finance.net'), t('reports.margin'), t('reports.count')]
  const rows = groups.value.map((g) => [g.label, g.income.toFixed(2), g.expense.toFixed(2), g.net.toFixed(2), (g.income ? Math.round((g.net / g.income) * 100) : 0) + '%', g.count])
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = `gardenos-report-${groupBy.value}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
  toast.add({ title: t('reports.exportCsv'), icon: 'i-lucide-download', color: 'success' })
}
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.business')" :title="t('reports.title')" :subtitle="t('reports.subtitle')">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" :disabled="!groups.length" @click="exportCsv"><UIcon name="i-lucide-download" class="text-xs" /><span>{{ t('reports.exportCsv') }}</span></button>
      </template>
    </PageHeader>

    <!-- toolbar -->
    <GlassCard class="p-3 mb-5 flex items-center gap-2 flex-wrap" :delay="0.2">
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted font-medium">{{ t('reports.groupBy') }}</span>
        <USelect v-model="groupBy" :items="groupOpts" class="w-40" />
      </div>
      <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app">
        <button v-for="p in periods" :key="p.k" class="px-3 py-1.5 rounded-md text-xs font-medium transition" :class="period === p.k ? 'bg-surface-2 text-fg' : 'text-muted'" @click="period = p.k">{{ p.l }}</button>
      </div>
      <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app">
        <button v-for="f in [{k:'all',l:t('common.all')},{k:'income',l:t('finance.income')},{k:'expense',l:t('finance.expense')}]" :key="f.k" class="px-3 py-1.5 rounded-md text-xs font-medium transition" :class="typeFilter === f.k ? 'bg-surface-2 text-fg' : 'text-muted'" @click="typeFilter = f.k as any">{{ f.l }}</button>
      </div>
      <USelect v-model="plotFilter" :items="[{ label: t('reports.gPlot') + ': ' + t('common.all'), value: ALL_FILTER }, ...plots.map((p) => ({ label: p.name, value: p.id }))]" class="w-36" />
      <USelect v-model="cropFilter" :items="[{ label: t('reports.gCrop') + ': ' + t('common.all'), value: ALL_FILTER }, ...crops.map((c) => ({ label: c.name, value: c.id }))]" class="w-36" />
    </GlassCard>

    <!-- summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <GlassCard class="p-4" :delay="0.05"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('finance.income') }}</div><AnimatedMetric :value="totalIncome" currency class="text-positive" /></GlassCard>
      <GlassCard class="p-4" :delay="0.1"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('finance.expense') }}</div><AnimatedMetric :value="totalExpense" currency class="text-negative" /></GlassCard>
      <GlassCard class="p-4" :delay="0.15"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('finance.net', { n: totalMargin }) }}</div><AnimatedMetric :value="totalNet" currency :class="totalNet >= 0 ? 'text-accent' : 'text-negative'" /></GlassCard>
      <GlassCard class="p-4" :delay="0.2"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('reports.count') }}</div><AnimatedMetric :value="filtered.length" /></GlassCard>
    </div>

    <div v-if="groups.length" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- group breakdown table + chart -->
      <GlassCard class="lg:col-span-2 overflow-hidden">
        <div class="px-5 py-4 border-b border-app flex items-center justify-between"><h2 class="font-semibold capitalize">{{ groupOpts.find((g) => g.value === groupBy)?.label }}</h2><span class="text-xs text-muted">{{ groups.length }}</span></div>
        <!-- bars -->
        <div class="p-5 space-y-3 border-b border-app">
          <div v-for="g in groups.slice(0, 8)" :key="g.label" class="flex items-center gap-3">
            <div class="w-28 text-xs text-muted truncate text-right">{{ g.label }}</div>
            <div class="flex-1 h-5 rounded-md bg-surface-2 overflow-hidden relative">
              <div class="h-full rounded-md transition-all duration-700" :style="{ width: `${(Math.abs(g.net) / maxAbsNet) * 100}%`, background: g.net >= 0 ? 'var(--accent)' : 'var(--negative)', marginLeft: g.net >= 0 ? '0' : 'auto' }" />
            </div>
            <div class="w-24 text-sm font-semibold text-right whitespace-nowrap" :class="g.net >= 0 ? 'text-positive' : 'text-negative'">{{ g.net >= 0 ? '+' : '−' }}{{ currency(g.net) }}</div>
          </div>
        </div>
        <!-- table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="text-left text-xs text-muted uppercase tracking-wider border-b border-app">
              <th class="px-5 py-3 font-semibold">{{ t('reports.group') }}</th>
              <th class="px-5 py-3 font-semibold text-right">{{ t('finance.income') }}</th>
              <th class="px-5 py-3 font-semibold text-right">{{ t('finance.expense') }}</th>
              <th class="px-5 py-3 font-semibold text-right">{{ t('finance.net') }}</th>
              <th class="px-5 py-3 font-semibold text-right">{{ t('reports.count') }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="g in groups" :key="g.label" class="border-b border-app last:border-0">
                <td class="px-5 py-3 font-medium">{{ g.label }}</td>
                <td class="px-5 py-3 text-right text-positive">{{ currency(g.income) }}</td>
                <td class="px-5 py-3 text-right text-negative">{{ currency(g.expense) }}</td>
                <td class="px-5 py-3 text-right font-semibold" :class="g.net >= 0 ? 'text-positive' : 'text-negative'">{{ currency(g.net) }}</td>
                <td class="px-5 py-3 text-right text-muted">{{ g.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      <!-- harvest yield context -->
      <GlassCard class="p-6">
        <div class="flex items-center gap-2 mb-4"><UIcon name="i-lucide-shopping-basket" class="text-accent" /><h2 class="font-semibold">{{ t('reports.harvestYield') }}</h2></div>
        <div v-if="harvestByCrop.length" class="space-y-4">
          <div v-for="c in harvestByCrop" :key="c.label">
            <div class="flex items-center justify-between text-sm mb-1.5"><span class="truncate">{{ c.label }}</span><span class="font-semibold whitespace-nowrap">{{ number(c.qty, { maximumFractionDigits: 1 }) }} kg</span></div>
            <div class="h-2 rounded-full bg-surface-2 overflow-hidden"><div class="h-full rounded-full" :style="{ width: `${(c.qty / (harvestByCrop[0]?.qty || 1)) * 100}%`, background: 'var(--positive)' }" /></div>
            <div class="text-[10px] text-muted-2 mt-0.5 text-right">{{ c.count }} ×</div>
          </div>
        </div>
        <p v-else class="text-sm text-muted-2 text-center py-6">{{ t('harvest.emptyDesc') }}</p>
      </GlassCard>
    </div>
    <GlassCard v-else><EmptyState icon="i-lucide-chart-bar" :title="t('reports.noData')" /></GlassCard>
  </div>
</template>
