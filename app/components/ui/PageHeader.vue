<script setup lang="ts">
/** Module page title bar — badge + title + subtitle + action slot. */
defineProps<{
  eyebrow?: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="flex items-end justify-between gap-4 flex-wrap fade-up mb-6">
    <div>
      <div v-if="eyebrow" class="flex items-center gap-2 mb-2">
        <span class="w-2 h-2 rounded-full bg-[var(--accent)] pulse-dot" />
        <span class="text-xs text-muted uppercase tracking-wider font-medium">{{ eyebrow }}</span>
      </div>
      <h1 class="display-font text-3xl font-bold tracking-tight">
        <slot name="title">{{ title }}</slot>
      </h1>
      <p v-if="subtitle" class="text-sm text-muted mt-1.5">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
