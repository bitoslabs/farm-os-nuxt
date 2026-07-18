/**
 * Inverse of event-builders.ts: parse Nostr events back into GardenOS entities
 * and merge them into the local state. Merge is additive & idempotent:
 *  - addressable (replaceable) events: upsert by `d` tag, newest created_at wins
 *  - log events (harvest/finance): append, deduped by a content signature
 */
import { GARDEN_KINDS } from '~/types/garden-kinds'
import type { GardenState, Plot, CropVariety, Planting, Harvest, Task, InventoryItem, FinanceRecord, GrowthStage, LivestockProfile, LivestockHealthLog, LivestockProductionLog, FarmAsset, MaintenanceLog, PlantingActivity } from '~/types/garden'

const STAGE_ORDER: GrowthStage[] = ['planned', 'seeded', 'germinating', 'seedling', 'vegetative', 'flowering', 'fruiting', 'ready', 'harvested']

/** Map a Nostr kind to the state collection it belongs to (for deletions & routing). */
const KIND_TO_COLLECTION: Record<number, keyof GardenState> = {
  [GARDEN_KINDS.FIELD_PLOT]: 'plots',
  [GARDEN_KINDS.CROP_VARIETY]: 'crops',
  [GARDEN_KINDS.PLANTING_RECORD]: 'plantings',
  [GARDEN_KINDS.TASK]: 'tasks',
  [GARDEN_KINDS.INPUT_INVENTORY]: 'inventory',
  [GARDEN_KINDS.FARM_ASSET]: 'assets',
  [GARDEN_KINDS.GROWTH_LOG]: 'activities',
  [GARDEN_KINDS.LIVESTOCK_PROFILE]: 'livestock'
}

type NostrEvent = { id: string; kind: number; content: string; tags: string[][]; created_at: number }

// State is reactive, so keep sync metadata outside the persisted domain model.
const stateVersions = new WeakMap<object, Map<string, number>>()
const stateEvents = new WeakMap<object, Set<string>>()
function metadata(state: GardenState) {
  let versions = stateVersions.get(state as object)
  if (!versions) { versions = new Map(); stateVersions.set(state as object, versions) }
  let ids = stateEvents.get(state as object)
  if (!ids) { ids = new Set(); stateEvents.set(state as object, ids) }
  return { versions, ids }
}

function tagVal(e: NostrEvent, name: string): string | undefined {
  return e.tags.find((t) => t[0] === name)?.[1]
}
function tagVals(e: NostrEvent, name: string): string[] {
  return e.tags.filter((t) => t[0] === name).map((t) => t[1])
}
function tagT(e: NostrEvent, prefix: string): string | undefined {
  const found = e.tags.find((t) => t[0] === 't' && t[1]?.startsWith(prefix))
  return found ? found[1].slice(prefix.length) : undefined
}
function content(e: NostrEvent): any {
  try { return JSON.parse(e.content) || {} } catch { return {} }
}
function isoFromUnix(s?: string): string | undefined {
  if (!s) return undefined
  const n = Number(s); return Number.isFinite(n) ? new Date(n * 1000).toISOString() : undefined
}
function stageProgress(stage?: string): number {
  const i = STAGE_ORDER.indexOf((stage as GrowthStage) || 'planned')
  return Math.round((i / (STAGE_ORDER.length - 1)) * 100)
}

