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
        <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
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
      <div className="
        flex shrink-0 items-center justify-between border-b
        border-(--cic-panel-edge) bg-(--cic-panel) px-4 py-2
      ">
        <span className="
          text-[9px] font-semibold tracking-wider text-(--cic-amber-dim)
          uppercase
        ">
          Mineral Stockpiles
        </span>
        {colonyList.length > 0 && (
          <select
            className="
              rounded-sm border border-(--cic-panel-edge) bg-(--cic-void) px-2
              py-1 text-[9px] text-foreground/60
            "
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
          <p className="py-8 text-center text-[10px] text-muted-foreground">No mineral data available</p>
        ) : (
          <div className="
            grid grid-cols-2 gap-3
            lg:grid-cols-3
          ">
            {mineralNames.map((name) => {
              const amount = totals[name] ?? 0
              const isLow = amount < 1000
              return (
                <div
                  key={name}
                  className={`
                    rounded-md border bg-(--cic-panel) p-3
                    ${
                    isLow ? 'border-(--cic-red)/30' : `
                      border-(--cic-panel-edge)
                    `
                  }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Gem className={`
                        size-3
                        ${isLow ? 'text-(--cic-red)' : `text-(--cic-amber-dim)`}
                      `} />
                      <span className="
                        text-[10px] font-medium text-foreground/70
                      ">{name}</span>
                    </div>
                    {isLow && <span className="text-[7px] text-(--cic-red)">LOW</span>}
                  </div>
                  <p className="mt-1 font-mono text-sm text-foreground/80">{amount.toLocaleString()}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
