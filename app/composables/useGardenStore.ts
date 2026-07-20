import type {
  GardenState,
  Plot,
  CropVariety,
  Planting,
  Harvest,
  Task,
  InventoryItem,
  FinanceRecord,
  ActivityItem,
  GrowthStage,
  StageHistoryEntry,
  LivestockProfile,
  LivestockHealthLog,
  LivestockProductionLog,
  FarmAsset,
  MaintenanceLog,
  PlantingActivity,
  LivestockMovement
} from '~/types/garden'
import { emptyState } from '~/utils/emptyState'
import {
  plotEvent, cropEvent, plantingEvent, harvestEvent,
  taskEvent, inventoryEvent, financeEvent,
  livestockEvent, livestockHealthEvent, livestockProductionEvent,
  livestockMovementEvent,
  farmAssetEvent, maintenanceLogEvent, growthLogEvent
} from '~/utils/event-builders'
import { useNostr } from '~/composables/useNostr'
import { GARDEN_KINDS } from '~/types/garden-kinds'

/**
 * GardenOS reactive store — SSR-safe singleton via Nuxt's useState.
 *
 * This is the CRUD seam: today it mutates local state (seeded); tomorrow the
 * Repository Adapter will republish each mutation as a signed Nostr event.
 * Pages never touch persistence directly — only this composable.
 */

const STAGE_ORDER: GrowthStage[] = [
  'planned', 'seeded', 'germinating', 'seedling', 'vegetative',
  'flowering', 'fruiting', 'ready', 'harvested'
]

