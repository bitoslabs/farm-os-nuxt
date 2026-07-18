/**
 * GardenOS — Core entity types.
 * Each interface mirrors a Nostr event kind (see garden-kinds.ts).
 * The Repository Adapter serializes these into { kind, content, tags }.
 */

export type ID = string
export type ISODate = string // ISO 8601 timestamp
export type Unit = 'kg' | 'g' | 'piece' | 'bunch' | 'liter' | 'm²' | 'ha'

export type SpaceType = 'field' | 'plot' | 'bed' | 'greenhouse' | 'container'

export interface FarmProfile {
  id: ID
  name: string
  location: string
  lat?: number
  lng?: number
  totalArea: number // m²
  areaUnit: 'm²' | 'ha'
  owner: string
  mode: 'garden' | 'farm'
  establishedYear?: number
}

export interface Plot {
  id: ID
  name: string
  type: SpaceType
  area: number
  areaUnit: 'm²' | 'ha'
  soilType?: string
  sunExposure?: 'full' | 'partial' | 'shade'
  zone?: string
  activeCropId?: ID
  notes?: string
}

export interface CropVariety {
  id: ID
  name: string
  species: string
  family: string
  daysToMaturity: number
  spacingCm: number
  season: ('wet' | 'dry')[]
  notes?: string
}

export type GrowthStage =
  | 'planned'
  | 'seeded'
  | 'germinating'
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'ready'
  | 'harvested'

/** A single growth-stage transition record (chronological, newest last). */
export interface StageHistoryEntry {
  stage: GrowthStage
  at: ISODate
}

/** Care activity performed on a planting (kind 32013). */
export type ActivityType =
  | 'watering'
  | 'fertilizing'
  | 'pest_treatment'
  | 'weeding'
  | 'pruning'
  | 'observation'
  | 'other'

export interface PlantingActivity {
  id: ID
  plantingId: ID
  type: ActivityType
  date: ISODate
  note?: string
  /** inventory input consumed (fertilizer/pesticide) — auto-decrements stock */
  inputId?: ID
  inputQty?: number
  inputUnit?: Unit
}

export interface Planting {
  id: ID
  plotId: ID
  cropId: ID
  method: 'seed' | 'seedling' | 'cutting'
  stage: GrowthStage
  quantity: number
  unit: Unit
  plantedAt: ISODate
  expectedHarvest?: ISODate
  progress: number // 0–100, derived from stage / days
  /** chronological record of growth-stage transitions (drives the detail timeline) */
  stageHistory?: StageHistoryEntry[]
  notes?: string
}

export interface Harvest {
  id: ID
  plantingId: ID
  cropId: ID
  plotId: ID
  quantity: number
  unit: Unit
  quality: 'A' | 'B' | 'C'
  harvestedAt: ISODate
  notes?: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: ID
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueAt?: ISODate
  assignee?: string
  plotId?: ID
  category: 'planting' | 'irrigation' | 'harvest' | 'pest' | 'maintenance' | 'other'
}

export type InputCategory = 'seed' | 'fertilizer' | 'pesticide' | 'soil' | 'tool'

export interface InventoryItem {
  id: ID
  name: string
  category: InputCategory
  unit: Unit
  stock: number
  reorderLevel: number
  costPerUnit: number
  currency: string
  notes?: string
}

// ---- Assets & Maintenance (kind 32044–32045) ----
/** Durable farm property: tractors, pumps, vehicles, buildings, tools, etc. */
export type AssetCategory = 'equipment' | 'vehicle' | 'building' | 'tool' | 'irrigation' | 'other'
export type AssetStatus = 'active' | 'maintenance' | 'retired' | 'lost'
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor'

export interface FarmAsset {
  id: ID
  name: string
  category: AssetCategory
  /** internal/inventory tag for physical identification */
  assetTag?: string
  serialNumber?: string
  status: AssetStatus
  condition: AssetCondition
  location?: string
  /** person currently responsible for the asset */
  assignedTo?: string
  purchaseDate?: ISODate
  purchaseCost?: number
  /** current book value; falls back to purchaseCost when omitted */
  currentValue?: number
  currency: string
  warrantyUntil?: ISODate
  notes?: string
}

export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'upgrade'
export interface MaintenanceLog {
  id: ID
  assetId: ID
  type: MaintenanceType
  description: string
  date: ISODate
  cost?: number
  performedBy?: string
}

export interface FinanceRecord {
  id: ID
  type: 'expense' | 'income'
  category: string
  amount: number
  currency: string
  date: ISODate
  description?: string
  plotId?: ID
  /** optional crop this record relates to (for per-crop reporting) */
  cropId?: ID
  /** optional planting this record relates to (for per-planting reporting) */
  plantingId?: ID
}

// ---- Livestock (kind 32060–32062) ----
export type LivestockSpecies = 'chicken' | 'duck' | 'cow' | 'pig' | 'goat' | 'sheep' | 'fish' | 'other'
export type LivestockStatus = 'active' | 'sold' | 'deceased'

export interface LivestockProfile {
  id: ID
  name: string
  species: LivestockSpecies
  breed?: string
  tagId?: string
  sex?: 'male' | 'female' | 'mixed'
  /** number of animals in this record (1 for an individual, N for a flock/herd) */
  count: number
  birthDate?: ISODate
  status: LivestockStatus
  notes?: string
}

export type HealthType = 'vaccination' | 'treatment' | 'checkup' | 'illness'
export interface LivestockHealthLog {
  id: ID
  animalId: ID
  type: HealthType
  description: string
  severity: 'low' | 'medium' | 'high'
  date: ISODate
  cost?: number
  vetName?: string
}

export type ProductType = 'eggs' | 'milk' | 'wool' | 'meat' | 'offspring' | 'other'
export interface LivestockProductionLog {
  id: ID
  animalId: ID
  product: ProductType
  quantity: number
  unit: Unit
  date: ISODate
  notes?: string
}

export interface ActivityItem {
  id: ID
  kind: 'planting' | 'harvest' | 'task' | 'irrigation' | 'input' | 'pest' | 'finance'
  title: string
  detail: string
  amount?: number
  amountUnit?: Unit
  positive?: boolean
  at: ISODate
  icon: string
}

/** Shape persisted by the store. */
export interface GardenState {
  farm: FarmProfile
  plots: Plot[]
  crops: CropVariety[]
  plantings: Planting[]
  harvests: Harvest[]
  tasks: Task[]
  inventory: InventoryItem[]
  finance: FinanceRecord[]
  livestock: LivestockProfile[]
  livestockHealth: LivestockHealthLog[]
  livestockProduction: LivestockProductionLog[]
  assets: FarmAsset[]
  maintenanceLogs: MaintenanceLog[]
  activities: PlantingActivity[]
}
