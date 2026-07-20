<script setup lang="ts">
import { useNav } from '~/composables/useNav'
import { useGardenStore } from '~/composables/useGardenStore'

/**
 * Sidebar inner content (logo + nav + mode card). Shared by the desktop
 * <aside> and the mobile drawer so nav stays in sync.
 */
const emit = defineEmits<{ navigate: [] }>()

const { groups, mode, toggleMode } = useNav()
const store = useGardenStore()
const farm = store.farm

const taskCount = computed(() => store.pendingTasks.value.length)
const stockCount = computed(() => store.lowStockItems.value.length)
const maintCount = computed(() => store.maintenanceDue.value.length)
const navScrolling = ref(false)
let navScrollTimer: ReturnType<typeof setTimeout> | undefined
function badgeValue(b?: 'tasks' | 'stock' | 'maintenance') {
  return b === 'tasks' ? taskCount.value : b === 'stock' ? stockCount.value : b === 'maintenance' ? maintCount.value : 0
}
function onNavScroll() {
  navScrolling.value = true
  if (navScrollTimer) clearTimeout(navScrollTimer)
  navScrollTimer = setTimeout(() => { navScrolling.value = false }, 700)
}
function onNavigate() {
  emit('navigate')
}
onUnmounted(() => { if (navScrollTimer) clearTimeout(navScrollTimer) })
</script>

<template>
  <div class="flex flex-col h-full min-h-0 overflow-hidden py-[var(--sidebar-padding-y)] px-[var(--sidebar-padding-x)]">
    <div class="px-2 mb-8">
      <NuxtLinkLocale to="/" @click="onNavigate"><AppLogo /></NuxtLinkLocale>
    </div>

    <nav
      class="sidebar-nav flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-2.5 px-2.5"
      :class="{ 'is-scrolling': navScrolling }"
      @scroll.passive="onNavScroll"
    >
      <template v-for="group in groups" :key="group.title">
        <div class="text-[10px] font-semibold text-muted-2 uppercase tracking-[0.15em] px-3 mb-2 mt-3 first:mt-0">
          {{ $t(group.title) }}
        </div>
        <NuxtLinkLocale
          v-for="link in group.links" :key="link.to"
          :to="link.to"
          class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
          @click="onNavigate"
        >
          <UIcon :name="link.icon" class="w-4 h-4 text-center shrink-0" />
          <span class="flex-1">{{ $t(link.label) }}</span>
          <span
            v-if="link.badge && badgeValue(link.badge) > 0"
            class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--accent-dim)] text-accent"
          >{{ badgeValue(link.badge) }}</span>
        </NuxtLinkLocale>
      </template>
    </nav>

    <!-- Mode toggle card -->
    <div class="glass rounded-2xl p-4 mt-4 relative overflow-hidden">
      <div class="absolute inset-0" style="background: linear-gradient(135deg, var(--accent-dim), transparent)" />
      <div class="relative">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <UIcon name="i-lucide-tractor" class="text-[var(--bg)] text-xs" />
          </div>
          <div>
            <div class="text-sm font-semibold capitalize">{{ mode }} Mode</div>
            <div class="text-[10px] text-muted">{{ farm.location }}</div>
          </div>
        </div>
        <p class="text-[11px] text-muted mb-3 leading-relaxed">
          {{ mode === 'farm' ? 'Full operations, labor & finance enabled.' : 'Simplified for home gardens.' }}
        </p>
        <button class="w-full btn-ghost text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5" @click="toggleMode">
          <UIcon name="i-lucide-arrow-left-right" class="text-[10px]" />
          Switch to {{ mode === 'farm' ? 'Garden' : 'Farm' }}
        </button>
      </div>
    </div>
  </div>
</template>
