<script setup lang="ts">
// /settings redirects to the default section so the URL always reflects state.
definePageMeta({})
await navigateTo('/settings/account', { replace: true })
</script>

<template>
  <div />
</template>