let uid = 0
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(uid++).toString(36)}`

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Append a growth-stage transition to a planting's history, deduping a
 * consecutive repeat of the current stage. Returns a new array (immutable).
 */
function recordStage(history: StageHistoryEntry[] | undefined, stage: GrowthStage, at = new Date().toISOString()): StageHistoryEntry[] {
  const base = history ?? []
  const last = base[base.length - 1]
  if (last && last.stage === stage) return base
  return [...base, { stage, at }]
}

export function useGardenStore() {
  // Shared singleton state across the app
  const state = useState<GardenState>('garden-state', () => emptyState())
  const nostr = useNostr()

  // ---- Lookups ----
  const plotById = computed(() => keyBy(state.value.plots, 'id'))
  const cropById = computed(() => keyBy(state.value.crops, 'id'))

  // ---- CRUD: Plots ----
  function addPlot(p: Omit<Plot, 'id'>) {
    const plot: Plot = { ...p, id: newId('plt') }
    state.value.plots.push(plot)
    nostr.publishQuiet(plotEvent(plot, state.value.farm.id))
    return plot
  }
  function updatePlot(id: string, patch: Partial<Plot>) {
    const i = state.value.plots.findIndex((p) => p.id === id)
    if (i !== -1) { state.value.plots[i] = { ...state.value.plots[i], ...patch }; nostr.publishQuiet(plotEvent(state.value.plots[i], state.value.farm.id)) }
  }
  function removePlot(id: string) {
    state.value.plots = state.value.plots.filter((p) => p.id !== id)
    nostr.deleteAddressable(GARDEN_KINDS.FIELD_PLOT, id)
  }

  // ---- CRUD: Crops ----
  function addCrop(c: Omit<CropVariety, 'id'>) {
    const crop: CropVariety = { ...c, id: newId('crop') }
    state.value.crops.push(crop)
    nostr.publishQuiet(cropEvent(crop))
    return crop
  }
  function updateCrop(id: string, patch: Partial<CropVariety>) {
    const i = state.value.crops.findIndex((c) => c.id === id)
    if (i !== -1) { state.value.crops[i] = { ...state.value.crops[i], ...patch }; nostr.publishQuiet(cropEvent(state.value.crops[i])) }
  }
  function removeCrop(id: string) {
    state.value.crops = state.value.crops.filter((c) => c.id !== id)
    nostr.deleteAddressable(GARDEN_KINDS.CROP_VARIETY, id)
  }

  // ---- CRUD: Plantings ----
  function addPlanting(p: Omit<Planting, 'id' | 'progress'>) {
    const progress = clamp(
      Math.round((STAGE_ORDER.indexOf(p.stage) / (STAGE_ORDER.length - 1)) * 100)
    )
    const planting: Planting = {
      ...p,
      id: newId('p'),
      progress,
      stageHistory: p.stageHistory ?? recordStage(undefined, p.stage, p.plantedAt)
    }
    state.value.plantings.push(planting)
    nostr.publishQuiet(plantingEvent(planting))
    return planting
  }
  function setPlantingStage(id: string, stage: GrowthStage) {
    const p = state.value.plantings.find((x) => x.id === id)
    if (!p || p.stage === stage) return
    p.stage = stage
    p.progress = clamp(
      Math.round((STAGE_ORDER.indexOf(stage) / (STAGE_ORDER.length - 1)) * 100)
    )
    p.stageHistory = recordStage(p.stageHistory, stage)
    nostr.publishQuiet(plantingEvent(p))
  }
  function updatePlanting(id: string, patch: Partial<Planting>) {
    const i = state.value.plantings.findIndex((x) => x.id === id)
    if (i === -1) return
    const current = state.value.plantings[i]
    const stageChanged = !!patch.stage && patch.stage !== current.stage
    const merged: Planting = { ...current, ...patch }
    merged.progress = clamp(Math.round((STAGE_ORDER.indexOf(merged.stage) / (STAGE_ORDER.length - 1)) * 100))
    if (stageChanged) merged.stageHistory = recordStage(current.stageHistory, merged.stage)
    state.value.plantings[i] = merged
    nostr.publishQuiet(plantingEvent(merged))
  }
  function removePlanting(id: string) {
    state.value.plantings = state.value.plantings.filter((p) => p.id !== id)
    nostr.deleteAddressable(GARDEN_KINDS.PLANTING_RECORD, id)
  }

  // ---- CRUD: Harvests ----
  function addHarvest(h: Omit<Harvest, 'id'>) {
    const harvest: Harvest = { ...h, id: newId('h') }
    state.value.harvests.push(harvest)
    nostr.publishQuiet(harvestEvent(harvest))
    return harvest
  }
  function removeHarvest(id: string) {
    state.value.harvests = state.value.harvests.filter((h) => h.id !== id)
  }

  // ---- CRUD: Tasks ----
  function addTask(t: Omit<Task, 'id'>) {
    const task: Task = { ...t, id: newId('t') }
    state.value.tasks.push(task)
    nostr.publishQuiet(taskEvent(task))
    return task
  }
  function updateTask(id: string, patch: Partial<Task>) {
    const i = state.value.tasks.findIndex((t) => t.id === id)
    if (i !== -1) {
      state.value.tasks[i] = { ...state.value.tasks[i], ...patch }
      nostr.publishQuiet(taskEvent(state.value.tasks[i]))
    }
  }
  function removeTask(id: string) {
    state.value.tasks = state.value.tasks.filter((t) => t.id !== id)
    nostr.deleteAddressable(GARDEN_KINDS.TASK, id)
  }

  // ---- CRUD: Inventory ----
  function updateInventory(id: string, patch: Partial<InventoryItem>) {
    const i = state.value.inventory.findIndex((x) => x.id === id)
    if (i !== -1) {
      state.value.inventory[i] = { ...state.value.inventory[i], ...patch }
      nostr.publishQuiet(inventoryEvent(state.value.inventory[i]))
    }
  }
  function addInventory(item: Omit<InventoryItem, 'id'>) {
    const entry: InventoryItem = { ...item, id: newId('i') }
    state.value.inventory.push(entry)
    nostr.publishQuiet(inventoryEvent(entry))
    return entry
  }
  function removeInventory(id: string) {
    state.value.inventory = state.value.inventory.filter((x) => x.id !== id)
    nostr.deleteAddressable(GARDEN_KINDS.INPUT_INVENTORY, id)
  }

  // ---- CRUD: Finance ----
  function addFinance(r: Omit<FinanceRecord, 'id'>) {
    const rec: FinanceRecord = { ...r, id: newId('f') }
    state.value.finance.push(rec)
    nostr.publishQuiet(financeEvent(rec))
    return rec
  }
  function removeFinance(id: string) {
    state.value.finance = state.value.finance.filter((x) => x.id !== id)
  }
  function updateFinance(id: string, patch: Partial<FinanceRecord>) {
    const i = state.value.finance.findIndex((x) => x.id === id)
    if (i !== -1) state.value.finance[i] = { ...state.value.finance[i], ...patch }
  }

  // ---- CRUD: Livestock ----
  function addLivestock(l: Omit<LivestockProfile, 'id'>) {
    const animal: LivestockProfile = { ...l, id: newId('lv') }
    state.value.livestock.push(animal)
    nostr.publishQuiet(livestockEvent(animal))
    return animal
  }
  function updateLivestock(id: string, patch: Partial<LivestockProfile>) {
    const i = state.value.livestock.findIndex((x) => x.id === id)
    if (i !== -1) { state.value.livestock[i] = { ...state.value.livestock[i], ...patch }; nostr.publishQuiet(livestockEvent(state.value.livestock[i])) }
  }
  /** Block destructive deletion once a record has any history; never cascade-delete append-only logs. */
  function removeLivestock(id: string): { ok: boolean; error?: string } {
    const hasHistory =
      state.value.livestockMovements.some((m) => m.animalId === id || m.parentAnimalId === id) ||
      state.value.livestockHealth.some((h) => h.animalId === id) ||
      state.value.livestockProduction.some((p) => p.animalId === id)
    if (hasHistory) return { ok: false, error: 'has-history' }
    state.value.livestock = state.value.livestock.filter((x) => x.id !== id)
    nostr.deleteAddressable(GARDEN_KINDS.LIVESTOCK_PROFILE, id)
    return { ok: true }
  }
  function addHealthLog(h: Omit<LivestockHealthLog, 'id'>) {
    const log: LivestockHealthLog = { ...h, id: newId('lh') }
    state.value.livestockHealth.push(log)
    nostr.publishQuiet(livestockHealthEvent(log))
    return log
  }
  /** Remove a health log locally and publish a NIP-09 deletion of its event. */
  function removeHealthLog(id: string) {
    state.value.livestockHealth = state.value.livestockHealth.filter((x) => x.id !== id)
    nostr.deleteEvent(id)
  }
  function addProductionLog(p: Omit<LivestockProductionLog, 'id'>) {
    const log: LivestockProductionLog = { ...p, id: newId('lp') }
    state.value.livestockProduction.push(log)
    nostr.publishQuiet(livestockProductionEvent(log))
    return log
  }
  /** Remove a production log locally and publish a NIP-09 deletion of its event. */
  function removeProductionLog(id: string) {
    state.value.livestockProduction = state.value.livestockProduction.filter((x) => x.id !== id)
    nostr.deleteEvent(id)
  }

  // ---- Lifecycle movements (kind 32063) — atomic count + finance + events ----
  /** Validate and apply a movement: updates head count, sets terminal status, and creates a linked finance record. */
  function recordLivestockMovement(input: Omit<LivestockMovement, 'id' | 'financeId'>): { ok: boolean; movement?: LivestockMovement; error?: string } {
    const animal = state.value.livestock.find((l) => l.id === input.animalId)
    if (!animal) return { ok: false, error: 'not-found' }
    const count = Math.floor(input.count)
    if (!Number.isFinite(count) || count <= 0) return { ok: false, error: 'invalid-count' }
    const isOut = input.type === 'sale' || input.type === 'death' || input.type === 'transfer_out'
    const isIn = input.type === 'purchase' || input.type === 'birth' || input.type === 'transfer_in'
    if (isOut && count > animal.count) return { ok: false, error: 'over-limit' }
    if (input.type === 'death' && !input.reason?.trim()) return { ok: false, error: 'reason-required' }

    const movement: LivestockMovement = { ...input, count, id: newId('mv') }

    // linked finance (purchase → expense, sale → income, death → optional disposal expense)
    const amount = input.totalAmount ?? (input.unitPrice ? input.unitPrice * count : undefined)
    if (amount && amount > 0 && (input.type === 'purchase' || input.type === 'sale' || input.type === 'death')) {
      const finance: FinanceRecord = {
        id: newId('f'),
        type: input.type === 'sale' ? 'income' : 'expense',
        category: input.type === 'sale' ? 'Livestock sale' : 'Livestock',
        amount,
        currency: input.currency || 'USD',
        date: input.date,
        description: `${input.type} · ${animal.name}`,
        sourceType: 'livestock',
        sourceId: movement.id
      }
      state.value.finance.push(finance)
      movement.financeId = finance.id
      nostr.publishQuiet(financeEvent(finance))
    }

    // apply head count + terminal status
    if (isIn) animal.count += count
    else if (isOut) {
      animal.count -= count
      if (animal.count <= 0) {
        animal.count = 0
        animal.status = input.type === 'sale' ? 'sold' : input.type === 'death' ? 'deceased' : 'transferred'
      }
    }

    state.value.livestockMovements.push(movement)
    nostr.publishQuiet(livestockMovementEvent(movement))
    nostr.publishQuiet(livestockEvent(animal))
    return { ok: true, movement }
  }
  /** Acquisition-first creation: profile (count 0) + a purchase movement that sets head count + linked expense. */
  function acquireLivestock(profile: Omit<LivestockProfile, 'id' | 'count' | 'status'>, purchase: { count: number; date: string; counterparty?: string; unitPrice?: number; totalAmount?: number; currency?: string; reference?: string; notes?: string }) {
    const animal: LivestockProfile = { ...profile, id: newId('lv'), count: 0, status: 'active' }
    state.value.livestock.push(animal)
    nostr.publishQuiet(livestockEvent(animal))
    const res = recordLivestockMovement({
      animalId: animal.id, type: 'purchase', count: purchase.count, date: purchase.date,
      counterparty: purchase.counterparty, unitPrice: purchase.unitPrice, totalAmount: purchase.totalAmount,
      currency: purchase.currency, reference: purchase.reference, notes: purchase.notes
    })
    return { profile: animal, movement: res.movement }
  }
  /** Create an offspring record and its parent-linked birth movement. The parent's count is not changed. */
  function recordLivestockBirth(parentAnimalId: string, input: {
    name: string; count: number; date: string; breed?: string; tagId?: string
    sex?: LivestockProfile['sex']; notes?: string
  }): { ok: boolean; profile?: LivestockProfile; movement?: LivestockMovement; error?: string } {
    const parent = state.value.livestock.find((l) => l.id === parentAnimalId)
    const count = Math.floor(input.count)
    if (!parent) return { ok: false, error: 'parent-not-found' }
    if (!input.name.trim() || !Number.isFinite(count) || count <= 0) return { ok: false, error: 'invalid-birth' }

    const animal: LivestockProfile = {
      id: newId('lv'), name: input.name.trim(), species: parent.species,
      breed: input.breed || parent.breed, tagId: input.tagId || undefined,
      sex: input.sex || 'mixed', count: 0, birthDate: input.date,
      parentAnimalId, status: 'active', notes: input.notes || undefined
    }
    state.value.livestock.push(animal)
    const res = recordLivestockMovement({
      animalId: animal.id, parentAnimalId, type: 'birth', count, date: input.date,
      notes: input.notes || undefined
    })
    if (!res.ok) {
      state.value.livestock = state.value.livestock.filter((l) => l.id !== animal.id)
      return { ok: false, error: res.error }
    }
    return { ok: true, profile: animal, movement: res.movement }
  }
  /** Remove a movement (pre-sync correction) and publish a NIP-09 deletion. Does not reverse applied count/finance. */
  function removeMovement(id: string) {
    state.value.livestockMovements = state.value.livestockMovements.filter((x) => x.id !== id)
    nostr.deleteEvent(id)
  }

  // ---- CRUD: Assets & Maintenance ----
  function addAsset(a: Omit<FarmAsset, 'id'>) {
    const asset: FarmAsset = { ...a, id: newId('ast') }
    state.value.assets.push(asset)
    nostr.publishQuiet(farmAssetEvent(asset))
    return asset
  }
  function updateAsset(id: string, patch: Partial<FarmAsset>) {
    const i = state.value.assets.findIndex((x) => x.id === id)
    if (i !== -1) { state.value.assets[i] = { ...state.value.assets[i], ...patch }; nostr.publishQuiet(farmAssetEvent(state.value.assets[i])) }
  }
  function removeAsset(id: string) {
    state.value.assets = state.value.assets.filter((x) => x.id !== id)
    state.value.maintenanceLogs = state.value.maintenanceLogs.filter((x) => x.assetId !== id)
    nostr.deleteAddressable(GARDEN_KINDS.FARM_ASSET, id)
  }
  function addMaintenanceLog(m: Omit<MaintenanceLog, 'id'>) {
    const log: MaintenanceLog = { ...m, id: newId('mt') }
    state.value.maintenanceLogs.push(log)
    nostr.publishQuiet(maintenanceLogEvent(log))
    return log
  }
  function removeMaintenanceLog(id: string) { state.value.maintenanceLogs = state.value.maintenanceLogs.filter((x) => x.id !== id) }

  // ---- Activities (planting care log, kind 32013) ----
  function addActivity(a: Omit<PlantingActivity, 'id'>) {
    const log: PlantingActivity = { ...a, id: newId('actv') }
    state.value.activities.push(log)
    // consuming an inventory input (fertilizer/pesticide) decrements stock
    if (log.inputId && log.inputQty && log.inputQty > 0) {
      const item = state.value.inventory.find((x) => x.id === log.inputId)
      if (item) item.stock = Math.max(0, item.stock - log.inputQty)
    }
    nostr.publishQuiet(growthLogEvent(log))
    return log
  }
  function removeActivity(id: string) { state.value.activities = state.value.activities.filter((x) => x.id !== id) }

  /**
   * Promote a consumable inventory item into a durable asset (e.g. a tool),
   * copying over identifying + cost fields. The inventory entry is left in
   * place so stock totals are unaffected.
   */
  function convertInventoryToAsset(itemId: string, patch: Partial<FarmAsset> = {}): FarmAsset | undefined {
    const item = state.value.inventory.find((x) => x.id === itemId)
    if (!item) return undefined
    const category = item.category === 'tool' ? 'tool' : 'other'
    return addAsset({
      name: item.name,
      category,
      condition: 'good',
      status: 'active',
      currency: item.currency,
      purchaseCost: item.costPerUnit || undefined,
      notes: item.notes,
      ...patch
    })
  }

  // ============================
  // Aggregates / Dashboard data
  // ============================

  const activePlantings = computed(() =>
    state.value.plantings.filter((p) => p.stage !== 'harvested')
  )

  const pendingTasks = computed(() =>
    state.value.tasks.filter((t) => t.status !== 'done')
  )

  const seasonHarvestKg = computed(() =>
    state.value.harvests.reduce((sum, h) => sum + (h.unit === 'kg' ? h.quantity : 0), 0)
  )

  /** Income vs expense over the last N months, oldest → newest. */
  const financeTrend = computed(() => buildFinanceTrend(state.value.finance, 8))

  /** Season plan completion: fraction of plantings that have reached maturity. */
  const seasonProgress = computed(() => {
    const list = state.value.plantings
    if (!list.length) return 0
    const sum = list.reduce((acc, p) => acc + p.progress, 0)
    return Math.round(sum / list.length)
  })

  const totalIncome = computed(() =>
    state.value.finance.filter((f) => f.type === 'income').reduce((s, f) => s + f.amount, 0)
  )
  const totalExpense = computed(() =>
    state.value.finance.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0)
  )
  const netProfit = computed(() => totalIncome.value - totalExpense.value)

  const lowStockItems = computed(() =>
    state.value.inventory.filter((i) => i.stock <= i.reorderLevel)
  )

  // ---- Assets & Maintenance aggregates ----
  const assetById = computed(() => keyBy(state.value.assets, 'id'))
  const livestockById = computed(() => keyBy(state.value.livestock, 'id'))
  const activeLivestock = computed(() => state.value.livestock.filter((l) => l.status === 'active'))

  /** total book value of in-service assets (excludes retired / lost) */
  const assetValue = computed(() =>
    state.value.assets
      .filter((a) => a.status === 'active' || a.status === 'maintenance')
      .reduce((sum, a) => sum + (a.currentValue ?? a.purchaseCost ?? 0), 0)
  )

  /** total on-hand consumable stock value */
  const inventoryValue = computed(() =>
    state.value.inventory.reduce((sum, i) => sum + i.stock * i.costPerUnit, 0)
  )

  /** open maintenance tasks (created from assets) — drives the "due" badge */
  const maintenanceDue = computed(() =>
    state.value.tasks.filter((t) => t.category === 'maintenance' && t.status !== 'done')
  )

  /** maintenance logs, newest first */
  const maintenanceHistory = computed(() =>
    [...state.value.maintenanceLogs].sort((a, b) => b.date.localeCompare(a.date))
  )

  /** Unified activity feed derived from recent events. */
  const activity = computed<ActivityItem[]>(() => buildActivity(state.value))

  return {
    // state
    state,
    farm: computed(() => state.value.farm),
    plots: computed(() => state.value.plots),
    crops: computed(() => state.value.crops),
    plantings: computed(() => state.value.plantings),
    harvests: computed(() => state.value.harvests),
    tasks: computed(() => state.value.tasks),
    inventory: computed(() => state.value.inventory),
    finance: computed(() => state.value.finance),
    plotById,
    cropById,
    assets: computed(() => state.value.assets),
    maintenanceLogs: computed(() => state.value.maintenanceLogs),
    activities: computed(() => state.value.activities),
    assetById,
    assetValue,
    inventoryValue,
    maintenanceDue,
    maintenanceHistory,
    // aggregates
    activePlantings,
    pendingTasks,
    seasonHarvestKg,
    financeTrend,
    seasonProgress,
    totalIncome,
    totalExpense,
    netProfit,
    lowStockItems,
    activity,
    // mutations
    addPlot,
    updatePlot,
    removePlot,
    addCrop,
    updateCrop,
    removeCrop,
    addPlanting,
    setPlantingStage,
    updatePlanting,
    removePlanting,
    addHarvest,
    removeHarvest,
    addTask,
    updateTask,
    removeTask,
    addInventory,
    updateInventory,
    removeInventory,
    addFinance,
    removeFinance,
    updateFinance,
    livestock: computed(() => state.value.livestock),
    livestockHealth: computed(() => state.value.livestockHealth),
    livestockProduction: computed(() => state.value.livestockProduction),
    livestockMovements: computed(() => state.value.livestockMovements),
    livestockById,
    activeLivestock,
    addLivestock,
    updateLivestock,
    removeLivestock,
    addHealthLog,
    removeHealthLog,
    addProductionLog,
    removeProductionLog,
    recordLivestockMovement,
    acquireLivestock,
    recordLivestockBirth,
    removeMovement,
    addAsset,
    updateAsset,
    removeAsset,
    addMaintenanceLog,
    removeMaintenanceLog,
    convertInventoryToAsset,
    addActivity,
    removeActivity
  }
}

// ---- helpers ----
function keyBy<T>(arr: T[], key: keyof T): Record<string, T> {
  return Object.fromEntries(arr.map((x) => [String(x[key]), x]))
}

function buildFinanceTrend(finance: FinanceRecord[], months: number) {
  const out: { label: string; income: number; expense: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString('en-US', { month: 'short' })
    const monthFinance = finance.filter((f) => {
      const fd = new Date(f.date)
      return fd.getFullYear() === d.getFullYear() && fd.getMonth() === d.getMonth()
    })
    out.push({
      label,
      income: monthFinance.filter((f) => f.type === 'income').reduce((s, f) => s + f.amount, 0),
      expense: monthFinance.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0)
    })
  }
  return out
}

function buildActivity(state: GardenState): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const h of [...state.harvests].sort((a, b) => b.harvestedAt.localeCompare(a.harvestedAt)).slice(0, 6)) {
    const crop = state.crops.find((c) => c.id === h.cropId)
    items.push({
      id: `act_h_${h.id}`,
      kind: 'harvest',
      title: `Harvested ${crop?.name ?? 'crop'}`,
      detail: `${formatRel(h.harvestedAt)} · Quality ${h.quality}`,
      amount: h.quantity,
      amountUnit: h.unit,
      positive: true,
      at: h.harvestedAt,
      icon: 'i-lucide-shopping-basket'
    })
  }

  for (const p of [...state.plantings].sort((a, b) => b.plantedAt.localeCompare(a.plantedAt)).slice(0, 4)) {
    const crop = state.crops.find((c) => c.id === p.cropId)
    items.push({
      id: `act_p_${p.id}`,
      kind: 'planting',
      title: `${crop?.name ?? 'Crop'} planted`,
      detail: `${formatRel(p.plantedAt)} · ${p.stage}`,
      at: p.plantedAt,
      icon: 'i-lucide-sprout'
    })
  }

  for (const f of [...state.finance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)) {
    items.push({
      id: `act_f_${f.id}`,
      kind: 'finance',
      title: f.description ?? f.category,
      detail: `${formatRel(f.date)} · ${f.category}`,
      amount: f.amount,
      positive: f.type === 'income',
      at: f.date,
      icon: f.type === 'income' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'
    })
  }

  for (const t of state.tasks.filter((x) => x.status === 'done').slice(0, 3)) {
    items.push({
      id: `act_t_${t.id}`,
      kind: 'task',
      title: `Task completed: ${t.title}`,
      detail: t.assignee ? `Done by ${t.assignee}` : 'Completed',
      at: t.dueAt ?? new Date().toISOString(),
      icon: 'i-lucide-check-circle-2',
      positive: true
    })
  }

  for (const m of [...state.maintenanceLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)) {
    const asset = state.assets.find((a) => a.id === m.assetId)
    items.push({
      id: `act_m_${m.id}`,
      kind: 'input',
      title: `Maintenance: ${asset?.name ?? 'asset'}`,
      detail: `${formatRel(m.date)} · ${m.type}`,
      amount: m.cost,
      amountUnit: undefined,
      positive: false,
      at: m.date,
      icon: 'i-lucide-wrench'
    })
  }

  for (const a of [...state.activities].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 4)) {
    const planting = state.plantings.find((p) => p.id === a.plantingId)
    const crop = planting ? state.crops.find((c) => c.id === planting.cropId) : undefined
    const activityIcon: Record<string, string> = { watering: 'i-lucide-droplets', fertilizing: 'i-lucide-flask-conical', pest_treatment: 'i-lucide-spray-can', weeding: 'i-lucide-shovel', pruning: 'i-lucide-scissors', observation: 'i-lucide-eye', other: 'i-lucide-circle-dot' }
    items.push({
      id: `act_a_${a.id}`,
      kind: a.type === 'watering' ? 'irrigation' : a.type === 'pest_treatment' ? 'pest' : 'input',
      title: `${crop?.name ?? 'Planting'} · ${a.type.replace('_', ' ')}`,
      detail: a.note ? `${formatRel(a.date)} · ${a.note}` : formatRel(a.date),
      at: a.date,
      icon: activityIcon[a.type] ?? 'i-lucide-circle-dot'
    })
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
}

function formatRel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86_400_000
  if (diff < 0) {
    const d = Math.round(-diff / day)
    return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d}d`
  }
  const d = Math.round(diff / day)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
