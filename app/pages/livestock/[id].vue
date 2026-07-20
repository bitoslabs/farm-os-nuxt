<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import type { LivestockMovementType, HealthType, ProductType } from '~/types/garden'

const route = useRoute()
const store = useGardenStore()
const { number, currency, date: fmtDate, relTime } = useFormat()
const { t } = useI18n()
const toast = useToast()

const id = computed(() => String(route.params.id))
const animal = computed(() => store.livestockById.value[id.value])

useHead({ title: () => `${animal.value?.name ?? t('livestock.title')} · GardenOS` })

const speciesIcon: Record<string, string> = { chicken: 'i-lucide-egg', duck: 'i-lucide-egg', cow: 'i-lucide-paw-print', pig: 'i-lucide-paw-print', goat: 'i-lucide-paw-print', sheep: 'i-lucide-paw-print', fish: 'i-lucide-fish', other: 'i-lucide-paw-print' }
const statusColor: Record<string, string> = { active: 'success', sold: 'neutral', deceased: 'negative', transferred: 'warning' }
const isActive = computed(() => animal.value?.status === 'active')
const parentAnimal = computed(() => animal.value?.parentAnimalId ? store.livestockById.value[animal.value.parentAnimalId] : undefined)
const offspring = computed(() => store.livestock.value.filter((entry) => entry.parentAnimalId === id.value))

const movements = computed(() => store.livestockMovements.value.filter((m) => m.animalId === id.value))
const health = computed(() => store.livestockHealth.value.filter((h) => h.animalId === id.value).sort((a, b) => b.date.localeCompare(a.date)))
const production = computed(() => store.livestockProduction.value.filter((p) => p.animalId === id.value).sort((a, b) => b.date.localeCompare(a.date)))
const finance = computed(() => store.finance.value.filter((f) => f.sourceType === 'livestock' && movements.value.some((m) => m.id === f.sourceId)).sort((a, b) => b.date.localeCompare(a.date)))

const healthCost = computed(() => health.value.reduce((s, h) => s + (h.cost ?? 0), 0))
const lastEvent = computed(() => {
  const dates = [...movements.value.map((m) => m.date), ...health.value.map((h) => h.date), ...production.value.map((p) => p.date)]
  return dates.length ? dates.sort().reverse()[0] : undefined
})

// ---- movement modal ----
const moveOpen = ref(false)
const moveType = ref<LivestockMovementType>('sale')
function openMovement(type: LivestockMovementType) { moveType.value = type; moveOpen.value = true }
const birthOpen = ref(false)

// ---- health modal ----
const healthOpen = ref(false)
const healthForm = reactive({ type: 'checkup' as HealthType, severity: 'low' as 'low' | 'medium' | 'high', description: '', cost: 0, vetName: '', date: new Date().toISOString().slice(0, 10) })
function openHealth() { Object.assign(healthForm, { type: 'checkup', severity: 'low', description: '', cost: 0, vetName: '', date: new Date().toISOString().slice(0, 10) }); healthOpen.value = true }
function saveHealth() {
  if (!healthForm.description.trim()) return
  store.addHealthLog({ animalId: id.value, type: healthForm.type, severity: healthForm.severity, description: healthForm.description, cost: healthForm.cost || undefined, vetName: healthForm.vetName || undefined, date: new Date(healthForm.date).toISOString() })
  healthOpen.value = false; toast.add({ title: t('crud.created'), icon: 'i-lucide-stethoscope', color: 'success' })
}

// ---- production modal ----
const prodOpen = ref(false)
const prodForm = reactive({ product: 'eggs' as ProductType, quantity: 1, unit: 'piece' as const, date: new Date().toISOString().slice(0, 10), notes: '' })
function openProduction() { Object.assign(prodForm, { product: 'eggs', quantity: 1, unit: 'piece', date: new Date().toISOString().slice(0, 10), notes: '' }); prodOpen.value = true }
function saveProduction() {
  store.addProductionLog({ animalId: id.value, product: prodForm.product, quantity: prodForm.quantity, unit: prodForm.unit, date: new Date(prodForm.date).toISOString(), notes: prodForm.notes || undefined })
  prodOpen.value = false; toast.add({ title: t('crud.created'), icon: 'i-lucide-egg', color: 'success' })
}

const tab = ref<'history' | 'health' | 'production' | 'finance'>('history')
const healthTypeOpts = computed(() => (['vaccination', 'treatment', 'checkup', 'illness'] as HealthType[]).map((x) => ({ label: t('enums.healthType.' + x), value: x })))
const productOpts = computed(() => (['eggs', 'milk', 'wool', 'meat', 'offspring', 'other'] as ProductType[]).map((p) => ({ label: t('enums.product.' + p), value: p })))
const unitOpts = computed(() => ['piece', 'kg', 'g', 'liter', 'bunch'].map((u) => ({ label: t('enums.unit.' + u), value: u })))
</script>

