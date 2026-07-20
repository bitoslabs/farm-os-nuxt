<script setup lang="ts">
/**
 * QuickLogModal — fast in-place capture of farm activity from the dashboard.
 *
 * One modal, a row of activity types, and a minimal form for each. Submitting
 * routes to the correct store action so a record is created wherever it
 * belongs (Tasks board, Finance, Harvest, Maintenance history) — no navigation.
 *
 * Activity types that have nothing to act on yet (no ready plantings / no
 * assets) are disabled with a hint rather than hidden, so the feature's
 * capabilities stay discoverable.
 */
import { useGardenStore } from '~/composables/useGardenStore'
import type { Task, TaskPriority, Unit, MaintenanceType, ActivityType } from '~/types/garden'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()

const store = useGardenStore()
const { settings } = useSettings()
const { t } = useI18n()
const toast = useToast()

const isOpen = computed({ get: () => props.open, set: (v) => emit('update:open', v) })

type LogType = 'task' | 'expense' | 'income' | 'harvest' | 'maintenance' | 'activity'
const type = ref<LogType>('task')

const readyPlantings = computed(() => store.plantings.value.filter((p) => p.stage === 'ready'))
const activePlantings = computed(() => store.plantings.value.filter((p) => p.stage !== 'harvested'))
const hasAssets = computed(() => store.assets.value.length > 0)

// finance category keys mirror app/pages/finance/index.vue
const finCatKey: Record<string, string> = { 'Produce sale': 'sale', Inputs: 'inputs', Labor: 'labor', Equipment: 'equipment', Seed: 'seed', Other: 'other' }
const finCatItems = computed(() => Object.keys(finCatKey).map((c) => ({ label: t('finance.cats.' + finCatKey[c]), value: c })))
const taskCatItems = computed(() => (['planting', 'irrigation', 'harvest', 'pest', 'maintenance', 'other'] as const).map((c) => ({ label: t('enums.taskCat.' + c), value: c })))
const prioItems = computed(() => [{ label: t('enums.priority.low'), value: 'low' }, { label: t('enums.priority.medium'), value: 'medium' }, { label: t('enums.priority.high'), value: 'high' }])
const readyItems = computed(() => readyPlantings.value.map((p) => ({ label: `${store.cropById.value[p.cropId]?.name ?? '—'} · ${store.plotById.value[p.plotId]?.name ?? ''}`, value: p.id })))
const assetItems = computed(() => store.assets.value.map((a) => ({ label: a.name, value: a.id })))
const maintTypeItems = computed(() => (['routine', 'repair', 'inspection', 'upgrade'] as const).map((x) => ({ label: t('enums.maintenanceType.' + x), value: x })))
const activityTypeItems = computed(() => (['watering', 'fertilizing', 'pest_treatment', 'weeding', 'pruning', 'observation', 'other'] as ActivityType[]).map((x) => ({ label: t('enums.activityType.' + x), value: x })))
const activePlantingItems = computed(() => activePlantings.value.map((p) => ({ label: `${store.cropById.value[p.cropId]?.name ?? '—'} · ${store.plotById.value[p.plotId]?.name ?? ''}`, value: p.id })))
const quickInputItems = computed(() => store.inventory.value.map((i) => ({ label: i.name, value: i.id })))
const unitItems = computed(() => ['kg', 'g', 'piece', 'bunch'].map((u) => ({ label: t('enums.unit.' + u), value: u })))
const qualityItems = computed(() => [{ label: `${t('harvest.grade')} A`, value: 'A' }, { label: `${t('harvest.grade')} B`, value: 'B' }, { label: `${t('harvest.grade')} C`, value: 'C' }])

const types = computed(() => [
  { key: 'task', label: t('tasks.title'), icon: 'i-lucide-list-checks', available: true },
  { key: 'expense', label: t('finance.expense'), icon: 'i-lucide-arrow-up-right', available: true },
  { key: 'income', label: t('finance.income'), icon: 'i-lucide-arrow-down-left', available: true },
  { key: 'harvest', label: t('harvest.record'), icon: 'i-lucide-shopping-basket', available: readyPlantings.value.length > 0 },
  { key: 'activity', label: t('plantings.logActivity'), icon: 'i-lucide-droplets', available: activePlantings.value.length > 0 },
  { key: 'maintenance', label: t('assets.maintenance'), icon: 'i-lucide-wrench', available: hasAssets.value }
] as const)

// ---- minimal per-type forms (typed so they bind cleanly to the store) ----
const taskForm = reactive<{ title: string; category: Task['category']; priority: TaskPriority; dueAt: string }>({ title: '', category: 'maintenance', priority: 'medium', dueAt: '' })
const finForm = reactive({ amount: 0, category: 'Inputs', description: '', date: new Date().toISOString().slice(0, 10) })
const harvForm = reactive<{ plantingId: string; quantity: number; unit: Unit; quality: 'A' | 'B' | 'C' }>({ plantingId: '', quantity: 1, unit: 'kg', quality: 'A' })
const maintForm = reactive<{ assetId: string; type: MaintenanceType; description: string; date: string; cost: number; performedBy: string }>({ assetId: '', type: 'routine', description: '', date: new Date().toISOString().slice(0, 10), cost: 0, performedBy: '' })
const actForm = reactive<{ plantingId: string; type: ActivityType; date: string; note: string; inputId: string; inputQty: number }>({ plantingId: '', type: 'watering', date: new Date().toISOString().slice(0, 10), note: '', inputId: '', inputQty: 0 })
const usesInput = computed(() => actForm.type === 'fertilizing' || actForm.type === 'pest_treatment')

