<script setup lang="ts">
/**
 * SortableTh — a clickable table header cell that reflects the active sort.
 * Pair with `useListControls().applySort(key)` on click and pass the shared
 * `sortKey` / `sortDir` so the indicator stays in sync.
 */
withDefaults(defineProps<{
  active: boolean
  direction?: 'asc' | 'desc'
  align?: 'left' | 'right' | 'center'
}>(), {
  direction: 'asc',
  align: 'left'
})
</script>

<template>
  <th
    class="px-5 py-3 font-semibold cursor-pointer select-none whitespace-nowrap transition hover:text-fg"
    :class="align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'"
  >
    <span
      class="inline-flex items-center gap-1"
      :class="align === 'right' ? 'flex-row-reverse' : ''"
    >
      <slot />
      <UIcon
        v-if="active"
        :name="direction === 'desc' ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
        class="text-accent"
      />
      <UIcon v-else name="i-lucide-chevrons-up-down" class="text-muted-2/60" />
    </span>
  </th>
</template>
