import { useLocation } from 'react-router-dom'
import { findModuleByRoute } from '@/app/modules/registry'
import { CATEGORIES } from '@/app/modules/categories'
import { Construction } from 'lucide-react'

export function ComingSoonPage() {
  const location = useLocation()
  const mod = findModuleByRoute(location.pathname)
  const category = mod ? CATEGORIES[mod.category] : null

  return (
    <div className="flex h-full items-center justify-center bg-[var(--cic-void)]">
      <div className="text-center space-y-3">
        <Construction className="h-8 w-8 text-[var(--cic-amber-dim)] mx-auto" />
        <div>
          <h2 className="text-sm font-semibold text-foreground/80">
            {mod?.name ?? 'Module'}
          </h2>
          {category && (
            <p className="text-[9px] uppercase tracking-wider text-[var(--cic-amber-dim)] mt-0.5">
              {category.label}
            </p>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground max-w-xs">
          This module is under development and will be available in a future update.
        </p>
      </div>
    </div>
  )
}
