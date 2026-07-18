<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { isNip07Available, encodeNsec } from '~/utils/nostr'

const { settings, isLoggedIn, npub, loginWithNsec, loginWithNpub, loginWithExtension, generateNewIdentity, updateProfile, logout, locked, setPassphrase, unlock, lock, disableEncryption } = useSettings()
const toast = useToast()
const { t } = useI18n()

const passphrase = ref('')
const unlockPass = ref('')
const secMsg = ref('')
const secBusy = ref(false)
async function enableLock() { secMsg.value = ''; secBusy.value = true; const r = await setPassphrase(passphrase.value); secBusy.value = false; if (!r.ok) { secMsg.value = r.error!; return } passphrase.value = ''; toast.add({ title: '✓', icon: 'i-lucide-shield-check', color: 'success' }) }
async function doUnlock() { secMsg.value = ''; secBusy.value = true; const r = await unlock(unlockPass.value); secBusy.value = false; if (!r.ok) { secMsg.value = r.error!; return } unlockPass.value = ''; toast.add({ title: '✓', icon: 'i-lucide-unlock', color: 'success' }) }
function removeLock() { disableEncryption(); toast.add({ icon: 'i-lucide-shield-off', color: 'warning' }) }

const showKey = ref(false)
const backedUpNsec = computed(() => settings.value.identity.secretKey ? encodeNsec(settings.value.identity.secretKey) : '')
function downloadIdentity() {
  const id = settings.value.identity
  if (!id.secretKey || !id.pubkey) return
  const content = `GardenOS — Nostr identity backup\n\nCreated: ${new Date().toISOString()}\n\nPublic key (npub):\n${id.npub ?? npub.value}\n\nPrivate key (nsec):\n${backedUpNsec.value}\n`
  const blob = new Blob([content], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `gardenos-identity-${new Date().toISOString().slice(0, 10)}.txt`; a.click(); URL.revokeObjectURL(url)
}

const nip07 = ref(false)
onMounted(() => { nip07.value = isNip07Available() })
const tab = ref<'extension' | 'nsec' | 'npub' | 'new'>('extension')
const nsecInput = ref(''); const npubInput = ref(''); const errorMsg = ref(''); const busy = ref(false)
const generated = ref<{ nsec: string; npub: string } | null>(null)
const showSecret = ref(false)
const copied = ref<'npub' | 'nsec' | null>(null)

async function doLoginNsec() { errorMsg.value = ''; busy.value = true; const res = await loginWithNsec(nsecInput.value); busy.value = false; if (!res.ok) errorMsg.value = res.error!; else { nsecInput.value = ''; toast.add({ icon: 'i-lucide-check', color: 'success' }) } }
async function doLoginNpub() { errorMsg.value = ''; busy.value = true; const res = await loginWithNpub(npubInput.value); busy.value = false; if (!res.ok) errorMsg.value = res.error!; else { npubInput.value = ''; toast.add({ icon: 'i-lucide-eye', color: 'info' }) } }
async function doLoginExtension() { errorMsg.value = ''; busy.value = true; const res = await loginWithExtension(); busy.value = false; if (!res.ok) errorMsg.value = res.error!; else toast.add({ icon: 'i-lucide-check', color: 'success' }) }
function doGenerate() { const kp = generateNewIdentity(); generated.value = { nsec: kp.nsec, npub: kp.npub }; showSecret.value = false; toast.add({ icon: 'i-lucide-key', color: 'warning' }) }
function copy(text: string, which: 'npub' | 'nsec') { navigator.clipboard?.writeText(text); copied.value = which; setTimeout(() => (copied.value = null), 1500) }

const tabs = computed(() => [
  { key: 'extension', label: t('auth.extension'), icon: 'i-lucide-puzzle', disabled: !nip07.value },
  { key: 'nsec', label: t('auth.privateKey'), icon: 'i-lucide-key-round' },
  { key: 'npub', label: t('auth.readOnly'), icon: 'i-lucide-eye' },
  { key: 'new', label: t('auth.createNew'), icon: 'i-lucide-user-plus' }
] as const)
const methodDesc = computed(() => settings.value.identity.method === 'nsec' ? t('sec.readWrite') : settings.value.identity.method === 'nip07' ? t('sec.extManaged') : t('sec.readOnlyMode'))
</script>

<template>
  <SettingsSection icon="i-lucide-key-round" :title="t('sec.accountTitle')" :description="t('sec.accountDesc')">
    <GlassCard v-if="isLoggedIn" class="p-6">
      <div class="flex items-center gap-4 flex-wrap">
        <UAvatar :src="settings.identity.picture" :alt="settings.identity.name || 'G'" size="xl" class="avatar-grad ring-2 ring-[var(--accent)]" />
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-lg">{{ settings.identity.name || t('account.anonymous') }}</div>
          <button class="text-xs text-muted hover:text-accent flex items-center gap-1.5 mt-0.5 font-mono" @click="copy(npub, 'npub')">
            <UIcon :name="copied === 'npub' ? 'i-lucide-check' : 'i-lucide-copy'" class="text-[10px]" />{{ npub.slice(0, 20) }}…{{ npub.slice(-8) }}
          </button>
          <div class="mt-1.5 flex items-center gap-2">
            <UBadge variant="subtle" color="success" class="capitalize">{{ settings.identity.method }}</UBadge>
            <span class="text-[11px] text-muted-2">{{ methodDesc }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink :to="`/u/${npub}`" class="btn-ghost px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><UIcon name="i-lucide-external-link" class="text-xs" />{{ t('account.publicProfile') }}</NuxtLink>
          <button class="btn-ghost px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-negative" @click="logout"><UIcon name="i-lucide-log-out" class="text-xs" />{{ t('sec.signOut') }}</button>
        </div>
      </div>

      <div class="mt-6 pt-6 border-t border-app space-y-4">
        <div class="text-xs text-muted uppercase tracking-wider font-semibold">{{ t('sec.metaTitle') }}</div>
        <UFormField :label="t('sec.displayName')"><UInput :model-value="settings.identity.name" @update:model-value="updateProfile({ name: $event })" class="w-full" /></UFormField>
        <UFormField :label="t('sec.avatarUrl')"><UInput :model-value="settings.identity.picture" @update:model-value="updateProfile({ picture: $event })" placeholder="https://…" class="w-full" /></UFormField>
        <UFormField :label="t('sec.about')"><UTextarea :model-value="settings.identity.about" @update:model-value="updateProfile({ about: $event })" :rows="2" class="w-full" /></UFormField>
      </div>

      <div v-if="settings.identity.method === 'nsec' && backedUpNsec" class="mt-6 pt-6 border-t border-app">
        <div class="flex items-center gap-2 mb-1"><UIcon name="i-lucide-shield-check" class="text-accent" /><div class="text-xs text-muted uppercase tracking-wider font-semibold">{{ t('sec.security') }}</div></div>
        <p class="text-xs text-muted mb-4">{{ t('sec.securityDesc') }}</p>
        <UFormField :label="t('sec.yourNsec')">
          <div class="flex gap-2">
            <UInput :model-value="backedUpNsec" :type="showKey ? 'text' : 'password'" readonly class="w-full font-mono" />
            <button class="btn-ghost px-3 rounded-lg shrink-0" @click="showKey = !showKey"><UIcon :name="showKey ? 'i-lucide-eye-off' : 'i-lucide-eye'" /></button>
            <button class="btn-ghost px-3 rounded-lg shrink-0" @click="copy(backedUpNsec, 'nsec')"><UIcon :name="copied === 'nsec' ? 'i-lucide-check' : 'i-lucide-copy'" /></button>
          </div>
        </UFormField>
        <button class="mt-3 btn-ghost px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" @click="downloadIdentity"><UIcon name="i-lucide-download" class="text-xs" />{{ t('auth.download') }}</button>
        <p class="text-[11px] text-muted-2 mt-3 flex items-start gap-1.5"><UIcon name="i-lucide-info" class="text-[10px] mt-0.5" /> {{ t('sec.neverShare') }}</p>
      </div>

      <div v-if="settings.identity.method === 'nsec'" class="mt-6 pt-6 border-t border-app">
        <div class="flex items-center gap-2 mb-1"><UIcon name="i-lucide-lock" class="text-accent" /><div class="text-xs text-muted uppercase tracking-wider font-semibold">{{ t('sec.passphrase') }}</div></div>
        <p class="text-xs text-muted mb-4">{{ t('sec.passphraseDesc') }}</p>
        <p v-if="secMsg" class="text-xs text-negative mb-3 flex items-center gap-1.5"><UIcon name="i-lucide-alert-circle" class="text-[10px]" />{{ secMsg }}</p>

        <div v-if="!settings.identity.encrypted">
          <UFormField :label="t('sec.setPassphrase')"><UInput v-model="passphrase" type="password" class="w-full" @keydown.enter="enableLock" /></UFormField>
          <button class="mt-3 btn-accent px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2" :disabled="secBusy || !passphrase" @click="enableLock"><UIcon name="i-lucide-shield-check" class="text-xs" />{{ t('sec.enable') }}</button>
        </div>

        <div v-else-if="locked">
          <GlassCard class="p-4 mb-3" :style="{ background: 'linear-gradient(135deg, var(--accent-dim), transparent)' }"><div class="flex items-center gap-2 text-sm"><UIcon name="i-lucide-lock" class="text-accent" /><span>{{ t('sec.lockedMsg') }}</span></div></GlassCard>
          <UFormField :label="t('sec.passphrase')"><UInput v-model="unlockPass" type="password" class="w-full" @keydown.enter="doUnlock" /></UFormField>
          <button class="mt-3 btn-accent px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2" :disabled="secBusy || !unlockPass" @click="doUnlock"><UIcon name="i-lucide-unlock" class="text-xs" />{{ t('sec.unlock') }}</button>
        </div>

        <div v-else class="flex items-center gap-2 flex-wrap">
          <UBadge variant="subtle" color="success"><UIcon name="i-lucide-shield-check" class="mr-1" />{{ t('sec.protectedUnlocked') }}</UBadge>
          <button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" @click="lock"><UIcon name="i-lucide-lock" class="text-[10px]" />{{ t('sec.lockNow') }}</button>
          <button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium text-negative flex items-center gap-1.5" @click="removeLock"><UIcon name="i-lucide-shield-off" class="text-[10px]" />{{ t('sec.removePass') }}</button>
        </div>
      </div>
    </GlassCard>

    <div v-else>
      <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app w-fit mb-5 flex-wrap">
        <button v-for="tb in tabs" :key="tb.key" :disabled="tb.disabled" class="px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5" :class="tab === tb.key ? 'bg-surface-2 text-fg' : tb.disabled ? 'text-muted-2 cursor-not-allowed' : 'text-muted'" @click="!tb.disabled && (tab = tb.key)"><UIcon :name="tb.icon" class="text-[10px]" />{{ tb.label }}</button>
      </div>
      <p v-if="errorMsg" class="text-sm text-negative mb-4 flex items-center gap-2"><UIcon name="i-lucide-alert-circle" class="text-xs" />{{ errorMsg }}</p>

      <GlassCard class="p-6">
        <div v-if="tab === 'extension'">
          <div class="flex items-center gap-3 mb-4"><UIcon name="i-lucide-puzzle" class="text-accent text-xl" /><div><div class="font-semibold">{{ t('sec.extCard') }}</div><div class="text-xs text-muted">{{ t('sec.extCardDesc') }}</div></div></div>
          <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" :disabled="busy" @click="doLoginExtension"><UIcon name="i-lucide-shield-check" class="text-xs" />{{ busy ? t('auth.connecting') : t('sec.connectExt') }}</button>
          <p v-if="!nip07" class="text-xs text-muted-2 mt-4">{{ t('auth.noExt') }}</p>
        </div>

        <div v-else-if="tab === 'nsec'">
          <UFormField :label="t('sec.pkField')" :description="t('sec.pkStored')"><UInput v-model="nsecInput" :type="showSecret ? 'text' : 'password'" placeholder="nsec1…" class="w-full font-mono" /></UFormField>
          <div class="flex items-center gap-2 mt-4">
            <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" :disabled="busy || !nsecInput" @click="doLoginNsec"><UIcon name="i-lucide-log-in" class="text-xs" />{{ t('auth.signIn') }}</button>
            <button class="btn-ghost px-3 py-2.5 rounded-lg text-sm flex items-center gap-2" @click="showSecret = !showSecret"><UIcon :name="showSecret ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="text-xs" />{{ showSecret ? t('auth.hide') : t('auth.show') }}</button>
          </div>
        </div>

        <div v-else-if="tab === 'npub'">
          <UFormField :label="t('sec.pubField')" :description="t('sec.pubRo')"><UInput v-model="npubInput" placeholder="npub1…" class="w-full font-mono" /></UFormField>
          <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 mt-4" :disabled="busy || !npubInput" @click="doLoginNpub"><UIcon name="i-lucide-eye" class="text-xs" />{{ t('account.publicProfile') }}</button>
        </div>

        <div v-else>
          <div class="flex items-center gap-3 mb-4"><UIcon name="i-lucide-sparkles" class="text-accent text-xl" /><div><div class="font-semibold">{{ t('auth.generateNew') }}</div><div class="text-xs text-muted">{{ t('auth.generateDesc') }}</div></div></div>
          <button v-if="!generated" class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="doGenerate"><UIcon name="i-lucide-plus" class="text-xs" />{{ t('sec.generateKeypair') }}</button>
          <div v-else class="space-y-4">
            <GlassCard class="p-4" :style="{ background: 'linear-gradient(135deg, rgba(248,113,113,0.10), transparent)' }"><div class="flex items-start gap-2 text-sm"><UIcon name="i-lucide-shield-alert" class="text-negative mt-0.5" /><span>{{ t('auth.backupWarn') }}</span></div></GlassCard>
            <UFormField :label="t('auth.pubShare')"><div class="flex gap-2"><UInput :model-value="generated.npub" readonly class="w-full font-mono" /><button class="btn-ghost px-3 rounded-lg" @click="copy(generated!.npub, 'npub')"><UIcon :name="copied === 'npub' ? 'i-lucide-check' : 'i-lucide-copy'" /></button></div></UFormField>
            <UFormField :label="t('auth.nsecSecret')"><div class="flex gap-2"><UInput :model-value="generated.nsec" :type="showSecret ? 'text' : 'password'" readonly class="w-full font-mono" /><button class="btn-ghost px-3 rounded-lg" @click="showSecret = !showSecret"><UIcon :name="showSecret ? 'i-lucide-eye-off' : 'i-lucide-eye'" /></button><button class="btn-ghost px-3 rounded-lg" @click="copy(generated!.nsec, 'nsec')"><UIcon :name="copied === 'nsec' ? 'i-lucide-check' : 'i-lucide-copy'" /></button></div></UFormField>
          </div>
        </div>
      </GlassCard>
    </div>
  </SettingsSection>
</template>
