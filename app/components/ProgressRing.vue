<script setup lang="ts">
/** Circular progress ring (ex-ui.html "Savings Plan" style). */
const props = withDefaults(defineProps<{
  value: number // 0–100
  size?: number // px
  stroke?: number
  label?: string
}>(), {
  size: 176,
  stroke: 6,
  label: 'Completed'
})

const r = computed(() => 50 - props.stroke / 2)
const circumference = computed(() => 2 * Math.PI * r.value)
const offset = computed(() => circumference.value * (1 - clamp(props.value) / 100))
const gradId = useId()

function clamp(n: number) {
  return Math.max(0, Math.min(100, n))
}
</script>

<template>
  <div class="relative flex flex-col items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" :r="r" stroke="var(--border)" :stroke-width="stroke" fill="none" />
      <circle
        cx="50" cy="50" :r="r"
        :stroke="`url(#${gradId})`"
        :stroke-width="stroke"
        fill="none"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        style="transition: stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)"
      />
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="var(--accent-2)" />
          <stop offset="100%" stop-color="var(--accent)" />
        </linearGradient>
      </defs>
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <div class="display-font text-4xl font-bold">
        {{ Math.round(value) }}<span class="text-xl text-muted">%</span>
      </div>
      <div class="text-[11px] text-muted uppercase tracking-wider mt-1">{{ label }}</div>
    </div>
  </div>
</template>
