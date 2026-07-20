import { describe, expect, it, beforeEach } from 'vitest'
import { useGardenStore } from '~/composables/useGardenStore'
import { emptyState } from '~/utils/emptyState'

describe('useGardenStore — planting activities', () => {
  beforeEach(() => {
    useGardenStore().state.value = emptyState()
  })

  it('stores an activity and exposes it via the collection', () => {
    const store = useGardenStore()
    const a = store.addActivity({ plantingId: 'p1', type: 'watering', date: '2025-07-14T00:00:00.000Z', note: 'Deep soak' })
    expect(store.activities.value).toHaveLength(1)
    expect(store.activities.value[0]).toMatchObject({ plantingId: 'p1', type: 'watering', note: 'Deep soak' })
    expect(a.id).toBeTruthy()
  })

  it('decrements inventory stock when an input is consumed', () => {
    const store = useGardenStore()
    const item = store.addInventory({ name: 'NPK', category: 'fertilizer', unit: 'kg', stock: 10, reorderLevel: 2, costPerUnit: 1.2, currency: 'USD' })
    store.addActivity({ plantingId: 'p1', type: 'fertilizing', date: '2025-06-20T00:00:00.000Z', inputId: item.id, inputQty: 3, inputUnit: 'kg' })
    expect(store.inventory.value.find((i) => i.id === item.id)!.stock).toBe(7)
  })

  it('never lets stock go negative', () => {
    const store = useGardenStore()
    const item = store.addInventory({ name: 'Neem', category: 'pesticide', unit: 'liter', stock: 1, reorderLevel: 1, costPerUnit: 6, currency: 'USD' })
    store.addActivity({ plantingId: 'p1', type: 'pest_treatment', date: '2025-06-25T00:00:00.000Z', inputId: item.id, inputQty: 5, inputUnit: 'liter' })
    expect(store.inventory.value.find((i) => i.id === item.id)!.stock).toBe(0)
  })

  it('ignores input consumption when no input is linked (e.g. watering)', () => {
    const store = useGardenStore()
    const item = store.addInventory({ name: 'NPK', category: 'fertilizer', unit: 'kg', stock: 10, reorderLevel: 2, costPerUnit: 1, currency: 'USD' })
    store.addActivity({ plantingId: 'p1', type: 'watering', date: '2025-07-14T00:00:00.000Z' })
    expect(store.inventory.value.find((i) => i.id === item.id)!.stock).toBe(10) // untouched
  })

  it('removes an activity', () => {
    const store = useGardenStore()
    const a = store.addActivity({ plantingId: 'p1', type: 'weeding', date: '2025-07-10T00:00:00.000Z' })
    store.removeActivity(a.id)
    expect(store.activities.value).toHaveLength(0)
  })
})
