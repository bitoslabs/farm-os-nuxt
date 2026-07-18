# List Controls System

A reusable, type-safe toolkit that gives every list page the same **search +
multi-field sort (asc/desc) + grid/table view** experience with one consistent
toolbar. Built so adding a new list page is a few lines instead of a copy-paste
of bespoke refs and sort switches.

> Source: `app/composables/useListControls.ts`, `app/components/ListToolbar.vue`,
> `app/components/ViewToggle.vue`, `app/components/SortableTh.vue`.
> Tests: `test/unit/useListControls.test.ts`.

---

## 1. Why

Before this system the list pages had inconsistent capabilities:

| Page | Before |
|---|---|
| Inventory | grid only, no search, no sort |
| Crops | table only, single-direction sort |
| Land | grid only, single-direction sort |
| Plantings | single-row cards, hardcoded newest-first |
| Harvest | list rows, hardcoded newest-first |
| Livestock | grid only, no sort |

Now **all seven list pages** share identical UX, and view-mode + sort
preferences persist per page in `localStorage`.

---

## 2. The composable — `useListControls<T>`

The single source of truth for a list's state.

```ts
export type SortDirection = 'asc' | 'desc'
export type ViewMode = 'grid' | 'table'

export interface SortOption<T> {
  key: string                                   // stable id (persistence + table headers)
  label: string                                // display label (usually an i18n string)
  value: (item: T) => string | number          // comparable extractor
}

export interface UseListControlsOptions<T> {
  items: MaybeRefOrGetter<T[]>                 // reactive source collection
  search?: (item: T, query: string) => boolean // filter predicate (query is lower-cased)
  sortOptions: MaybeRefOrGetter<SortOption<T>[]>
  defaultSortKey?: string                      // defaults to the first option's key
  defaultSortDir?: SortDirection               // default 'asc'
  defaultViewMode?: ViewMode                   // default 'grid'
  storageKey?: string                          // persist prefs under gardenos:list:<key>
}
```

**Returns** (`ListControls<T>`):

| Member | Type | Purpose |
|---|---|---|
| `search` | `Ref<string>` | current text query |
| `sortKey` | `Ref<string>` | active sort column |
| `sortDir` | `Ref<SortDirection>` | active direction |
| `viewMode` | `Ref<ViewMode>` | grid / table |
| `sortItems` | `ComputedRef<{label,value}[]>` | ready for `<USelect :items>` |
| `list` | `ComputedRef<T[]>` | **filtered + sorted** result (never mutates the source) |
| `toggleSortDir()` | `() => void` | flip asc ⇄ desc |
| `applySort(key)` | `(key: string) => void` | click-to-sort for table headers (toggles dir on the active column, resets dir on a new one) |

**Behaviour notes**
- Numeric extractors sort numerically; strings use `localeCompare` (case-insensitive).
- `list` copies the source before sorting (`[...items]`), so the store array is untouched.
- When `storageKey` is set, `viewMode` / `sortKey` / `sortDir` are read on init and
  written on change via `flush: 'sync'` watchers (immediate, deterministic persistence).

---

## 3. Components

### 3.1 `ListToolbar.vue`
The canonical bar. Bind the composable's refs with `v-model:`.

```vue
<ListToolbar
  v-model:search="search"
  v-model:sort-key="sortKey"
  v-model:sort-dir="sortDir"
  v-model:view-mode="viewMode"
  :sort-items="sortItems"
  :search-placeholder="t('inventory.search')"
  class="mb-4"
/>
```

| Prop | Default | Notes |
|---|---|---|
| `search`, `sortKey`, `sortDir`, `viewMode` | — | bound via `v-model:` |
| `sortItems` | `[]` | `{label, value}[]` for the sort `<USelect>` |
| `searchPlaceholder` | `t('listControls.search')` | |
| `showSearch` / `showSort` / `showViewToggle` | `true` | hide any control |
| default slot | — | extra controls (e.g. a species filter dropdown) appear after the view toggle |

### 3.2 `ViewToggle.vue`
Standalone segmented grid/table switch (also used inside `ListToolbar`).
Props: `modelValue: ViewMode`; emits `update:modelValue`.

### 3.3 `SortableTh.vue`
A clickable `<th>` that reflects the active sort — pair with `applySort(key)`.

