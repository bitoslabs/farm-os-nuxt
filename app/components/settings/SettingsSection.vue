<script setup lang="ts">
defineProps<{ title: string; description?: string; icon?: string }>()
</script>

<template>
  <section>
    <div class="flex items-start gap-3 mb-6">
      <div v-if="icon" class="icon-box w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
        <UIcon :name="icon" class="text-accent" />
      </div>
      <div>
        <h2 class="text-lg font-semibold">{{ title }}</h2>
        <p v-if="description" class="text-sm text-muted mt-1">{{ description }}</p>
      </div>
    </div>
    <slot />
  </section>
</template>
