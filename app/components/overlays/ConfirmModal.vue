<script setup lang="ts">
/** Reusable confirmation dialog for destructive actions (delete). */
const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}>(), {
  title: 'crud.confirmTitle',
  message: 'crud.confirmDelete',
  confirmLabel: 'crud.confirm',
  cancelLabel: 'common.cancel',
  danger: true
})
const emit = defineEmits<{ 'update:open': [boolean]; confirm: [] }>()
const { t } = useI18n()
const isOpen = computed({ get: () => props.open, set: (v) => emit('update:open', v) })
</script>

<template>
  <UModal v-model:open="isOpen" :title="t(title)">
    <template #body>
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="danger ? 'bg-[rgba(248,113,113,0.12)]' : 'bg-accent-dim'">
          <UIcon :name="danger ? 'i-lucide-trash-2' : 'i-lucide-alert-circle'" :class="danger ? 'text-negative' : 'text-accent'" />
        </div>
        <p class="text-sm text-muted pt-1.5">{{ t(message) }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <button class="btn-ghost px-4 py-2 rounded-lg text-sm" @click="isOpen = false">{{ t(cancelLabel) }}</button>
        <button
          class="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
          :style="{ background: danger ? 'var(--negative)' : 'var(--accent)', color: danger ? '#fff' : 'var(--bg)' }"
          @click="emit('confirm'); isOpen = false"
        >{{ t(confirmLabel) }}</button>
      </div>
    </template>
  </UModal>
</template>
