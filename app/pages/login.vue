<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { isNip07Available } from '~/utils/nostr'

definePageMeta({ layout: 'auth' })
const { loginWithNsec, loginWithNpub, loginWithExtension } = useSettings()
const toast = useToast()
const router = useRouter()
const { t } = useI18n()
useHead({ title: () => `${t('auth.signIn')} · GardenOS` })

const redirectTarget = useState<string | null>('auth-redirect', () => null)
if (import.meta.client) { const r = useRoute().query.redirect; if (typeof r === 'string') redirectTarget.value = r }

const nip07 = ref(false)
onMounted(() => { nip07.value = isNip07Available() })
const tab = ref<'extension' | 'nsec' | 'npub'>('extension')
const nsecInput = ref('')
const npubInput = ref('')
const showSecret = ref(false)
const busy = ref(false)
const error = ref('')

async function redirect() { await router.push(redirectTarget.value && redirectTarget.value !== '/login' ? redirectTarget.value : '/'); redirectTarget.value = null }
async function doExtension() { error.value = ''; busy.value = true; const res = await loginWithExtension(); busy.value = false; if (!res.ok) { error.value = res.error!; return } toast.add({ title: '✓', icon: 'i-lucide-check', color: 'success' }); redirect() }
async function doNsec() { error.value = ''; busy.value = true; const res = await loginWithNsec(nsecInput.value); busy.value = false; if (!res.ok) { error.value = res.error!; return } toast.add({ title: '✓', icon: 'i-lucide-check', color: 'success' }); redirect() }
async function doNpub() { error.value = ''; busy.value = true; const res = await loginWithNpub(npubInput.value); busy.value = false; if (!res.ok) { error.value = res.error!; return } toast.add({ icon: 'i-lucide-eye', color: 'info' }); redirect() }

const tabs = computed(() => [
  { key: 'extension', label: t('auth.extension'), icon: 'i-lucide-puzzle' },
  { key: 'nsec', label: t('auth.privateKey'), icon: 'i-lucide-key-round' },
  { key: 'npub', label: t('auth.readOnly'), icon: 'i-lucide-eye' }
] as const)
</script>

<template>
  <GlassCard class="p-7">
    <div class="text-center mb-6">
      <h1 class="display-font text-2xl font-bold">{{ t('auth.signInTitle') }}</h1>
      <p class="text-sm text-muted mt-1.5">{{ t('auth.signInSub') }}</p>
    </div>

    <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app mb-5">
      <button v-for="tb in tabs" :key="tb.key" :disabled="tb.key === 'extension' && !nip07"
        class="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5"
        :class="tab === tb.key ? 'bg-surface-2 text-fg' : (tb.key === 'extension' && !nip07) ? 'text-muted-2 cursor-not-allowed' : 'text-muted'"
        @click="!(tb.key === 'extension' && !nip07) && (tab = tb.key)">
        <UIcon :name="tb.icon" class="text-[10px]" />{{ tb.label }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-negative mb-4 flex items-center gap-2"><UIcon name="i-lucide-alert-circle" class="text-xs" />{{ error }}</p>

    <div v-if="tab === 'extension'" class="space-y-4">
      <p class="text-sm text-muted">{{ t('auth.extDesc') }}</p>
      <button class="w-full btn-accent py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" :disabled="busy" @click="doExtension"><UIcon name="i-lucide-shield-check" class="text-xs" />{{ busy ? t('auth.connecting') : t('auth.connectExt') }}</button>
      <p v-if="!nip07" class="text-xs text-muted-2 text-center">{{ t('auth.noExt') }}</p>
    </div>

    <div v-else-if="tab === 'nsec'" class="space-y-4">
      <UFormField :label="t('auth.pkLabel')" :description="t('auth.pkDesc')"><UInput v-model="nsecInput" :type="showSecret ? 'text' : 'password'" placeholder="nsec1…" class="w-full font-mono" @keydown.enter="doNsec" /></UFormField>
      <div class="flex items-center gap-2">
        <button class="flex-1 btn-accent py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" :disabled="busy || !nsecInput" @click="doNsec"><UIcon name="i-lucide-log-in" class="text-xs" />{{ t('auth.signIn') }}</button>
        <button class="btn-ghost px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm" @click="showSecret = !showSecret"><UIcon :name="showSecret ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="text-xs" /></button>
      </div>
    </div>

    <div v-else class="space-y-4">
      <UFormField :label="t('auth.pubLabel')" :description="t('auth.pubDesc')"><UInput v-model="npubInput" placeholder="npub1…" class="w-full font-mono" @keydown.enter="doNpub" /></UFormField>
      <button class="w-full btn-accent py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" :disabled="busy || !npubInput" @click="doNpub"><UIcon name="i-lucide-eye" class="text-xs" />{{ t('auth.continueRo') }}</button>
    </div>

    <div class="mt-6 pt-5 border-t border-app text-center text-sm text-muted">
      {{ t('auth.noAccount') }}
      <NuxtLink to="/register" class="text-accent font-semibold hover:underline">{{ t('auth.createIdentity') }}</NuxtLink>
    </div>
  </GlassCard>
</template>
