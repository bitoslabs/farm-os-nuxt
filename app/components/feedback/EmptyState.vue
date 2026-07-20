<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title: string
  description?: string
}>(), {
  icon: 'i-lucide-leaf'
})
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center py-16 px-6">
    <div class="icon-box w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
      <UIcon :name="icon" class="text-accent text-xl" />
    </div>
    <h3 class="text-base font-semibold mb-1">{{ title }}</h3>
    <p v-if="description" class="text-sm text-muted max-w-sm">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>
