# Plantings — Growth Timeline, Care Log & Table Actions

Three UX capabilities on the Plantings page (`/plantings`):

1. **Inline "Next" button** in the table view's stage cell — advance a planting
   to its next growth stage without opening a menu.
2. **Detail view with a growth-stage timeline** — open any planting to see its
   full growth journey (reached stages with dates, current stage highlighted,
   upcoming stages faded), progress, and related harvests.
3. **Care activity log** — record watering, fertilizing, pest treatment, weeding,
   pruning, and observations per planting (with notes). Consuming an input
   auto-deducts it from inventory.

> Source: `app/components/charts/GrowthTimeline.vue`, `app/components/charts/ActivityLog.vue`,
> `app/pages/plantings/index.vue`, `app/components/overlays/QuickLogModal.vue`.
> Tests: `test/nuxt/plantings.test.ts`, `test/nuxt/activities.test.ts`.

---

## 1. Data model

A planting now carries a chronological record of its stage transitions:

```ts
export interface StageHistoryEntry {
  stage: GrowthStage    // 'planned' | 'seeded' | … | 'harvested'
  at: ISODate           // when it reached that stage
}

export interface Planting {
  // …existing fields…
  stageHistory?: StageHistoryEntry[]   // newest last
}
```

**How it's populated** (`useGardenStore.ts`):

| Action | Effect on `stageHistory` |
|---|---|
| `addPlanting(p)` | seeded with `[{ stage: p.stage, at: p.plantedAt }]` |
| `setPlantingStage(id, stage)` | appends `{ stage, at: now }` (no-op if unchanged; dedupes a consecutive repeat) |
| `updatePlanting(id, { stage })` | appends when the stage actually changes |

The history is persisted inside the planting's Nostr event content (kind 32012),
so it syncs across relays/devices with the rest of the record.

> **Future enhancement:** each transition could become its own append-only
> `GROWTH_LOG` (kind 32013) event with photos/notes. Today the history is embedded
> for atomicity — a single replaceable event per planting.

---

## 2. The `GrowthTimeline` component

A vertical "growth journey" — reusable, presentational.

```vue
<GrowthTimeline
  :history="planting.stageHistory"
  :current="planting.stage"
  :planted-at="planting.plantedAt"
  :expected-harvest="planting.expectedHarvest"
/>
```

Renders **every** growth stage. For each:
- **Reached** (index ≤ current) → filled accent marker + the recorded date.
- **Current** → accent ring + a "current" badge.
- **Upcoming** → faded hollow marker, label "upcoming".

Degrades gracefully when `stageHistory` is empty (synthesises from `plantedAt` +
the current stage), so legacy/seed plantings still render sensibly.

---

## 3. User flows

### Flow A — Advance a stage from the table (new)
1. Open **Plantings**, switch to **Table** view.
2. In the **Stage** column, each row shows the current stage + a small **Next →**
   button (or a **Harvest** link when the crop is `ready`).
3. Click **Next** → the planting advances one stage, a toast confirms, the row
   updates, and a history entry is recorded.

### Flow B — Open the growth timeline detail
1. In the table, click the **eye** icon in the actions cell — or open any row's
   **⋯** menu → **View details** (works in grid view too).
2. The detail modal shows: crop/plot summary, progress bar, the **growth
   timeline**, and any **harvests** recorded for that planting.
3. The footer offers **Advance** (or **Harvest** when ready) and **Close**.

### Flow C — Watch history accumulate
1. Advance a planting through several stages (table **Next** button or menu).
2. Reopen its detail — each transition now appears on the timeline with its date.

---

## 4. QA test matrix

