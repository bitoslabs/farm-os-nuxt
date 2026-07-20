<script setup lang="ts">
// Desktop sidebar (>= md). Mobile uses <AppMobileNav> drawer instead.
</script>

<template>
  <aside class="relative w-[260px] flex-shrink-0 border-r border-app hidden md:flex flex-col sticky top-0 h-dvh before:absolute before:inset-x-0 before:top-[calc(var(--app-header-height)-1px)] before:border-b before:border-[var(--border)] before:pointer-events-none">
    <AppSidebarContent />
  </aside>
</template>
