import type { GardenState } from '~/types/garden'

/**
 * A blank garden state. Fresh users start here (no demo data); returning users
 * are hydrated from IndexedDB by plugins/sync.client.ts.
 */
export function emptyState(): GardenState {
  return {
    farm: {
      id: 'farm',
      name: '',
      owner: '',
      location: '',
      totalArea: 0,
      areaUnit: 'm²',
      mode: 'farm'
    },
    plots: [],
    crops: [],
    plantings: [],
    harvests: [],
    tasks: [],
    inventory: [],
    finance: [],
    livestock: [],
    livestockHealth: [],
    livestockProduction: [],
    assets: [],
    maintenanceLogs: [],
    activities: []
  }
}
