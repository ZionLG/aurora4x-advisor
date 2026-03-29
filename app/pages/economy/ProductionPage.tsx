import { useMemo, useState } from 'react'
import { useProduction, useShipyards } from '@/app/hooks/data'
import { Badge } from '@/app/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import { Factory, Anchor, Loader2, Pause, ChevronDown } from 'lucide-react'

interface ProductionTask {
  projectId: number
  colony: string
  description: string
  productionType: number
  amount: number
  percentComplete: number
  paused: boolean
  queue: number
}

interface ShipyardTaskInfo {
  taskId: number
  taskType: string
  className: string
  unitName: string
  totalBP: number
  completedBP: number
  percentComplete: number
  paused: boolean
}

interface ShipyardInfo {
  shipyardId: number
  name: string
  colony: string
  type: string
  slipways: number
  capacity: number
  currentTask: ShipyardTaskInfo | null
}

function ProgressBar({ percent, paused }: { percent: number; paused?: boolean }) {
  const color = paused ? 'var(--cic-amber-dim)' : percent >= 100 ? 'var(--cic-green)' : 'var(--cic-cyan)'

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-20 h-[5px] rounded-sm bg-[var(--cic-void)] overflow-hidden border border-[var(--cic-panel-edge)]/30">
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-all duration-500"
          style={{
            width: `${Math.min(percent, 100)}%`,
            background: `linear-gradient(90deg, transparent 0%, ${color} 100%)`,
            boxShadow: percent >= 50 ? `0 0 6px ${color}` : 'none',
          }}
        />
      </div>
      <span className="text-[9px] font-mono tabular-nums w-7 text-right" style={{ color }}>
        {percent}%
      </span>
    </div>
  )
}

