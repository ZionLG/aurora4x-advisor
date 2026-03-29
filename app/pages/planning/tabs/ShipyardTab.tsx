import { useClasses } from '@/app/hooks/data'

import { Loader2, Factory } from 'lucide-react'

export function ShipyardTab() {
  const { data: classes, isLoading } = useClasses()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cic-cyan-dim)]" />
      </div>
    )
  }

  const classList = (classes ?? []) as Record<string, unknown>[]

  return (
    <div>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--cic-amber-dim)]">
          Ship Classes
        </span>
        <span className="text-[8px] font-mono text-muted-foreground">{classList.length} designs</span>
      </div>

      <div className="p-4">
        {classList.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-8">No ship class data available</p>
        ) : (
          <div className="space-y-2">
            {classList.map((cls) => (
              <div
                key={cls.ShipClassID as number}
                className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Factory className="h-3 w-3 text-[var(--cic-amber-dim)]" />
                    <span className="text-[11px] font-semibold text-foreground/80">{cls.ClassName as string}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {Boolean(cls.Commercial) && (
                      <span className="text-[7px] px-1.5 py-0.5 rounded bg-[var(--cic-green)]/10 text-[var(--cic-green)] border border-[var(--cic-green)]/20">
                        CIV
                      </span>
                    )}
                    {Boolean(cls.MilitaryEngines) && (
                      <span className="text-[7px] px-1.5 py-0.5 rounded bg-[var(--cic-red)]/10 text-[var(--cic-red)] border border-[var(--cic-red)]/20">
                        MIL
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[8px]">
                  <div>
                    <span className="text-muted-foreground">Tonnage</span>
                    <p className="font-mono text-foreground/60">{((cls.Tonnage as number) ?? 0).toLocaleString()}t</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Speed</span>
                    <p className="font-mono text-foreground/60">{cls.MaxSpeed as number} km/s</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fuel</span>
                    <p className="font-mono text-foreground/60">
                      {((cls.FuelCapacity as number) ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Jump</span>
                    <p className="font-mono text-foreground/60">
                      {(cls.JumpDistance as number) > 0 ? `${cls.JumpDistance}km` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
