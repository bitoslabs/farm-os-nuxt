<script setup lang="ts">
const { date } = useFormat()
const { t } = useI18n()
useHead({ title: () => `${t('irrigation.title')} · GardenOS` })

const weather = ref({ temp: 31, humidity: 72, rainfall: 12, condition: 'Partly cloudy', wind: 8 })
const sensors = ref([
  { id: 's1', plot: 'North Field', type: 'Moisture', value: 42, unit: '%', status: 'ok' },
  { id: 's2', plot: 'Greenhouse 1', type: 'Moisture', value: 28, unit: '%', status: 'low' },
  { id: 's3', plot: 'Greenhouse 1', type: 'Temp', value: 34, unit: '°C', status: 'high' },
  { id: 's4', plot: 'Raised Bed A', type: 'pH', value: 6.5, unit: '', status: 'ok' }
])
const schedule = ref([
  { id: 'w1', plot: 'Greenhouse 1', time: '06:00', duration: 15, method: 'Drip', next: 'Tomorrow', active: true },
  { id: 'w2', plot: 'North Field', time: '17:30', duration: 45, method: 'Flood', next: 'Today', active: true },
  { id: 'w3', plot: 'Raised Bed A', time: '07:00', duration: 10, method: 'Sprinkler', next: 'Mon', active: false }
])
const statusColor: Record<string, string> = { ok: 'text-positive', low: 'text-warning', high: 'text-negative' }
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('navGroups.environment')" :title="t('irrigation.title')" :subtitle="t('irrigation.subtitle')" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <GlassCard class="p-6 lg:col-span-1">
        <div class="flex items-center justify-between mb-4"><h2 class="font-semibold">{{ t('irrigation.weather') }}</h2><UIcon name="i-lucide-cloud-sun" class="text-accent text-xl" /></div>
        <div class="display-font text-5xl font-bold mb-1">{{ weather.temp }}<span class="text-2xl text-muted">°C</span></div>
        <div class="text-sm text-muted mb-5">{{ weather.condition }}</div>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-surface-2 rounded-xl p-3"><div class="text-xs text-muted mb-1">{{ t('irrigation.humidity') }}</div><div class="font-semibold">{{ weather.humidity }}%</div></div>
          <div class="bg-surface-2 rounded-xl p-3"><div class="text-xs text-muted mb-1">{{ t('irrigation.rainfall') }}</div><div class="font-semibold">{{ weather.rainfall }} mm</div></div>
          <div class="bg-surface-2 rounded-xl p-3"><div class="text-xs text-muted mb-1">{{ t('irrigation.wind') }}</div><div class="font-semibold">{{ weather.wind }} km/h</div></div>
          <div class="bg-surface-2 rounded-xl p-3"><div class="text-xs text-muted mb-1">{{ t('irrigation.season') }}</div><div class="font-semibold">Wet</div></div>
        </div>
      </GlassCard>

      <GlassCard class="p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4"><h2 class="font-semibold">{{ t('irrigation.sensors') }}</h2><span class="text-xs text-muted">{{ t('irrigation.sensorsHint') }}</span></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="s in sensors" :key="s.id" class="bg-surface-2 rounded-xl p-4 flex items-center justify-between">
            <div><div class="text-xs text-muted">{{ s.plot }}</div><div class="font-semibold">{{ s.type }}</div></div>
            <div class="text-right">
              <div class="display-font text-2xl font-bold" :class="statusColor[s.status]">{{ s.value }}<span class="text-sm text-muted">{{ s.unit }}</span></div>
              <div class="text-[10px] uppercase tracking-wider" :class="statusColor[s.status]">{{ s.status }}</div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>

    <GlassCard class="p-6 mt-6">
      <div class="flex items-center justify-between mb-4"><h2 class="font-semibold">{{ t('irrigation.schedule') }}</h2><span class="text-xs text-muted">{{ t('irrigation.nActive', { n: schedule.filter(s => s.active).length }) }}</span></div>
      <div class="divide-y divide-[var(--border)]">
        <div v-for="w in schedule" :key="w.id" class="flex items-center gap-4 py-3">
          <div class="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center"><UIcon name="i-lucide-droplets" class="text-info" /></div>
          <div class="flex-1"><div class="font-semibold">{{ w.plot }}</div><div class="text-xs text-muted">{{ w.method }} · {{ w.duration }} min · {{ w.time }}</div></div>
          <div class="text-sm text-muted">{{ t('irrigation.next') }}: {{ w.next }}</div>
          <UBadge variant="subtle" :color="w.active ? 'success' : 'neutral'">{{ w.active ? t('irrigation.activeStatus') : t('irrigation.paused') }}</UBadge>
        </div>
      </div>
    </GlassCard>
  </div>
</template>
