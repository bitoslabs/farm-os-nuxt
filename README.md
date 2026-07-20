# Garden & Farm Operations System (GardenOS)

GardenOS is an offline-first, Nostr-native farm and garden management system.
It supports a simple **Garden Mode** for home, school, and community gardens,
and a more complete **Farm Mode** for small farms and co-ops. Both modes use
the same core flow: **space → crop plan → planting → observations → harvest**.

The goal is to keep farm data portable and user-owned, with local-first use in
the field and synchronization through Nostr when connectivity is available.

## Product scope

GardenOS is planned around these areas:

- Land, fields, plots, garden beds, and zones
- Crop and seasonal planning, including rotation and companion-planting notes
- Planting records, growth observations, photo journals, and harvests
- Irrigation, weather, and optional soil/IoT sensor readings
- Inputs, tools, inventory movements, tasks, and labor logs
- Pest and disease records, treatments, and an optional knowledge layer
- Farm finances, marketplace listings, and optional livestock management

Garden Mode keeps the experience focused on planning, planting, and harvests.
Farm Mode exposes operational features such as inventory, labor, and finance.

## Current status

The Nuxt application scaffold is in place. The broader product specification,
Nostr event-kind registry, data-model sketch, and proposed delivery phases are
documented in [docs/plan.md](docs/plan.md).

## Technology

- Nuxt 4 and Vue 3
- TypeScript
- Tailwind CSS and Nuxt UI
- Tiptap editor tooling
- Vitest and Playwright for testing
- Planned event layer: Nostr addressable events for state and regular events
  for append-only logs

## Getting started

### Prerequisites

- Node.js 20 or later
- npm (or a compatible package manager)

### Install and run

```bash
npm install
npm run dev
```

The development server is available at `http://localhost:3000`.

## Useful commands

```bash
# Create a production build
npm run build

# Preview a production build locally
npm run preview

# Generate a static site
npm run generate

# Run unit tests
npm run test:unit

# Run Nuxt integration tests
npm run test:nuxt

# Run end-to-end tests
npm run test:e2e
```

## Design principles

- **Offline-first:** workers can record activity without a reliable connection.
- **User-owned data:** data is controlled by the user's Nostr identity and is
  portable across devices.
- **Photo-first logging:** common field actions should be fast to capture.
- **Season-aware planning:** the experience should reflect local growing
  seasons, including Lao wet and dry cycles.
- **Lao and English:** bilingual support is a first-class product requirement.

## Roadmap

1. Foundation: farm, plot, and garden-bed records plus Nostr event support.
2. Garden Mode MVP: crop plans, plantings, growth logs, harvests, and calendar.
3. Farm Mode: crop rotation, tasks, labor, and input inventory.
4. Environment: irrigation, weather, and sensor data.
5. Economics and community: finance, marketplace, knowledge, and compliance.
6. Optional livestock support.

For the detailed module definitions and the reserved `32000–32099` GardenOS
Nostr event kinds, see [docs/plan.md](docs/plan.md).