function resetForms() {
  Object.assign(taskForm, { title: '', category: 'maintenance', priority: 'medium', dueAt: '' })
  Object.assign(finForm, { amount: 0, category: 'Inputs', description: '', date: new Date().toISOString().slice(0, 10) })
  Object.assign(harvForm, { plantingId: readyPlantings.value[0]?.id ?? '', quantity: 1, unit: 'kg', quality: 'A' })
  Object.assign(maintForm, { assetId: store.assets.value[0]?.id ?? '', type: 'routine', description: '', date: new Date().toISOString().slice(0, 10), cost: 0, performedBy: '' })
  Object.assign(actForm, { plantingId: activePlantings.value[0]?.id ?? '', type: 'watering', date: new Date().toISOString().slice(0, 10), note: '', inputId: '', inputQty: 0 })
}

// re-init whenever the modal opens, and keep the active type valid
watch(() => props.open, (o) => {
  if (!o) return
  resetForms()
  type.value = 'task'
})
watch(types, (list) => {
  if (!list.some((tp) => tp.key === type.value && tp.available)) {
    const first = list.find((tp) => tp.available)
    if (first) type.value = first.key
  }
}, { flush: 'sync' })

// income defaults to a revenue category, expense to a cost category
watch(type, (tp) => {
  if (tp === 'income' && finForm.category === 'Inputs') finForm.category = 'Produce sale'
  if (tp === 'expense' && finForm.category === 'Produce sale') finForm.category = 'Inputs'
})

function selectType(key: LogType) {
  const tp = types.value.find((x) => x.key === key)
  if (tp?.available) type.value = key
}

