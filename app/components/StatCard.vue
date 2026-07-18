<script setup lang="ts">
/** KPI stat tile — icon, trend badge, animated counter, sparkline. */
import { useFormat } from '~/composables/useFormat'

const props = withDefaults(defineProps<{
  label: string
  value: number
  prefix?: string
  suffix?: string
  currency?: boolean
  decimals?: number
  icon: string
  trend?: number // percentage, signed
  trendInvert?: boolean // expense-style: up is bad
  spark?: number[]
  sparkColor?: string
  delay?: number
}>(), {
  decimals: 0,
  delay: 0
})

const { number, currency: formatCurrency } = useFormat()
const display = ref(0)
const started = ref(false)

onMounted(() => {
  setTimeout(() => {
    started.value = true
    const target = props.value
    const duration = 1300
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      display.value = target * eased
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, 300)
})

const formatted = computed(() => {
  if (props.currency) {
    return formatCurrency(display.value, undefined, {
      minimumFractionDigits: props.decimals,
      maximumFractionDigits: props.decimals
    })
  }
  return (props.prefix ?? '') +
    number(display.value, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals }) +
    (props.suffix ?? '')
})

const trendGood = computed(() =>
  props.trend === undefined ? null
    : props.trendInvert ? props.trend < 0 : props.trend >= 0
)
const trendColor = computed(() =>
  trendGood.value === null ? ''
    : trendGood.value ? 'text-positive' : 'text-negative'
)
const trendBg = computed(() =>
  trendGood.value === null ? ''
    : trendGood.value ? 'bg-[var(--surface-2)]' : 'bg-[var(--surface-2)]'
)
</script>

<template>
  <div class="stat-card glass rounded-2xl p-5 fade-up" :class="delay ? `am-${Math.min(6, Math.max(1, Math.round(delay / 0.05)))}` : undefined" :style="delay ? { '--motion-delay': `${delay}s` } : undefined">
    <div class="flex items-start justify-between mb-4">
      <div class="icon-box w-10 h-10 rounded-xl flex items-center justify-center">
        <UIcon :name="icon" class="text-accent text-sm" />
      </div>
      <span
        v-if="trend !== undefined"
        class="text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1"
        :class="[trendColor, trendBg]"
      >
        <UIcon
          :name="trend >= 0 ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
          class="text-[10px]"
        />
        {{ Math.abs(trend) }}%
      </span>
    </div>
    <div class="text-xs text-muted uppercase tracking-wider mb-1.5">{{ label }}</div>
    <div class="display-font text-3xl font-bold mb-3">{{ formatted }}</div>
    <Sparkline v-if="spark?.length" :data="spark" :color="sparkColor ?? 'var(--accent)'" />
  </div>
</template>
