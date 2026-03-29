import { useFleets, useRealtimeFleets } from '@/app/hooks/data'
import { useSessionStore } from '@/app/stores/session-store'

import { Badge } from '@/app/components/ui/badge'
import { Loader2, Ship, AlertTriangle, CheckCircle, Radio } from 'lucide-react'

export function FleetTab() {
  const connectionMode = useSessionStore((s) => s.connectionMode)
  const { data: fleets, isLoading, error } = useFleets()
  const { data: realtimeFleets } = useRealtimeFleets()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[10px] text-(--cic-red)">Failed to load fleet data</p>
      </div>
    )
  }

  const fleetList = (fleets ?? []) as Record<string, unknown>[]

  return (
    <div>
      {/* Header */}
      <div className="
        flex shrink-0 items-center justify-between border-b
        border-(--cic-panel-edge) bg-(--cic-panel) px-4 py-2
      ">
        <div className="flex items-center gap-2">
          <span className="
            text-[9px] font-semibold tracking-wider text-(--cic-amber-dim)
            uppercase
          ">
            {fleetList.length} Fleets
          </span>
          {connectionMode === 'bridge' && realtimeFleets && (
            <Badge
              variant="outline"
              className="
                h-4 border-(--cic-green)/30 px-1.5 text-[7px] text-(--cic-green)
              "
            >
              <Radio className="mr-0.5 size-2" /> Live
            </Badge>
          )}
        </div>
      </div>

      {/* Fleet list */}

      <div className="space-y-2 p-4">
        {fleetList.length === 0 ? (
          <p className="py-8 text-center text-[10px] text-muted-foreground">No fleets found</p>
        ) : (
          fleetList.map((fleet) => {
            const ships = (fleet.ships ?? []) as Record<string, unknown>[]
            const jumpAnalysis = fleet.jumpAnalysis as Record<string, unknown> | undefined
            const jumpStatus = jumpAnalysis?.status as string | undefined

            return (
              <div
                key={fleet.fleetId as number}
                className="
                  overflow-hidden rounded-md border border-(--cic-panel-edge)
                  bg-(--cic-panel)
                "
              >
                {/* Fleet header */}
                <div className="
                  flex items-center justify-between border-b
                  border-(--cic-panel-edge) bg-(--cic-void)/40 px-3 py-2
                ">
                  <div className="flex items-center gap-2">
                    <Ship className="size-3 text-(--cic-cyan-dim)" />
                    <span className="
                      text-[11px] font-semibold text-foreground/80
                    ">{fleet.fleetName as string}</span>
                    <span className="text-[8px] text-muted-foreground">{ships.length} ships</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {jumpStatus && (
                      <Badge
                        variant="outline"
                        className={`
                          h-4 px-1.5 text-[7px]
                          ${
                          jumpStatus === 'ok'
                            ? `border-(--cic-green)/30 text-(--cic-green)`
                            : jumpStatus === 'covered'
                              ? `border-(--cic-cyan-dim)/30 text-(--cic-cyan)`
                              : `border-(--cic-amber-dim)/30 text-(--cic-amber)`
                        }
                        `}
                      >
                        {jumpStatus === 'ok' ? (
                          <CheckCircle className="mr-0.5 size-2" />
                        ) : (
                          <AlertTriangle className="mr-0.5 size-2" />
                        )}
                        {jumpStatus === 'ok' ? 'Jump OK' : jumpStatus === 'covered' ? 'Tender' : 'Warning'}
                      </Badge>
                    )}
                    <span className="font-mono text-[8px] text-muted-foreground">{fleet.systemName as string}</span>
                  </div>
                </div>

                {/* Fleet details */}
                <div className="grid grid-cols-4 gap-3 px-3 py-2 text-[9px]">
                  <div>
                    <span className="text-muted-foreground">Speed</span>
                    <p className="font-mono text-foreground/70">{fleet.speed as number} km/s</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Position</span>
                    <p className="font-mono text-foreground/70">
                      {((fleet.x as number) ?? 0).toFixed(1)}, {((fleet.y as number) ?? 0).toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">System</span>
                    <p className="text-foreground/70">{fleet.systemName as string}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ships</span>
                    <p className="font-mono text-foreground/70">{ships.length}</p>
                  </div>
                </div>

                {/* Ship list (collapsed) */}
                {ships.length > 0 && (
                  <div className="
                    border-t border-(--cic-panel-edge) px-3 py-1.5
                  ">
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {ships.map((ship) => (
                        <span key={ship.shipId as number} className="
                          text-[8px] text-muted-foreground/70
                        ">
                          {ship.shipName as string}
                          <span className="ml-1 text-muted-foreground/40">({ship.className as string})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
