import { useFleets, useMinerals, useResearch, useGameDate } from '@/app/hooks/data'

import { Ship, Gem, FlaskConical, Clock, Loader2 } from 'lucide-react'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'var(--cic-cyan-dim)',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color }}><Icon className="h-3 w-3" /></span>
        <span className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-mono font-bold text-foreground/80">{value}</p>
      {sub && <p className="text-[8px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

export function OverviewTab() {
  const { data: fleets, isLoading: fleetsLoading } = useFleets()
  const { data: minerals, isLoading: mineralsLoading } = useMinerals()
  const { data: research, isLoading: researchLoading } = useResearch()
  const { data: gameDate } = useGameDate()

  const isLoading = fleetsLoading || mineralsLoading || researchLoading

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cic-cyan-dim)]" />
      </div>
    )
  }

  const fleetList = (fleets ?? []) as Record<string, unknown>[]
  const totalShips = fleetList.reduce((sum, f) => sum + ((f.ships as unknown[])?.length ?? 0), 0)
  const mineralData = minerals as Record<string, unknown> | undefined
  const totals = (mineralData?.totals ?? {}) as Record<string, number>
  const mineralCount = Object.keys(totals).length
  const lowMinerals = Object.values(totals).filter((v) => v < 1000).length
  const researchData = research as Record<string, unknown> | undefined
  const projects = (researchData?.projects ?? []) as Record<string, unknown>[]
  const gameDateFormatted = gameDate ? (gameDate as Record<string, unknown>).formatted as string : null

  return (
    
      <div className="p-4 space-y-4">
        {/* Game date */}
        {gameDateFormatted && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <Clock className="h-3 w-3" />
            Game Date: <span className="text-foreground/70">{gameDateFormatted}</span>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Ship}
            label="Fleets"
            value={fleetList.length}
            sub={`${totalShips} total ships`}
            color="var(--cic-cyan-dim)"
          />
          <StatCard
            icon={Gem}
            label="Minerals"
            value={mineralCount}
            sub={lowMinerals > 0 ? `${lowMinerals} low stockpiles` : 'All stocks healthy'}
            color={lowMinerals > 0 ? 'var(--cic-red)' : 'var(--cic-amber-dim)'}
          />
          <StatCard
            icon={FlaskConical}
            label="Research"
            value={projects.length}
            sub="active projects"
            color="var(--cic-cyan-dim)"
          />
          <StatCard
            icon={Clock}
            label="Date"
            value={gameDateFormatted ?? '—'}
            color="var(--cic-amber-dim)"
          />
        </div>

        {/* Active research */}
        {projects.length > 0 && (
          <div className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-void)]/40">
              <span className="text-[8px] font-semibold uppercase tracking-wider text-[var(--cic-amber-dim)]">
                Active Research
              </span>
            </div>
            <div className="divide-y divide-[var(--cic-panel-edge)]">
              {projects.slice(0, 5).map((p, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] text-foreground/70">{p.name as string}</span>
                  <span className="text-[9px] font-mono text-[var(--cic-cyan-dim)]">
                    {((p.percentComplete as number) ?? 0).toFixed(1)}%
                  </span>
                </div>
              ))}
              {projects.length > 5 && (
                <div className="px-3 py-1.5 text-[8px] text-muted-foreground text-center">
                  +{projects.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fleets summary */}
        {fleetList.length > 0 && (
          <div className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-void)]/40">
              <span className="text-[8px] font-semibold uppercase tracking-wider text-[var(--cic-amber-dim)]">
                Fleet Summary
              </span>
            </div>
            <div className="divide-y divide-[var(--cic-panel-edge)]">
              {fleetList.slice(0, 8).map((f, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-foreground/70">{f.fleetName as string}</span>
                    <span className="text-[8px] text-muted-foreground">
                      {((f.ships as unknown[])?.length ?? 0)} ships
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-muted-foreground">{f.systemName as string}</span>
                </div>
              ))}
              {fleetList.length > 8 && (
                <div className="px-3 py-1.5 text-[8px] text-muted-foreground text-center">
                  +{fleetList.length - 8} more fleets
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    
  )
}