/** Parse a single event into a typed entity + target collection. */
export function parseEvent(e: NostrEvent): { collection: keyof GardenState; entity: any } | null {
  const c = content(e)
  switch (e.kind) {
    case GARDEN_KINDS.FARM_PROFILE: {
      const farm = {
        id: tagVal(e, 'd') || 'farm',
        name: tagVal(e, 'name') || 'Farm',
        location: tagVal(e, 'location') || c.location || '',
        lat: c.lat, lng: c.lng,
        totalArea: c.totalArea ?? 0,
        areaUnit: c.areaUnit ?? 'm²',
        owner: tagVal(e, 'owner') || '',
        mode: (tagVal(e, 'mode') as any) || 'farm',
        establishedYear: c.establishedYear
      }
      return { collection: 'farm', entity: farm }
    }
    case GARDEN_KINDS.FIELD_PLOT: {
      const areaRaw = tagVal(e, 'area') || ''
      const m = areaRaw.match(/^([\d.]+)(m²|ha)$/)
      const plot: Plot = {
        id: tagVal(e, 'd') || e.id,
        name: tagVal(e, 'name') || 'Plot',
        type: (tagVal(e, 'type') as any) || 'plot',
        area: m ? Number(m[1]) : 0,
        areaUnit: (m?.[2] as any) || 'm²',
        soilType: c.soilType,
        sunExposure: c.sunExposure,
        zone: tagVal(e, 'zone') || undefined,
        notes: c.notes,
        activeCropId: undefined
      }
      return { collection: 'plots', entity: plot }
    }
    case GARDEN_KINDS.CROP_VARIETY: {
      const crop: CropVariety = {
        id: tagVal(e, 'd') || e.id,
        name: tagVal(e, 'name') || 'Crop',
        species: c.species || '',
        family: tagVal(e, 'family') || '',
        daysToMaturity: c.daysToMaturity ?? 60,
        spacingCm: c.spacingCm ?? 30,
        season: (tagVals(e, 'season') as any) || ['wet', 'dry'],
        notes: c.notes
      }
      return { collection: 'crops', entity: crop }
    }
    case GARDEN_KINDS.PLANTING_RECORD: {
      const stage = (tagT(e, 'stage:') as GrowthStage) || 'planned'
      const p: Planting = {
        id: tagVal(e, 'd') || e.id,
        plotId: tagVal(e, 'plot') || '',
        cropId: tagVal(e, 'crop') || '',
        method: (c.method as any) || 'seed',
        stage,
        quantity: c.quantity ?? 0,
        unit: c.unit || 'piece',
        plantedAt: isoFromUnix(tagVal(e, 'plantedAt')) || new Date(0).toISOString(),
        progress: stageProgress(stage),
        stageHistory: Array.isArray(c.stageHistory) ? c.stageHistory : undefined,
        notes: c.notes
      }
      return { collection: 'plantings', entity: p }
    }
    case GARDEN_KINDS.HARVEST_RECORD: {
      const h: Harvest = {
        id: e.id,
        plantingId: tagVal(e, 'planting') || '',
        cropId: tagVal(e, 'crop') || '',
        plotId: tagVal(e, 'plot') || '',
        quantity: c.quantity ?? 0,
        unit: c.unit || 'kg',
        quality: (c.quality as any) || 'B',
        harvestedAt: isoFromUnix(tagVal(e, 'harvestedAt')) || new Date(0).toISOString(),
        notes: c.notes
      }
      return { collection: 'harvests', entity: h }
    }
    case GARDEN_KINDS.TASK: {
      const t: Task = {
        id: tagVal(e, 'd') || e.id,
        title: c.title || '',
        description: c.description,
        status: (tagT(e, 'status:') as any) || 'todo',
        priority: (tagT(e, 'priority:') as any) || 'medium',
        dueAt: isoFromUnix(tagVal(e, 'dueAt')),
        assignee: tagVal(e, 'assignee') || undefined,
        plotId: tagVal(e, 'plot') || undefined,
        category: (tagVal(e, 'category') as any) || 'other'
      }
      return { collection: 'tasks', entity: t }
    }
    case GARDEN_KINDS.INPUT_INVENTORY: {
      const it: InventoryItem = {
        id: tagVal(e, 'd') || e.id,
        name: tagVal(e, 'name') || '',
        category: (tagVal(e, 'category') as any) || 'tool',
        unit: (tagVal(e, 'unit') as any) || 'piece',
        stock: c.stock ?? 0,
        reorderLevel: Number(tagVal(e, 'reorderLevel')) || 0,
        costPerUnit: c.costPerUnit ?? 0,
        currency: c.currency || 'USD',
        notes: c.notes
      }
      return { collection: 'inventory', entity: it }
    }
    case GARDEN_KINDS.EXPENSE_RECORD:
    case GARDEN_KINDS.INCOME_RECORD: {
      const f: FinanceRecord = {
        id: e.id,
        type: e.kind === GARDEN_KINDS.EXPENSE_RECORD ? 'expense' : 'income',
        category: tagVal(e, 'category') || '',
        amount: c.amount ?? 0,
        currency: c.currency || 'USD',
        date: isoFromUnix(tagVal(e, 'date')) || new Date(0).toISOString(),
        description: c.description,
        plotId: tagVal(e, 'plot') || undefined,
        cropId: tagVal(e, 'crop') || undefined,
        plantingId: tagVal(e, 'planting') || undefined
      }
      return { collection: 'finance', entity: f }
    }
    case GARDEN_KINDS.LIVESTOCK_PROFILE: {
      const c = content(e)
      const l: LivestockProfile = {
        id: tagVal(e, 'd') || e.id,
        name: tagVal(e, 'name') || 'Animal',
        species: (tagVal(e, 'species') as any) || 'other',
        breed: c.breed,
        tagId: c.tagId,
        sex: c.sex,
        count: c.count ?? 1,
        birthDate: isoFromUnix(tagVal(e, 'birthDate')),
        status: (tagVal(e, 'status') as any) || 'active',
        notes: c.notes
      }
      return { collection: 'livestock', entity: l }
    }
    case GARDEN_KINDS.LIVESTOCK_HEALTH_LOG: {
      const c = content(e)
      const h: LivestockHealthLog = {
        id: e.id,
        animalId: tagVal(e, 'animal') || '',
        type: (tagVal(e, 'type') as any) || 'checkup',
        severity: (tagVal(e, 'severity') as any) || 'low',
        description: c.description || '',
        date: isoFromUnix(tagVal(e, 'date')) || new Date(0).toISOString(),
        cost: c.cost,
        vetName: c.vetName
      }
      return { collection: 'livestockHealth', entity: h }
    }
    case GARDEN_KINDS.LIVESTOCK_PRODUCTION_LOG: {
      const c = content(e)
      const p: LivestockProductionLog = {
        id: e.id,
        animalId: tagVal(e, 'animal') || '',
        product: (tagVal(e, 'product') as any) || 'other',
        quantity: Number(tagVal(e, 'qty')) || 0,
        unit: (tagVal(e, 'unit') as any) || 'piece',
        date: isoFromUnix(tagVal(e, 'date')) || new Date(0).toISOString(),
        notes: c.notes
      }
      return { collection: 'livestockProduction', entity: p }
    }
    case GARDEN_KINDS.FARM_ASSET: {
      const a: FarmAsset = {
        id: tagVal(e, 'd') || e.id,
        name: tagVal(e, 'name') || 'Asset',
        category: (tagVal(e, 'category') as any) || 'other',
        status: (tagVal(e, 'status') as any) || 'active',
        condition: (c.condition as any) || 'good',
        currency: c.currency || 'USD',
        assetTag: tagVal(e, 'assetTag'),
        serialNumber: c.serialNumber,
        location: c.location,
        assignedTo: c.assignedTo,
        purchaseDate: isoFromUnix(tagVal(e, 'purchaseDate')),
        purchaseCost: c.purchaseCost,
        currentValue: c.currentValue,
        warrantyUntil: isoFromUnix(tagVal(e, 'warrantyUntil')),
        notes: c.notes
      }
      return { collection: 'assets', entity: a }
    }
    case GARDEN_KINDS.MAINTENANCE_LOG: {
      const m: MaintenanceLog = {
        id: e.id,
        assetId: tagVal(e, 'asset') || '',
        type: (tagVal(e, 'type') as any) || 'routine',
        description: c.description || '',
        date: isoFromUnix(tagVal(e, 'date')) || new Date(0).toISOString(),
        cost: c.cost,
        performedBy: c.performedBy
      }
      return { collection: 'maintenanceLogs', entity: m }
    }
    case GARDEN_KINDS.GROWTH_LOG: {
      const act: PlantingActivity = {
        id: e.id,
        plantingId: tagVal(e, 'planting') || '',
        type: (tagVal(e, 'type') as any) || 'other',
        date: isoFromUnix(tagVal(e, 'date')) || new Date(0).toISOString(),
        note: c.note,
        inputId: tagVal(e, 'input'),
        inputQty: c.inputQty,
        inputUnit: c.inputUnit
      }
      return { collection: 'activities', entity: act }
    }
    default:
      return null
  }
}

