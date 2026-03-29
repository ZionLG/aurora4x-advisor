import { useClasses } from '@/app/hooks/data'

import { Loader2, Factory } from 'lucide-react'

export function ShipyardTab() {
  const { data: classes, isLoading } = useClasses()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
      </div>
    )
  }

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
          Ship Classes
        </span>
        <span className="font-mono text-[8px] text-muted-foreground">{classList.length} designs</span>
      </div>

      <div className="p-4">
        {classList.length === 0 ? (
          <p className="py-8 text-center text-[10px] text-muted-foreground">No ship class data available</p>
        ) : (
          <div className="space-y-2">
            {classList.map((cls) => (
              <div
                key={cls.ShipClassID as number}
                className="
                  rounded-md border border-(--cic-panel-edge) bg-(--cic-panel)
                  p-3
                "
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Factory className="size-3 text-(--cic-amber-dim)" />
                    <span className="
                      text-[11px] font-semibold text-foreground/80
                    ">{cls.ClassName as string}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {Boolean(cls.Commercial) && (
                      <span className="
                        rounded-sm border border-(--cic-green)/20
                        bg-(--cic-green)/10 px-1.5 py-0.5 text-[7px]
                        text-(--cic-green)
                      ">
                        CIV
                      </span>
                    )}
                    {Boolean(cls.MilitaryEngines) && (
                      <span className="
                        rounded-sm border border-(--cic-red)/20
                        bg-(--cic-red)/10 px-1.5 py-0.5 text-[7px]
                        text-(--cic-red)
                      ">
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
