<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="flex items-center justify-between gap-4 py-3.5 border-b border-app last:border-0">
    <div class="min-w-0">
      <div class="text-sm font-medium">{{ title }}</div>
      <div v-if="description" class="text-xs text-muted mt-0.5 leading-relaxed">{{ description }}</div>
    </div>
    <div class="shrink-0"><slot /></div>
  </div>
</template>