<template>
  <div v-if="animal">
    <NuxtLinkLocale to="/livestock" class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4"><UIcon name="i-lucide-arrow-left" class="text-xs" />{{ t('livestock.title') }}</NuxtLinkLocale>

    <!-- header -->
    <div class="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center"><UIcon :name="speciesIcon[animal.species]" class="text-accent text-2xl" /></div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="display-font text-2xl font-bold">{{ animal.name }}</h1>
            <UBadge variant="subtle" :color="statusColor[animal.status]">{{ t('enums.livestockStatus.' + animal.status) }}</UBadge>
          </div>
          <div class="text-sm text-muted mt-0.5">{{ t('enums.species.' + animal.species) }}<span v-if="animal.breed"> · {{ animal.breed }}</span> · {{ number(animal.count) }} {{ t('livestock.head') }}</div>
        </div>
      </div>
      <div v-if="isActive" class="flex items-center gap-2 flex-wrap">
        <button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" @click="openHealth"><UIcon name="i-lucide-stethoscope" class="text-[10px]" />{{ t('livestock.healthLog') }}</button>
        <button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" @click="openProduction"><UIcon name="i-lucide-egg" class="text-[10px]" />{{ t('livestock.productionLog') }}</button>
        <button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" @click="birthOpen = true"><UIcon name="i-lucide-baby" class="text-[10px]" />{{ t('livestock.recordBirth') }}</button>
        <button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" @click="openMovement('sale')"><UIcon name="i-lucide-hand-coins" class="text-[10px]" />{{ t('livestock.recordSale') }}</button>
        <button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" @click="openMovement('death')"><UIcon name="i-lucide-skull" class="text-[10px]" />{{ t('livestock.recordDeath') }}</button>
        <button class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5" @click="openMovement('transfer_out')"><UIcon name="i-lucide-arrow-up-from-line" class="text-[10px]" />{{ t('livestock.recordTransfer') }}</button>
      </div>
    </div>

    <GlassCard v-if="parentAnimal || offspring.length" class="p-4 mb-6">
      <div v-if="parentAnimal" class="flex items-center justify-between gap-4">
        <div><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('livestock.parent') }}</div><div class="font-semibold">{{ parentAnimal.name }}</div></div>
        <NuxtLink :to="`/livestock/${parentAnimal.id}`" class="btn-ghost px-3 py-2 rounded-lg text-xs font-medium">{{ t('livestock.viewDetail') }}</NuxtLink>
      </div>
      <div v-if="parentAnimal && offspring.length" class="my-4 border-t border-app" />
      <div v-if="offspring.length">
        <div class="text-xs text-muted uppercase tracking-wider mb-2">{{ t('livestock.offspring') }} · {{ offspring.length }}</div>
        <div class="flex flex-wrap gap-2"><NuxtLink v-for="child in offspring" :key="child.id" :to="`/livestock/${child.id}`" class="px-3 py-2 rounded-lg bg-surface-2 text-sm font-medium hover:bg-surface">{{ child.name }} <span class="text-muted">· {{ number(child.count) }}</span></NuxtLink></div>
      </div>
    </GlassCard>

    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <GlassCard class="p-4"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('livestock.currentCount') }}</div><div class="display-font text-2xl font-bold">{{ number(animal.count) }}</div></GlassCard>
      <GlassCard class="p-4"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('livestock.title') }}</div><div class="display-font text-2xl font-bold text-accent">{{ production.length }}</div></GlassCard>
      <GlassCard class="p-4"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('livestock.healthCost') }}</div><div class="display-font text-2xl font-bold text-negative">{{ currency(healthCost) }}</div></GlassCard>
      <GlassCard class="p-4"><div class="text-xs text-muted uppercase tracking-wider mb-1">{{ t('livestock.lastEvent') }}</div><div class="text-sm font-semibold pt-1.5">{{ lastEvent ? relTime(lastEvent) : '—' }}</div></GlassCard>
    </div>

    <!-- tabs -->
    <div class="flex items-center gap-1 p-1 rounded-lg bg-surface border border-app w-fit mb-5">
      <button v-for="tb in [{k:'history',l:t('livestock.history')},{k:'health',l:t('nav.livestock')},{k:'production',l:t('livestock.recentProduction')},{k:'finance',l:t('livestock.linkedFinance')}]" :key="tb.k" class="px-3 py-1.5 rounded-md text-xs font-medium transition" :class="tab === tb.k ? 'bg-surface-2 text-fg' : 'text-muted'" @click="tab = tb.k as any">{{ tb.l }}</button>
    </div>

    <GlassCard class="p-5">
      <LivestockTimeline v-if="tab === 'history'" :animal-id="id" />

      <div v-else-if="tab === 'health'">
        <div v-if="health.length" class="space-y-2">
          <div v-for="h in health" :key="h.id" class="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
            <UIcon :name="h.type === 'vaccination' ? 'i-lucide-syringe' : h.type === 'treatment' ? 'i-lucide-pill' : h.type === 'illness' ? 'i-lucide-thermometer' : 'i-lucide-stethoscope'" class="text-accent" />
            <div class="flex-1 min-w-0"><div class="text-sm font-medium">{{ t('enums.healthType.' + h.type) }}</div><div class="text-xs text-muted truncate">{{ h.description }} · {{ fmtDate(h.date) }}<span v-if="h.vetName"> · {{ h.vetName }}</span></div></div>
            <UBadge variant="subtle" :color="h.severity === 'high' ? 'negative' : h.severity === 'medium' ? 'warning' : 'neutral'">{{ t('enums.priority.' + h.severity) }}</UBadge>
            <span v-if="h.cost" class="text-sm font-semibold text-negative whitespace-nowrap">{{ currency(h.cost) }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-muted-2 text-center py-6">{{ t('livestock.noHealth') }}</p>
      </div>

      <div v-else-if="tab === 'production'">
        <div v-if="production.length" class="space-y-2">
          <div v-for="p in production" :key="p.id" class="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
            <UIcon name="i-lucide-egg" class="text-positive" />
            <div class="flex-1 min-w-0"><div class="text-sm font-medium">{{ t('enums.product.' + p.product) }}</div><div class="text-xs text-muted truncate">{{ fmtDate(p.date) }}<span v-if="p.notes"> · {{ p.notes }}</span></div></div>
            <span class="text-sm font-semibold text-positive whitespace-nowrap">+{{ number(p.quantity, { maximumFractionDigits: 1 }) }} {{ t('enums.unit.' + p.unit) }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-muted-2 text-center py-6">{{ t('livestock.noProduction') }}</p>
      </div>

      <div v-else>
        <div v-if="finance.length" class="space-y-2">
          <div v-for="f in finance" :key="f.id" class="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
            <UIcon :name="f.type === 'income' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'" :class="f.type === 'income' ? 'text-positive' : 'text-negative'" />
            <div class="flex-1 min-w-0"><div class="text-sm font-medium">{{ f.description || f.category }}</div><div class="text-xs text-muted">{{ f.category }} · {{ fmtDate(f.date) }}</div></div>
            <span class="text-sm font-semibold whitespace-nowrap" :class="f.type === 'income' ? 'text-positive' : 'text-negative'">{{ f.type === 'income' ? '+' : '−' }}{{ currency(f.amount, f.currency) }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-muted-2 text-center py-6">{{ t('common.noData') }}</p>
      </div>
    </GlassCard>

    <!-- modals -->
    <LivestockMovementModal v-model:open="moveOpen" :animal-id="id" :type="moveType" />
    <LivestockBirthModal v-model:open="birthOpen" :parent-id="id" />

    <UModal v-model:open="healthOpen" :title="t('livestock.healthTitle')">
      <template #body>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('livestock.type')"><USelect v-model="healthForm.type" :items="healthTypeOpts" class="w-full" /></UFormField>
            <UFormField :label="t('livestock.severity')"><USelect v-model="healthForm.severity" :items="[{label:t('enums.priority.low'),value:'low'},{label:t('enums.priority.medium'),value:'medium'},{label:t('enums.priority.high'),value:'high'}]" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('livestock.description')"><UTextarea v-model="healthForm.description" :rows="2" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('livestock.cost')"><UInputNumber v-model="healthForm.cost" :step="0.5" class="w-full" /></UFormField>
            <UFormField :label="t('livestock.vet')"><UInput v-model="healthForm.vetName" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('common.date')"><UInput v-model="healthForm.date" type="date" class="w-full" /></UFormField>
        </div>
      </template>
      <template #footer><div class="flex justify-end gap-2 w-full"><button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="healthOpen = false">{{ t('common.cancel') }}</button><button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="saveHealth">{{ t('common.save') }}</button></div></template>
    </UModal>

    <UModal v-model:open="prodOpen" :title="t('livestock.productionTitle')">
      <template #body>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('livestock.product')"><USelect v-model="prodForm.product" :items="productOpts" class="w-full" /></UFormField>
            <UFormField :label="t('common.unit')"><USelect v-model="prodForm.unit" :items="unitOpts" class="w-full" /></UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('livestock.quantity')"><UInputNumber v-model="prodForm.quantity" :step="0.5" class="w-full" /></UFormField>
            <UFormField :label="t('common.date')"><UInput v-model="prodForm.date" type="date" class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('livestock.notes')"><UInput v-model="prodForm.notes" class="w-full" /></UFormField>
        </div>
      </template>
      <template #footer><div class="flex justify-end gap-2 w-full"><button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="prodOpen = false">{{ t('common.cancel') }}</button><button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="saveProduction">{{ t('common.save') }}</button></div></template>
    </UModal>
  </div>
  <GlassCard v-else class="text-center py-16"><EmptyState icon="i-lucide-egg" :title="t('livestock.title')" :description="t('common.noData')" /></GlassCard>
</template>
