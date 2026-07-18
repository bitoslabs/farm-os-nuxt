<script setup lang="ts">
/**
 * ListToolbar — the canonical filter/sort/view bar for list pages.
 *
 * Built on top of `useListControls`: pass the composable's refs through
 * `v-model:` and a `sortItems` array and it renders everything. Any part can
 * be hidden (e.g. `:show-view-toggle="false"`) and extra controls drop into
 * the default slot.
 *
 * Example:
 *   <ListToolbar
 *     v-model:search="search" v-model:sort-key="sortKey"
 *     v-model:sort-dir="sortDir" v-model:view-mode="viewMode"
 *     :sort-items="sortItems" :search-placeholder="t('inventory.search')"
 *   />
 */
import type { SortDirection, ViewMode } from '~/composables/useListControls'

interface SelectItem { label: string; value: string }

const props = withDefaults(defineProps<{
  search?: string
  sortKey?: string
  sortDir?: SortDirection
  viewMode?: ViewMode
  sortItems?: SelectItem[]
  searchPlaceholder?: string
  showSearch?: boolean
  showSort?: boolean
  showViewToggle?: boolean
  delay?: number
}>(), {
  search: '',
  sortKey: '',
  sortDir: 'asc',
  viewMode: undefined,
  sortItems: () => [],
  searchPlaceholder: '',
  showSearch: true,
  showSort: true,
  showViewToggle: true,
  delay: 0.2
})

const emit = defineEmits<{
  'update:search': [string]
  'update:sortKey': [string]
  'update:sortDir': [SortDirection]
  'update:viewMode': [ViewMode]
}>()

const { t } = useI18n()

const searchProxy = computed({
  get: () => props.search,
  set: (v) => emit('update:search', v)
})
const sortKeyProxy = computed({
  get: () => props.sortKey,
  set: (v) => emit('update:sortKey', v)
})

const dirIcon = computed(() =>
  props.sortDir === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'
)
const dirTitle = computed(() =>
  props.sortDir === 'asc' ? t('listControls.ascending') : t('listControls.descending')
)

function toggleDir() {
  emit('update:sortDir', props.sortDir === 'asc' ? 'desc' : 'asc')
}
</script>

<template>
  <GlassCard class="p-3 flex items-center gap-2 flex-wrap" :delay="delay">
    <UInput
      v-if="showSearch"
      v-model="searchProxy"
      icon="i-lucide-search"
      :placeholder="searchPlaceholder || t('listControls.search')"
      class="flex-1 min-w-[160px]"
    />

    <div v-if="showSort && sortItems.length" class="flex items-center gap-2">
      <USelect
        v-model="sortKeyProxy"
        :items="sortItems"
        class="w-44"
        :aria-label="t('listControls.sortBy')"
      />
      <button
        type="button"
        :title="dirTitle"
        :aria-label="dirTitle"
        class="w-8 h-8 rounded-lg flex items-center justify-center btn-ghost shrink-0"
        @click="toggleDir"
      >
        <UIcon :name="dirIcon" />
      </button>
    </div>

    <ViewToggle
      v-if="showViewToggle && viewMode"
      :model-value="viewMode"
      @update:model-value="(v) => emit('update:viewMode', v)"
    />

    <slot />
  </GlassCard>
</template>
