# Quick Log

Fast, in-place capture of farm activity **from the dashboard** — record
something in seconds without navigating to each module. One modal, a row of
activity types, a minimal form for each. On submit the record is routed to the
correct store action, so it lands in the right module automatically.

> Source: `app/components/QuickLogModal.vue`. Triggered by the **Quick Log**
> button on the dashboard (`app/pages/index.vue`).

---

## 1. Supported activity types

| Type | Icon | Creates | Lands in | Enabled when |
|---|---|---|---|---|
| **Task** | `list-checks` | a to-do (status `todo`) | Tasks board | always |
| **Expense** | `arrow-up-right` | a finance expense | Finance | always |
| **Income** | `arrow-down-left` | a finance income | Finance | always |
| **Harvest** | `shopping-basket` | a harvest + marks the planting `harvested` | Harvest | ≥ 1 planting is `ready` |
| **Activity** | `droplets` | a planting care log (watering/fertilizing/…) | Plantings detail activity log | ≥ 1 active planting |
| **Maintenance** | `wrench` | a maintenance history log | Assets → Maintenance tab | ≥ 1 asset exists |

Types with nothing to act on yet (**Harvest** with no ready plantings, **Activity**
with no active plantings, **Maintenance** with no assets) are **disabled with a
tooltip** ("Nothing to log here yet") rather than hidden — so the feature's full
capability stays discoverable.

---

## 2. Forms (minimal by design)

| Type | Fields |
|---|---|
| Task | title, category, priority, due date (optional) |
| Expense / Income | category, amount, date, description |
| Harvest | ready planting (select), quantity, unit, quality grade |
| Activity | active planting (select), type, date, note, optional input + qty |
| Maintenance | asset (select), type, description, cost, performed by, date |

**Smart defaults**
- Switching to **Income** sets the category to a revenue category ("Produce sale");
  **Expense** sets a cost category ("Inputs").
- Forms reset each time the modal opens; the active type stays valid.

All form fields are typed to the domain unions (`Task['category']`, `Unit`,
`MaintenanceType`, …) — no `any` casts, so invalid values can't reach the store.

---

## 3. Component API

```vue
<QuickLogModal v-model:open="quickLogOpen" />
```

| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` | `v-model:open` |

Internally uses `useGardenStore()` and `useSettings()` (for the locale currency).
Emits a success toast per type on submit, then closes.

---

## 4. User flow

1. On the dashboard, click **Quick Log** (zap icon, top-right).
2. Pick an **activity type** from the chip row.
3. Fill the minimal form.
4. **Save**. A toast confirms; the record appears in the target module
   (Tasks / Finance / Harvest / Assets) and in the dashboard activity feed.

### Tips
- No ready crops? The **Harvest** chip is disabled — advance a planting to the
  `ready` stage on `/plantings` first (or use a planting's **Advance** action).
- No active plantings? The **Activity** chip is disabled.
- No assets? The **Maintenance** chip is disabled — register one on `/assets`
  (or **Convert** a tool from `/inventory`).

---

## 5. QA test matrix

| # | Steps | Expected |
|---|---|---|
| 1 | Quick Log → Task → title "Water beds" → Save | task on `/tasks` (To Do column) |
| 2 | Quick Log → Expense → category Inputs, amount 25 → Save | expense in `/finance`, dashboard activity updates |
| 3 | Quick Log → Income → category auto-defaults to "Produce sale" | revenue record created |
| 4 | With a `ready` planting: Quick Log → Harvest → pick it, qty 12 kg grade A → Save | harvest recorded; planting becomes `harvested` |
| 5 | With no ready plantings | Harvest chip disabled with tooltip |
| 6 | With an asset: Quick Log → Maintenance → routine, cost 20 → Save | entry in Assets → Maintenance history + dashboard activity |
| 7 | Open Quick Log twice in a row | forms reset between opens |
| 8 | Load `qa-mock-data.json` first | Harvest + Maintenance chips are immediately usable |
