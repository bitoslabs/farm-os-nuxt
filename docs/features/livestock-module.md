# Livestock Module — UX Review & Implementation Plan

## Status

The current `/livestock` page is a good **register and logbook foundation**,
but it is not yet a complete livestock-management workflow.

**Already implemented**

- Create, edit, filter, search, sort, and delete an animal or flock record.
- Record and browse global health records (vaccination, treatment, check-up,
  illness).
- Record and browse global production records (eggs, milk, wool, meat,
  offspring, other).
- Persist profiles and new log entries through the Nostr event layer.

**Missing for an operational farm**

> **Update (implemented):** the P0 lifecycle, history, purchase/sale/death,
> finance linking, safe deletion, and Nostr sync items below are now complete —
> see `app/pages/livestock/[id].vue`, `app/components/livestock/`, and
> `test/nuxt/livestock.test.ts`. P1/P2 remain as future work.

- An animal/flock detail page and a single chronological history.
- Purchase/acquisition, sale, death/loss, transfer, and adjustment workflows.
- Automatic finance records and auditable links between a movement and its
  income/expense.
- Safe delete behaviour for logs and related records.
- Tests for livestock mutations, lifecycle events, and Nostr serialization.

> Current sources: `app/pages/livestock/index.vue`, `app/types/garden.ts`,
> `app/composables/useGardenStore.ts`, `app/utils/event-builders.ts`, and
> `app/utils/event-parsers.ts`.

---

## 1. UX findings in the current page

| Area | Current behaviour | Gap / impact | Priority |
|---|---|---|---|
| Register | Grid/table list with edit and delete menus | Cards and rows do not open a detail view; users cannot understand one animal's history. | P0 |
| Health | Global, newest-first list | A user must scan unrelated animals to see vaccinations, illness, costs, and treatment history. | P0 |
| Production | Global, newest-first list | No per-animal production summary, period filter, or relationship to sale/inventory. | P1 |
| Purchase | “Add animal” creates a profile only | Purchase date, supplier, price, currency, and arrival count are absent; no expense is created. | P0 |
| Sale | User can manually set status to `sold` | No buyer, date, count, price, proceeds, reason, or finance record. Inventory/head count can become misleading. | P0 |
| Death/loss | User can manually set `deceased` | No cause, date, count, disposal/cost, or immutable audit history. | P0 |
| Delete | Deletes only the profile locally and sends a profile deletion | Related logs become orphaned locally; deleting health/production logs does not publish a Nostr deletion. | P0 defect |
| Validation | Only name and a log description are required | Count may be zero/negative; individual tag IDs are not protected; logs can target inactive records. | P1 |
| Finance | Separate Finance page with no livestock reference | Users must manually duplicate purchases, treatment costs, and sales. | P0 |

### UX recommendation

Use the register as the entry point, but make the **detail page** the working
surface. The list should show health/status signals and make each record
clickable. Lifecycle changes should be explicit actions, never a generic status
dropdown.

---

## 2. Scope and terminology

A `LivestockProfile` can represent either:

- an **individual** (`count === 1`), such as a cow or tagged goat; or
- a **group** (`count > 1`), such as a flock, herd, pond, or batch.

Keep this model for the first implementation. Do not silently split a group
into individuals. If individual tracking is required later, add a parent/group
relationship in a separate migration.

### Lifecycle states

Replace the editable status field with lifecycle operations:

| State | Meaning | Can log health / production? |
|---|---|---|
| `active` | Currently held by the farm | Yes |
| `sold` | Entire record has left through sale | No |
| `deceased` | Entire record has died / been culled | No |
| `transferred` | Entire record moved to another owner/site | No |

For a group, a partial sale, loss, birth, purchase, or correction changes its
`count` through a movement event. The profile remains `active` while the count
is above zero. A zero balance must be closed by a final sale, death, or
transfer event; never leave an active zero-count record.

---

## 3. Target information architecture

```text
/livestock                         Register: active / closed filters, search, list controls
/livestock/new                     Acquisition-first creation flow (optional; modal is acceptable)
/livestock/:id                     Detail, summary, and chronological timeline
  ├─ Overview                      identity, head count, KPIs, notes
  ├─ History                       all events: acquisition, health, production, movements
  ├─ Health                        filterable health history and add record
  ├─ Production                    filterable production history and add record
  └─ Finance                       linked purchase/sale/treatment transactions
```

Recommended components (create only when implementing the feature):

```text
app/components/livestock/
  LivestockProfileCard.vue
  LivestockDetailHeader.vue
  LivestockTimeline.vue
  LivestockMovementModal.vue
  LivestockHealthModal.vue
  LivestockProductionModal.vue
app/pages/livestock/index.vue
app/pages/livestock/[id].vue
```

