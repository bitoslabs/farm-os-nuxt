<script setup lang="ts">
// Desktop sidebar (>= md). Mobile uses <AppMobileNav> drawer instead.
</script>

<template>
  <aside class="w-[260px] flex-shrink-0 border-r border-app hidden md:flex flex-col sticky top-0 h-dvh">
    <AppSidebarContent />
  </aside>
</template>
