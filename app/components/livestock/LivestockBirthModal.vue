<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import type { LivestockProfile } from '~/types/garden'

const props = defineProps<{ open: boolean; parentId: string }>()
const emit = defineEmits<{ 'update:open': [boolean]; created: [LivestockProfile] }>()

const store = useGardenStore()
const { t } = useI18n()
const toast = useToast()
const parent = computed(() => store.livestockById.value[props.parentId])
const isOpen = computed({ get: () => props.open, set: (value) => emit('update:open', value) })
const form = reactive({ name: '', count: 1, date: new Date().toISOString().slice(0, 10), breed: '', tagId: '', sex: 'mixed' as 'male' | 'female' | 'mixed', notes: '' })
const sexOpts = computed(() => (['male', 'female', 'mixed'] as const).map((value) => ({ label: t('enums.sex.' + value), value })))

watch(() => props.open, (open) => {
  if (!open || !parent.value) return
  Object.assign(form, { name: `${parent.value.name} ${t('livestock.offspring')}`, count: 1, date: new Date().toISOString().slice(0, 10), breed: parent.value.breed || '', tagId: '', sex: 'mixed', notes: '' })
})

function submit() {
  const res = store.recordLivestockBirth(props.parentId, {
    name: form.name, count: form.count, date: new Date(form.date).toISOString(), breed: form.breed || undefined,
    tagId: form.tagId || undefined, sex: form.sex, notes: form.notes || undefined
  })
  if (!res.ok || !res.profile) {
    toast.add({ title: t('livestock.birthInvalid'), color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  emit('created', res.profile)
  toast.add({ title: t('livestock.birthCreated', { count: res.profile.count }), color: 'success', icon: 'i-lucide-baby' })
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('livestock.recordBirth')">
    <template #body>
      <div v-if="parent" class="space-y-4">
        <p class="text-sm text-muted">{{ t('livestock.birthFor', { name: parent.name }) }}</p>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('livestock.name')"><UInput v-model="form.name" class="w-full" /></UFormField>
          <UFormField :label="t('livestock.count')"><UInputNumber v-model="form.count" :min="1" class="w-full" /></UFormField>
          <UFormField :label="t('livestock.birthDate')"><UInput v-model="form.date" type="date" class="w-full" /></UFormField>
          <UFormField :label="t('livestock.sex')"><USelect v-model="form.sex" :items="sexOpts" class="w-full" /></UFormField>
          <UFormField :label="t('livestock.breed')"><UInput v-model="form.breed" class="w-full" /></UFormField>
          <UFormField :label="t('livestock.tag')"><UInput v-model="form.tagId" class="w-full" /></UFormField>
        </div>
        <UFormField :label="t('livestock.notes')"><UTextarea v-model="form.notes" :rows="2" class="w-full" /></UFormField>
      </div>
    </template>
    <template #footer><div class="flex justify-end gap-2 w-full"><button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="isOpen = false">{{ t('common.cancel') }}</button><button class="btn-accent px-4 py-2 rounded-lg text-sm font-semibold" @click="submit">{{ t('livestock.recordBirth') }}</button></div></template>
  </UModal>
</template>