function submit() {
  switch (type.value) {
    case 'task': {
      if (!taskForm.title.trim()) return
      store.addTask({
        title: taskForm.title,
        status: 'todo',
        priority: taskForm.priority,
        category: taskForm.category,
        dueAt: taskForm.dueAt ? new Date(taskForm.dueAt).toISOString() : undefined
      })
      toast.add({ title: t('crud.created'), icon: 'i-lucide-list-checks', color: 'success' })
      break
    }
    case 'expense':
    case 'income': {
      if (!finForm.amount) return
      const ftype = type.value
      store.addFinance({
        type: ftype,
        category: finForm.category,
        amount: finForm.amount,
        currency: settings.value.locale.currency,
        description: finForm.description || undefined,
        date: new Date(finForm.date).toISOString()
      })
      toast.add({ title: t('crud.created'), icon: ftype === 'income' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right', color: 'success' })
      break
    }
    case 'harvest': {
      const p = store.plantings.value.find((x) => x.id === harvForm.plantingId)
      if (!p) return
      store.addHarvest({ plantingId: p.id, cropId: p.cropId, plotId: p.plotId, quantity: harvForm.quantity, unit: harvForm.unit, quality: harvForm.quality, harvestedAt: new Date().toISOString() })
      store.setPlantingStage(p.id, 'harvested')
      toast.add({ title: t('crud.created'), icon: 'i-lucide-shopping-basket', color: 'success' })
      break
    }
    case 'maintenance': {
      if (!maintForm.assetId || !maintForm.description.trim()) return
      store.addMaintenanceLog({
        assetId: maintForm.assetId,
        type: maintForm.type,
        description: maintForm.description,
        date: new Date(maintForm.date).toISOString(),
        cost: maintForm.cost || undefined,
        performedBy: maintForm.performedBy || undefined
      })
      toast.add({ title: t('crud.created'), icon: 'i-lucide-wrench', color: 'success' })
      break
    }
    case 'activity': {
      if (!actForm.plantingId) return
      const item = usesInput.value && actForm.inputId ? store.inventory.value.find((i) => i.id === actForm.inputId) : undefined
      store.addActivity({
        plantingId: actForm.plantingId,
        type: actForm.type,
        date: new Date(actForm.date).toISOString(),
        note: actForm.note || undefined,
        inputId: usesInput.value && actForm.inputId ? actForm.inputId : undefined,
        inputQty: usesInput.value && actForm.inputId && actForm.inputQty > 0 ? actForm.inputQty : undefined,
        inputUnit: item?.unit
      })
      toast.add({ title: t('crud.created'), icon: 'i-lucide-droplets', color: 'success' })
      break
    }
  }
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('dashboard.quickLog')">
    <template #body>
      <p class="text-xs text-muted mb-3">{{ t('dashboard.quickLogHint') }}</p>

      <!-- activity type selector -->
      <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-5">
        <button
          v-for="tp in types"
          :key="tp.key"
          type="button"
          :disabled="!tp.available"
          :title="tp.available ? tp.label : t('dashboard.quickLogNone')"
          class="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition text-center"
          :class="[
            type === tp.key
              ? 'border-accent bg-accent-dim text-fg'
              : tp.available
                ? 'border-app text-muted hover:text-fg hover:bg-surface-2'
                : 'border-app text-muted-2 opacity-50 cursor-not-allowed'
          ]"
          @click="selectType(tp.key as LogType)"
        >
          <UIcon :name="tp.icon" class="text-base" />
          <span class="text-[11px] font-medium leading-tight">{{ tp.label }}</span>
        </button>
      </div>

      <!-- TASK -->
      <div v-if="type === 'task'" class="space-y-4">
        <UFormField :label="t('tasks.titleLabel')"><UInput v-model="taskForm.title" :placeholder="t('tasks.titleLabel')" class="w-full" autofocus /></UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('tasks.category')"><USelect v-model="taskForm.category" :items="taskCatItems" class="w-full" /></UFormField>
          <UFormField :label="t('tasks.priority')"><USelect v-model="taskForm.priority" :items="prioItems" class="w-full" /></UFormField>
        </div>
        <UFormField :label="t('tasks.dueDate')"><UInput v-model="taskForm.dueAt" type="date" class="w-full" /></UFormField>
      </div>

      <!-- EXPENSE / INCOME -->
      <div v-else-if="type === 'expense' || type === 'income'" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('finance.category')"><USelect v-model="finForm.category" :items="finCatItems" class="w-full" /></UFormField>
          <UFormField :label="t('finance.amountLabel', { currency: settings.locale.currency })"><UInputNumber v-model="finForm.amount" :step="0.01" class="w-full" /></UFormField>
        </div>
        <UFormField :label="t('common.date')"><UInput v-model="finForm.date" type="date" class="w-full" /></UFormField>
        <UFormField :label="t('finance.description')"><UInput v-model="finForm.description" class="w-full" /></UFormField>
      </div>

      <!-- HARVEST -->
      <div v-else-if="type === 'harvest'" class="space-y-4">
        <UFormField :label="t('harvest.readyPlanting')"><USelect v-model="harvForm.plantingId" :items="readyItems" class="w-full" /></UFormField>
        <div class="grid grid-cols-3 gap-4">
          <UFormField :label="t('common.quantity')"><UInputNumber v-model="harvForm.quantity" :step="0.5" class="w-full" /></UFormField>
          <UFormField :label="t('common.unit')"><USelect v-model="harvForm.unit" :items="unitItems" class="w-full" /></UFormField>
          <UFormField :label="t('harvest.grade')"><USelect v-model="harvForm.quality" :items="qualityItems" class="w-full" /></UFormField>
        </div>
      </div>

      <!-- MAINTENANCE -->
      <div v-else-if="type === 'maintenance'" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('assets.title')"><USelect v-model="maintForm.assetId" :items="assetItems" class="w-full" /></UFormField>
          <UFormField :label="t('assets.maintenanceType')"><USelect v-model="maintForm.type" :items="maintTypeItems" class="w-full" /></UFormField>
        </div>
        <UFormField :label="t('assets.description')"><UTextarea v-model="maintForm.description" :rows="2" class="w-full" /></UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('assets.cost')"><UInputNumber v-model="maintForm.cost" :step="0.5" class="w-full" /></UFormField>
          <UFormField :label="t('assets.performedBy')"><UInput v-model="maintForm.performedBy" class="w-full" /></UFormField>
        </div>
        <UFormField :label="t('common.date')"><UInput v-model="maintForm.date" type="date" class="w-full" /></UFormField>
      </div>

      <!-- ACTIVITY (planting care) -->
      <div v-else-if="type === 'activity'" class="space-y-4">
        <UFormField :label="t('plantings.title')"><USelect v-model="actForm.plantingId" :items="activePlantingItems" class="w-full" /></UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('common.type')"><USelect v-model="actForm.type" :items="activityTypeItems" class="w-full" /></UFormField>
          <UFormField :label="t('common.date')"><UInput v-model="actForm.date" type="date" class="w-full" /></UFormField>
        </div>
        <UFormField :label="t('common.notes')"><UTextarea v-model="actForm.note" :rows="2" class="w-full" /></UFormField>
        <div v-if="usesInput" class="grid grid-cols-2 gap-4">
          <UFormField :label="t('plantings.inputUsed')"><USelect v-model="actForm.inputId" :items="quickInputItems" class="w-full" /></UFormField>
          <UFormField :label="t('plantings.qtyUsed')"><UInputNumber v-model="actForm.inputQty" :step="0.1" class="w-full" /></UFormField>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="isOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2" @click="submit"><UIcon name="i-lucide-plus" class="text-xs" />{{ t('common.save') }}</button>
      </div>
    </template>
  </UModal>
</template>
