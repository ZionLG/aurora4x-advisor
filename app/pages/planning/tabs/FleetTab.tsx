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
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cic-cyan-dim)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[10px] text-[var(--cic-red)]">Failed to load fleet data</p>
      </div>
    )
  }

  const fleetList = (fleets ?? []) as Record<string, unknown>[]

  return (
    <div>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--cic-amber-dim)]">
            {fleetList.length} Fleets
          </span>
          {connectionMode === 'bridge' && realtimeFleets && (
            <Badge variant="outline" className="text-[7px] h-4 px-1.5 border-[var(--cic-green)]/30 text-[var(--cic-green)]">
              <Radio className="h-2 w-2 mr-0.5" /> Live
            </Badge>
          )}
        </div>
      </div>

      {/* Fleet list */}
      
        <div className="p-4 space-y-2">
          {fleetList.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-8">No fleets found</p>
          ) : (
            fleetList.map((fleet) => {
              const ships = (fleet.ships ?? []) as Record<string, unknown>[]
              const jumpAnalysis = fleet.jumpAnalysis as Record<string, unknown> | undefined
              const jumpStatus = jumpAnalysis?.status as string | undefined

              return (
                <div
                  key={fleet.fleetId as number}
                  className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden"
                >
                  {/* Fleet header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-[var(--cic-void)]/40 border-b border-[var(--cic-panel-edge)]">
                    <div className="flex items-center gap-2">
                      <Ship className="h-3 w-3 text-[var(--cic-cyan-dim)]" />
                      <span className="text-[11px] font-semibold text-foreground/80">{fleet.fleetName as string}</span>
                      <span className="text-[8px] text-muted-foreground">{ships.length} ships</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {jumpStatus && (
                        <Badge variant="outline" className={`text-[7px] h-4 px-1.5 ${
                          jumpStatus === 'ok' ? 'border-[var(--cic-green)]/30 text-[var(--cic-green)]'
                            : jumpStatus === 'covered' ? 'border-[var(--cic-cyan-dim)]/30 text-[var(--cic-cyan)]'
                              : 'border-[var(--cic-amber-dim)]/30 text-[var(--cic-amber)]'
                        }`}>
                          {jumpStatus === 'ok' ? <CheckCircle className="h-2 w-2 mr-0.5" /> : <AlertTriangle className="h-2 w-2 mr-0.5" />}
                          {jumpStatus === 'ok' ? 'Jump OK' : jumpStatus === 'covered' ? 'Tender' : 'Warning'}
                        </Badge>
                      )}
                      <span className="text-[8px] font-mono text-muted-foreground">
                        {fleet.systemName as string}
                      </span>
                    </div>
                  </div>

                  {/* Fleet details */}
                  <div className="px-3 py-2 grid grid-cols-4 gap-3 text-[9px]">
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
                    <div className="border-t border-[var(--cic-panel-edge)] px-3 py-1.5">
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {ships.map((ship) => (
                          <span key={ship.shipId as number} className="text-[8px] text-muted-foreground/70">
                            {ship.shipName as string}
                            <span className="text-muted-foreground/40 ml-1">
                              ({ship.className as string})
                            </span>
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
