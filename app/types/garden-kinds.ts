/**
 * GardenOS — Nostr Event Kind Registry (Extension)
 *
 * Occupies a non-colliding block (32000–32099) of the parameterized-replaceable
 * event range (30000–39999), following NIP-33 addressable-event conventions.
 *
 * Each kind maps to a domain entity in the farm/garden data model.
 * See docs/plan.md §3.
 */
export const GARDEN_KINDS = {
  // --- Land & Space (32000–32009) ---
  /** Farm/property profile */
  FARM_PROFILE: 32000,
  /** Field or plot definition (boundaries, soil type) */
  FIELD_PLOT: 32001,
  /** Garden bed definition (home/community scale) */
  GARDEN_BED: 32002,

  // --- Crop Planning (32010–32019) ---
  /** Crop/plant variety reference */
  CROP_VARIETY: 32010,
  /** Seasonal crop plan */
  CROP_PLAN: 32011,
  /** Planting record (seed/seedling planted) */
  PLANTING_RECORD: 32012,
  /** Growth stage observation / photo journal entry */
  GROWTH_LOG: 32013,
  /** Multi-season crop rotation plan */
  CROP_ROTATION_PLAN: 32014,

  // --- Irrigation & Environment (32020–32029) ---
  /** Irrigation schedule */
  IRRIGATION_SCHEDULE: 32020,
  /** Irrigation/watering event log */
  IRRIGATION_LOG: 32021,
  /** Weather data snapshot */
  WEATHER_SNAPSHOT: 32022,
  /** IoT sensor reading (soil moisture, pH, temp) */
  SENSOR_READING: 32023,

  // --- Harvest & Yield (32030–32039) ---
  /** Harvest event record */
  HARVEST_RECORD: 32030,
  /** Aggregated yield report per plot/season */
  YIELD_REPORT: 32031,

  // --- Inventory & Inputs (32040–32049) ---
  /** Seed/fertilizer/pesticide inventory item */
  INPUT_INVENTORY: 32040,
  /** Input application record */
  INPUT_APPLICATION: 32041,
  /** Tool/equipment registry entry */
  TOOL_EQUIPMENT: 32042,
  /** Inventory stock movement (in/out/transfer) */
  STOCK_MOVEMENT: 32043,
  /** Durable farm asset register entry (tractor, vehicle, building…) */
  FARM_ASSET: 32044,
  /** Asset maintenance / service history log */
  MAINTENANCE_LOG: 32045,

  // --- Labor & Tasks (32050–32059) ---
  /** Farm task / to-do */
  TASK: 32050,
  /** Task assignment to a worker */
  TASK_ASSIGNMENT: 32051,
  /** Labor hours logged */
  LABOR_LOG: 32052,
  /** Worker/staff profile */
  WORKER_PROFILE: 32053,

  // --- Livestock (32060–32069, optional module) ---
  /** Individual animal record */
  LIVESTOCK_PROFILE: 32060,
  /** Animal health/vet log */
  LIVESTOCK_HEALTH_LOG: 32061,
  /** Animal production log (eggs, milk, etc.) */
  LIVESTOCK_PRODUCTION_LOG: 32062,

  // --- Pest & Disease (32070–32079) ---
  /** Pest/disease sighting report */
  PEST_SIGHTING: 32070,
  /** Treatment applied for a pest/disease event */
  TREATMENT_RECORD: 32071,

  // --- Marketplace (32080–32089) ---
  /** Produce listing for sale */
  MARKET_LISTING: 32080,
  /** Buyer order for produce */
  MARKET_ORDER: 32081,
  /** Market price reference/quote */
  PRICE_QUOTE: 32082,

  // --- Financial (32090–32097) ---
  /** Farm expense record */
  EXPENSE_RECORD: 32090,
  /** Farm income/sale record */
  INCOME_RECORD: 32091,
  /** Season financial summary report */
  SEASON_REPORT: 32092,
  /** Organic/certification record */
  CERTIFICATION: 32095,
  /** Compliance/inspection log */
  COMPLIANCE_LOG: 32096,

  // --- Community & Knowledge (32098–32099) ---
  /** Community knowledge base article */
  KNOWLEDGE_ARTICLE: 32098,
  /** Community discussion post */
  COMMUNITY_POST: 32099
} as const

/** All valid GardenOS Nostr event kinds */
export type GardenKind = (typeof GARDEN_KINDS)[keyof typeof GARDEN_KINDS]

/** Reverse lookup: kind number → human name (for debugging / tags) */
export const GARDEN_KIND_NAMES = Object.fromEntries(
  Object.entries(GARDEN_KINDS).map(([name, kind]) => [kind, name])
) as Record<number, string>

export function getGardenKindName(kind: number): string | undefined {
  return GARDEN_KIND_NAMES[kind]
}
