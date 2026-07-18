import { describe, expect, it, beforeEach } from 'vitest'
import { useGardenStore } from '~/composables/useGardenStore'
import { emptyState } from '~/utils/emptyState'
import type { GardenState } from '~/types/garden'
import dataset from '../../docs/features/qa-mock-data.json'

/** The garden slice, typed at the import boundary (JSON is otherwise loose). */
const data = dataset.garden as GardenState

/**
 * Guards the QA mock dataset (`docs/features/qa-mock-data.json`).
 * If the file is edited, these assertions keep it internally consistent and
 * document the numbers a tester should see after importing it.
 */
describe('QA mock dataset', () => {
  beforeEach(() => {
    useGardenStore().state.value = emptyState()
  })

  it('loads as a valid GardenState with every collection populated', () => {
    const store = useGardenStore()
    store.state.value = data

    expect(store.plots.value).toHaveLength(5)
    expect(store.crops.value).toHaveLength(6)
    expect(store.plantings.value).toHaveLength(6)
    expect(store.harvests.value).toHaveLength(3)
    expect(store.inventory.value).toHaveLength(6)
    expect(store.finance.value).toHaveLength(6)
    expect(store.livestock.value).toHaveLength(4)
    expect(store.assets.value).toHaveLength(5)
    expect(store.maintenanceLogs.value).toHaveLength(4)
    expect(store.activities.value).toHaveLength(4)
    expect(store.tasks.value).toHaveLength(5)
  })

  it('keeps every relation valid', () => {
    const store = useGardenStore()
    store.state.value = data
    const cropIds = new Set(store.crops.value.map((c) => c.id))
    const plotIds = new Set(store.plots.value.map((p) => p.id))
    const assetIds = new Set(store.assets.value.map((a) => a.id))

    expect(store.plantings.value.every((p) => plotIds.has(p.plotId) && cropIds.has(p.cropId))).toBe(true)
    expect(store.maintenanceLogs.value.every((m) => assetIds.has(m.assetId))).toBe(true)
    expect(store.activities.value.filter((a) => a.inputId).every((a) => new Set(store.inventory.value.map((i) => i.id)).has(a.inputId!))).toBe(true)
  })

  it('produces the documented dashboard/aggregate numbers', () => {
    const store = useGardenStore()
    store.state.value = data

    expect(store.assetValue.value).toBe(20800)             // 15000 + 500 + 3500 + 1800 (retired excluded)
    expect(store.inventoryValue.value).toBeCloseTo(161.4, 2) // 2 + 2.4 + 18 + 24 + 25 + 90
    expect(store.lowStockItems.value).toHaveLength(2)       // seed + fertilizer
    expect(store.maintenanceDue.value).toHaveLength(2)      // 2 open maintenance tasks
    expect(store.maintenanceHistory.value).toHaveLength(4)
    expect(store.plantings.value.filter((p) => p.stage === 'ready')).toHaveLength(2) // harvest-ready
  })
})