The current three top-level tabs may remain as a **farm-wide activity view**,
but the default route should focus on the register. Do not use it as a
substitute for per-record history.

---

## 4. Required data model

Keep existing profile, health, and production types. Add a movement entity as
the source of truth for changes in ownership and head count.

```ts
export type LivestockMovementType =
  | 'purchase'
  | 'sale'
  | 'birth'
  | 'death'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'

export interface LivestockMovement {
  id: ID
  animalId: ID
  type: LivestockMovementType
  count: number                 // always positive; type determines direction
  date: ISODate
  reason?: string               // required for death and adjustment
  counterparty?: string         // supplier, buyer, or receiving farm
  reference?: string            // invoice / receipt / transport reference
  unitPrice?: number
  totalAmount?: number          // stored snapshot: count × unitPrice or entered total
  currency?: string
  financeId?: ID                // generated/linked finance record, if applicable
  notes?: string
}
```

Extend `GardenState` with `livestockMovements: LivestockMovement[]`.

### Data rules

- `count` must be a positive whole number for animals/birds. For fish, allow
  whole-number stock counts only in this phase; do not overload it with weight.
- A record with `count === 1` may have a unique `tagId`; group tags identify the
  group, not every member.
- `sale`, `death`, and `transfer_out` cannot exceed the current count.
- `purchase`, `birth`, and `transfer_in` increase the count.
- `adjustment` needs an explicit signed direction in the UI and a mandatory
  reason; persist its direction in the event tag.
- Profile edit must not directly change `count` once movements exist. Route the
  user to **Adjust count** instead.
- Preserve movements and logs after closing a record. Do not permit deleting a
  profile with history; use a close lifecycle action or an archive state.

### Existing type changes

Add `transferred` to `LivestockStatus`. Keep `sold` and `deceased` only as
derived/terminal profile states for backwards compatibility. Future code should
derive the displayed state from the last closing movement.

---

## 5. User flows and acceptance criteria

### A. Acquire / purchase animals

1. User selects **Add livestock** → **Purchase / acquire**.
2. They enter identity fields, count, acquisition date, supplier, optional
   tag, total or unit price, currency, and notes.
3. Saving creates the profile and a `purchase` movement.
4. When an amount is provided, create one linked `FinanceRecord` of type
   `expense`, category `Livestock`, with the same date/currency/amount.
5. The detail timeline shows both records as one purchase event.

**Accept:** a newly purchased flock of 20 appears with a count of 20, its
purchase is visible in History and Finance, and the expense is not duplicated
when the user revisits or edits the record.

### B. Record a sale

1. From an active record, choose **Record sale**.
2. Enter quantity, date, buyer, unit/total price, currency, reference, and
   notes.
3. Confirm a review sentence: “Sell 5 of 20 Layers; 15 remain.”
4. Saving adds a `sale` movement, reduces the count, and creates one linked
   `FinanceRecord` of type `income`, category `Livestock sale`.
5. If the remaining count is zero, mark the profile `sold` and show it under
   Closed records.

**Accept:** sale quantity cannot exceed available animals, profile count and
finance income update atomically, and the detail timeline links to the sale.

### C. Record death, cull, or loss

1. From an active record, choose **Record death/loss**.
2. Enter quantity, date, cause/reason, optional disposal cost, and notes.
3. Saving adds a `death` movement and reduces the count.
4. If a disposal cost exists, add a linked expense. If count reaches zero, mark
   the profile `deceased`.

**Accept:** reason is required, no income is created, and death/loss is visible
in the timeline and count audit.

### D. View detail and history

1. Click a card, row, or accessible **View details** action.
2. The detail header shows identity, status, current count, tag, age/birth
   date, and primary actions (health, production, sale, movement).
3. Overview shows lifetime / selected-period production, health cost, last
   health event, and the next recommended action when applicable.
4. History merges movements, health logs, production logs, and linked finance
   records, ordered by event date descending, with filters by event type and
   date range.

**Accept:** every health, production, purchase, sale, death, and transfer
entry for the record is reachable from one route and never includes another
animal's data.

### E. Health and production logs

- Only active records appear in “new log” selectors by default; an explicit
  historical override is allowed only for backfill.
- Health records show date, type, severity, treatment/vet, cost, and links to
  its associated expense when present.
- Production logs permit product-appropriate units; show period total and do
  not imply that a production log is a sale.

**Accept:** deleting a log requires confirmation and removes it locally and
from Nostr; a log cannot silently refer to a missing profile.

---

## 6. Finance and inventory boundaries

| Event | Finance action | Inventory action |
|---|---|---|
| Purchase | Create linked expense when amount is supplied | None |
| Sale | Create linked income | None in P0 |
| Health treatment | Offer “record expense”; link if saved | None |
| Death / disposal | Optional linked expense | None |
| Production | No automatic finance entry | None in P0 |

