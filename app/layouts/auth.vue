<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
const { isLoggedIn } = useSettings()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- ambient background already on body; add a centered column -->
    <div class="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <NuxtLinkLocale to="/" class="mb-8">
        <AppLogo :size="44" />
      </NuxtLinkLocale>

      <div class="w-full max-w-md">
        <slot />
      </div>

      <div class="mt-6 text-xs text-muted-2 text-center max-w-sm">
        <slot name="footer">
          GardenOS is decentralized — your keys never leave your device.
        </slot>
      </div>
    </div>
  </div>
</template>
