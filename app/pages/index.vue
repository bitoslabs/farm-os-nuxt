<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useFormat } from '~/composables/useFormat'

const store = useGardenStore()
const { isLoggedIn } = useSettings()
const { settings } = useSettings()
const {
  farm, plots, plantings, harvests, tasks, finance, activePlantings, pendingTasks, seasonHarvestKg,
  financeTrend, seasonProgress, netProfit, totalIncome, activity, cropById,
  inventoryValue, assetValue, lowStockItems, maintenanceDue
} = store
const { currency, compactCurrency, number, todayLabel } = useFormat()
const { t } = useI18n()
const greetingKey = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'dashboard.greetingMorning' : h < 18 ? 'dashboard.greetingAfternoon' : 'dashboard.greetingEvening'
})

useHead({ title: 'Dashboard · GardenOS' })

// counts (activePlantings / pendingTasks are arrays in the store)
const activeCount = computed(() => activePlantings.value.length)
const pendingCount = computed(() => pendingTasks.value.length)

// Real sparkline data: the last eight calendar months from the local/Nostr
// store. These remain reactive when records are created, edited, or synced.
const sparkMonths = computed(() => {
  const now = new Date()
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (7 - index), 1)
    return { year: date.getFullYear(), month: date.getMonth() }
  })
})
function inMonth(iso: string | undefined, month: { year: number; month: number }) {
  if (!iso) return false
  const date = new Date(iso)
  return date.getFullYear() === month.year && date.getMonth() === month.month
}
const plantingsSpark = computed(() => sparkMonths.value.map((month) => plantings.value.filter((p) => inMonth(p.plantedAt, month)).length))
const harvestSpark = computed(() => sparkMonths.value.map((month) => harvests.value.filter((h) => h.unit === 'kg' && inMonth(h.harvestedAt, month)).reduce((sum, h) => sum + h.quantity, 0)))
const tasksSpark = computed(() => sparkMonths.value.map((month) => tasks.value.filter((task) => task.status !== 'done' && inMonth(task.dueAt, month)).length))
const profitSpark = computed(() => financeTrend.value.map((month) => month.income - month.expense))

// chart labels + series
const chartLabels = computed(() => financeTrend.value.map((m) => m.label))
const chartIncome = computed(() => financeTrend.value.map((m) => m.income))
const chartExpense = computed(() => financeTrend.value.map((m) => m.expense))

const period = ref<'week' | 'month' | 'year'>('month')
const periods = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' }
] as const

// plots with their active planting progress (the "wallets" analog)
const plotCards = computed(() =>
  plots.value.map((p) => {
    const planting = plantings.value.find((pl) => pl.plotId === p.id && pl.stage !== 'harvested')
    const crop = planting ? cropById.value[planting.cropId] : undefined
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      cropName: crop?.name ?? 'Fallow',
      progress: planting?.progress ?? 0,
      stage: planting?.stage,
      featured: (p.type === 'greenhouse' || p.type === 'field')
    }
  })
)

const firstName = computed(() => settings.value.identity.name?.trim()?.split(' ')[0] || 'farmer')

// Quick Log — in-place activity capture modal
const quickLogOpen = ref(false)
</script>

