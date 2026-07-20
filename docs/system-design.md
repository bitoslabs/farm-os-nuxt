# GardenOS — System Design

> Decentralized, offline-capable Farm & Garden Management System, Nostr-native.
> Built on Nuxt 4 + Nuxt UI 4 + Tailwind v4. Source of truth: `docs/plan.md`.

---

## 1. Goals & Principles

| Principle | How it's realized |
|---|---|
| **User-owned data** | Every record is a signed Nostr event keyed to the operator's `nsec`. No central DB is the source of truth. |
| **Offline-first** | All reads/writes go through a local reactive store; a sync layer replays them as Nostr events on reconnect. |
| **Portable schema** | Two profiles (Garden / Farm) share one entity model — upgrade in place, no migration. |
| **Bilingual** | Lao + English, locale-aware (date/number/currency formatting via `useLocale`). |
| **Themeable** | Dark-first design system with full light-theme parity (CSS custom properties). |

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Nuxt 4 (SSR/SPA/PWA)                     │
│                                                                  │
│   Pages ──▶ Composables ──▶ useGardenStore (reactive cache)     │
│              (UI logic)          │                                │
│                                 │  read/write (CRUD seam)        │
│                                 ▼                                │
│                       Repository Adapter                         │
│                  ┌──────────────┴──────────────┐                │
│                  │                             │                │
│          LocalStateAdapter             NostrAdapter (planned)    │
│          (seed/mock, today)           (publish/subscribe)        │
│                                          │                       │
└──────────────────────────────────────────┼───────────────────────┘
                                           │ NIP-33 addressable
                                           │ / regular events
                                           ▼
                              Nostr Relay(s)  ──▶  PostgreSQL indexer
                                                   (materialized view)
```

The **Repository Adapter** is the single seam that lets the UI run today on
local mock data and switch to live Nostr relays later without touching pages.

### 2.1 Data-flow lifecycle (per record)

1. **Optimistic local write** → appended to `useGardenStore` state, UI re-renders instantly.
2. **Persist** → adapter serializes the entity to a Nostr event template
   `{ kind, content, tags }`.
3. **Sync** (when online) → signed with `nsec`, published to configured relays.
4. **Confirm** → replace the local provisional record with the confirmed event id.
5. **Index** (server side, optional) → relay writes to PostgreSQL for fast queries / reports.

---

## 3. Nostr Event Model

### 3.1 Kind block
GardenOS reserves a **non-colliding block 32000–32099** inside the
parameterized-replaceable range (30000–39999), following NIP-33.

- **State / reference entities** (farm, plot, bed, crop variety, inventory item, worker, …)
  → **addressable replaceable events** (`kind 3xxxx`) identified by a `d` tag.
- **Append-only logs** (planting, growth, harvest, watering, labor, sightings)
  → **regular events** (`kind 3xxxx`), deduplicated by event id.

Registry: `app/types/garden-kinds.ts` (`GARDEN_KINDS`).

### 3.2 Canonical event shape

```ts
type GardenEvent<T> = {
  kind: GardenKind
  content: T            // JSON-stringified entity payload
  tags: Array<string[]> // identity + relations, see below
}
```

**Standard tags**
| Tag | Purpose |
|---|---|
| `d` | Per-entity identifier (addressable events only) |
| `name` | Human label (searchable) |
| `t` | Free-form topic / status tags |
| `r` | Relation to another entity: `["r", "<kind>:<d>", "role"]` |
| `farm` | Owning farm/property `d` |
| `plot` / `bed` | Spatial containment |
| `season` | Growing season key (e.g. `2025-wet`) |
| `crop` | Crop variety `d` |
| `qty` / `unit` | Quantities for harvest / input / stock |

**Example — a planting record (kind 32012)**
```jsonc
{
  "kind": 32012,
  "content": "{\"method\":\"seed\",\"seedRate\":2,\"notes\":\"...\"}",
  "tags": [
    ["d", "plt_8f3a"],
    ["plot", "fld_north_1"],
    ["crop", "tomato-cherry"],
    ["season", "2025-wet"],
    ["plantedAt", "1735296000"],
    ["t", "status:germinating"]
  ]
}
```

### 3.3 Relation graph

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

worker_profile ─ task_assignment → task
input_inventory → stock_movement
market_listing → market_order
expense_record / income_record → season_report
```

---

## 4. Module Map

Mirrors `plan.md` §2. Each module = a route group + a slice of the store.

