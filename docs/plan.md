# GardenOS (GMS) — Farm & Garden Management System
### A Nostr-native planning document

---

## 1. Vision

GardenOS is a decentralized, offline-capable system for managing agricultural
land — from a single home garden bed to a multi-plot community farm — built
on the same Nostr event-model approach as the ERP project. Data is portable,
user-owned (nsec-controlled), and syncable across devices without a central
database being the source of truth.

Two "profiles" of the same underlying schema:

| Profile | Typical user | Scale |
|---|---|---|
| **Garden Mode** | Home gardener, school garden, community plot | 1–10 beds, simple UX |
| **Farm Mode** | Smallholder or commercial farm, co-op | Multiple fields, labor, inventory, sales |

Both share the same core entities (plot → crop → planting → harvest), so a
household can start in Garden Mode and grow into Farm Mode without a data
migration.

---

## 2. Core Modules

### 2.1 Land & Space Management
- Farm profile (name, location/GPS, total area, owner)
- Field / plot definitions with boundary polygons, soil type, sun exposure
- Garden bed definitions (raised bed, container, size, substrate)
- Zone grouping (e.g. "north field", "greenhouse 1")

### 2.2 Crop Planning
- Crop/variety reference library (species, days-to-maturity, spacing, climate needs)
- Seasonal crop plans (what/where/when, companion planting notes)
- Crop rotation planning across seasons (avoid same-family repeats)
- Planting calendar with reminders (tied to local Lao growing seasons)

### 2.3 Planting & Growth Tracking
- Planting records (seed vs. seedling, date, quantity, plot)
- Growth-stage log with optional photo journal
- Germination/survival rate tracking

### 2.4 Irrigation & Resource Management
- Irrigation schedules (manual or sensor-triggered)
- Watering logs
- Weather snapshots (rainfall, temperature, humidity — manual entry or API)
- Soil/IoT sensor readings (moisture, pH, EC) — optional hardware integration

### 2.5 Harvest & Yield
- Harvest records (crop, quantity, unit, quality grade, date)
- Yield reports aggregated per plot/season for planning next cycle
- Post-harvest loss tracking (spoilage, pest damage)

### 2.6 Inventory & Inputs
- Seed/fertilizer/pesticide inventory with stock levels
- Input application records (what was applied, where, how much)
- Tool & equipment registry (with maintenance log)
- Stock movement log (purchase, use, transfer between plots)

### 2.7 Labor & Task Management
- Task/to-do list with due dates and status
- Task assignment to workers/family members
- Labor hour logging (useful for co-op or paid labor cost tracking)
- Worker profiles

### 2.8 Livestock (optional module)
- Individual animal records (species, breed, ID tag)
- Health/vet log
- Production log (eggs, milk, etc.)

### 2.9 Pest & Disease Management
- Sighting reports (photo + description, geo-tagged to plot)
- Treatment records linked to a sighting
- Optional: community-shared pest alert feed (see 2.12)

### 2.10 Marketplace & Sales
- Produce listings (what's available, quantity, price)
- Buyer orders
- Price reference/quotes (useful for smallholders to compare local market rates)

### 2.11 Financial Tracking
- Expense records (inputs, labor, equipment)
- Income records (sales)
- Season summary report (profit/loss per plot or crop — helps decide what to plant next season)

### 2.12 Community & Knowledge Layer
- Knowledge base articles (growing guides, pest identification, local techniques)
- Community discussion posts (farmer-to-farmer, could bridge into your SHG-style group structure)
- Certification/compliance records (organic, GAP, etc.) if relevant for market access

---

## 3. Nostr Event Kind Registry — GardenOS Extension

Extends your existing `NOSTR_KINDS` registry using a **new, non-colliding
block (32000–32099)**, following the same parameterized-replaceable-event
convention (kind 30000–39999) used elsewhere in your ERP schema.

```typescript
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
  COMMUNITY_POST: 32099,
} as const;
```

> Reserve 32100+ for future modules (e.g. equipment IoT telemetry streams,
> cooperative-level aggregation events) if the system grows past this block.

---

## 4. Core Data Model (relational sketch)

For the PostgreSQL indexer/materialized layer behind the relay (same pattern
as your ERP's Hasura layer over Nostr events):

```
farm_profile
  └── field_plot / garden_bed
        └── crop_plan
              └── planting_record
                    ├── growth_log
                    ├── irrigation_log
                    ├── input_application
                    ├── pest_sighting → treatment_record
                    └── harvest_record → yield_report

worker_profile
  └── task_assignment → task

input_inventory → stock_movement

market_listing → market_order

expense_record / income_record → season_report
```

---

## 5. UX Considerations & Features

- **Offline-first PWA** — field workers/farmers often have poor connectivity; queue events locally, sync on reconnect (same as your Nostr ERP plan).
- **Lao + English bilingual** — Phetsarath OT, Noto Sans Lao pairing, same as your design system.
- **Photo-first logging** — growth log, pest sighting, and harvest record should support a single photo + quantity + one-tap save, minimal typing.
- **Season-aware calendar UI** — align with Lao wet/dry season cycles rather than generic Gregorian quarters.
- **Simple mode toggle** — Garden Mode hides labor/inventory/financial complexity by default; Farm Mode reveals it.

---

## 6. Suggested Build Phases

| Phase | Scope |
|---|---|
| **0 — Foundation** | Nostr kind registry (above), relay setup, farm/plot/garden bed CRUD |
| **1 — MVP Garden Mode** | Crop plan, planting record, growth log, harvest record, basic calendar |
| **2 — Farm Mode core** | Field/plot at scale, crop rotation, task & labor, input inventory |
| **3 — Environment & IoT** | Irrigation scheduling/logs, weather snapshot, sensor readings |
| **4 — Economics** | Expense/income tracking, season reports, marketplace listings |
| **5 — Community layer** | Knowledge base, pest alert sharing, certification/compliance |
| **6 — Livestock** | If needed for mixed farms |

---

## 7. Suggested Stack (consistent with your existing tooling)

- **Frontend**: Nuxt 3 + TypeScript + Tailwind Nuxt UI
- **Event layer**: Nostr relay(s), NIP-33 addressable events for state, regular events for logs
- **Payments** (if marketplace module is used): Lightning, same sats-first display convention as the ERP plan