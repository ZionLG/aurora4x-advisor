import { lazy, type ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Landmark,
  BarChart3,
  Handshake,
  Ship,
  PenTool,
  Crosshair,
  Rocket,
  Shield,
  Factory,
  Gem,
  Globe,
  Building2,
  FlaskConical,
  Thermometer,
  Bug,
  BookOpen,
  Globe2,
  Atom,
  Map,
  ScrollText,
  AlertTriangle,
  Settings,
  Wrench,
  Plus,
} from 'lucide-react'
import type { CategoryId } from './categories'

export interface ModuleDefinition {
  id: string
  name: string
  category: CategoryId
  icon: LucideIcon
  route: string
  component: ComponentType
  requiresGame: boolean
  requiresBridge: boolean
  alertTags?: string[]
  order: number
  status: 'active' | 'coming-soon' | 'hidden'
}

// Lazy-load all module pages
const DashboardPage = lazy(() => import('@/app/pages/welcome/WelcomePage').then((m) => ({ default: m.WelcomePage })))
const GovernmentPage = lazy(() =>
  import('@/app/pages/government/GovernmentPage').then((m) => ({ default: m.GovernmentPage }))
)
const SetupPage = lazy(() => import('@/app/pages/setup/SetupPage').then((m) => ({ default: m.SetupPage })))
const SettingsPage = lazy(() => import('@/app/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

// Economy pages
const ProductionPage = lazy(() =>
  import('@/app/pages/economy/ProductionPage').then((m) => ({ default: m.ProductionPage }))
)

// System pages
const GameLogPage = lazy(() => import('@/app/pages/system/GameLogPage').then((m) => ({ default: m.GameLogPage })))
const WarningsPage = lazy(() => import('@/app/pages/system/WarningsPage').then((m) => ({ default: m.WarningsPage })))

// Planning pages — disabled until properly migrated with body map support
// const FleetPage = lazy(() => import('@/app/pages/planning/tabs/FleetTab').then((m) => ({ default: m.FleetTab })))
// const MineralsPage = lazy(() => import('@/app/pages/planning/tabs/MineralsTab').then((m) => ({ default: m.MineralsTab })))
// const ResearchPage = lazy(() => import('@/app/pages/planning/tabs/ResearchTab').then((m) => ({ default: m.ResearchTab })))
// const ShipyardPage = lazy(() => import('@/app/pages/planning/tabs/ShipyardTab').then((m) => ({ default: m.ShipyardTab })))
// const RoutesPage = lazy(() => import('@/app/pages/planning/tabs/RoutesTab').then((m) => ({ default: m.RoutesTab })))
// const OverviewPage = lazy(() => import('@/app/pages/planning/tabs/OverviewTab').then((m) => ({ default: m.OverviewTab })))

// Placeholder for coming-soon modules
const ComingSoonPage = lazy(() =>
  import('@/app/pages/common/ComingSoonPage').then((m) => ({ default: m.ComingSoonPage }))
)

export const MODULES: ModuleDefinition[] = [
  // ── Home ────────────────────────────────────────
  {
    id: 'dashboard',
    name: 'Dashboard',
    category: 'home',
    icon: LayoutDashboard,
    route: '/',
    component: DashboardPage,
    requiresGame: false,
    requiresBridge: false,
    order: 0,
    status: 'active',
  },
  {
    id: 'setup',
    name: 'New Campaign',
    category: 'home',
    icon: Plus,
    route: '/setup',
    component: SetupPage,
    requiresGame: false,
    requiresBridge: false,
    order: 1,
    status: 'active',
  },

  // ── Strategic ───────────────────────────────────
  {
    id: 'government',
    name: 'Government',
    category: 'strategic',
    icon: Landmark,
    route: '/strategic/government',
    component: GovernmentPage,
    requiresGame: true,
    requiresBridge: false,
    order: 0,
    status: 'active',
  },
  {
    id: 'analytics',
    name: 'Empire Analytics',
    category: 'strategic',
    icon: BarChart3,
    route: '/strategic/analytics',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    alertTags: ['economy', 'military', 'diplomacy'],
    order: 1,
    status: 'coming-soon',
  },
  {
    id: 'diplomacy',
    name: 'Diplomacy',
    category: 'strategic',
    icon: Handshake,
    route: '/strategic/diplomacy',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    alertTags: ['diplomacy'],
    order: 2,
    status: 'coming-soon',
  },

  // ── Military ────────────────────────────────────
  {
    id: 'fleet',
    name: 'Fleet Command',
    category: 'military',
    icon: Ship,
    route: '/military/fleet',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    alertTags: ['military', 'fleet'],
    order: 0,
    status: 'coming-soon',
  },
  {
    id: 'ship-design',
    name: 'Ship Design',
    category: 'military',
    icon: PenTool,
    route: '/military/ship-design',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 1,
    status: 'coming-soon',
  },
  {
    id: 'combat-sim',
    name: 'Combat Simulator',
    category: 'military',
    icon: Crosshair,
    route: '/military/combat-sim',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 2,
    status: 'coming-soon',
  },
  {
    id: 'missile-foundry',
    name: 'Missile Foundry',
    category: 'military',
    icon: Rocket,
    route: '/military/missile-foundry',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 3,
    status: 'coming-soon',
  },
  {
    id: 'ground-forces',
    name: 'Ground Forces',
    category: 'military',
    icon: Shield,
    route: '/military/ground-forces',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 4,
    status: 'coming-soon',
  },
  {
    id: 'routes',
    name: 'Route Planner',
    category: 'military',
    icon: Map,
    route: '/military/routes',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 5,
    status: 'coming-soon',
  },

  // ── Economy ─────────────────────────────────────
  {
    id: 'production',
    name: 'Production',
    category: 'economy',
    icon: Factory,
    route: '/economy/production',
    component: ProductionPage,
    requiresGame: true,
    requiresBridge: false,
    alertTags: ['industry'],
    order: 0,
    status: 'active',
  },
  {
    id: 'minerals',
    name: 'Minerals & Mining',
    category: 'economy',
    icon: Gem,
    route: '/economy/minerals',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    alertTags: ['minerals'],
    order: 1,
    status: 'coming-soon',
  },
  {
    id: 'colonies',
    name: 'Colonies & Planets',
    category: 'economy',
    icon: Globe,
    route: '/economy/colonies',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 2,
    status: 'coming-soon',
  },
  {
    id: 'organizations',
    name: 'Organizations',
    category: 'economy',
    icon: Building2,
    route: '/economy/organizations',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 3,
    status: 'coming-soon',
  },

  // ── Science ─────────────────────────────────────
  {
    id: 'research',
    name: 'Research',
    category: 'science',
    icon: FlaskConical,
    route: '/science/research',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    alertTags: ['research'],
    order: 0,
    status: 'coming-soon',
  },
  {
    id: 'habitability',
    name: 'Habitability',
    category: 'science',
    icon: Thermometer,
    route: '/science/habitability',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    alertTags: ['exploration'],
    order: 1,
    status: 'coming-soon',
  },
  {
    id: 'species',
    name: 'Species & Life',
    category: 'science',
    icon: Bug,
    route: '/science/species',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 2,
    status: 'coming-soon',
  },

  // ── Creative ────────────────────────────────────
  {
    id: 'lore',
    name: 'Lore & History',
    category: 'creative',
    icon: BookOpen,
    route: '/creative/lore',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 0,
    status: 'coming-soon',
  },
  {
    id: 'planet-viz',
    name: 'Planet Visualizer',
    category: 'creative',
    icon: Globe2,
    route: '/creative/planet-viz',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 1,
    status: 'coming-soon',
  },
  {
    id: 'station-designer',
    name: 'Station Designer',
    category: 'creative',
    icon: Atom,
    route: '/creative/station-designer',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: false,
    order: 2,
    status: 'coming-soon',
  },

  // ── System ──────────────────────────────────────
  {
    id: 'tactical-map',
    name: 'Tactical Map',
    category: 'system',
    icon: Map,
    route: '/system/map',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: true,
    order: 0,
    status: 'coming-soon',
  },
  {
    id: 'game-log',
    name: 'Game Log',
    category: 'system',
    icon: ScrollText,
    route: '/system/log',
    component: GameLogPage,
    requiresGame: true,
    requiresBridge: false,
    order: 1,
    status: 'active',
  },
  {
    id: 'warnings',
    name: 'Warnings',
    category: 'system',
    icon: AlertTriangle,
    route: '/system/warnings',
    component: WarningsPage,
    requiresGame: true,
    requiresBridge: false,
    order: 2,
    status: 'active',
  },
  {
    id: 'dev-tools',
    name: 'Dev Tools',
    category: 'system',
    icon: Wrench,
    route: '/system/dev-tools',
    component: ComingSoonPage,
    requiresGame: true,
    requiresBridge: true,
    order: 2,
    status: 'coming-soon',
  },
  {
    id: 'settings',
    name: 'Settings',
    category: 'system',
    icon: Settings,
    route: '/system/settings',
    component: SettingsPage,
    requiresGame: false,
    requiresBridge: false,
    order: 10,
    status: 'active',
  },
]

/** Get modules grouped by category, sorted by order */
export function getModulesByCategory(): Record<CategoryId, ModuleDefinition[]> {
  const groups: Record<string, ModuleDefinition[]> = {}
  for (const mod of MODULES) {
    if (mod.status === 'hidden') continue
    if (!groups[mod.category]) groups[mod.category] = []
    groups[mod.category].push(mod)
  }
  for (const cat of Object.keys(groups)) {
    groups[cat].sort((a, b) => a.order - b.order)
  }
  return groups as Record<CategoryId, ModuleDefinition[]>
}

/** Find the module + category for the current route */
export function findModuleByRoute(route: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.route === route)
}

/** Find the category for the current route */
export function findCategoryByRoute(route: string): CategoryId | undefined {
  return findModuleByRoute(route)?.category
}
