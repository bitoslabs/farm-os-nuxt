/**
 * Event builders — convert GardenOS entities into Nostr event templates
 * { kind, content, tags } per docs/plan.md §3.2 (GARDEN_KINDS, tags standard).
 * Content is JSON; relations live in tags for relay-side filtering.
 */
import { GARDEN_KINDS } from '~/types/garden-kinds'
import type { Plot, CropVariety, Planting, Harvest, Task, InventoryItem, FinanceRecord, FarmProfile } from '~/types/garden'

export interface EventTemplate {
  kind: number
  content: string
  tags: string[][]
}

const SEASON = '2025-wet'

export function farmProfileEvent(farm: FarmProfile): EventTemplate {
  return {
    kind: GARDEN_KINDS.FARM_PROFILE,
    content: JSON.stringify({ location: farm.location, lat: farm.lat, lng: farm.lng, totalArea: farm.totalArea, areaUnit: farm.areaUnit, establishedYear: farm.establishedYear }),
    tags: [
      ['d', farm.id], ['name', farm.name], ['owner', farm.owner], ['mode', farm.mode], ['location', farm.location]
    ]
  }
}

export function plotEvent(plot: Plot, farmId: string): EventTemplate {
  return {
    kind: GARDEN_KINDS.FIELD_PLOT,
    content: JSON.stringify({ soilType: plot.soilType, sunExposure: plot.sunExposure, notes: plot.notes }),
    tags: [
      ['d', plot.id], ['name', plot.name], ['type', plot.type], ['zone', plot.zone ?? ''],
      ['area', `${plot.area}${plot.areaUnit}`], ['farm', farmId]
    ]
  }
}

export function cropEvent(crop: CropVariety): EventTemplate {
  return {
    kind: GARDEN_KINDS.CROP_VARIETY,
    content: JSON.stringify({ species: crop.species, daysToMaturity: crop.daysToMaturity, spacingCm: crop.spacingCm, notes: crop.notes }),
    tags: [
      ['d', crop.id], ['name', crop.name], ['family', crop.family],
      ...crop.season.map((s) => ['season', s])
    ]
  }
}

export function plantingEvent(p: Planting): EventTemplate {
  return {
    kind: GARDEN_KINDS.PLANTING_RECORD,
    content: JSON.stringify({ method: p.method, quantity: p.quantity, unit: p.unit, notes: p.notes, stageHistory: p.stageHistory }),
    tags: [
      ['d', p.id], ['plot', p.plotId], ['crop', p.cropId], ['season', SEASON],
      ['plantedAt', String(Math.floor(new Date(p.plantedAt).getTime() / 1000))],
      ['t', `stage:${p.stage}`]
    ]
  }
}

export function harvestEvent(h: Harvest): EventTemplate {
  return {
    kind: GARDEN_KINDS.HARVEST_RECORD,
    content: JSON.stringify({ quantity: h.quantity, unit: h.unit, quality: h.quality, notes: h.notes }),
    tags: [
      ['planting', h.plantingId], ['crop', h.cropId], ['plot', h.plotId],
      ['harvestedAt', String(Math.floor(new Date(h.harvestedAt).getTime() / 1000))],
      ['t', `quality:${h.quality}`]
    ]
  }
}

export function taskEvent(t: Task): EventTemplate {
  return {
    kind: GARDEN_KINDS.TASK,
    content: JSON.stringify({ title: t.title, description: t.description }),
    tags: [
      ['d', t.id], ['t', `status:${t.status}`], ['t', `priority:${t.priority}`],
      ['category', t.category], ['assignee', t.assignee ?? ''],
      ...(t.plotId ? [['plot', t.plotId]] : []),
      ...(t.dueAt ? [['dueAt', String(Math.floor(new Date(t.dueAt).getTime() / 1000))]] : [])
    ]
  }
}

export function inventoryEvent(item: InventoryItem): EventTemplate {
  return {
    kind: GARDEN_KINDS.INPUT_INVENTORY,
    content: JSON.stringify({ stock: item.stock, costPerUnit: item.costPerUnit, currency: item.currency, notes: item.notes }),
    tags: [
      ['d', item.id], ['name', item.name], ['category', item.category], ['unit', item.unit],
      ['reorderLevel', String(item.reorderLevel)]
    ]
  }
}

