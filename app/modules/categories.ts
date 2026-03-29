import {
  Home,
  Landmark,
  Swords,
  Coins,
  FlaskConical,
  Palette,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type CategoryId = 'home' | 'strategic' | 'military' | 'economy' | 'science' | 'creative' | 'system'

export interface Category {
  id: CategoryId
  label: string
  icon: LucideIcon
  order: number
}

export const CATEGORIES: Record<CategoryId, Category> = {
  home: { id: 'home', label: 'Home', icon: Home, order: 0 },
  strategic: { id: 'strategic', label: 'Strategic', icon: Landmark, order: 1 },
  military: { id: 'military', label: 'Military', icon: Swords, order: 2 },
  economy: { id: 'economy', label: 'Economy', icon: Coins, order: 3 },
  science: { id: 'science', label: 'Science', icon: FlaskConical, order: 4 },
  creative: { id: 'creative', label: 'Creative', icon: Palette, order: 5 },
  system: { id: 'system', label: 'System', icon: Settings, order: 6 },
}

export const CATEGORY_LIST = Object.values(CATEGORIES).sort((a, b) => a.order - b.order)