/** Signature for deduping log events on repeated relay loads. */
function logSig(collection: string, ent: any): string {
  if (collection === 'harvests') return `h:${ent.plantingId}:${ent.quantity}:${ent.harvestedAt}`
  if (collection === 'finance') return `f:${ent.type}:${ent.amount}:${ent.date}:${ent.category}`
  if (collection === 'livestockHealth') return `lh:${ent.animalId}:${ent.type}:${ent.date}:${ent.description}`
  if (collection === 'livestockProduction') return `lp:${ent.animalId}:${ent.product}:${ent.quantity}:${ent.date}`
  if (collection === 'maintenanceLogs') return `m:${ent.assetId}:${ent.type}:${ent.date}:${ent.description}`
  if (collection === 'activities') return `pa:${ent.plantingId}:${ent.type}:${ent.date}:${ent.note ?? ''}`
  return ent.id
}

/** Apply a NIP-09 deletion event (kind 5) by removing the referenced addressable entity. */
function applyDeletion(state: GardenState, e: NostrEvent): number {
  let removed = 0
  for (const t of e.tags) {
    if (t[0] !== 'a') continue
    const [kindStr, , d] = (t[1] || '').split(':')
    const collection = KIND_TO_COLLECTION[Number(kindStr)]
    if (!collection || !d) continue
    const arr = state[collection] as any[]
    const idx = arr.findIndex((x) => x.id === d)
    if (idx !== -1) { arr.splice(idx, 1); removed++ }
  }
  return removed
}