| Group | Route | Modules | Primary kinds |
|---|---|---|---|
| Overview | `/` | Dashboard (KPIs, calendar, activity) | aggregates |
| Cultivation | `/land` | Fields, plots, beds, zones | 32000–32002 |
| | `/crops` | Crop/variety library + plans | 32010, 32011, 32014 |
| | `/plantings` | Planting records + growth log | 32012, 32013 |
| | `/harvest` | Harvest + yield reports | 32030, 32031 |
| Operations | `/tasks` | Tasks, assignments, labor logs | 32050–32053 |
| | `/inventory` | Inputs, applications, stock moves | 32040–32043 |
| Environment | `/irrigation` | Schedules, watering logs, weather, sensors | 32020–32023 |
| | `/pests` | Sightings + treatments | 32070, 32071 |
| Business | `/finance` | Expense, income, season report | 32090–32092 |
| | `/marketplace` | Listings, orders, price quotes | 32080–32082 |
| Community | `/knowledge` | KB articles, discussions | 32098, 32099 |
| System | `/settings` | Profile, relays, mode, locale | 32000, prefs |

> **Garden Mode** hides Operations/Finance/Marketplace; **Farm Mode** reveals them.
> Both write the same schema.

---

## 5. Design System & Theming

### 5.1 Tokens
All colors/surfaces are **CSS custom properties** under two scopes in
`assets/css/main.css`:

```css
:root        { /* light theme tokens */ }
:root.dark   { /* dark theme tokens (overrides) */ }
```

Tailwind v4's `dark:` variant is bound to the color-mode class:
```css
@custom-variant dark (&:where(.dark, .dark *));
```

`@nuxtjs/color-mode` (registered by `@nuxt/ui` with `classSuffix: ""`) toggles
`<html class="dark|light">`. Switching is instant and works offline.

### 5.2 Token catalog
| Token | Role |
|---|---|
| `--bg`, `--bg-2` | Page background + elevated panels |
| `--surface(2/3)` | Glass card fills (rising opacity) |
| `--border`, `--border-bright` | Hairlines / hover emphasis |
| `--fg`, `--muted`, `--muted-2` | Text hierarchy |
| `--accent`, `--accent-2`, `--accent-hover`, `--accent-dim`, `--accent-glow`, `--accent-contrast` | Brand lime + derived states |
| `--positive / negative / warning / info` | Status semantics |

**Utility helpers** (`.text-accent`, `.glass`, `.btn-accent`, `.stat-card`, …)
reference these variables, so a single class flip re-themes the whole app.

### 5.3 Fonts
- **Display** (`Space Grotesk`) — headings, numerics.
- **Body** (`Plus Jakarta Sans`) — everything else.
- Lao scripts pair with Noto Sans Lao (planned for locale `lo`).

### 5.4 Theme control
`app/components/app/ThemeToggle.vue` wraps `useColorMode()`; default preference is
`system` with `dark` fallback (`nuxt.config.ts`).

---

## 6. Frontend Architecture

### 6.1 Folder layout (Nuxt 4 `app/` dir)
```
app/
├── app.vue                 # <UApp> root (tooltips, toasts, overlays)
├── app.config.ts           # @nuxt/ui theme: primary=lime, neutral=zinc
├── layouts/
│   └── default.vue         # sidebar + header shell
├── components/
│   ├── AppSidebar.vue
│   ├── AppHeader.vue
│   ├── ThemeToggle.vue
│   ├── GlassCard.vue        # base surface
│   ├── StatCard.vue         # KPI tile
│   ├── PageHeader.vue       # module page title bar
│   └── EmptyState.vue
├── composables/
│   ├── useGardenStore.ts    # reactive singleton (useState-backed)
│   ├── useNav.ts            # nav model + Garden/Farm mode filter
│   └── useFormat.ts         # i18n number/date/currency
├── pages/                   # one folder per module group (see §4)
├── types/
│   ├── garden-kinds.ts      # GARDEN_KINDS registry
│   └── garden.ts            # entity TS interfaces
└── utils/
    └── seed.ts              # demo dataset
```

### 6.2 State management
`useGardenStore` is a **SSR-safe singleton** via Nuxt's `useState`. It exposes:

```ts
const store = useGardenStore()
store.plots            // Ref<Plot[]>
store.addPlot(p)       // optimistic create
store.updatePlot(id, patch)
store.removePlot(id)
// …one slice per entity, all Nostr-ready
```

Each mutator follows the §2.1 lifecycle: mutate local state → hand off to the
Repository Adapter (local today, Nostr tomorrow).

### 6.3 Rendering & components
- **Nuxt UI 4** primitives (`UButton`, `UModal`, `UForm`, `UTable`, `UTabs`, …)
  themed via `app.config.ts`.
- Custom glass components layer the brand aesthetic on top.
- Icons: **Lucide** (`@iconify-json/lucide`) bundled locally for offline use.

