import { useLocation } from 'react-router-dom'
import { findModuleByRoute } from '@/app/modules/registry'
import { CATEGORIES } from '@/app/modules/categories'
import { Construction } from 'lucide-react'

export function ComingSoonPage() {
  const location = useLocation()
  const mod = findModuleByRoute(location.pathname)
  const category = mod ? CATEGORIES[mod.category] : null

  return (
    <div className="flex h-full items-center justify-center bg-(--cic-void)">
      <div className="space-y-3 text-center">
        <Construction className="mx-auto size-8 text-(--cic-amber-dim)" />
        <div>
          <h2 className="text-sm font-semibold text-foreground/80">{mod?.name ?? 'Module'}</h2>
          {category && (
            <p
              className="
                mt-0.5 text-[9px] tracking-wider text-(--cic-amber-dim)
                uppercase
              "
            >
              {category.label}
            </p>
          )}
        </div>
        <p className="max-w-xs text-[10px] text-muted-foreground">
          This module is under development and will be available in a future update.
        </p>
      </div>
    </div>
  )
}
