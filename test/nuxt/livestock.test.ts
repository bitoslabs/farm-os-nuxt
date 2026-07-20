import { describe, expect, it, beforeEach } from 'vitest'
import { useGardenStore } from '~/composables/useGardenStore'
import { emptyState } from '~/utils/emptyState'

describe('useGardenStore — livestock lifecycle', () => {
  beforeEach(() => {
    useGardenStore().state.value = emptyState()
  })

  it('acquire creates a profile, a purchase movement, and a linked expense', () => {
    const store = useGardenStore()
    const { profile, movement } = store.acquireLivestock(
      { name: 'Layers', species: 'chicken' },
      { count: 20, date: '2025-01-01T00:00:00.000Z', counterparty: 'Somchai Farm', totalAmount: 120, currency: 'USD' }
    )
    expect(profile.count).toBe(20)                       // count set by the purchase movement
    expect(profile.status).toBe('active')
    expect(store.livestockMovements.value).toHaveLength(1)
    expect(movement?.type).toBe('purchase')
    const expense = store.finance.value.find((f) => f.sourceId === movement!.id)
    expect(expense).toBeTruthy()
    expect(expense!.type).toBe('expense')
    expect(expense!.amount).toBe(120)
    expect(expense!.sourceType).toBe('livestock')
  })

  it('a partial sale reduces count and creates one income', () => {
    const store = useGardenStore()
    const { profile } = store.acquireLivestock({ name: 'Layers', species: 'chicken' }, { count: 20, date: '2025-01-01T00:00:00.000Z', totalAmount: 120, currency: 'USD' })
    const res = store.recordLivestockMovement({ animalId: profile.id, type: 'sale', count: 5, date: '2025-06-01T00:00:00.000Z', totalAmount: 50, currency: 'USD', counterparty: 'Market' })
    expect(res.ok).toBe(true)
    const updated = store.livestockById.value[profile.id]
    expect(updated.count).toBe(15)
    expect(updated.status).toBe('active')
    const income = store.finance.value.filter((f) => f.type === 'income')
    expect(income).toHaveLength(1)
    expect(income[0].amount).toBe(50)
  })

  it('rejects over-selling with no partial writes', () => {
    const store = useGardenStore()
    const { profile } = store.acquireLivestock({ name: 'Cow', species: 'cow' }, { count: 1, date: '2025-01-01T00:00:00.000Z' })
    const before = store.finance.value.length
    const res = store.recordLivestockMovement({ animalId: profile.id, type: 'sale', count: 5, date: '2025-06-01T00:00:00.000Z' })
    expect(res.ok).toBe(false)
    expect(store.livestockById.value[profile.id].count).toBe(1)   // unchanged
    expect(store.finance.value.length).toBe(before)               // no finance written
  })

  it('death to zero closes the record as deceased', () => {
    const store = useGardenStore()
    const { profile } = store.acquireLivestock({ name: 'Fish batch', species: 'fish' }, { count: 50, date: '2025-01-01T00:00:00.000Z' })
    const res = store.recordLivestockMovement({ animalId: profile.id, type: 'death', count: 50, date: '2025-06-01T00:00:00.000Z', reason: 'Disease' })
    expect(res.ok).toBe(true)
    const updated = store.livestockById.value[profile.id]
    expect(updated.count).toBe(0)
    expect(updated.status).toBe('deceased')
    expect(store.finance.value.filter((f) => f.type === 'income')).toHaveLength(0) // death creates no income
  })

  it('death requires a reason', () => {
    const store = useGardenStore()
    const { profile } = store.acquireLivestock({ name: 'Goat', species: 'goat' }, { count: 2, date: '2025-01-01T00:00:00.000Z' })
    const res = store.recordLivestockMovement({ animalId: profile.id, type: 'death', count: 1, date: '2025-06-01T00:00:00.000Z' })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('reason-required')
  })

  it('blocks profile deletion once history exists, but allows it for empty records', () => {
    const store = useGardenStore()
    const empty = store.addLivestock({ name: 'Temp', species: 'other', count: 1, status: 'active' })
    expect(store.removeLivestock(empty.id).ok).toBe(true)

    const { profile } = store.acquireLivestock({ name: 'Layers', species: 'chicken' }, { count: 10, date: '2025-01-01T00:00:00.000Z' })
    expect(store.removeLivestock(profile.id).ok).toBe(false)     // has a purchase movement
    expect(store.livestock.value.some((l) => l.id === profile.id)).toBe(true)
  })
})
