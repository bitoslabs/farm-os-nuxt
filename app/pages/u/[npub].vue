<script setup lang="ts">
import { useNostr } from '~/composables/useNostr'
import { parseKey, shortenNpub } from '~/utils/nostr'
import { GARDEN_KINDS, getGardenKindName } from '~/types/garden-kinds'

const route = useRoute()
const router = useRouter()
const { fetchProfile, fetchEvents } = useNostr()
const { t } = useI18n()

definePageMeta({ public: true })
const raw = computed(() => String(route.params.npub))
const parsed = computed(() => parseKey(raw.value))
const pubkey = computed(() => parsed.value?.pubkey ?? '')
useHead({ title: () => `${t('profile.publicProfile')} · GardenOS` })

const loading = ref(true)
const profile = ref<{ name?: string; about?: string; picture?: string } | null>(null)
const events = ref<any[]>([])
const error = ref('')

async function load() {
  if (!pubkey.value) { error.value = t('profile.invalid'); loading.value = false; return }
  loading.value = true; error.value = ''
  try {
    const [p, evs] = await Promise.all([
      fetchProfile(pubkey.value),
      fetchEvents({ authors: [pubkey.value], kinds: [0, GARDEN_KINDS.FARM_PROFILE, GARDEN_KINDS.FIELD_PLOT, GARDEN_KINDS.PLANTING_RECORD, GARDEN_KINDS.HARVEST_RECORD, GARDEN_KINDS.CROP_VARIETY], limit: 60 })
    ])
    profile.value = p; events.value = evs.sort((a, b) => b.created_at - a.created_at)
  } catch (e: any) { error.value = e?.message ?? t('profile.invalid') } finally { loading.value = false }
}
onMounted(load); watch(pubkey, load)

const kindCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const e of events.value) { if (e.kind === 0) continue; const n = getGardenKindName(e.kind) ?? `kind ${e.kind}`; counts[n] = (counts[n] || 0) + 1 }
  return counts
})
const farmProfile = computed(() => events.value.find((e) => e.kind === GARDEN_KINDS.FARM_PROFILE))
const farmMeta = computed(() => { try { return farmProfile.value ? JSON.parse(farmProfile.value.content) : null } catch { return null } })
const displayName = computed(() => profile.value?.name || farmProfile.value?.tags.find((tg: string[]) => tg[0] === 'name')?.[1] || t('profile.anonymous'))
const totalEvents = computed(() => events.value.filter((e) => e.kind !== 0).length)
</script>

<template>
  <div>
    <PageHeader :eyebrow="t('profile.eyebrow')" :title="displayName" :subtitle="pubkey ? shortenNpub(raw) : t('profile.publicProfile')">
      <template #actions>
        <button class="btn-ghost px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" @click="router.back()"><UIcon name="i-lucide-arrow-left" class="text-xs" />{{ t('profile.back') }}</button>
      </template>
    </PageHeader>

    <GlassCard v-if="loading" class="p-12">
      <div class="flex flex-col items-center gap-3 text-muted"><UIcon name="i-lucide-loader-circle" class="text-2xl animate-spin text-accent" /><span class="text-sm">{{ t('profile.loading') }}</span></div>
    </GlassCard>

    <GlassCard v-else-if="error" class="p-12"><EmptyState icon="i-lucide-user-x" :title="error" :description="t('profile.invalidDesc')" /></GlassCard>

    <template v-else>
      <GlassCard class="p-6 mb-6 flex items-center gap-5 flex-wrap">
        <UAvatar :src="profile?.picture" :alt="displayName" size="3xl" class="avatar-grad ring-2 ring-[var(--accent)]" />
        <div class="flex-1 min-w-[200px]">
          <h2 class="display-font text-2xl font-bold">{{ displayName }}</h2>
          <div class="text-xs text-muted font-mono mt-1">{{ shortenNpub(raw) }}</div>
          <p v-if="profile?.about" class="text-sm text-muted mt-2">{{ profile.about }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 min-w-[220px]">
          <div class="bg-surface-2 rounded-xl p-3 text-center"><div class="display-font text-xl font-bold text-accent">{{ totalEvents }}</div><div class="text-[11px] text-muted">{{ t('profile.events') }}</div></div>
          <div class="bg-surface-2 rounded-xl p-3 text-center"><div class="display-font text-xl font-bold">{{ Object.keys(kindCounts).length }}</div><div class="text-[11px] text-muted">{{ t('profile.types') }}</div></div>
        </div>
      </GlassCard>

      <GlassCard v-if="farmMeta" class="p-6 mb-6">
        <div class="flex items-center gap-2 mb-3"><UIcon name="i-lucide-tractor" class="text-accent" /><h3 class="font-semibold">{{ t('profile.farm') }}</h3></div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div v-if="farmMeta.location"><div class="text-xs text-muted">{{ t('common.location') }}</div><div class="font-medium">{{ farmMeta.location }}</div></div>
          <div v-if="farmProfile?.tags.find((tg:any)=>tg[0]==='owner')?.[1]"><div class="text-xs text-muted">{{ t('common.owner') }}</div><div class="font-medium">{{ farmProfile.tags.find((tg:any)=>tg[0]==='owner')[1] }}</div></div>
          <div v-if="farmMeta.totalArea"><div class="text-xs text-muted">{{ t('common.area') }}</div><div class="font-medium">{{ farmMeta.totalArea }} {{ farmMeta.areaUnit }}</div></div>
          <div v-if="farmProfile?.tags.find((tg:any)=>tg[0]==='mode')?.[1]"><div class="text-xs text-muted">{{ t('common.mode') }}</div><div class="font-medium capitalize">{{ farmProfile.tags.find((tg:any)=>tg[0]==='mode')[1] }}</div></div>
        </div>
      </GlassCard>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard class="p-6">
          <h3 class="font-semibold mb-4">{{ t('profile.publishedByType') }}</h3>
          <div v-if="Object.keys(kindCounts).length" class="space-y-2">
            <div v-for="(count, kind) in kindCounts" :key="kind" class="flex items-center justify-between text-sm"><span class="text-muted font-mono text-xs">{{ String(kind).replace(/_/g,' ').toLowerCase() }}</span><span class="font-semibold">{{ count }}</span></div>
          </div>
          <p v-else class="text-sm text-muted-2">{{ t('profile.noRecords') }}</p>
        </GlassCard>

        <GlassCard class="p-6 lg:col-span-2">
          <h3 class="font-semibold mb-4">{{ t('profile.recent') }} <span class="text-xs text-muted-2 font-normal">· {{ t('profile.recentHint') }}</span></h3>
          <div v-if="events.filter(e=>e.kind!==0).length" class="space-y-2 max-h-96 overflow-y-auto">
            <div v-for="e in events.filter(e=>e.kind!==0).slice(0,20)" :key="e.id" class="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2">
              <UIcon name="i-lucide-hash" class="text-muted-2 text-xs" />
              <div class="flex-1 min-w-0"><div class="text-xs font-mono text-muted">kind {{ e.kind }} · {{ getGardenKindName(e.kind) }}</div><div class="text-[11px] text-muted-2 truncate">{{ e.content?.slice(0,80) }}</div></div>
              <span class="text-[10px] text-muted-2">{{ new Date(e.created_at*1000).toLocaleDateString() }}</span>
            </div>
          </div>
          <p v-else class="text-sm text-muted-2">{{ t('profile.noPublished') }}</p>
        </GlassCard>
      </div>
    </template>
  </div>
</template>
