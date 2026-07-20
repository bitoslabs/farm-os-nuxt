<template>
  <div class="flex h-dvh overflow-hidden">
    <AppSidebar />
    <main class="flex-1 flex flex-col min-w-0 min-h-0">
      <AppHeader />
      <div class="flex-1 min-h-0 overflow-y-auto p-[var(--content-padding)] sm:p-[var(--content-padding-sm)] md:p-[var(--content-padding-md)]">
        <slot />
      </div>
    </main>
    <AppMobileNav />
    <AppCommandPalette />
  </div>
</template>
