<script setup lang="ts">
/** Tiny inline sparkline, like the ex-ui.html KPI tiles. */
const props = defineProps<{
  data: number[]
  color?: string
  fillOpacity?: number
}>()

const color = computed(() => props.color ?? 'var(--accent)')
const W = 100
const H = 32

const points = computed(() => {
  const d = props.data
  if (!d.length) return { line: '', area: '' }
  const min = Math.min(...d)
  const max = Math.max(...d)
  const span = max - min || 1
  const step = W / (d.length - 1 || 1)
  const coords = d.map((v, i) => {
    const x = i * step
    const y = H - 4 - ((v - min) / span) * (H - 8)
    return [x, y] as const
  })
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  return { line, area }
})

const gradId = useId()
</script>

<template>
  <svg class="w-full" style="height: 32px" viewBox="0 0 100 32" preserveAspectRatio="none">
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path :d="points.area" :fill="`url(#${gradId})`" :opacity="fillOpacity ?? 0.3" />
    <path
      :d="points.line"
      :stroke="color"
      stroke-width="1.5"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
