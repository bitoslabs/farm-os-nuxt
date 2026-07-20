import { describe, expect, it, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useListControls, type SortOption } from '../../app/composables/useListControls'

interface Item { name: string; price: number }

const SAMPLE: Item[] = [
  { name: 'Carrot', price: 3 },
  { name: 'apple', price: 1 },
  { name: 'Banana', price: 2 }
]

const sortOptions: SortOption<Item>[] = [
  { key: 'name', label: 'Name', value: (i) => i.name },
  { key: 'price', label: 'Price', value: (i) => i.price }
]

/** minimal in-memory localStorage so the persistence path is exercised */
function makeStore(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => store.clear(),
    key: () => null,
    length: 0
  } as Storage
}

describe('useListControls', () => {
  beforeEach(() => {
    Object.assign(globalThis, { localStorage: makeStore() })
  })

  it('sorts by the default key ascending', () => {
    const { list } = useListControls<Item>({ items: SAMPLE, sortOptions, defaultSortKey: 'price' })
    expect(list.value.map((i) => i.price)).toEqual([1, 2, 3])
  })

  it('toggles sort direction', () => {
    const { list, sortDir, toggleSortDir } = useListControls<Item>({ items: SAMPLE, sortOptions, defaultSortKey: 'price' })
    expect(sortDir.value).toBe('asc')
    toggleSortDir()
    expect(sortDir.value).toBe('desc')
    expect(list.value.map((i) => i.price)).toEqual([3, 2, 1])
  })

  it('applySort toggles direction on the active column and resets on a new one', () => {
    const { sortKey, sortDir, applySort } = useListControls<Item>({ items: SAMPLE, sortOptions, defaultSortKey: 'price' })
    applySort('price') // same column -> toggle
    expect(sortDir.value).toBe('desc')
    applySort('name') // new column -> reset to asc
    expect(sortKey.value).toBe('name')
    expect(sortDir.value).toBe('asc')
  })

  it('filters with the search predicate', () => {
    const { search, list } = useListControls<Item>({
      items: SAMPLE,
      search: (i, q) => i.name.toLowerCase().includes(q),
      sortOptions
    })
    search.value = 'an'
    expect(list.value.map((i) => i.name)).toEqual(['Banana'])
  })

  it('never mutates the source array', () => {
    const original = SAMPLE.map((i) => ({ ...i }))
    const { list } = useListControls<Item>({ items: SAMPLE, sortOptions, defaultSortKey: 'price' })
    expect(list.value.length).toBeGreaterThan(0) // force compute
    expect(SAMPLE).toEqual(original)
  })

  it('sorts case-insensitively for string values', () => {
    const { list } = useListControls<Item>({ items: SAMPLE, sortOptions, defaultSortKey: 'name' })
    expect(list.value.map((i) => i.name)).toEqual(['apple', 'Banana', 'Carrot'])
  })

  it('reacts to a reactive source collection', () => {
    const items = ref<Item[]>(SAMPLE.slice(0, 1))
    const { list } = useListControls<Item>({ items, sortOptions, defaultSortKey: 'price' })
    expect(list.value).toHaveLength(1)
    items.value = SAMPLE
    expect(list.value).toHaveLength(3)
  })

  it('persists view-mode and sort prefs to localStorage', async () => {
    const { viewMode, sortKey, sortDir } = useListControls<Item>({
      items: SAMPLE,
      sortOptions,
      defaultSortKey: 'price',
      defaultViewMode: 'grid',
      storageKey: 'test-list'
    })
    viewMode.value = 'table'
    sortKey.value = 'name'
    sortDir.value = 'desc'
    await nextTick() // watch effects are pre-flush

    const raw = localStorage.getItem('gardenos:list:test-list')
    expect(raw).toBeTruthy()
    const saved = JSON.parse(raw!)
    expect(saved.viewMode).toBe('table')
    expect(saved.sortKey).toBe('name')
    expect(saved.sortDir).toBe('desc')
  })
})
