import { useRoutes, useClasses } from '@/app/hooks/data'

import { Loader2, Route, Fuel } from 'lucide-react'

export function RoutesTab() {
  const { data: routes, isLoading } = useRoutes()
  const { data: classes } = useClasses()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
      </div>
    )
  }

  const routeList = (routes ?? []) as Record<string, unknown>[]
  const classList = (classes ?? []) as Record<string, unknown>[]

  return (
    <div>
      {/* Header */}
      <div className="
        flex shrink-0 items-center justify-between border-b
        border-(--cic-panel-edge) bg-(--cic-panel) px-4 py-2
      ">
        <span className="
          text-[9px] font-semibold tracking-wider text-(--cic-amber-dim)
          uppercase
        ">
          Route Planner
        </span>
        <span className="font-mono text-[8px] text-muted-foreground">
          {routeList.length} saved routes · {classList.length} ship classes
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* Route planner will be expanded in Sprint 4 */}
        <div className="
          rounded-md border border-(--cic-panel-edge) bg-(--cic-panel) p-6
          text-center
        ">
          <Route className="mx-auto mb-2 size-6 text-muted-foreground/30" />
          <p className="text-[10px] text-muted-foreground">Route planner coming soon</p>
          <p className="mt-1 text-[8px] text-muted-foreground/50">
            Select ship class or fleet, pick systems, compute fuel burn and travel time
          </p>
        </div>

        {/* Saved routes */}
        {routeList.length > 0 && (
          <div>
            <h3 className="
              mb-2 text-[9px] font-semibold tracking-wider text-(--cic-cyan-dim)
              uppercase
            ">
              Saved Routes
            </h3>
            <div className="space-y-2">
              {routeList.map((route, i) => (
                <div
                  key={i}
                  className="
                    rounded-md border border-(--cic-panel-edge) bg-(--cic-panel)
                    px-3 py-2
                  "
                >
                  <div className="flex items-center gap-2">
                    <Fuel className="size-3 text-(--cic-amber-dim)" />
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
          <p className="py-4 text-center text-[10px] text-muted-foreground">No saved routes</p>
        )}
      </div>
    </div>
  )
}
