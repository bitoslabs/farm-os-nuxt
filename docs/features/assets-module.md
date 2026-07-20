# Assets & Equipment Module

A dedicated register for **durable farm property** (tractors, pumps, vehicles,
buildings, tools, irrigation systems) — kept deliberately separate from
**Inventory** (consumable inputs you count in quantities).

> **Why separate?** "10 bags of fertilizer" is a stock level that depletes; "one
> tractor" is a durable asset that depreciates and needs maintenance. Mixing them
> confuses stock totals with fixed-asset value. Both still feed financial
> reporting (see Dashboard → Farm holdings).
>
> Source: `app/types/garden.ts`, `app/types/garden-kinds.ts`,
> `app/composables/useGardenStore.ts`, `app/pages/assets/index.vue`.

---

## 1. Data model

### 1.1 `FarmAsset` (durable property register)

```ts
export type AssetCategory  = 'equipment' | 'vehicle' | 'building' | 'tool' | 'irrigation' | 'other'
export type AssetStatus    = 'active' | 'maintenance' | 'retired' | 'lost'
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor'

export interface FarmAsset {
  id: string
  name: string
  category: AssetCategory
  assetTag?: string          // internal/inventory tag for physical identification
  serialNumber?: string
  status: AssetStatus
  condition: AssetCondition
  location?: string
  assignedTo?: string        // person currently responsible
  purchaseDate?: string      // ISO date
  purchaseCost?: number
  currentValue?: number      // book value; falls back to purchaseCost when omitted
  currency: string
  warrantyUntil?: string     // ISO date
  notes?: string
}
```

**Computed book value** used everywhere (dashboard, register, table):
```ts
asset.currentValue ?? asset.purchaseCost ?? 0
```

### 1.2 `MaintenanceLog` (service history per asset)

```ts
export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'upgrade'

export interface MaintenanceLog {
  id: string
  assetId: string
  type: MaintenanceType
  description: string
  date: string               // ISO date
  cost?: number
  performedBy?: string
}
```

> **Maintenance log vs. maintenance task** — two distinct concepts:
> - **Maintenance log** = a historical record of work *already done* (what, when, cost).
> - **Maintenance task** = a future to-do created on the Tasks board (category
>   `maintenance`). "Create maintenance task" from an asset makes one of these.

### 1.3 Where it lives
Both are slices of the persisted `GardenState`:
```ts
interface GardenState {
  // …plots, crops, plantings, harvests, tasks, inventory, finance, livestock…
  assets: FarmAsset[]
  maintenanceLogs: MaintenanceLog[]
}
```

---

## 2. Nostr event model

Two new kinds in the reserved Inventory block (`app/types/garden-kinds.ts`):

| Kind | Name | Entity | Replaceable? |
|---|---|---|---|
| `32044` | `FARM_ASSET` | `FarmAsset` | yes — addressable by `d` |
| `32045` | `MAINTENANCE_LOG` | `MaintenanceLog` | no — append-only log (deduped by signature) |

### 2.1 Asset event (kind 32044)

```jsonc
{
  "kind": 32044,
  "content": "{\"serialNumber\":\"KUB-2023-8841\",\"condition\":\"good\",\"location\":\"North shed\",\"assignedTo\":\"Kham\",\"purchaseCost\":18000,\"currentValue\":15000,\"currency\":\"USD\",\"notes\":\"\"}",
  "tags": [
    ["d", "ast_lx2a"],
    ["name", "Kubota Tractor"],
    ["category", "vehicle"],
    ["status", "active"],
    ["assetTag", "EQ-001"],
    ["purchaseDate", "1680307200"],
    ["warrantyUntil", "1743465600"]
  ]
}
```

### 2.2 Maintenance log event (kind 32045)

```jsonc
{
  "kind": 32045,
  "content": "{\"description\":\"Oil change + filter\",\"cost\":45,\"performedBy\":\"Sai\"}",
  "tags": [
    ["asset", "ast_lx2a"],
    ["type", "routine"],
    ["date", "1717372800"]
  ]
}
```

### 2.3 Serialization & sync
- **Build:** `farmAssetEvent()`, `maintenanceLogEvent()` (`app/utils/event-builders.ts`)
- **Parse:** `parseEvent()` handles both kinds (`app/utils/event-parsers.ts`)
- **Merge/dedup:** assets upsert by `d` (newest `created_at` wins); maintenance
  logs dedupe by signature `m:<assetId>:<type>:<date>:<description>`
- **Delete:** `removeAsset()` publishes a NIP-09 deletion for the asset kind and
  also strips its maintenance logs locally.

---

## 3. Store API (`useGardenStore`)

