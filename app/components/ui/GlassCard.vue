<script setup lang="ts">
/** Base glass surface — the primary container across the app. */
withDefaults(defineProps<{
  hover?: boolean
  as?: string
  delay?: number
}>(), {
  hover: false,
  as: 'div',
  delay: 0
})
</script>

<template>
  <component
    :is="as"
    class="glass rounded-2xl fade-up"
    :class="[hover ? 'stat-card' : '', delay ? `am-${Math.min(6, Math.max(1, Math.round(delay / 0.05)))}` : undefined]"
    :style="delay ? { '--motion-delay': `${delay}s` } : undefined"
  >
    <slot />
  </component>
</template>
