import { useRoutes, useClasses } from '@/app/hooks/data'

import { Loader2, Route, Fuel } from 'lucide-react'

export function RoutesTab() {
  const { data: routes, isLoading } = useRoutes()
  const { data: classes } = useClasses()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cic-cyan-dim)]" />
      </div>
    )
  }

  const routeList = (routes ?? []) as Record<string, unknown>[]
  const classList = (classes ?? []) as Record<string, unknown>[]

  return (
    <div>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--cic-amber-dim)]">
          Route Planner
        </span>
        <span className="text-[8px] font-mono text-muted-foreground">
          {routeList.length} saved routes · {classList.length} ship classes
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Route planner will be expanded in Sprint 4 */}
        <div className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] p-6 text-center">
          <Route className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">Route planner coming soon</p>
          <p className="text-[8px] text-muted-foreground/50 mt-1">
            Select ship class or fleet, pick systems, compute fuel burn and travel time
          </p>
        </div>

        {/* Saved routes */}
        {routeList.length > 0 && (
          <div>
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-[var(--cic-cyan-dim)] mb-2">
              Saved Routes
            </h3>
            <div className="space-y-2">
              {routeList.map((route, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Fuel className="h-3 w-3 text-[var(--cic-amber-dim)]" />
                    <span className="text-[10px] font-medium text-foreground/70">
                      {(route.name as string) ?? `Route ${i + 1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {routeList.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">No saved routes</p>
        )}
      </div>
    </div>
  )
}
