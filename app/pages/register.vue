<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { generateKeyPair } from '~/utils/nostr'

definePageMeta({ layout: 'auth' })
const { loginWithNsec } = useSettings()
const toast = useToast()
const router = useRouter()
const { t } = useI18n()
useHead({ title: () => `${t('auth.createIdentity')} · GardenOS` })

const kp = ref<ReturnType<typeof generateKeyPair> | null>(null)
const showSecret = ref(false)
const backedUp = ref(false)
const copied = ref<'npub' | 'nsec' | null>(null)
function generate() { kp.value = generateKeyPair(); backedUp.value = false }
function copy(text: string, which: 'npub' | 'nsec') { navigator.clipboard?.writeText(text); copied.value = which; setTimeout(() => (copied.value = null), 1500) }
function download() {
  if (!kp.value) return
  const content = `GardenOS — Nostr identity backup\n\nCreated: ${new Date().toISOString()}\n\nPublic key (npub):\n${kp.value.npub}\n\nPrivate key (nsec):\n${kp.value.nsec}\n`
  const blob = new Blob([content], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `gardenos-identity-${new Date().toISOString().slice(0, 10)}.txt`; a.click(); URL.revokeObjectURL(url)
}
async function finish() { if (!kp.value || !backedUp.value) return; await loginWithNsec(kp.value.nsec); toast.add({ title: '✓', icon: 'i-lucide-party-popper', color: 'success' }); router.push('/') }
</script>

<template>
  <GlassCard class="p-7">
    <div class="text-center mb-6">
      <h1 class="display-font text-2xl font-bold">{{ t('auth.createTitle') }}</h1>
      <p class="text-sm text-muted mt-1.5">{{ t('auth.createSub') }}</p>
    </div>

    <div v-if="!kp" class="text-center py-4">
      <div class="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center accent-glow mx-auto mb-5"><UIcon name="i-lucide-key-round" class="text-[var(--bg)] text-2xl" /></div>
      <button class="btn-accent px-6 py-3 rounded-lg text-sm font-semibold inline-flex items-center gap-2" @click="generate"><UIcon name="i-lucide-sparkles" class="text-xs" />{{ t('auth.generateNew') }}</button>
    </div>

    <div v-else class="space-y-4">
      <GlassCard class="p-4" :style="{ background: 'linear-gradient(135deg, rgba(248,113,113,0.12), transparent)' }">
        <div class="flex items-start gap-2.5 text-sm"><UIcon name="i-lucide-shield-alert" class="text-negative mt-0.5 shrink-0" /><span>{{ t('auth.backupWarn') }}</span></div>
      </GlassCard>

      <UFormField :label="t('auth.pubShare')">
        <div class="flex gap-2"><UInput :model-value="kp.npub" readonly class="w-full font-mono" /><button class="btn-ghost px-3 rounded-lg shrink-0" @click="copy(kp!.npub, 'npub')"><UIcon :name="copied === 'npub' ? 'i-lucide-check' : 'i-lucide-copy'" /></button></div>
      </UFormField>
      <UFormField :label="t('auth.nsecSecret')">
        <div class="flex gap-2">
          <UInput :model-value="kp.nsec" :type="showSecret ? 'text' : 'password'" readonly class="w-full font-mono" />
          <button class="btn-ghost px-3 rounded-lg shrink-0" @click="showSecret = !showSecret"><UIcon :name="showSecret ? 'i-lucide-eye-off' : 'i-lucide-eye'" /></button>
          <button class="btn-ghost px-3 rounded-lg shrink-0" @click="copy(kp!.nsec, 'nsec')"><UIcon :name="copied === 'nsec' ? 'i-lucide-check' : 'i-lucide-copy'" /></button>
        </div>
      </UFormField>
      <button class="w-full btn-ghost py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2" @click="download"><UIcon name="i-lucide-download" class="text-xs" />{{ t('auth.download') }}</button>

      <label class="flex items-start gap-3 py-2 cursor-pointer">
        <UCheckbox v-model="backedUp" class="mt-0.5" />
        <span class="text-sm text-muted">{{ t('auth.ackBox') }}</span>
      </label>
      <button class="w-full btn-accent py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" :disabled="!backedUp" :class="{ 'opacity-40 cursor-not-allowed': !backedUp }" @click="finish"><UIcon name="i-lucide-arrow-right" class="text-xs" />{{ t('auth.enter') }}</button>
    </div>

    <div class="mt-6 pt-5 border-t border-app text-center text-sm text-muted">
      {{ t('auth.haveAccount') }}
      <NuxtLink to="/login" class="text-accent font-semibold hover:underline">{{ t('auth.signIn') }}</NuxtLink>
    </div>
  </GlassCard>
</template>