export function financeEvent(f: FinanceRecord): EventTemplate {
  return {
    kind: f.type === 'expense' ? GARDEN_KINDS.EXPENSE_RECORD : GARDEN_KINDS.INCOME_RECORD,
    content: JSON.stringify({ amount: f.amount, currency: f.currency, description: f.description }),
    tags: [
      ['category', f.category],
      ...(f.plotId ? [['plot', f.plotId]] : []),
      ...(f.cropId ? [['crop', f.cropId]] : []),
      ...(f.plantingId ? [['planting', f.plantingId]] : []),
      ['date', String(Math.floor(new Date(f.date).getTime() / 1000))]
    ]
  }
}

// ---- Assets & Maintenance (32044–32045) ----
export function farmAssetEvent(a: import('~/types/garden').FarmAsset): EventTemplate {
  return {
    kind: GARDEN_KINDS.FARM_ASSET,
    content: JSON.stringify({
      serialNumber: a.serialNumber, condition: a.condition, location: a.location,
      assignedTo: a.assignedTo, purchaseCost: a.purchaseCost, currentValue: a.currentValue,
      currency: a.currency, notes: a.notes
    }),
    tags: [
      ['d', a.id], ['name', a.name], ['category', a.category], ['status', a.status],
      ...(a.assetTag ? [['assetTag', a.assetTag]] : []),
      ...(a.purchaseDate ? [['purchaseDate', String(Math.floor(new Date(a.purchaseDate).getTime() / 1000))]] : []),
      ...(a.warrantyUntil ? [['warrantyUntil', String(Math.floor(new Date(a.warrantyUntil).getTime() / 1000))]] : [])
    ]
  }
}

export function maintenanceLogEvent(m: import('~/types/garden').MaintenanceLog): EventTemplate {
  return {
    kind: GARDEN_KINDS.MAINTENANCE_LOG,
    content: JSON.stringify({ description: m.description, cost: m.cost, performedBy: m.performedBy }),
    tags: [
      ['asset', m.assetId], ['type', m.type],
      ['date', String(Math.floor(new Date(m.date).getTime() / 1000))]
    ]
  }
}

// ---- Planting activities / care log (32013) ----
export function growthLogEvent(a: import('~/types/garden').PlantingActivity): EventTemplate {
  return {
    kind: GARDEN_KINDS.GROWTH_LOG,
    content: JSON.stringify({ note: a.note, inputQty: a.inputQty, inputUnit: a.inputUnit }),
    tags: [
      ['planting', a.plantingId], ['type', a.type],
      ...(a.inputId ? [['input', a.inputId]] : []),
      ['date', String(Math.floor(new Date(a.date).getTime() / 1000))]
    ]
  }
}

/** NIP-01 profile metadata (kind 0) for the signed-in identity. */
export function profileMetadataEvent(name: string, about: string, picture: string): EventTemplate {
  return {
    kind: 0,
    content: JSON.stringify({ name, about, picture }),
    tags: []
  }
}

// ---- Livestock (32060–32062) ----
export function livestockEvent(l: import('~/types/garden').LivestockProfile): EventTemplate {
  return {
    kind: GARDEN_KINDS.LIVESTOCK_PROFILE,
    content: JSON.stringify({ breed: l.breed, tagId: l.tagId, sex: l.sex, count: l.count, birthDate: l.birthDate, notes: l.notes }),
    tags: [
      ['d', l.id], ['name', l.name], ['species', l.species],
      ['status', l.status],
      ...(l.birthDate ? [['birthDate', String(Math.floor(new Date(l.birthDate).getTime() / 1000))]] : [])
    ]
  }
}

export function livestockHealthEvent(h: import('~/types/garden').LivestockHealthLog): EventTemplate {
  return {
    kind: GARDEN_KINDS.LIVESTOCK_HEALTH_LOG,
    content: JSON.stringify({ description: h.description, cost: h.cost, vetName: h.vetName }),
    tags: [
      ['animal', h.animalId], ['type', h.type], ['severity', h.severity],
      ['date', String(Math.floor(new Date(h.date).getTime() / 1000))]
    ]
  }
}

export function livestockProductionEvent(p: import('~/types/garden').LivestockProductionLog): EventTemplate {
  return {
    kind: GARDEN_KINDS.LIVESTOCK_PRODUCTION_LOG,
    content: JSON.stringify({ notes: p.notes }),
    tags: [
      ['animal', p.animalId], ['product', p.product], ['qty', String(p.quantity)],
      ['unit', p.unit], ['date', String(Math.floor(new Date(p.date).getTime() / 1000))]
    ]
  }
}
