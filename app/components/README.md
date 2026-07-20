# Component organization

Components are grouped by responsibility. Nuxt is configured with
`pathPrefix: false`, so moving a component into one of these folders does not
change its template name.

- `app/` — application shell, navigation, and global controls
- `charts/` — charts, timelines, and activity visualizations
- `feedback/` — empty and status states
- `list/` — shared searching, sorting, and view controls
- `overlays/` — modals and other temporary overlays
- `settings/` — settings-page sections and rows
- `ui/` — reusable, presentation-focused building blocks

Place a component in the narrowest folder that fits it. A feature-specific
component should live beside that feature's page when the feature grows beyond
a single page.
