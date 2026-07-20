import { describe, expect, it, beforeEach } from 'vitest'
import { useGardenStore } from '~/composables/useGardenStore'
import { emptyState } from '~/utils/emptyState'

describe('useGardenStore — assets & maintenance', () => {
  beforeEach(() => {
    const store = useGardenStore()
    store.state.value = emptyState()
  })

  it('creates an asset and exposes it via the reactive collection', () => {
    const store = useGardenStore()
    const a = store.addAsset({ name: 'Tractor', category: 'vehicle', status: 'active', condition: 'good', currency: 'USD', purchaseCost: 20000 })
    expect(store.assets.value).toHaveLength(1)
    expect(store.assets.value[0]).toMatchObject({ name: 'Tractor', category: 'vehicle' })
    expect(a.id).toBeTruthy()
  })

  it('updates an asset in place', () => {
    const store = useGardenStore()
    const a = store.addAsset({ name: 'Pump', category: 'irrigation', status: 'active', condition: 'new', currency: 'USD' })
    store.updateAsset(a.id, { status: 'maintenance', condition: 'fair' })
    expect(store.assetById.value[a.id]).toMatchObject({ status: 'maintenance', condition: 'fair' })
  })

  it('removing an asset also clears its maintenance logs', () => {
    const store = useGardenStore()
    const a = store.addAsset({ name: 'Pump', category: 'irrigation', status: 'active', condition: 'good', currency: 'USD' })
    store.addMaintenanceLog({ assetId: a.id, type: 'repair', description: 'Fixed seal', date: new Date().toISOString() })
    store.addMaintenanceLog({ assetId: a.id, type: 'routine', description: 'Oil change', date: new Date().toISOString() })
    expect(store.maintenanceLogs.value).toHaveLength(2)

    store.removeAsset(a.id)
    expect(store.assets.value).toHaveLength(0)
    expect(store.maintenanceLogs.value).toHaveLength(0) // cascade delete
  })

  it('assetValue sums currentValue (falling back to purchaseCost) for in-service assets only', () => {
    const store = useGardenStore()
    store.addAsset({ name: 'A', category: 'equipment', status: 'active', condition: 'good', currency: 'USD', purchaseCost: 1000, currentValue: 700 })
    store.addAsset({ name: 'B', category: 'equipment', status: 'maintenance', condition: 'good', currency: 'USD', purchaseCost: 500 }) // no currentValue → uses 500
    store.addAsset({ name: 'C', category: 'equipment', status: 'retired', condition: 'poor', currency: 'USD', purchaseCost: 9999 }) // excluded
    expect(store.assetValue.value).toBe(1200)
  })

  it('maintenanceDue counts open maintenance tasks', () => {
    const store = useGardenStore()
    store.addTask({ title: 'Service tractor', status: 'todo', priority: 'medium', category: 'maintenance' })
    store.addTask({ title: 'Fix fence', status: 'in_progress', priority: 'low', category: 'maintenance' })
    store.addTask({ title: 'Done oil change', status: 'done', priority: 'low', category: 'maintenance' }) // closed → ignored
    store.addTask({ title: 'Water plants', status: 'todo', priority: 'low', category: 'irrigation' }) // other category
    expect(store.maintenanceDue.value).toHaveLength(2)
  })

  it('convertInventoryToAsset promotes a stock item into an asset, mapping the category', () => {
    const store = useGardenStore()
    const item = store.addInventory({ name: 'Spade', category: 'tool', unit: 'piece', stock: 1, reorderLevel: 0, costPerUnit: 25, currency: 'USD' })
    const asset = store.convertInventoryToAsset(item.id)
    expect(asset).toBeTruthy()
    expect(asset!.category).toBe('tool')
    expect(asset!.purchaseCost).toBe(25)
    expect(store.assets.value).toHaveLength(1)
    // inventory is untouched
    expect(store.inventory.value).toHaveLength(1)
    expect(store.inventory.value[0].stock).toBe(1)
  })

  it('maintenanceHistory is sorted newest-first', () => {
    const store = useGardenStore()
    const a = store.addAsset({ name: 'Pump', category: 'irrigation', status: 'active', condition: 'good', currency: 'USD' })
    store.addMaintenanceLog({ assetId: a.id, type: 'routine', description: 'old', date: '2024-01-01T00:00:00.000Z' })
    store.addMaintenanceLog({ assetId: a.id, type: 'repair', description: 'new', date: '2025-01-01T00:00:00.000Z' })
    expect(store.maintenanceHistory.value.map((m) => m.description)).toEqual(['new', 'old'])
  })
})
