<script setup lang="ts">
withDefaults(defineProps<{ size?: number; compact?: boolean }>(), { size: 36, compact: false })
</script>

<template>
  <div class="flex items-center gap-2.5">
    <div
      class="rounded-xl bg-[var(--accent)] flex items-center justify-center accent-glow"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <span class="display-font text-[var(--bg)] font-bold" :style="{ fontSize: `${size * 0.5}px` }">G</span>
    </div>
    <div v-if="!compact" class="leading-none">
      <div class="display-font text-xl font-bold tracking-tight">GardenOS</div>
      <div class="text-[10px] text-muted-2 uppercase tracking-[0.15em] mt-0.5">Farm &amp; Garden</div>
    </div>
  </div>
</template>
