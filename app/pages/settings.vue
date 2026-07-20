<script setup lang="ts">
// Parent shell for nested settings routes. The left nav links to each
// /settings/<section> sub-route, and <NuxtPage/> renders the active one.
// Refresh & back-button now preserve the active section.
useHead({ title: 'Settings · GardenOS' })

const route = useRoute()
const sections = [
  { key: 'account', to: '/settings/account', label: 'settings.account', icon: 'i-lucide-key-round' },
  { key: 'profile', to: '/settings/profile', label: 'settings.profile', icon: 'i-lucide-tractor' },
  { key: 'appearance', to: '/settings/appearance', label: 'settings.appearance', icon: 'i-lucide-palette' },
  { key: 'relays', to: '/settings/relays', label: 'settings.relays', icon: 'i-lucide-radio' },
  { key: 'locale', to: '/settings/locale', label: 'settings.locale', icon: 'i-lucide-globe' },
  { key: 'notifications', to: '/settings/notifications', label: 'settings.notifications', icon: 'i-lucide-bell' },
  { key: 'data', to: '/settings/data', label: 'settings.data', icon: 'i-lucide-database' },
  { key: 'about', to: '/settings/about', label: 'settings.about', icon: 'i-lucide-info' }
] as const

const router = useRouter()
const { t } = useI18n()
function isActive(to: string) { return route.path === to }
const activeSection = computed(() => sections.find((s) => s.to === route.path) ?? sections[0])
const sectionItems = computed(() =>
  sections.map((s) => ({
    label: t(s.label),
    icon: s.icon,
    onSelect: () => router.push(s.to)
  }))
)
</script>

<template>
  <div>
    <PageHeader eyebrow="System" :title="t('settings.title')" :subtitle="t('settings.subtitle')" />

    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Mobile: dropdown section switcher (pros use this, not cramped tabs) -->
      <div class="lg:hidden shrink-0">
        <UDropdownMenu :items="sectionItems" :content="{ align: 'start', sideOffset: 8 }" :ui="{ content: 'w-72 max-w-[80vw]' }">
          <UButton
            :label="activeSection ? t(activeSection.label) : 'Section'"
            :icon="activeSection?.icon"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral" variant="outline"
            class="w-full justify-between rounded-xl input-glass font-medium"
            size="lg"
          />
        </UDropdownMenu>
      </div>

      <!-- Desktop: sticky vertical nav -->
      <nav class="hidden lg:block w-60 shrink-0 sticky -top-2 self-start">
        <div class="flex flex-col gap-1">
          <NuxtLinkLocale
            v-for="s in sections" :key="s.key"
            :to="s.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap"
            :class="isActive(s.to) ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface hover:text-fg'"
          >
            <UIcon :name="s.icon" class="w-4 h-4 text-center shrink-0" />
            <span>{{ t(s.label) }}</span>
          </NuxtLinkLocale>
        </div>
      </nav>

      <!-- active sub-page -->
      <div class="flex-1 min-w-0">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