```vue
<SortableTh :active="sortKey === 'name'" :direction="sortDir" @click="applySort('name')">
  {{ t('common.name') }}
</SortableTh>
<SortableTh :active="sortKey === 'price'" :direction="sortDir" align="right" @click="applySort('price')">
  Price
</SortableTh>
```

Shows an up/down arrow on the active column, a faint chevron on others.

---

## 4. Adding it to a new page (step by step)

```vue
<script setup lang="ts">
import { useListControls, type SortOption } from '~/composables/useListControls'
import type { MyItem } from '~/types/garden'

const store = useGardenStore()
const { items } = store            // a computed collection from the store

// 1. define sort columns
const sortOptions = computed<SortOption<MyItem>[]>(() => [
  { key: 'name', label: t('common.name'), value: (i) => i.name },
  { key: 'price', label: 'Price', value: (i) => i.price }
])

// 2. wire the composable
const { search, sortKey, sortDir, viewMode, sortItems, list, applySort } =
  useListControls<MyItem>({
    items,
    search: (i, q) => i.name.toLowerCase().includes(q),
    sortOptions,
    defaultSortKey: 'name',
    defaultViewMode: 'grid',
    storageKey: 'my-items'
  })
</script>

<template>
  <!-- 3. toolbar -->
  <ListToolbar
    v-model:search="search" v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir" v-model:view-mode="viewMode"
    :sort-items="sortItems" class="mb-4"
  />

  <!-- 4a. grid -->
  <div v-if="list.length && viewMode === 'grid'" class="grid grid-cols-3 gap-4">
    <GlassCard v-for="i in list" :key="i.id">…</GlassCard>
  </div>

  <!-- 4b. table -->
  <GlassCard v-else-if="list.length" class="overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-xs text-muted uppercase border-b border-app">
          <SortableTh :active="sortKey === 'name'" :direction="sortDir" @click="applySort('name')">Name</SortableTh>
          <SortableTh :active="sortKey === 'price'" :direction="sortDir" align="right" @click="applySort('price')">Price</SortableTh>
        </tr>
      </thead>
      <tbody><tr v-for="i in list" :key="i.id"><td>{{ i.name }}</td><td class="text-right">{{ i.price }}</td></tr></tbody>
    </table>
  </GlassCard>

  <!-- 4c. empty -->
  <GlassCard v-else><EmptyState :title="search ? t('crud.noResults') : 'No items'" /></GlassCard>
</template>
```

### Combining with existing filters
If a page has its own filter (e.g. plantings' Active/Ready/All tabs, livestock's
species filter), apply it **first** and pass the filtered collection as `items`:

```ts
const tabFiltered = computed(() => plantings.value.filter((p) => /* tab logic */))
const { list, … } = useListControls({ items: tabFiltered, … })
```

Extra filter UI drops into the toolbar's default slot.

---

## 5. Persistence

Preferences are stored under `gardenos:list:<storageKey>` as one JSON object:

```json
{ "viewMode": "table", "sortKey": "price", "sortDir": "desc" }
```

Keys in use: `inventory`, `crops`, `land`, `assets`, `plantings`, `harvest`, `livestock`.

---

## 6. Pages using the system

| Page | Sort fields | Default view |
|---|---|---|
| `/inventory` | name, category, stock, reorder, cost, value | grid |
| `/crops` | name, family, maturity, spacing | table |
| `/land` | name, type, area, zone | grid |
| `/assets` | name, category, status, condition, value, purchase date | grid |
| `/plantings` | crop, plot, stage, progress, planted | grid |
| `/harvest` | crop, plot, date, quantity, grade | table |
| `/livestock` (animals) | name, species, status, count, birth date | grid |

---

## 7. QA test matrix

| # | Steps | Expected |
|---|---|---|
| 1 | Open any list page, type in search | list filters live, "No results" state when nothing matches |
| 2 | Change the sort dropdown | list re-sorts |
| 3 | Click the asc/desc arrow button | direction flips, list re-sorts |
| 4 | In table view, click a column header | sorts by that column; clicking again flips direction; a new column resets to asc |
| 5 | Switch grid ⇄ table | view changes, data preserved |
| 6 | Set grid + sort-by-price desc, reload page | grid view + price desc restored (localStorage) |
| 7 | Combine a page's own filter (e.g. species) with search + sort | all three compose correctly |
| 8 | Locale switch (EN ⇄ LO) | sort labels + placeholders translate; list contents unchanged |
