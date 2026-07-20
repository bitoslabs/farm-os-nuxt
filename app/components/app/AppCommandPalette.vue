<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useSettings } from '~/composables/useSettings'

/**
 * Global command palette (Cmd/Ctrl+K). Searches nav, farm records, and
 * quick actions. Mounted in the default layout.
 */
const store = useGardenStore()
const { isLoggedIn } = useSettings()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const open = useState<boolean>('cmdk-open', () => false)
defineShortcuts({
  meta_k: () => (open.value = true),
  ctrl_k: () => (open.value = true)
})

function go(to: string) {
  open.value = false
  router.push(to)
}
function action(label: string, to?: string) {
  open.value = false
  if (to) router.push(to)
  toast.add({ title: label, icon: 'i-lucide-zap', color: 'info' })
}

const groups = computed(() => {
  const nav: any[] = []
  const { groups: navGroups } = useNav()
  for (const g of navGroups.value) for (const l of g.links) {
    nav.push({ label: t(l.label), icon: l.icon, onSelect: () => go(l.to) })
  }

  const records: any[] = []
  for (const p of store.plots.value) records.push({ label: p.name, suffix: t('palette.plot'), icon: 'i-lucide-map-pin', onSelect: () => go('/land') })
  for (const c of store.crops.value) records.push({ label: c.name, suffix: t('palette.crop'), icon: 'i-lucide-wheat', onSelect: () => go('/crops') })
  for (const a of store.assets.value) records.push({ label: a.name, suffix: t('palette.asset'), icon: 'i-lucide-tractor', onSelect: () => go('/assets') })
  for (const t2 of store.tasks.value.slice(0, 12)) records.push({ label: t2.title, suffix: t('palette.task'), icon: 'i-lucide-list-checks', onSelect: () => go('/tasks') })

  const actions: any[] = [
    { label: t('palette.addPlanting'), icon: 'i-lucide-sprout', onSelect: () => go('/plantings') },
    { label: t('palette.recordHarvest'), icon: 'i-lucide-shopping-basket', onSelect: () => go('/harvest') },
    { label: t('palette.addTask'), icon: 'i-lucide-plus', onSelect: () => go('/tasks') },
    { label: t('palette.addSpace'), icon: 'i-lucide-map-pinned', onSelect: () => go('/land') },
    { label: t('palette.addFinance'), icon: 'i-lucide-banknote', onSelect: () => go('/finance') },
    { label: t('palette.addAsset'), icon: 'i-lucide-tractor', onSelect: () => go('/assets') },
    { label: t('palette.openSettings'), icon: 'i-lucide-settings', onSelect: () => go('/settings') }
  ]
  if (!isLoggedIn.value) {
    actions.unshift(
      { label: t('palette.signIn'), icon: 'i-lucide-log-in', onSelect: () => go('/login') },
      { label: t('palette.createIdentity'), icon: 'i-lucide-user-plus', onSelect: () => go('/register') }
    )
  }

  return [
    { id: 'nav', label: t('palette.navigation'), items: nav },
    { id: 'actions', label: t('palette.actions'), items: actions },
    { id: 'records', label: t('palette.records'), items: records }
  ]
})

const selected = ref()
watch(selected, (v) => { if (v) selected.value = null })
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-2xl' }" title="Command palette">
    <template #body>
      <UCommandPalette
        :groups="groups"
        v-model="selected"
        :placeholder="t('palette.placeholder')"
        class="h-80"
        :ui="{ input: 'text-base' }"
      />
    </template>
  </UModal>
</template>