---

## 7. Offline-First Strategy

| Concern | Approach |
|---|---|
| Local persistence | `localStorage` / IndexedDB queue of pending events |
| Connectivity | `navigator.onLine` + relay `NOTICE`/`OK` acks |
| Conflict resolution | Addressable events: last-write-wins by `created_at`; logs: append + id dedupe |
| Sync status surface | A "synced / pending / offline" chip in the header |

> The repository seam means **zero page changes** when we move from local mock
> data to real relay publishing.

---

## 8. Internationalization

- Default locale `en`; planned `lo` (Lao). Strings centralized for extraction.
- All user-facing numbers/currency/dates flow through `useFormat` so locale
  swaps are consistent.

---

## 9. Testing

| Layer | Tool |
|---|---|
| Unit (store/utils) | Vitest (`test/unit`) |
| Component (Nuxt) | `@nuxt/test-utils` + `@vue/test-utils` (`test/nuxt`) |
| E2E | Playwright (`tests/`) |

---

## 10. Build Phases (alignment with plan.md §6)

| Phase | Status | Scope |
|---|---|---|
| 0 — Foundation | ✅ In progress | Kind registry, design system, theming, app shell, store seam |
| 1 — MVP Garden Mode | ⏳ | Crop plan, planting, growth log, harvest, calendar |
| 2 — Farm Mode core | ⏳ | Plots at scale, rotation, tasks & labor, inventory |
| 3 — Environment & IoT | ⏳ | Irrigation, weather, sensor readings |
| 4 — Economics | ⏳ | Expense/income, season reports, marketplace |
| 5 — Community | ⏳ | KB, pest alerts, certification |
| 6 — Livestock | ⏳ | Optional, mixed farms |

---

## 11. Settings & Identity Subsystem

A full settings module (`/settings`) backed by `useSettings` (persisted to
`localStorage` via `plugins/settings.client.ts`). Eight sections:

| Section | Component | Purpose |
|---|---|---|
| Nostr Identity | `SettingsAccount` | Login (NIP-07 extension / import nsec / read-only npub / generate), profile metadata (kind 0) |
| Farm Profile | `SettingsProfile` | Property name, owner, location, area, mode — kind 32000 |
| Appearance | `SettingsAppearance` | Theme, accent color, font size, density |
| Relays | `SettingsRelays` | Relay pool (add/remove, read/write flags, live status) |
| Language & Region | `SettingsLocale` | Language (en/lo), currency, units, date format |
| Notifications | `SettingsNotifications` | Task / low-stock / pest / sync alert toggles |
| Data & Sync | `SettingsData` | Offline mode, export/import JSON, reset |
| About | `SettingsAbout` | Version, features, kind registry |

### 11.1 Nostr identity (`utils/nostr.ts`)
Wraps `nostr-tools/pure` + `nip19` (isomorphic, SSR-safe) and NIP-07:

- `parseKey(input)` — accepts `nsec1…`, `npub1…`, or hex; returns `{ pubkey, secretKey? }`.
- `generateKeyPair()` — fresh secp256k1 keypair + bech32 encoding.
- `nip07GetPublicKey()` / `nip07SignEvent()` — browser extension (client-only).
- Keys (when using nsec login) are stored locally only and never synced.

### 11.2 Appearance engine (`utils/accents.ts`)
12 accent presets, each with a bright (dark-theme) and deep (light-theme) base.
At runtime `applyAccent(preset, mode)` derives the full token set
(`--accent`, `--accent-2`, `--accent-hover`, `--accent-dim`, `--accent-glow`,
`--accent-contrast`) via `color-mix()` and luminance-based contrast, writing them
to `<html>`. The plugin re-applies on theme toggle, so accent stays correct in
both modes. Font size scales the root `font-size` (14/16/18/20px).

### 11.3 Relay management
The relay pool (`DEFAULT_RELAYS`) seeds three public relays. Each entry carries
`read` / `write` / `enabled` flags. Connection status is simulated today; the
real pool will report via WebSocket `OK`/`NOTICE` acks. At least one read + one
write relay is recommended.

---

## 12. Open Decisions

1. **Relay set** — configurable in Settings → Relays; default pool self-hosted `strfry` + public fallbacks.
2. **Indexer** — PostgreSQL/Hasura vs. pure client-side materialization for
   small gardens.
3. **Payments** — Lightning integration scope (marketplace-only vs. broader).
4. **Auth UX** — browser extension (`nos2x`) vs. in-app `nsec` (encrypted) vs.
   NIP-07.

---

*This document is the canonical reference for GardenOS architecture. Update it
alongside `plan.md` whenever the kind registry or module boundaries change.*
