<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'

const { settings, addRelay, updateRelay, removeRelay } = useSettings()
const toast = useToast()
const { t } = useI18n()
const newUrl = ref('')

const status = ref<Record<string, 'connected' | 'connecting' | 'offline'>>({})
onMounted(() => { for (const r of settings.value.relays) { status.value[r.url] = 'connecting'; setTimeout(() => (status.value[r.url] = 'connected'), 800 + Math.random() * 1200) } })
watch(() => settings.value.relays.map((r) => r.url), (urls, old = []) => { for (const u of urls) if (!status.value[u]) { status.value[u] = 'connecting'; setTimeout(() => (status.value[u] = 'connected'), 1000) } for (const o of old) if (!urls.includes(o)) delete status.value[o] }, { deep: true })
const statusMeta = { connected: { label: t('sec.connected'), dot: 'var(--positive)' }, connecting: { label: t('sec.connecting'), dot: 'var(--warning)' }, offline: { label: t('sec.offline'), dot: 'var(--muted-2)' } }
function isWss(url: string) { return /^wss?:\/\/.+/i.test(url.trim()) }
function add() { if (!isWss(newUrl.value)) { toast.add({ icon: 'i-lucide-alert-circle', color: 'error' }); return } addRelay(newUrl.value.trim()); newUrl.value = '' }
const readCount = computed(() => settings.value.relays.filter((r) => r.enabled && r.read).length)
const writeCount = computed(() => settings.value.relays.filter((r) => r.enabled && r.write).length)
</script>

<template>
  <SettingsSection icon="i-lucide-radio" :title="t('sec.relaysTitle')" :description="t('sec.relaysDesc')">
    <GlassCard class="p-6">
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-surface-2 rounded-xl p-3"><div class="text-xs text-muted mb-1">{{ t('common.total') }}</div><div class="font-semibold">{{ settings.relays.length }}</div></div>
        <div class="bg-surface-2 rounded-xl p-3"><div class="text-xs text-muted mb-1">{{ t('sec.relaysRead') }}</div><div class="font-semibold text-info">{{ readCount }}</div></div>
        <div class="bg-surface-2 rounded-xl p-3"><div class="text-xs text-muted mb-1">{{ t('sec.relaysWrite') }}</div><div class="font-semibold text-accent">{{ writeCount }}</div></div>
      </div>

      <div class="space-y-2">
        <div v-for="r in settings.relays" :key="r.url" class="flex items-center gap-3 p-3 rounded-xl bg-surface-2">
          <span class="w-2.5 h-2.5 rounded-full pulse-dot shrink-0" :style="{ background: statusMeta[status[r.url] ?? 'offline'].dot }" />
          <div class="flex-1 min-w-0"><div class="text-sm font-mono truncate">{{ r.url }}</div><div class="text-[11px]" :style="{ color: statusMeta[status[r.url] ?? 'offline'].dot }">{{ statusMeta[status[r.url] ?? 'offline'].label }}</div></div>
          <div class="flex items-center gap-1">
            <UTooltip :text="t('sec.relaysRead')"><button class="px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition" :class="r.read ? 'bg-accent-dim text-accent' : 'bg-surface text-muted-2'" @click="updateRelay(r.url, { read: !r.read })">R</button></UTooltip>
            <UTooltip :text="t('sec.relaysWrite')"><button class="px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition" :class="r.write ? 'bg-accent-dim text-accent' : 'bg-surface text-muted-2'" @click="updateRelay(r.url, { write: !r.write })">W</button></UTooltip>
            <USwitch :model-value="r.enabled" @update:model-value="updateRelay(r.url, { enabled: $event })" />
            <button class="w-8 h-8 rounded-md flex items-center justify-center text-muted-2 hover:text-negative transition" @click="removeRelay(r.url)"><UIcon name="i-lucide-trash-2" class="text-xs" /></button>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mt-5">
        <UInput v-model="newUrl" placeholder="wss://relay.example.com" class="flex-1 font-mono" @keydown.enter="add" />
        <button class="btn-accent px-4 rounded-lg text-sm font-semibold flex items-center gap-2" @click="add"><UIcon name="i-lucide-plus" class="text-xs" />{{ t('sec.addRelay') }}</button>
      </div>
      <p class="text-[11px] text-muted-2 mt-3 flex items-center gap-1.5"><UIcon name="i-lucide-info" class="text-[10px]" /> relay.damus.io · nos.lol · relay.nostr.band · offchain.pub</p>
    </GlassCard>
  </SettingsSection>
</template>
