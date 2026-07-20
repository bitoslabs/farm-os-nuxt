<script setup lang="ts">
/**
 * Theme toggle — cycles between dark and light.
 * Backed by @nuxtjs/color-mode (registered via @nuxt/ui), which toggles the
 * `.dark` / `.light` class on <html>. See assets/css/main.css for the dual
 * token sets that make every surface theme-aware.
 */
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (v) => { colorMode.preference = v ? 'dark' : 'light' }
})
</script>

<template>
  <UButton
    :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
    color="neutral"
    variant="ghost"
    size="sm"
    :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    square
    @click="isDark = !isDark"
  />
</template>
