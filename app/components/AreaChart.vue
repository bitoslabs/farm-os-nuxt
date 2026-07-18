<script setup lang="ts">
/** Two-series area+line chart (income vs expense), ex-ui "Balance Overview" style. */
const props = withDefaults(defineProps<{
  income: number[]
  expense: number[]
  labels: string[]
  height?: number
}>(), {
  height: 260
})

const W = 800
const H = computed(() => props.height)
const PAD = 24

const max = computed(() => {
  const m = Math.max(1, ...props.income, ...props.expense)
  return m * 1.15
})

function toPath(values: number[], smooth = true) {
  const n = values.length
  if (!n) return ''
  const step = (W - PAD * 2) / (n - 1 || 1)
  const pts = values.map((v, i) => {
    const x = PAD + i * step
    const y = H.value - PAD - (v / max.value) * (H.value - PAD * 2)
    return [x, y] as const
  })
  if (!smooth) {
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    return line
  }
  // Catmull-Rom → cubic bezier smoothing
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

const incomeLine = computed(() => toPath(props.income))
const expenseLine = computed(() => toPath(props.expense))
const incomeArea = computed(() => `${incomeLine.value} L${W - PAD},${H.value - PAD} L${PAD},${H.value - PAD} Z`)
const expenseArea = computed(() => `${expenseLine.value} L${W - PAD},${H.value - PAD} L${PAD},${H.value - PAD} Z`)

const lastIncomePoint = computed(() => {
  const n = props.income.length
  const step = (W - PAD * 2) / (n - 1 || 1)
  const x = PAD + (n - 1) * step
  const y = H.value - PAD - (props.income[n - 1] / max.value) * (H.value - PAD * 2)
  return { x, y }
})
</script>

<template>
  <div class="relative" :style="{ height: `${H}px` }">
    <svg class="w-full h-full" viewBox="0 0 800 260" preserveAspectRatio="none">
      <g class="chart-grid">
        <line x1="0" y1="50" x2="800" y2="50" stroke="var(--border)" />
        <line x1="0" y1="100" x2="800" y2="100" stroke="var(--border)" />
        <line x1="0" y1="150" x2="800" y2="150" stroke="var(--border)" />
        <line x1="0" y1="200" x2="800" y2="200" stroke="var(--border)" />
      </g>
      <defs>
        <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--negative)" stop-opacity="0.18" />
          <stop offset="100%" stop-color="var(--negative)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <path :d="expenseArea" fill="url(#gExp)" />
      <path :d="expenseLine" stroke="var(--negative)" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6" />

      <path :d="incomeArea" fill="url(#gInc)" />
      <path
        :d="incomeLine"
        stroke="var(--accent)"
        stroke-width="2.5"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="chart-path"
      />
      <circle :cx="lastIncomePoint.x" :cy="lastIncomePoint.y" r="4.5" fill="var(--accent)" stroke="var(--bg)" stroke-width="2" />
    </svg>
    <div class="absolute -bottom-1 left-0 right-0 flex justify-between text-[10px] text-muted-2 font-medium px-1">
      <span v-for="(l, i) in labels" :key="i">{{ l }}</span>
    </div>
  </div>
</template>

<style scoped>
.chart-path {
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  animation: drawLine 2s ease-out 0.3s forwards;
}
@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}
</style>