<template>
  <div class="space-y-6">
    <!-- Guest banner -->
    <GlassCard v-if="!isLoggedIn" class="p-5 fade-up flex items-center gap-4 flex-wrap" :style="{ background: 'linear-gradient(135deg, var(--accent-dim), transparent)' }">
      <div class="w-11 h-11 rounded-xl bg-[var(--accent)] flex items-center justify-center shrink-0">
        <UIcon name="i-lucide-key-round" class="text-[var(--bg)]" />
      </div>
      <div class="flex-1 min-w-[200px]">
        <div class="font-semibold">You're viewing in local mode</div>
        <div class="text-sm text-muted mt-0.5">Create a Nostr identity to own your data and sync across devices &amp; relays.</div>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLinkLocale to="/login" class="btn-ghost px-4 py-2 rounded-lg text-sm font-medium">Sign in</NuxtLinkLocale>
        <NuxtLinkLocale to="/register" class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"><UIcon name="i-lucide-user-plus" class="text-xs" />Create identity</NuxtLinkLocale>
      </div>
    </GlassCard>
    <!-- Greeting -->
    <div class="flex items-end justify-between gap-4 flex-wrap fade-up">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="w-2 h-2 rounded-full bg-[var(--accent)] pulse-dot" />
          <span class="text-xs text-muted uppercase tracking-wider font-medium">{{ todayLabel() }}</span>
        </div>
        <h1 class="display-font text-3xl font-bold tracking-tight">
          {{ $t(greetingKey) }}, <span class="text-accent">{{ firstName }}</span>
        </h1>
        <p class="text-sm text-muted mt-1.5">{{ farm.name ? $t('dashboard.subtitle', { farm: farm.name }) : $t('dashboard.emptySubtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-ghost px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2" @click="quickLogOpen = true">
          <UIcon name="i-lucide-zap" class="text-xs" /><span>{{ t('dashboard.quickLog') }}</span>
        </button>
        <NuxtLinkLocale to="/plantings" class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2">
          <UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('dashboard.addPlanting') }}</span>
        </NuxtLinkLocale>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :label="t('dashboard.kpiActivePlantings')" :value="activeCount" icon="i-lucide-sprout" :spark="plantingsSpark" :delay="0.05" />
      <StatCard :label="t('dashboard.kpiHarvest')" :value="seasonHarvestKg" suffix=" kg" :decimals="1" icon="i-lucide-shopping-basket" :spark="harvestSpark" spark-color="var(--positive)" :delay="0.1" />
      <StatCard :label="t('dashboard.kpiTasks')" :value="pendingCount" icon="i-lucide-list-checks" :spark="tasksSpark" spark-color="var(--warning)" :delay="0.15" />
      <StatCard :label="t('dashboard.kpiProfit')" :value="netProfit" currency :decimals="2" icon="i-lucide-banknote" :spark="profitSpark" :delay="0.2" />
    </div>

    <!-- Farm holdings: inventory + asset values, low stock, maintenance due -->
    <div class="fade-up">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-semibold text-muted uppercase tracking-wider">{{ t('dashboard.holdings') }}</h2>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <NuxtLinkLocale to="/inventory" class="block">
          <GlassCard hover :delay="0.05" class="p-4 h-full">
            <div class="flex items-center gap-2 mb-1"><UIcon name="i-lucide-boxes" class="text-accent text-sm" /><span class="text-xs text-muted uppercase tracking-wider">{{ t('dashboard.inventoryValue') }}</span></div>
            <div class="display-font text-xl font-bold whitespace-nowrap tabular-nums overflow-hidden text-ellipsis" :title="currency(inventoryValue)">{{ compactCurrency(inventoryValue) }}</div>
          </GlassCard>
        </NuxtLinkLocale>
        <NuxtLinkLocale to="/assets" class="block">
          <GlassCard hover :delay="0.1" class="p-4 h-full">
            <div class="flex items-center gap-2 mb-1"><UIcon name="i-lucide-tractor" class="text-accent text-sm" /><span class="text-xs text-muted uppercase tracking-wider">{{ t('dashboard.assetValue') }}</span></div>
            <div class="display-font text-xl font-bold whitespace-nowrap tabular-nums overflow-hidden text-ellipsis" :title="currency(assetValue)">{{ compactCurrency(assetValue) }}</div>
          </GlassCard>
        </NuxtLinkLocale>
        <NuxtLinkLocale to="/inventory" class="block">
          <GlassCard hover :delay="0.15" class="p-4 h-full">
            <div class="flex items-center gap-2 mb-1"><UIcon name="i-lucide-package-x" class="text-warning text-sm" /><span class="text-xs text-muted uppercase tracking-wider">{{ t('dashboard.lowStock') }}</span></div>
            <div class="display-font text-xl font-bold" :class="lowStockItems.length ? 'text-warning' : ''">{{ lowStockItems.length }}</div>
          </GlassCard>
        </NuxtLinkLocale>
        <NuxtLinkLocale to="/assets" class="block">
          <GlassCard hover :delay="0.2" class="p-4 h-full">
            <div class="flex items-center gap-2 mb-1"><UIcon name="i-lucide-wrench" class="text-warning text-sm" /><span class="text-xs text-muted uppercase tracking-wider">{{ t('dashboard.maintenanceDue') }}</span></div>
            <div class="display-font text-xl font-bold" :class="maintenanceDue.length ? 'text-warning' : ''">{{ maintenanceDue.length }}</div>
          </GlassCard>
        </NuxtLinkLocale>
      </div>
    </div>

    <!-- Main grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left column -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Trend chart -->
        <GlassCard class="p-6" :delay="0.25">
          <div class="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 class="text-base font-semibold mb-1">{{ t('dashboard.incomeVsSpending') }}</h2>
              <p class="text-xs text-muted">Farm cashflow over the last 8 months</p>
            </div>
            <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app">
              <button
                v-for="p in periods" :key="p.key"
                class="px-3 py-1.5 rounded-md text-xs font-medium transition"
                :class="period === p.key ? 'bg-surface-2 text-fg' : 'text-muted'"
                @click="period = p.key"
              >{{ p.label }}</button>
            </div>
          </div>
          <div v-if="finance.length" class="flex items-center gap-6 mb-4 flex-wrap">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
              <span class="text-xs text-muted">Income</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[var(--negative)]" />
              <span class="text-xs text-muted">Spending</span>
            </div>
            <div class="ml-auto flex items-baseline gap-2">
              <span class="display-font text-2xl font-bold">{{ currency(netProfit) }}</span>
            </div>
          </div>
          <AreaChart v-if="finance.length" :income="chartIncome" :expense="chartExpense" :labels="chartLabels" />
          <p v-else class="text-sm text-muted-2 text-center py-16">{{ t('common.noData') }}</p>
        </GlassCard>

        <!-- Plots (wallets analog) -->
        <GlassCard class="p-6" :delay="0.3">
          <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 class="text-base font-semibold mb-1">{{ t('dashboard.activePlots') }}</h2>
              <p class="text-xs text-muted">{{ plots.length }} spaces under cultivation</p>
            </div>
            <NuxtLinkLocale to="/land" class="btn-ghost px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
              <UIcon name="i-lucide-plus" class="text-[10px]" /><span>Add Space</span>
            </NuxtLinkLocale>
          </div>
          <div v-if="plotCards.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NuxtLinkLocale
              v-for="card in plotCards" :key="card.id"
              to="/land"
              class="wallet-card rounded-xl p-4 border border-app"
              :class="card.featured ? 'featured' : 'glass'"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center" :class="card.featured ? 'bg-[var(--accent-dim)]' : 'bg-surface-2'">
                    <UIcon name="i-lucide-map-pin" class="text-sm" :class="card.featured ? 'text-accent' : ''" />
                  </div>
                  <div>
                    <div class="text-sm font-semibold capitalize">{{ card.name }}</div>
                    <div class="text-[10px] text-muted">{{ t('enums.landType.' + card.type) }}</div>
                  </div>
                </div>
                <UIcon name="i-lucide-ellipsis-vertical" class="text-muted-2 text-xs" />
              </div>
              <div class="display-font text-2xl font-bold mb-1 capitalize">{{ card.cropName }}</div>
              <div class="flex items-center justify-between text-[11px] mb-2">
                <span class="text-muted">{{ card.stage ? t('enums.stage.' + card.stage) : '—' }}</span>
                <span class="font-semibold text-accent">{{ card.progress }}%</span>
              </div>
              <div class="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div class="progress-fill" :style="{ width: `${card.progress}%` }" />
              </div>
            </NuxtLinkLocale>
          </div>
          <EmptyState v-else icon="i-lucide-map-pin" :title="t('land.emptyTitle')" :description="t('land.emptyDesc')">
            <template #action><NuxtLink to="/land" class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold">{{ t('land.add') }}</NuxtLink></template>
          </EmptyState>
        </GlassCard>
      </div>

      <!-- Right column -->
      <div class="space-y-6">
        <!-- Season progress (savings ring analog) -->
        <GlassCard class="p-6" :delay="0.35">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h2 class="text-base font-semibold mb-1">{{ t('dashboard.seasonPlan') }}</h2>
              <p class="text-xs text-muted">Growing cycle progress</p>
            </div>
            <NuxtLinkLocale to="/plantings" class="btn-ghost w-8 h-8 rounded-lg flex items-center justify-center" aria-label="Open">
              <UIcon name="i-lucide-arrow-up-right" class="text-xs" />
            </NuxtLinkLocale>
          </div>
          <div class="flex items-center justify-center mb-5">
            <ProgressRing :value="seasonProgress" :label="t('dashboard.grown')" />
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted">{{ t('dashboard.kpiActivePlantings') }}</span>
              <span class="font-semibold display-font">{{ activeCount }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted">{{ t('dashboard.readyToHarvest') }}</span>
              <span class="font-semibold display-font text-accent">{{ plantings.filter(p => p.stage === 'ready').length }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted">{{ t('dashboard.totalIncome') }}</span>
              <span class="font-semibold display-font">{{ currency(totalIncome) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm pt-3 border-t border-app">
              <span class="text-muted">{{ t('dashboard.season') }}</span>
              <span class="font-semibold">2025 · Wet</span>
            </div>
          </div>
          <NuxtLinkLocale to="/harvest" class="w-full btn-accent py-2.5 rounded-lg text-sm font-semibold mt-5 flex items-center justify-center gap-2">
            <UIcon name="i-lucide-shopping-basket" class="text-xs" />{{ t('dashboard.recordHarvest') }}
          </NuxtLinkLocale>
        </GlassCard>

        <!-- Recent activity (transactions analog) -->
        <GlassCard class="p-6" :delay="0.4">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-semibold mb-1">{{ t('dashboard.recentActivity') }}</h2>
              <p class="text-xs text-muted">Latest farm events</p>
            </div>
          </div>
          <div v-if="activity.length" class="space-y-1">
            <div
              v-for="item in activity" :key="item.id"
              class="transaction-row flex items-center gap-3 p-2.5 rounded-lg"
            >
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                :class="item.positive === false ? 'bg-[rgba(248,113,113,0.12)]' : 'bg-surface-2'"
              >
                <UIcon :name="item.icon" class="text-sm" :class="item.positive === false ? 'text-negative' : 'text-accent'" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold truncate">{{ item.title }}</div>
                <div class="text-[11px] text-muted truncate">{{ item.detail }}</div>
              </div>
              <div v-if="item.amount !== undefined" class="text-right">
                <div class="text-sm font-semibold" :class="item.positive === false ? 'text-negative' : 'text-positive'">
                  {{ item.positive === false ? '-' : '+' }}{{ number(item.amount) }} {{ item.amountUnit }}
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-muted-2 text-center py-6">{{ t('common.noData') }}</p>
        </GlassCard>
      </div>
    </div>

    <QuickLogModal v-model:open="quickLogOpen" />
  </div>
</template>