function ColonyGroup({
  colony,
  tasks,
  defaultOpen,
}: {
  colony: string
  tasks: ProductionTask[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const activeCount = tasks.filter((t) => !t.paused).length

  return (
    <div className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--cic-void)]/40 hover:bg-[var(--cic-void)]/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`h-3 w-3 text-muted-foreground/50 transition-transform ${open ? '' : '-rotate-90'}`} />
          <span className="text-[11px] font-semibold text-foreground/80">{colony}</span>
          <span className="text-[8px] font-mono text-muted-foreground/40">
            {activeCount}/{tasks.length} active
          </span>
        </div>
      </button>
      {open && (
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--cic-panel-edge)] hover:bg-transparent">
              <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-3 w-8">
                #
              </TableHead>
              <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-2">
                Project
              </TableHead>
              <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-2 w-16 text-right">
                Qty
              </TableHead>
              <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-2 w-36">
                Progress
              </TableHead>
              <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-2 w-16">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow
                key={task.projectId}
                className="border-b border-[var(--cic-panel-edge)]/50 hover:bg-[var(--cic-panel)]/50"
              >
                <TableCell className="px-3 py-1.5 text-[9px] font-mono text-muted-foreground/40">{task.queue}</TableCell>
                <TableCell className="px-2 py-1.5">
                  <span className={`text-[10px] ${task.paused ? 'text-muted-foreground/40' : 'text-foreground/70'}`}>
                    {task.description}
                  </span>
                </TableCell>
                <TableCell className="px-2 py-1.5 text-right">
                  <span className="text-[10px] font-mono text-foreground/50">{task.amount}</span>
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  <ProgressBar percent={task.percentComplete} paused={task.paused} />
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  {task.paused ? (
                    <Badge variant="outline" className="text-[7px] px-1.5 py-0 h-4 border-[var(--cic-amber-dim)]/40 text-[var(--cic-amber-dim)]">
                      <Pause className="h-2 w-2 mr-0.5" />
                      Paused
                    </Badge>
                  ) : task.percentComplete >= 100 ? (
                    <Badge variant="outline" className="text-[7px] px-1.5 py-0 h-4 border-[var(--cic-green)]/40 text-[var(--cic-green)]">
                      Done
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[7px] px-1.5 py-0 h-4 border-[var(--cic-cyan-dim)]/30 text-[var(--cic-cyan-dim)]">
                      Active
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export function ProductionPage() {
  const { data: production, isLoading: loadingProd } = useProduction()
  const { data: shipyards, isLoading: loadingYards } = useShipyards()

  const tasks = useMemo(() => (production ?? []) as ProductionTask[], [production])
  const yards = useMemo(() => (shipyards ?? []) as ShipyardInfo[], [shipyards])

  const colonyGroups = useMemo(() => {
    const groups = new Map<string, ProductionTask[]>()
    for (const task of tasks) {
      const existing = groups.get(task.colony) ?? []
      existing.push(task)
      groups.set(task.colony, existing)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [tasks])

  const yardsByColony = useMemo(() => {
    const groups = new Map<string, ShipyardInfo[]>()
    for (const yard of yards) {
      const existing = groups.get(yard.colony) ?? []
      existing.push(yard)
      groups.set(yard.colony, existing)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [yards])

  const isLoading = loadingProd || loadingYards

  return (
    <div className="flex h-full flex-col bg-[var(--cic-void)]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]">
        <div className="flex items-center gap-3">
          <Factory className="h-4 w-4 text-[var(--cic-amber)]" />
          <span className="text-xs font-semibold text-foreground/80">Production</span>
          <span className="text-[9px] font-mono text-muted-foreground">
            {tasks.length} projects &middot; {yards.length} shipyards
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--cic-cyan-dim)]" />
        </div>
      ) : tasks.length === 0 && yards.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-[10px]">
          No production data found
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Industrial Production */}
          {colonyGroups.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Factory className="h-3.5 w-3.5 text-[var(--cic-amber)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--cic-amber)]">
                  Industrial Production
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-[var(--cic-amber-dim)]/30 to-transparent" />
                <span className="text-[8px] font-mono text-[var(--cic-amber-dim)]/50">{tasks.length} projects</span>
              </div>
              <div className="space-y-2">
                {colonyGroups.map(([colony, colonyTasks], i) => (
                  <ColonyGroup key={colony} colony={colony} tasks={colonyTasks} defaultOpen={i === 0} />
                ))}
              </div>
            </section>
          )}

          {/* Shipyards */}
          {yardsByColony.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Anchor className="h-3.5 w-3.5 text-[var(--cic-cyan)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--cic-cyan)]">
                  Shipyards
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-[var(--cic-cyan-dim)]/30 to-transparent" />
                <span className="text-[8px] font-mono text-[var(--cic-cyan-dim)]/50">{yards.length} yards</span>
              </div>
              <div className="space-y-2">
                {yardsByColony.map(([colony, colonyYards]) => (
                  <div
                    key={colony}
                    className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] overflow-hidden"
                  >
                    <div className="px-3 py-2 bg-[var(--cic-void)]/40 border-b border-[var(--cic-panel-edge)]">
                      <span className="text-[11px] font-semibold text-foreground/80">{colony}</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[var(--cic-panel-edge)] hover:bg-transparent">
                          <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-3">
                            Shipyard
                          </TableHead>
                          <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-2 w-16">
                            Type
                          </TableHead>
                          <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-2 w-14 text-right">
                            Slips
                          </TableHead>
                          <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-2 w-20 text-right">
                            Capacity
                          </TableHead>
                          <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-2">
                            Current Task
                          </TableHead>
                          <TableHead className="text-[8px] uppercase tracking-wider text-muted-foreground/60 h-7 px-2 w-36">
                            Progress
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {colonyYards.map((yard) => (
                          <TableRow
                            key={yard.shipyardId}
                            className="border-b border-[var(--cic-panel-edge)]/50 hover:bg-[var(--cic-panel)]/50"
                          >
                            <TableCell className="px-3 py-1.5">
                              <span className="text-[10px] text-foreground/70">{yard.name}</span>
                            </TableCell>
                            <TableCell className="px-2 py-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[7px] px-1.5 py-0 h-4 ${
                                  yard.type === 'Naval'
                                    ? 'border-[var(--cic-red)]/30 text-[var(--cic-red)]'
                                    : 'border-[var(--cic-green)]/30 text-[var(--cic-green)]'
                                }`}
                              >
                                {yard.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-2 py-1.5 text-right">
                              <span className="text-[10px] font-mono text-foreground/50">{yard.slipways}</span>
                            </TableCell>
                            <TableCell className="px-2 py-1.5 text-right">
                              <span className="text-[10px] font-mono text-foreground/50">
                                {yard.capacity.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-1.5">
                              {yard.currentTask ? (
                                <span className="text-[10px] text-foreground/70">
                                  <span className="text-[var(--cic-amber-dim)]">{yard.currentTask.taskType}:</span>{' '}
                                  {yard.currentTask.className}
                                  {yard.currentTask.unitName && (
                                    <span className="text-muted-foreground/50"> ({yard.currentTask.unitName})</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/30 italic">Idle</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-1.5">
                              {yard.currentTask ? (
                                <ProgressBar
                                  percent={yard.currentTask.percentComplete}
                                  paused={yard.currentTask.paused}
                                />
                              ) : (
                                <span className="text-[9px] text-muted-foreground/20">&mdash;</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
