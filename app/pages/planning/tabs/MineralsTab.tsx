import { useState } from 'react'
import { useMinerals, useMineralColonies } from '@/app/hooks/data'

import { Loader2, Gem } from 'lucide-react'

export function MineralsTab() {
  const { data: minerals, isLoading } = useMinerals()
  const { data: colonies } = useMineralColonies()
  const [selectedColony, setSelectedColony] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cic-cyan-dim)]" />
      </div>
    )
  }

  const mineralData = minerals as Record<string, unknown> | undefined
  const totals = (mineralData?.totals ?? {}) as Record<string, number>
  const colonyList = (colonies ?? []) as Record<string, unknown>[]
  const mineralNames = Object.keys(totals).sort()

  return (
    <div>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--cic-amber-dim)]">
          Mineral Stockpiles
        </span>
        {colonyList.length > 0 && (
          <select
            className="text-[9px] bg-[var(--cic-void)] border border-[var(--cic-panel-edge)] rounded px-2 py-1 text-foreground/60"
            value={selectedColony ?? ''}
            onChange={(e) => setSelectedColony(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">All Colonies</option>
            {colonyList.map((c) => (
              <option key={c.populationId as number} value={c.populationId as number}>
                {c.name as string} ({c.system as string})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Mineral grid */}

      <div className="p-4">
        {mineralNames.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-8">No mineral data available</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {mineralNames.map((name) => {
              const amount = totals[name] ?? 0
              const isLow = amount < 1000
              return (
                <div
                  key={name}
                  className={`rounded-md border bg-[var(--cic-panel)] p-3 ${
                    isLow ? 'border-[var(--cic-red)]/30' : 'border-[var(--cic-panel-edge)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Gem className={`h-3 w-3 ${isLow ? 'text-[var(--cic-red)]' : 'text-[var(--cic-amber-dim)]'}`} />
                      <span className="text-[10px] font-medium text-foreground/70">{name}</span>
                    </div>
                    {isLow && <span className="text-[7px] text-[var(--cic-red)]">LOW</span>}
                  </div>
                  <p className="text-sm font-mono text-foreground/80 mt-1">{amount.toLocaleString()}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
