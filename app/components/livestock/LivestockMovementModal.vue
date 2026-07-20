<script setup lang="ts">
/**
 * LivestockMovementModal — record a lifecycle movement for an existing record.
 *
 * sale / death / transfer_out reduce head count (validated ≤ available);
 * purchase / birth / transfer_in increase it. Purchase (acquisition of a NEW
 * record) is handled on the register page; this modal operates on an existing
 * animal/flock. Creates the linked finance record through the store.
 */
import { useGardenStore } from '~/composables/useGardenStore'
import type { LivestockMovementType } from '~/types/garden'

const props = defineProps<{
  open: boolean
  animalId: string
  type: LivestockMovementType
}>()
const emit = defineEmits<{ 'update:open': [boolean] }>()

const store = useGardenStore()
const { settings } = useSettings()
const { t } = useI18n()
const toast = useToast()

const isOpen = computed({ get: () => props.open, set: (v) => emit('update:open', v) })
const animal = computed(() => store.livestockById.value[props.animalId])

const isOut = computed(() => props.type === 'sale' || props.type === 'death' || props.type === 'transfer_out')
const needsReason = computed(() => props.type === 'death' || props.type === 'adjustment')
const hasMoney = computed(() => props.type === 'sale' || props.type === 'death')
const counterpartyLabel = computed(() => props.type === 'sale' ? t('livestock.buyer') : t('livestock.supplier'))

const form = reactive({ count: 1, date: new Date().toISOString().slice(0, 10), reason: '', counterparty: '', unitPrice: 0, totalAmount: 0, currency: settings.value.locale.currency, reference: '', notes: '' })

watch(() => props.open, (o) => {
  if (!o) return
  Object.assign(form, { count: 1, date: new Date().toISOString().slice(0, 10), reason: '', counterparty: '', unitPrice: 0, totalAmount: 0, currency: settings.value.locale.currency, reference: '', notes: '' })
})

const confirmSentence = computed(() => {
  if (!animal.value || !isOut.value) return ''
  const remain = Math.max(0, animal.value.count - form.count)
  if (props.type === 'sale') return t('livestock.confirmSale', { qty: form.count, total: animal.value.count, name: animal.value.name, remain })
  return t('livestock.confirmDeath', { qty: form.count, total: animal.value.count, name: animal.value.name, remain })
})

function submit() {
  if (!animal.value) return
  if (needsReason.value && !form.reason.trim()) { toast.add({ title: t('livestock.reasonRequired'), color: 'warning', icon: 'i-lucide-alert-triangle' }); return }
  const res = store.recordLivestockMovement({
    animalId: props.animalId,
    type: props.type,
    count: form.count,
    date: new Date(form.date).toISOString(),
    reason: form.reason || undefined,
    counterparty: form.counterparty || undefined,
    unitPrice: form.unitPrice || undefined,
    totalAmount: form.totalAmount || undefined,
    currency: form.currency,
    reference: form.reference || undefined,
    notes: form.notes || undefined
  })
  if (!res.ok) {
    toast.add({ title: t('livestock.overLimit'), color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  toast.add({ title: t('crud.saved'), icon: 'i-lucide-check', color: 'success' })
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('enums.movementType.' + type)">
    <template #body>
      <div v-if="animal" class="space-y-4">
        <div class="text-sm text-muted">{{ animal.name }} · {{ t('livestock.available', { n: animal.count }) }}</div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('livestock.count')">
            <UInputNumber v-model="form.count" :min="1" :max="isOut ? animal.count : undefined" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.date')"><UInput v-model="form.date" type="date" class="w-full" /></UFormField>
        </div>

        <UFormField v-if="needsReason" :label="t('tasks.descOpt')"><UTextarea v-model="form.reason" :rows="2" class="w-full" /></UFormField>
        <UFormField v-if="hasMoney || type === 'birth'" :label="counterpartyLabel"><UInput v-model="form.counterparty" class="w-full" /></UFormField>

        <div v-if="hasMoney" class="grid grid-cols-3 gap-4">
          <UFormField :label="t('livestock.unitPrice')"><UInputNumber v-model="form.unitPrice" :step="0.5" class="w-full" /></UFormField>
          <UFormField :label="t('livestock.totalAmount')"><UInputNumber v-model="form.totalAmount" :step="0.5" class="w-full" /></UFormField>
          <UFormField :label="t('sec.currency')"><UInput v-model="form.currency" class="w-full" /></UFormField>
        </div>

        <UFormField :label="t('livestock.reference')"><UInput v-model="form.reference" class="w-full" /></UFormField>
        <UFormField :label="t('common.notes')"><UTextarea v-model="form.notes" :rows="2" class="w-full" /></UFormField>

        <div v-if="confirmSentence" class="text-xs px-3 py-2 rounded-lg bg-accent-dim text-fg flex items-center gap-2">
          <UIcon name="i-lucide-info" class="text-accent" />{{ confirmSentence }}
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="isOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="submit">{{ t('common.save') }}</button>
      </div>
    </template>
  </UModal>
</template>
