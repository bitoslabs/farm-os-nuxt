<script setup lang="ts">
// Mobile navigation drawer (< md). Opened by the header hamburger button.
const open = useState<boolean>('mobile-nav-open', () => false)
</script>

<template>
  <USlideover v-model:open="open" side="left" title="Menu" :ui="{ content: 'w-[280px] max-w-[85vw] p-0' }">
    <template #body>
      <div class="h-full min-h-0 overflow-hidden">
        <AppSidebarContent @navigate="open = false" />
      </div>
    </template>
  </USlideover>
</template>
