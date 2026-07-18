# GardenOS — Feature Documentation

Reference docs for the features built on top of the core system
(`docs/plan.md` vision, `docs/system-design.md` architecture).

| Doc | Feature | What it covers |
|---|---|---|
| [list-controls.md](./list-controls.md) | **List Controls System** | Reusable grid/table view + sort (asc/desc) composable & components, how to wire a new list page |
| [assets-module.md](./assets-module.md) | **Assets & Equipment Module** | Durable-property register + maintenance lifecycle, data model, Nostr kinds, user flows |
| [quick-log.md](./quick-log.md) | **Quick Log** | In-place dashboard activity capture (task / expense / income / harvest / maintenance) |
| [plantings-growth.md](./plantings-growth.md) | **Plantings Timeline & Care Log** | Table inline "Next" stage button, detail view with growth-stage timeline, and a per-planting care/activity log (watering, fertilizing, …) with inventory integration |
| [qa-mock-data.json](./qa-mock-data.json) | **QA Test Dataset** | A full farm snapshot — import via **Settings → Data & Sync → Import backup** to test every flow |

## How to use the QA dataset

1. Start the app (`yarn dev`).
2. Open **Settings → Data & Sync**.
3. Click **Import backup**, select `qa-mock-data.json`.
4. Every module (inventory, assets, plantings, harvest, livestock, finance, tasks) is now populated and the flows in each doc can be exercised end-to-end.

> The import only loads the `garden` slice — it never touches your Nostr identity or relays.
