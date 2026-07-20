<script setup lang="ts">
import { useGardenStore } from '~/composables/useGardenStore'
import { useSettings } from '~/composables/useSettings'
import { useNav } from '~/composables/useNav'

const store = useGardenStore()
const { settings } = useSettings()
const { mode, toggleMode } = useNav()
const { t } = useI18n()
const toast = useToast()
const farm = store.farm
function patch(p: Partial<typeof farm.value>) { store.state.value.farm = { ...farm.value, ...p } }
function save() { toast.add({ icon: 'i-lucide-check', color: 'success' }) }
</script>

<template>
  <SettingsSection icon="i-lucide-tractor" :title="t('sec.profileTitle')" :description="t('sec.profileDesc')">
    <GlassCard class="p-6 space-y-5">
      <div class="flex items-center gap-4">
        <UAvatar :src="settings.identity.picture" :alt="farm.name" size="2xl" class="avatar-grad ring-2 ring-[var(--accent)]" />
        <div><div class="font-semibold text-lg">{{ farm.name }}</div><div class="text-xs text-muted">{{ farm.location }}</div></div>
      </div>
      <UFormField :label="t('sec.farmName')"><UInput :model-value="farm.name" @update:model-value="patch({ name: $event })" class="w-full" /></UFormField>
      <UFormField :label="t('common.owner')"><UInput :model-value="farm.owner" @update:model-value="patch({ owner: $event })" class="w-full" /></UFormField>
      <UFormField :label="t('common.location')"><UInput :model-value="farm.location" @update:model-value="patch({ location: $event })" class="w-full" /></UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="t('land.area')"><UInputNumber :model-value="farm.totalArea" @update:model-value="patch({ totalArea: Number($event) })" class="w-full" /></UFormField>
        <UFormField :label="t('sec.areaUnit')"><USelect :model-value="farm.areaUnit" @update:model-value="patch({ areaUnit: $event })" :items="['m²', 'ha']" class="w-full" /></UFormField>
      </div>
      <div class="flex items-center justify-between gap-4 py-3 border-t border-app">
        <div><div class="text-sm font-medium">{{ t('sec.opMode') }}</div><div class="text-xs text-muted mt-0.5">{{ t('sec.opModeDesc') }}</div></div>
        <button class="btn-ghost px-4 py-2 rounded-lg text-sm font-medium capitalize flex items-center gap-2" @click="toggleMode"><UIcon name="i-lucide-arrow-left-right" class="text-xs" />{{ mode }}</button>
      </div>
      <div class="flex justify-end pt-2">
        <button class="btn-accent px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2" @click="save"><UIcon name="i-lucide-save" class="text-xs" />{{ t('sec.saveProfile') }}</button>
      </div>
    </GlassCard>
  </SettingsSection>
</template>