| # | Steps | Expected |
|---|---|---|
| 1 | Table view, click **Next** in a stage cell | stage advances one step, toast shows, progress bar updates |
| 2 | A `ready` planting shows a **Harvest** link in the stage cell | routes to `/harvest?planting=<id>` |
| 3 | Click the **eye** icon | detail modal opens with timeline |
| 4 | Advance a planting, reopen detail | new stage appears on the timeline with today's date |
| 5 | A planting with no prior history | timeline still renders (planted date + current stage) |
| 6 | Detail modal shows related harvests | each harvest lists date, qty, grade |
| 7 | Footer **Advance**/**Harvest** buttons reflect the current stage | correct button shown |
| 8 | Switch grid ⇄ table, reload | view preference persists |
| 9 | Load `qa-mock-data.json` | tomato & lettuce (ready) and chili (fruiting) timelines show full dated histories |

---

## 5. Care activity log (kind 32013)

A general-purpose **per-planting care log**: watering, fertilizing, pest
treatment, weeding, pruning, observations — each with an optional note, and an
optional **inventory input** whose quantity is auto-deducted from stock.

### 5.1 Data model

```ts
export type ActivityType =
  | 'watering' | 'fertilizing' | 'pest_treatment'
  | 'weeding' | 'pruning' | 'observation' | 'other'

export interface PlantingActivity {
  id: string
  plantingId: string
  type: ActivityType
  date: string               // ISO date
  note?: string
  inputId?: string           // inventory item consumed (fertilizer/pesticide)
  inputQty?: number          // auto-decrements inventory stock
  inputUnit?: Unit
}
```

Lives in `GardenState.activities`. Nostr kind **32013 (`GROWTH_LOG`)** — the
reserved "growth-stage observation / photo journal" slot. Serialize/parse lives
in `event-builders.ts` (`growthLogEvent`) and `event-parsers.ts`; merged as an
append-only log deduped by signature `pa:<plantingId>:<type>:<date>:<note>`.

### 5.2 Store API (`useGardenStore`)

| Export | Purpose |
|---|---|
| `activities` | all activities |
| `addActivity(a)` | append + **decrement linked inventory stock** (clamped ≥ 0) + publish |
| `removeActivity(id)` | delete |

> Activities also surface in the **dashboard activity feed** and are reachable
> from **Quick Log** (the *Activity* chip).

### 5.3 Components

- **`ActivityLog.vue`** — self-contained chronological list for a planting
  (`<ActivityLog :planting-id="p.id" />`); type icon + badge, date, note, input
  consumed, and per-row delete.
- Rendered inside the planting detail modal, below the growth timeline.

### 5.4 Presentation map

| Type | Icon | Badge |
|---|---|---|
| watering | `droplets` | info |
| fertilizing | `flask-conical` | success |
| pest_treatment | `spray-can` | warning |
| weeding | `shovel` | neutral |
| pruning | `scissors` | neutral |
| observation | `eye` | info |
| other | `circle-dot` | neutral |

### 5.5 User flows

**Log care from a planting**
1. Plantings → row **⋯** → **Log activity** (or open the detail → **+ Log activity**).
2. Pick type (watering / fertilizing / pest treatment / …), date, note.
3. For **fertilizing** / **pest treatment**, optionally pick an inventory input
   + quantity — it is deducted from stock on save.
4. Save → entry appears in the detail's activity log + dashboard feed.

**Quick Log → Activity** (dashboard)
1. Dashboard → **Quick Log** → *Activity* chip (enabled when ≥ 1 active planting).
2. Pick an active planting, type, note, optional input → Save.

### 5.6 QA test matrix

| # | Steps | Expected |
|---|---|---|
| 1 | Log a watering on a planting | appears in detail activity log + dashboard feed |
| 2 | Log fertilizing with NPK input qty 2 | inventory stock drops by 2 |
| 3 | Log pest treatment consuming more than available stock | stock clamps to 0 (never negative) |
| 4 | Watering (no input) | inventory untouched |
| 5 | Quick Log → Activity with an active planting | entry created |
| 6 | No active plantings | Activity chip disabled with tooltip |
| 7 | Delete an activity entry | removed from list |
| 8 | Load `qa-mock-data.json` | 4 activities (2 on tomato, 2 on chili) incl. input consumption |
