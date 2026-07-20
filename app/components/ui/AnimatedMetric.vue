<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'

const props = withDefaults(defineProps<{
  value: number
  currency?: boolean
  decimals?: number
  suffix?: string
}>(), {
  currency: false,
  decimals: 0,
  suffix: ''
})

const { currency: formatCurrency, number } = useFormat()
const display = ref(0)
let frame = 0
let timer: ReturnType<typeof setTimeout> | undefined

const formatted = computed(() => props.currency
  ? formatCurrency(display.value, undefined, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })
  : `${number(display.value, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })}${props.suffix}`
)

function animate() {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    display.value = props.value
    return
  }

  const start = performance.now()
  const from = display.value
  const duration = 850
  const tick = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    display.value = from + (props.value - from) * eased
    if (progress < 1) frame = requestAnimationFrame(tick)
  }
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(tick)
}

onMounted(() => {
  timer = setTimeout(animate, 120)
})
watch(() => props.value, animate)
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="display-font text-2xl font-bold">{{ formatted }}</div>
</template>
