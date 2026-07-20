import { computed, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'

/**
 * useListControls — reusable list UX state for the whole app.
 *
 * Centralises the three things every list page needs:
 *   1. text search filtering
 *   2. multi-field sorting with asc/desc direction
 *   3. grid / table view-mode switching
 *
 * Keeping the logic in one composable means every list page behaves
 * identically, and adding a new list is a few lines instead of a copy-paste
 * of bespoke refs + sort switches.
 *
 * View-mode and sort preferences optionally persist to localStorage so a
 * user's favourite layout survives reloads.
 */

export type SortDirection = 'asc' | 'desc'
export type ViewMode = 'grid' | 'table'

/** A single sortable column: a stable key + a value extractor. */
export interface SortOption<T> {
  /** stable id, used for persistence + table-header binding */
  key: string
  /** display label (usually an i18n string resolved by the caller) */
  label: string
  /** comparable value for a row; numbers sort numerically, strings lexically */
  value: (item: T) => string | number
}

/** Reactive handle returned by `useListControls`. */
export interface ListControls<T> {
  search: Ref<string>
  sortKey: Ref<string>
  sortDir: Ref<SortDirection>
  viewMode: Ref<ViewMode>
  sortItems: ComputedRef<{ label: string; value: string }[]>
  list: ComputedRef<T[]>
  toggleSortDir: () => void
  applySort: (key: string) => void
}

export interface UseListControlsOptions<T> {
  /** reactive source collection (ref / computed / getter) */
  items: MaybeRefOrGetter<T[]>
  /** filter predicate; receives the already lower-cased query */
  search?: (item: T, query: string) => boolean
  /** available sort columns; the first is the default unless overridden */
  sortOptions: MaybeRefOrGetter<SortOption<T>[]>
  defaultSortKey?: string
  defaultSortDir?: SortDirection
  defaultViewMode?: ViewMode
  /** persist view-mode + sort prefs to localStorage under this namespace */
  storageKey?: string
}

const STORAGE_PREFIX = 'gardenos:list:'

/* ------------------------------------------------------------------ */
/* localStorage helpers (defensive — never throw)                      */
/* ------------------------------------------------------------------ */
function readStored<T>(ns: string | undefined, field: string, fallback: T): T {
  if (!ns || typeof localStorage === 'undefined') return fallback
  try {
    const obj = JSON.parse(localStorage.getItem(STORAGE_PREFIX + ns) || '{}')
    return (obj?.[field] ?? fallback) as T
  } catch {
    return fallback
  }
}

function writeStored(ns: string | undefined, field: string, value: unknown) {
  if (!ns || typeof localStorage === 'undefined') return
  try {
    const key = STORAGE_PREFIX + ns
    const obj = JSON.parse(localStorage.getItem(key) || '{}')
    obj[field] = value
    localStorage.setItem(key, JSON.stringify(obj))
  } catch {
    /* storage unavailable / quota — ignore, purely cosmetic prefs */
  }
}

export function useListControls<T>(opts: UseListControlsOptions<T>): ListControls<T> {
  const { storageKey } = opts

  /** current text query */
  const search = ref('')

  const sortOptions = computed(() => toValue(opts.sortOptions))
  const defaultKey = opts.defaultSortKey ?? sortOptions.value[0]?.key ?? ''
  const defaultDir = opts.defaultSortDir ?? 'asc'
  const defaultView = opts.defaultViewMode ?? 'grid'

  /** active sort column */
  const sortKey = ref<string>(readStored(storageKey, 'sortKey', defaultKey))
  /** active sort direction */
  const sortDir = ref<SortDirection>(readStored(storageKey, 'sortDir', defaultDir))
  /** active presentation mode */
  const viewMode = ref<ViewMode>(readStored(storageKey, 'viewMode', defaultView))

  // persist preferences whenever they change (sync: immediate + deterministic)
  watch(sortKey, (v) => writeStored(storageKey, 'sortKey', v), { flush: 'sync' })
  watch(sortDir, (v) => writeStored(storageKey, 'sortDir', v), { flush: 'sync' })
  watch(viewMode, (v) => writeStored(storageKey, 'viewMode', v), { flush: 'sync' })

  /** items shaped for `<USelect>` */
  const sortItems = computed(() => sortOptions.value.map((o) => ({ label: o.label, value: o.key })))

  /** flip asc ⇄ desc, keeping the current column */
  function toggleSortDir() {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }

  /**
   * Sort by a column. Clicking the active column toggles direction;
   * switching columns resets to the default direction. Ideal for
   * clickable table headers.
   */
  function applySort(key: string) {
    if (sortKey.value === key) toggleSortDir()
    else {
      sortKey.value = key
      sortDir.value = defaultDir
    }
  }

  /** filtered + sorted collection (never mutates the source) */
  const list = computed<T[]>(() => {
    const items = toValue(opts.items)
    const q = search.value.toLowerCase().trim()
    const arr = q && opts.search ? items.filter((it) => opts.search!(it, q)) : [...items]

    const opt = sortOptions.value.find((o) => o.key === sortKey.value) ?? sortOptions.value[0]
    if (opt) {
      const dir = sortDir.value === 'asc' ? 1 : -1
      arr.sort((a, b) => {
        const va = opt.value(a)
        const vb = opt.value(b)
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
        return String(va).localeCompare(String(vb)) * dir
      })
    }
    return arr
  })

  return { search, sortKey, sortDir, viewMode, sortItems, list, toggleSortDir, applySort }
}