Production is not automatically inventory in P0 because the existing inventory
model is for farm inputs and does not yet model saleable outputs. Add output
stock only as a later, explicit inventory extension; do not create ambiguous
input items for eggs or milk.

Add optional generic source references to `FinanceRecord` (`sourceType`,
`sourceId`) or a dedicated relation table. Use the same approach for every
cross-module financial link; do not store a one-way relationship only in the
livestock movement.

---

## 7. Nostr sync and deletion requirements

The present kinds are:

| Kind | Entity | Current behaviour |
|---|---|---|
| `32060` | livestock profile | addressable; profile updates publish |
| `32061` | health log | append-only event; local removal does not publish deletion |
| `32062` | production log | append-only event; local removal does not publish deletion |

Add `LIVESTOCK_MOVEMENT` at `32063`. It must be append-only and include:

```jsonc
{
  "kind": 32063,
  "content": "{\"counterparty\":\"Somchai Farm\",\"totalAmount\":125,\"currency\":\"USD\",\"financeId\":\"fin_…\",\"notes\":\"\"}",
  "tags": [
    ["animal", "lv_…"],
    ["type", "sale"],
    ["count", "5"],
    ["date", "178…"]
  ]
}
```

Implementation requirements:

- Add builders and parsers for movements; validate enum values and numeric
  fields rather than casting external tags with `as any`.
- Add signature-based merge/deduplication for movements.
- Publish a NIP-09 deletion when removing a health or production log. Add the
  same behaviour for movements if deletion is permitted before sync; prefer a
  correcting adjustment movement after sync.
- Never cascade-delete remote append-only history merely because a profile is
  removed. Block destructive profile deletion once history exists.
- Maintain backwards compatibility: profiles and the two existing log kinds
  imported from backups or relays remain valid.

---

## 8. Implementation tasks

### P0 — correct lifecycle and data integrity

- [x] Add `LivestockMovement` types, garden state slice, Nostr kind `32063`,
      event builder/parser, and sync merge rules.
- [x] Add store APIs: `recordLivestockMovement`, `livestockById`,
      `activeLivestock`, `livestockMovements`, `acquireLivestock`, and derived current count.
- [x] Make movement + profile count + linked finance mutation atomic in the
      store; validate before publishing any event.
- [x] Add purchase, sale, and death/loss modals with confirmation text and
      invalid-count handling.
- [x] Replace direct status editing with explicit lifecycle actions. Retain a
      migration-safe read path for existing statuses.
- [x] Add `/livestock/[id]` and link all register cards/rows to it with a
      keyboard-accessible action.
- [x] Fix profile deletion: block it when related history exists; for empty
      records, publish profile deletion. Publish NIP-09 deletions for removed
      health and production logs.
- [x] Add English and Lao localization keys before UI work is merged.

### P1 — usable daily operations

- [ ] Add unified timeline filters (type/date), health and production summaries,
      and period totals on detail.
- [ ] Add transfer in/out and audited count adjustment workflows.
- [ ] Add register filters for active/closed status and species; display health
      alert/last-event indicators.
- [ ] Offer optional health-cost finance linking and show linked finance records
      in the detail page.
- [ ] Prevent duplicate individual `tagId` values; make the policy explicit for
      flock/group tags.
- [ ] Add “create follow-up task” from illness/treatment.

### P2 — later enhancements

- [ ] Due-date schedules for vaccines, breeding, milking, and withdrawal periods.
- [ ] Feed, weight, breeding, and offspring lineage records.
- [ ] Output-stock integration for products that will later be sold.
- [ ] Import/export mapping and individual-animal mode for groups that must be
      split into members.

---

## 9. Test plan

Add focused tests; current QA coverage only asserts that the sample dataset
loads livestock records.

| Test layer | Required coverage |
|---|---|
| Unit: store | purchase increases count and creates linked expense; partial sale reduces count and creates one income; invalid/over-selling movement is rejected with no partial writes; death closes a zero-count record. |
| Unit: event layer | `32063` build/parse round trip; invalid tags safely fall back/reject; health/production/movement deletion publishes correct NIP-09 target. |
| Nuxt/component | card/row opens the correct detail route; history contains only selected-record events; closed records cannot receive normal logs. |
| E2E | purchase → health → production → partial sale → final sale sequence; finance and count stay consistent after reload/sync. |
| Regression | existing `32060`–`32062` records from `qa-mock-data.json` continue to render and can be opened. |

## Definition of done

The livestock feature is complete for the initial release when a farmer can
acquire animals, see each animal/flock’s full history, log health and
production, sell or record loss for all or part of a group, and trust that head
count and linked finance records remain consistent after reload and Nostr sync.