| Export | Kind | Purpose |
|---|---|---|
| `assets` | `ComputedRef<FarmAsset[]>` | all assets |
| `assetById` | `ComputedRef<Record<id, FarmAsset>>` | lookup |
| `maintenanceLogs` | `ComputedRef<MaintenanceLog[]>` | all logs |
| `maintenanceHistory` | `ComputedRef<MaintenanceLog[]>` | logs newest-first |
| `assetValue` | `ComputedRef<number>` | Σ book value of in-service assets (active + maintenance) |
| `maintenanceDue` | `ComputedRef<Task[]>` | open tasks with `category === 'maintenance'` |
| `addAsset(a)` / `updateAsset(id, patch)` / `removeAsset(id)` | mutation | CRUD (remove cascades to logs) |
| `addMaintenanceLog(m)` / `removeMaintenanceLog(id)` | mutation | history CRUD |
| `convertInventoryToAsset(itemId, patch?)` | mutation | promote a stock item into an asset |

---

## 4. Integration points

| Where | What |
|---|---|
| **Nav** (`useNav.ts`) | `/assets` link under Operations, with a live **maintenance-due** badge |
| **Sidebar** (`AppSidebarContent.vue`) | badge source `'maintenance'` → `maintenanceDue.length` |
| **Dashboard** (`pages/index.vue`) | "Farm holdings" cards: asset value + maintenance due |
| **Command palette** (`AppCommandPalette.vue`) | asset name search + "Add asset" action |
| **Inventory** (`pages/inventory/index.vue`) | row action **"Convert to asset"** |
| **Quick Log** (`QuickLogModal.vue`) | **Maintenance** activity type |
| **Activity feed** | recent maintenance logs surface on the dashboard |

---

## 5. The `/assets` page

Two tabs, both powered by the [List Controls System](./list-controls.md):

- **Register** — grid/table of assets. Stat cards: register value, in-service
  count, maintenance due, warranty-expiring-soon (within 30 days).
- **Maintenance history** — chronological log across all assets.

**Presentation maps**

| Category | Icon |
|---|---|
| equipment / vehicle / building / tool / irrigation / other | `i-lucide-tractor` / `truck` / `warehouse` / `wrench` / `droplets` / `package` |

| Status | Badge color | Condition | Badge color |
|---|---|---|---|
| active | success | new | info |
| maintenance | warning | good | success |
| retired | neutral | fair | warning |
| lost | negative | poor | negative |

---

## 6. User flows

### Flow A — Register a new asset
1. Open **Assets** from the sidebar.
2. Click **Add Asset** (top-right).
3. Fill: name, category, status, condition, asset tag, serial, location,
   assigned person, purchase date/cost, current value, warranty until.
4. **Save**. Toast "Created"; the asset appears in the register.

### Flow B — Log completed maintenance (history)
1. On an asset, open the **⋯** menu → **Log maintenance**.
2. Choose type (routine / repair / inspection / upgrade), add description, date,
   cost, performer.
3. **Save**. Entry appears under the **Maintenance history** tab and in the
   dashboard activity feed.

### Flow C — Create a maintenance task (future to-do)
1. On an asset, open **⋯** → **Create maintenance task**.
2. Set priority + optional due date.
3. **Save**. A task titled *"Maintenance: {asset}"* (category `maintenance`) is
   created on the Tasks board; the Assets nav badge increments; the dashboard
   "Maintenance due" card updates. Completing the task on `/tasks` clears the badge.

### Flow D — Convert an inventory item into an asset
1. Open **Inventory**, find a durable item (e.g. a tool).
2. Open **⋯** → **Convert to asset**.
3. The item is promoted to a new asset (category `tool`→`tool`, others→`other`;
   cost/currency copied), you're routed to `/assets`, and a toast confirms.
4. The inventory entry is **left untouched** (stock totals unchanged) — edit the
   new asset to refine location/condition/value.

### Flow E — Browse the register
1. Use the toolbar to **search** (name / tag / serial / location).
2. Pick a **sort** field (name, category, status, condition, value, purchase
   date) and toggle **asc/desc**.
3. Switch **grid ⇄ table**; click any table header to sort by it.
4. Preferences persist across reloads.

### Flow F — Retire / lose an asset
1. Edit the asset, set **status** to `retired` (or `lost`).
2. It is excluded from the **register value** total but remains in the list
   (filtered/sortable by status) and keeps its maintenance history.

---

## 7. QA test matrix

| # | Steps | Expected |
|---|---|---|
| 1 | Create assets in each category/status/condition | icons + badge colors render correctly |
| 2 | Set `currentValue` < `purchaseCost` | card shows "depreciated" hint |
| 3 | Set `warrantyUntil` to ~10 days from now | "warranty soon" stat card counts it; card badge turns warning |
| 4 | Log maintenance on an asset | appears in Maintenance tab + dashboard activity feed |
| 5 | Create a maintenance task | Tasks board shows it; Assets nav badge = open maintenance tasks |
| 6 | Complete that task on `/tasks` | badge clears; dashboard "maintenance due" decrements |
| 7 | Convert an inventory tool to asset | asset created, inventory stock unchanged, routed to `/assets` |
| 8 | Delete an asset that has maintenance logs | asset + its logs both removed |
| 9 | Retire an asset | excluded from register value, still listed |
| 10 | Switch grid/table, sort, search, reload | prefs persist (localStorage `gardenos:list:assets`) |
| 11 | Load `qa-mock-data.json` | 5 assets across categories, 4 maintenance logs, 1 in-maintenance, 1 warranty-soon |
