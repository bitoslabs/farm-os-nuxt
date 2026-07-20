import { describe, expect, it, beforeEach } from 'vitest'
import { useGardenStore } from '~/composables/useGardenStore'
import { emptyState } from '~/utils/emptyState'
import type { GrowthStage } from '~/types/garden'

describe('useGardenStore — planting stage history', () => {
  beforeEach(() => {
    useGardenStore().state.value = emptyState()
  })

  it('seeds stageHistory with the initial stage at the planted date', () => {
    const store = useGardenStore()
    const p = store.addPlanting({
      plotId: 'plt', cropId: 'crp', method: 'seed', stage: 'seeded',
      quantity: 10, unit: 'piece', plantedAt: '2025-04-15T00:00:00.000Z'
    })
    expect(p.stageHistory).toEqual([{ stage: 'seeded', at: '2025-04-15T00:00:00.000Z' }])
  })

  it('appends an entry when the stage advances', () => {
    const store = useGardenStore()
    const p = store.addPlanting({ plotId: 'plt', cropId: 'crp', method: 'seed', stage: 'seeded', quantity: 1, unit: 'piece', plantedAt: '2025-04-15T00:00:00.000Z' })
    store.setPlantingStage(p.id, 'seedling')
    store.setPlantingStage(p.id, 'vegetative')
    const updated = store.plantings.value.find((x) => x.id === p.id)!
    expect(updated.stageHistory?.map((h) => h.stage)).toEqual(['seeded', 'seedling', 'vegetative'])
    expect(updated.stage).toBe('vegetative')
  })

  it('is a no-op (history untouched) when set to the same stage', () => {
    const store = useGardenStore()
    const p = store.addPlanting({ plotId: 'plt', cropId: 'crp', method: 'seed', stage: 'seeded', quantity: 1, unit: 'piece', plantedAt: '2025-04-15T00:00:00.000Z' })
    const before = store.plantings.value.find((x) => x.id === p.id)!.stageHistory
    store.setPlantingStage(p.id, 'seeded')
    expect(store.plantings.value.find((x) => x.id === p.id)!.stageHistory).toBe(before)
  })

  it('updatePlanting records a stage change in history', () => {
    const store = useGardenStore()
    const p = store.addPlanting({ plotId: 'plt', cropId: 'crp', method: 'seed', stage: 'seeded', quantity: 1, unit: 'piece', plantedAt: '2025-04-15T00:00:00.000Z' })
    store.updatePlanting(p.id, { stage: 'flowering' })
    const updated = store.plantings.value.find((x) => x.id === p.id)!
    expect(updated.stageHistory?.map((h) => h.stage)).toEqual(['seeded', 'flowering'])
  })

  it('preserves and extends history across many transitions', () => {
    const store = useGardenStore()
    const p = store.addPlanting({ plotId: 'plt', cropId: 'crp', method: 'seed', stage: 'planned', quantity: 1, unit: 'piece', plantedAt: '2025-01-01T00:00:00.000Z' })
    for (const s of (['seeded', 'germinating', 'seedling', 'vegetative', 'flowering', 'fruiting', 'ready', 'harvested'] as GrowthStage[])) {
      store.setPlantingStage(p.id, s)
    }
    const updated = store.plantings.value.find((x) => x.id === p.id)!
    expect(updated.stageHistory).toHaveLength(9) // planned + 8 advances
    expect(updated.stageHistory?.[8].stage).toBe('harvested')
  })
})
