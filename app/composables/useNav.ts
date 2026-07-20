/**
 * Application navigation model.
 * Garden Mode hides Operations / Business complexity (per plan.md §5).
 */

export interface NavLink {
  label: string
  to: string
  icon: string
  badge?: 'tasks' | 'stock' | 'maintenance' // dynamic badge source
}

export interface NavGroup {
  title: string
  links: NavLink[]
  farmOnly?: boolean
}

export const NAV: NavGroup[] = [
  {
    title: 'navGroups.overview',
    links: [
      { label: 'nav.dashboard', to: '/', icon: 'i-lucide-layout-dashboard' }
    ]
  },
  {
    title: 'navGroups.cultivation',
    links: [
      { label: 'nav.land', to: '/land', icon: 'i-lucide-map-pinned' },
      { label: 'nav.crops', to: '/crops', icon: 'i-lucide-wheat' },
      { label: 'nav.plantings', to: '/plantings', icon: 'i-lucide-sprout' },
      { label: 'nav.harvest', to: '/harvest', icon: 'i-lucide-shopping-basket' }
    ]
  },
  {
    title: 'navGroups.operations',
    farmOnly: true,
    links: [
      { label: 'nav.tasks', to: '/tasks', icon: 'i-lucide-list-checks', badge: 'tasks' },
      { label: 'nav.inventory', to: '/inventory', icon: 'i-lucide-boxes', badge: 'stock' },
      { label: 'nav.livestock', to: '/livestock', icon: 'i-lucide-egg' },
      { label: 'nav.assets', to: '/assets', icon: 'i-lucide-tractor', badge: 'maintenance' }
    ]
  },
  {
    title: 'navGroups.environment',
    links: [
      { label: 'nav.irrigation', to: '/irrigation', icon: 'i-lucide-droplets' },
      { label: 'nav.pests', to: '/pests', icon: 'i-lucide-bug' }
    ]
  },
  {
    title: 'navGroups.business',
    farmOnly: true,
    links: [
      { label: 'nav.finance', to: '/finance', icon: 'i-lucide-banknote' },
      { label: 'reports.title', to: '/reports', icon: 'i-lucide-chart-bar' },
      { label: 'nav.marketplace', to: '/marketplace', icon: 'i-lucide-store' }
    ]
  },
  {
    title: 'navGroups.community',
    links: [
      { label: 'nav.knowledge', to: '/knowledge', icon: 'i-lucide-book-open' }
    ]
  },
  {
    title: 'navGroups.system',
    links: [
      { label: 'nav.settings', to: '/settings', icon: 'i-lucide-settings' }
    ]
  }
]

export function useNav() {
  const mode = useState<'garden' | 'farm'>('farm-mode', () => 'farm')

  const groups = computed(() =>
    NAV.filter((g) => g.farmOnly ? mode.value === 'farm' : true)
  )

  function toggleMode() {
    mode.value = mode.value === 'farm' ? 'garden' : 'farm'
  }

  return { groups, mode, toggleMode }
}
