<script setup lang="ts">
const { currency, number } = useFormat()
const { t } = useI18n()
useHead({ title: () => `${t('marketplace.title')} · GardenOS` })

const listings = ref([
  { id: 'm1', crop: 'Cherry Tomato', qty: 14.5, unit: 'kg', price: 2.5, status: 'available' },
  { id: 'm2', crop: 'Thai Basil', qty: 6, unit: 'bunch', price: 1.2, status: 'available' },
  { id: 'm3', crop: "Bird's Eye Chili", qty: 3, unit: 'kg', price: 6, status: 'low' },
  { id: 'm4', crop: 'Lettuce', qty: 0, unit: 'piece', price: 0.8, status: 'sold' }
])
const quotes = ref([
  { crop: 'Tomato', market: 'Vientiane Morning Market', price: 2.8, change: 0.3 },
  { crop: 'Rice (sticky)', market: 'Co-op', price: 1.4, change: -0.1 },
  { crop: 'Chili', market: 'Thongkhankham', price: 6.5, change: 0.5 }
])
const statusColor: Record<string, string> = { available: 'success', low: 'warning', sold: 'neutral' }
const statusLabel: Record<string, string> = { available: 'irrigation.activeStatus', low: 'inventory.lowStock', sold: 'tasks.done' }
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.business')" :title="t('marketplace.title')" :subtitle="t('marketplace.subtitle')">
      <template #actions>
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2"><UIcon name="i-lucide-plus" class="text-xs" /><span>{{ t('marketplace.newListing') }}</span></button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-3">
        <GlassCard v-for="l in listings" :key="l.id" class="p-5">
          <div class="flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-store" class="text-accent" /></div>
            <div class="flex-1"><div class="font-semibold">{{ l.crop }}</div><div class="text-xs text-muted">{{ number(l.qty) }} {{ l.unit }} {{ t('marketplace.available') }}</div></div>
            <div class="text-right">
              <div class="display-font text-xl font-bold">{{ currency(l.price) }}<span class="text-xs text-muted">/{{ l.unit }}</span></div>
              <UBadge variant="subtle" :color="statusColor[l.status]" class="mt-1">{{ t(statusLabel[l.status]) }}</UBadge>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard class="p-6">
        <div class="flex items-center gap-2 mb-4"><UIcon name="i-lucide-line-chart" class="text-accent" /><h2 class="font-semibold">{{ t('marketplace.priceQuotes') }}</h2></div>
        <div class="space-y-4">
          <div v-for="q in quotes" :key="q.crop + q.market" class="flex items-center justify-between">
            <div><div class="text-sm font-semibold">{{ q.crop }}</div><div class="text-[11px] text-muted">{{ q.market }}</div></div>
            <div class="text-right">
              <div class="font-semibold">{{ currency(q.price) }}</div>
              <div class="text-xs font-medium" :class="q.change >= 0 ? 'text-positive' : 'text-negative'">{{ q.change >= 0 ? '+' : '' }}{{ currency(q.change) }}</div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
</template>
