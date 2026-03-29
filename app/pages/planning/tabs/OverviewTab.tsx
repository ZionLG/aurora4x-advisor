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
    <div className="
      rounded-md border border-(--cic-panel-edge) bg-(--cic-panel) p-3
    ">
      <div className="mb-1 flex items-center gap-1.5">
        <span style={{ color }}>
          <Icon className="size-3" />
        </span>
        <span className="
          text-[8px] tracking-wider text-muted-foreground uppercase
        ">{label}</span>
      </div>
      <p className="font-mono text-lg font-bold text-foreground/80">{value}</p>
      {sub && <p className="mt-0.5 text-[8px] text-muted-foreground">{sub}</p>}
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
        <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
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
  const gameDateFormatted = gameDate ? ((gameDate as Record<string, unknown>).formatted as string) : null

  return (
    <div className="space-y-4 p-4">
      {/* Game date */}
      {gameDateFormatted && (
        <div className="
          flex items-center gap-2 font-mono text-[10px] text-muted-foreground
        ">
          <Clock className="size-3" />
          Game Date: <span className="text-foreground/70">{gameDateFormatted}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="
        grid grid-cols-2 gap-3
        lg:grid-cols-4
      ">
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
        <StatCard icon={Clock} label="Date" value={gameDateFormatted ?? '—'} color="var(--cic-amber-dim)" />
      </div>

      {/* Active research */}
      {projects.length > 0 && (
        <div className="
          overflow-hidden rounded-md border border-(--cic-panel-edge)
          bg-(--cic-panel)
        ">
          <div className="
            border-b border-(--cic-panel-edge) bg-(--cic-void)/40 px-3 py-2
          ">
            <span className="
              text-[8px] font-semibold tracking-wider text-(--cic-amber-dim)
              uppercase
            ">
              Active Research
            </span>
          </div>
          <div className="divide-y divide-(--cic-panel-edge)">
            {projects.slice(0, 5).map((p, i) => (
              <div key={i} className="
                flex items-center justify-between px-3 py-2
              ">
                <span className="text-[10px] text-foreground/70">{p.name as string}</span>
                <span className="font-mono text-[9px] text-(--cic-cyan-dim)">
                  {((p.percentComplete as number) ?? 0).toFixed(1)}%
                </span>
              </div>
            ))}
            {projects.length > 5 && (
              <div className="
                px-3 py-1.5 text-center text-[8px] text-muted-foreground
              ">
                +{projects.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fleets summary */}
      {fleetList.length > 0 && (
        <div className="
          overflow-hidden rounded-md border border-(--cic-panel-edge)
          bg-(--cic-panel)
        ">
          <div className="
            border-b border-(--cic-panel-edge) bg-(--cic-void)/40 px-3 py-2
          ">
            <span className="
              text-[8px] font-semibold tracking-wider text-(--cic-amber-dim)
              uppercase
            ">
              Fleet Summary
            </span>
          </div>
          <div className="divide-y divide-(--cic-panel-edge)">
            {fleetList.slice(0, 8).map((f, i) => (
              <div key={i} className="
                flex items-center justify-between px-3 py-2
              ">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-foreground/70">{f.fleetName as string}</span>
                  <span className="text-[8px] text-muted-foreground">{(f.ships as unknown[])?.length ?? 0} ships</span>
                </div>
                <span className="font-mono text-[8px] text-muted-foreground">{f.systemName as string}</span>
              </div>
            ))}
            {fleetList.length > 8 && (
              <div className="
                px-3 py-1.5 text-center text-[8px] text-muted-foreground
              ">
                +{fleetList.length - 8} more fleets
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