/**
 * Merge a batch of events (already sorted oldest→newest) into a state object.
 * Mutates the passed state. Returns the count of newly-merged records.
 */
export function mergeEvents(state: GardenState, events: NostrEvent[]): number {
  let added = 0
  const meta = metadata(state)
  for (const e of events) {
    if (e.id && meta.ids.has(e.id)) continue
    if (e.kind === 5) {
      let deletionApplied = false
      for (const t of e.tags || []) {
        if (t[0] !== 'a') continue
        const [kind, , d] = (t[1] || '').split(':')
        const collection = KIND_TO_COLLECTION[Number(kind)]
        if (collection && d) {
          const key = `${collection}:${d}`
          const timestamp = e.created_at || 0
          if ((meta.versions.get(key) || 0) <= timestamp) {
            meta.versions.set(key, timestamp)
            deletionApplied = true
          }
        }
      }
      if (deletionApplied) added += applyDeletion(state, e)
      if (e.id) meta.ids.add(e.id)
      continue
    }
    const parsed = parseEvent(e)
    if (!parsed) continue
    const { collection, entity } = parsed
    const d = tagVal(e, 'd') || entity.id
    const key = `${collection}:${d}`
    const timestamp = e.created_at || 0
    if ((meta.versions.get(key) || 0) > timestamp) continue
    meta.versions.set(key, timestamp)

    if (collection === 'farm') {
      // single farm profile: take newest (events are sorted asc, so later overrides)
      if (!state.farm || entity.name) state.farm = { ...state.farm, ...entity }
      if (e.id) meta.ids.add(e.id)
      continue
    }

    const arr = state[collection] as any[]
    const idx = arr.findIndex((x) => x.id === entity.id)
    if (idx !== -1) {
      // replaceable upsert
      if (JSON.stringify(arr[idx]) !== JSON.stringify(entity)) { arr[idx] = entity; added++ }
      if (e.id) meta.ids.add(e.id)
      continue
    }

    // for logs, dedupe by signature
    if ((collection === 'harvests' || collection === 'finance' || collection === 'livestockHealth' || collection === 'livestockProduction' || collection === 'maintenanceLogs' || collection === 'activities') && arr.some((x) => logSig(collection, x) === logSig(collection, entity))) {
      if (e.id) meta.ids.add(e.id)
      continue
    }
    arr.push(entity)
    added++
    if (e.id) meta.ids.add(e.id)
  }
  return added
}
