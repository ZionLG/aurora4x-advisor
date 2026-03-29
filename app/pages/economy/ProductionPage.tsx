import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import { useProductionRecap } from '@/app/hooks/data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import {
  Factory,
  Loader2,
  ListFilter,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Anchor,
  Ship,
  Shield,
  Thermometer,
  LayoutList,
  Building2,
  ArrowUpDown,
} from 'lucide-react'

interface RecapEntry {
  id: string
  type: 'research' | 'production' | 'ship' | 'shipyard' | 'training' | 'terraforming'
  badge: string
  name: string
  system: string
  colony: string
  colonyId: number
  remainingDays: number | null
  annualRate: string
  annualRateValue: number
  paused: boolean
  queued: boolean
}

type ViewMode = 'recap' | 'colony'

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  research: { bg: '#dc2626', text: '#fff' },
  production: { bg: '#0891b2', text: '#fff' },
  ship: { bg: '#2563eb', text: '#fff' },
  shipyard: { bg: '#ea580c', text: '#fff' },
  training: { bg: '#16a34a', text: '#fff' },
  terraforming: { bg: '#9333ea', text: '#fff' },
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  research: FlaskConical,
  production: Factory,
  ship: Ship,
  shipyard: Anchor,
  training: Shield,
  terraforming: Thermometer,
}

const ALL_TYPES = ['research', 'production', 'ship', 'shipyard', 'training', 'terraforming'] as const

function formatDays(days: number | null, queued: boolean, paused: boolean): React.ReactNode {
  if (paused) return <span className="text-(--cic-amber)">Paused</span>
  if (queued) return <span className="text-(--cic-red)/70">Queued</span>
  if (days == null) return <span className="text-muted-foreground/30">&mdash;</span>
  if (days <= 0) return <span className="text-(--cic-green)">Done!</span>
  const color = days < 100 ? 'var(--cic-green)' : days < 500 ? 'var(--cic-amber)' : 'var(--cic-red)'
  const prefix = days > 10000 ? '~ ' : ''
  return (
    <span style={{ color }}>
      {prefix}
      {days.toLocaleString(undefined, { maximumFractionDigits: 1 })}
    </span>
  )
}

function TypeBadge({ badge, type }: { badge: string; type: string }) {
  const colors = TYPE_COLORS[type] ?? { bg: '#666', text: '#fff' }
  return (
    <span
      className="
        inline-block rounded-sm px-2 py-0.5 text-[8px] font-bold tracking-wider
        whitespace-nowrap uppercase
      "
      style={{ background: colors.bg, color: colors.text }}
    >
      {badge}
    </span>
  )
}

/* ── Summary stat cards ────────────────────────────────────────────── */

function SummaryCards({ entries }: { entries: RecapEntry[] }) {
  const stats = useMemo(() => {
    const byType: Record<string, { count: number; soonest: number | null; paused: number }> = {}
    for (const e of entries) {
      if (!byType[e.type]) byType[e.type] = { count: 0, soonest: null, paused: 0 }
      byType[e.type].count++
      if (e.paused) byType[e.type].paused++
      if (e.remainingDays != null && !e.queued && !e.paused) {
        const current = byType[e.type].soonest
        if (current == null || e.remainingDays < current) byType[e.type].soonest = e.remainingDays
      }
    }
    return byType
  }, [entries])

  const colonies = useMemo(() => new Set(entries.map((e) => e.colony)).size, [entries])

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {/* Total */}
      <div className="
        min-w-[100px] shrink-0 rounded-sm border border-(--cic-panel-edge)
        bg-(--cic-panel) px-3 py-2
      ">
        <div className="
          text-[8px] tracking-wider text-muted-foreground/50 uppercase
        ">Total</div>
        <div className="text-lg font-bold text-foreground/80 tabular-nums">{entries.length}</div>
        <div className="text-[8px] text-muted-foreground/40">
          across {colonies} {colonies === 1 ? 'colony' : 'colonies'}
        </div>
      </div>

      {/* Per type */}
      {ALL_TYPES.map((type) => {
        const s = stats[type]
        if (!s) return null
        const colors = TYPE_COLORS[type]
        const Icon = TYPE_ICONS[type]
        return (
          <div
            key={type}
            className="
              min-w-[110px] shrink-0 rounded-sm border border-(--cic-panel-edge)
              bg-(--cic-panel) px-3 py-2
            "
          >
            <div className="flex items-center gap-1.5">
              <Icon className="size-3" style={{ color: colors.bg }} />
              <span className="
                text-[8px] font-semibold tracking-wider uppercase
              " style={{ color: colors.bg }}>
                {type}
              </span>
            </div>
            <div className="text-base font-bold text-foreground/80 tabular-nums">{s.count}</div>
            <div className="text-[8px] text-muted-foreground/40">
              {s.paused > 0 && <span className="text-(--cic-amber)">{s.paused} paused</span>}
              {s.paused > 0 && s.soonest != null && ' · '}
              {s.soonest != null && (
                <span>
                  next: <span className="text-(--cic-green)">~{Math.round(s.soonest)}d</span>
                </span>
              )}
              {s.paused === 0 && s.soonest == null && 'active'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Colony grouped view ───────────────────────────────────────────── */

function ColonyView({ entries }: { entries: RecapEntry[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, RecapEntry[]>()
    for (const e of entries) {
      const existing = map.get(e.colony) ?? []
      existing.push(e)
      map.set(e.colony, existing)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [entries])

  return (
    <div className="space-y-3 p-4">
      {groups.map(([colony, colonyEntries]) => (
        <ColonyCard key={colony} colony={colony} entries={colonyEntries} />
      ))}
    </div>
  )
}

function ColonyCard({ colony, entries }: { colony: string; entries: RecapEntry[] }) {
  const [open, setOpen] = useState(true)

  const typeSummary = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of entries) counts[e.type] = (counts[e.type] ?? 0) + 1
    return counts
  }, [entries])

  const soonest = useMemo(() => {
    let best: number | null = null
    for (const e of entries) {
      if (e.remainingDays != null && !e.paused && !e.queued) {
        if (best == null || e.remainingDays < best) best = e.remainingDays
      }
    }
    return best
  }, [entries])

  return (
    <div className="
      overflow-hidden rounded-md border border-(--cic-panel-edge)
      bg-(--cic-panel)
    ">
      <button
        onClick={() => setOpen(!open)}
        className="
          flex w-full items-center justify-between bg-(--cic-void)/40 px-4
          py-2.5 transition-colors
          hover:bg-(--cic-void)/60
        "
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={`
              size-3 text-muted-foreground/50 transition-transform
              ${open ? '' : `-rotate-90`}
            `}
          />
          <Building2 className="size-3.5 text-(--cic-amber)" />
          <span className="text-[11px] font-semibold text-foreground/80">{colony}</span>
          <span className="font-mono text-[8px] text-muted-foreground/40">{entries.length} projects</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Type mini-badges */}
          {Object.entries(typeSummary).map(([type, count]) => {
            const colors = TYPE_COLORS[type]
            return (
              <span
                key={type}
                className="
                  rounded-sm px-1.5 py-px text-[7px] font-bold uppercase
                "
                style={{ background: colors?.bg, color: colors?.text, opacity: 0.8 }}
              >
                {count} {type}
              </span>
            )
          })}
          {soonest != null && (
            <span className="font-mono text-[8px] text-(--cic-green)">~{Math.round(soonest)}d</span>
          )}
        </div>
      </button>
      {open && (
        <Table>
          <TableHeader>
            <TableRow className="
              border-b border-(--cic-panel-edge)
              hover:bg-transparent
            ">
              <TableHead className="
                h-7 w-28 px-3 text-[8px] tracking-wider text-muted-foreground/60
                uppercase
              ">
                Type
              </TableHead>
              <TableHead className="
                h-7 w-24 px-2 text-[8px] tracking-wider text-muted-foreground/60
                uppercase
              ">
                Days
              </TableHead>
              <TableHead className="
                h-7 px-2 text-[8px] tracking-wider text-muted-foreground/60
                uppercase
              ">
                Name
              </TableHead>
              <TableHead className="
                h-7 w-36 px-2 text-[8px] tracking-wider text-muted-foreground/60
                uppercase
              ">
                Annual Production
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow
                key={entry.id}
                className="
                  border-b border-(--cic-panel-edge)/50
                  hover:bg-(--cic-panel)/50
                "
              >
                <TableCell className="px-3 py-1.5">
                  <TypeBadge badge={entry.badge} type={entry.type} />
                </TableCell>
                <TableCell className="
                  px-2 py-1.5 font-mono text-[10px] tabular-nums
                ">
                  {formatDays(entry.remainingDays, entry.queued, entry.paused)}
                </TableCell>
                <TableCell className="px-2 py-1.5 whitespace-normal">
                  <span
                    className={`
                      text-[10px]
                      ${entry.paused ? `text-muted-foreground/40` : `
                        text-foreground/70
                      `}
                    `}
                  >
                    {entry.name}
                  </span>
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  <span className="
                    font-mono text-[10px] text-muted-foreground/50
                  ">{entry.annualRate}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────────── */

const recapColumns: ColumnDef<RecapEntry>[] = [
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <TypeBadge badge={row.original.badge} type={row.original.type} />,
    sortingFn: (a, b) => a.original.badge.localeCompare(b.original.badge),
  },
  {
    accessorKey: 'remainingDays',
    header: 'Remaining Days',
    cell: ({ row }) => (
      <span className="font-mono text-[10px] tabular-nums">
        {formatDays(row.original.remainingDays, row.original.queued, row.original.paused)}
      </span>
    ),
    sortingFn: (a, b) => (a.original.remainingDays ?? Infinity) - (b.original.remainingDays ?? Infinity),
  },
  {
    accessorKey: 'system',
    header: 'System',
    cell: ({ row }) => <span className="text-[10px] text-foreground/40">{row.original.system}</span>,
    size: 80,
  },
  {
    accessorKey: 'colony',
    header: 'Population',
    cell: ({ row }) => <span className="text-[10px] text-foreground/50">{row.original.colony}</span>,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span
        className={`
          text-[10px] whitespace-normal
          ${
          row.original.paused
            ? 'text-muted-foreground/40'
            : row.original.queued
              ? 'text-muted-foreground/50'
              : 'text-foreground/70'
        }
        `}
      >
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: 'annualRate',
    header: 'Annual Production',
    cell: ({ row }) => (
      <span className="font-mono text-[10px] text-muted-foreground/50">{row.original.annualRate}</span>
    ),
    sortingFn: (a, b) => (a.original.annualRateValue ?? 0) - (b.original.annualRateValue ?? 0),
  },
]

export function ProductionPage() {
  const { data: recapData, isLoading, isFetching } = useProductionRecap()
  const [showQueues, setShowQueues] = useState(false)
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set(ALL_TYPES))
  const [viewMode, setViewMode] = useState<ViewMode>('recap')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'remainingDays', desc: false }])
  const [filterSystems, setFilterSystems] = useState<Set<string> | null>(null)
  const [filterColonies, setFilterColonies] = useState<Set<string> | null>(null)
  const [locationFilterOpen, setLocationFilterOpen] = useState(false)

  const entries = useMemo(() => (recapData ?? []) as RecapEntry[], [recapData])

  // Available systems and colonies for filter badges
  const systems = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      if (e.system) map.set(e.system, (map.get(e.system) ?? 0) + 1)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [entries])

  const colonies = useMemo(() => {
    const map = new Map<string, { count: number; system: string }>()
    for (const e of entries) {
      if (!filterSystems || filterSystems.has(e.system)) {
        const existing = map.get(e.colony)
        if (existing) existing.count++
        else map.set(e.colony, { count: 1, system: e.system })
      }
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [entries, filterSystems])

  const activeLocationFilters = (filterSystems?.size ?? 0) + (filterColonies?.size ?? 0)

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!activeTypes.has(e.type)) return false
      if (!showQueues && e.queued) return false
      if (filterSystems && !filterSystems.has(e.system)) return false
      if (filterColonies && !filterColonies.has(e.colony)) return false
      return true
    })
  }, [entries, activeTypes, showQueues, filterSystems, filterColonies])

  const table = useReactTable({
    data: filtered,
    columns: recapColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of entries) counts[e.type] = (counts[e.type] ?? 0) + 1
    return counts
  }, [entries])

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col bg-(--cic-void)">
      {/* Header */}
      <div className="
        flex shrink-0 items-center justify-between border-b
        border-(--cic-panel-edge) bg-(--cic-panel) px-4 py-2.5
      ">
        <div className="flex items-center gap-3">
          <Factory className="size-4 text-(--cic-amber)" />
          <span className="text-xs font-semibold text-foreground/80">Production Command</span>
          <span className="font-mono text-[9px] text-muted-foreground">
            {filtered.length}/{entries.length} projects
          </span>
          {isFetching && !isLoading && <Loader2 className="
            size-3 animate-spin text-(--cic-cyan-dim)
          " />}
        </div>

        {/* View toggle */}
        <div className="
          flex items-center gap-1 rounded-sm border border-(--cic-panel-edge)
          bg-(--cic-void)/50 p-0.5
        ">
          <button
            onClick={() => setViewMode('recap')}
            className={`
              flex items-center gap-1 rounded-sm px-2 py-1 text-[9px]
              transition-all
              ${
              viewMode === 'recap'
                ? 'bg-(--cic-cyan-glow) text-(--cic-cyan)'
                : `
                  text-muted-foreground/50
                  hover:text-muted-foreground/70
                `
            }
            `}
          >
            <LayoutList className="size-3" />
            Recap
          </button>
          <button
            onClick={() => setViewMode('colony')}
            className={`
              flex items-center gap-1 rounded-sm px-2 py-1 text-[9px]
              transition-all
              ${
              viewMode === 'colony'
                ? 'bg-(--cic-cyan-glow) text-(--cic-cyan)'
                : `
                  text-muted-foreground/50
                  hover:text-muted-foreground/70
                `
            }
            `}
          >
            <Building2 className="size-3" />
            By Colony
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="
        flex shrink-0 items-center gap-2 overflow-x-auto border-b
        border-(--cic-panel-edge) bg-(--cic-panel)/80 px-4 py-2
      ">
        {ALL_TYPES.map((type) => {
          const colors = TYPE_COLORS[type]
          const active = activeTypes.has(type)
          const count = typeCounts[type] ?? 0
          if (count === 0) return null
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className="
                flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1
                text-[9px] font-bold tracking-wider uppercase transition-all
              "
              style={{
                background: active ? colors.bg : 'transparent',
                color: active ? colors.text : colors.bg,
                border: `1px solid ${active ? colors.bg : 'transparent'}`,
                opacity: active ? 1 : 0.5,
              }}
            >
              {type}
              <span className="font-mono text-[8px]" style={{ opacity: 0.7 }}>
                {count}
              </span>
            </button>
          )
        })}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setLocationFilterOpen(!locationFilterOpen)}
            className={`
              flex items-center gap-1 rounded-sm border px-2 py-1 text-[9px]
              font-semibold tracking-wider uppercase transition-all
              ${
              locationFilterOpen || activeLocationFilters > 0
                ? `
                  border-(--cic-cyan-dim)/30 bg-(--cic-cyan-glow)
                  text-(--cic-cyan)
                `
                : `
                  border-transparent text-muted-foreground/50
                  hover:text-muted-foreground/70
                `
            }
            `}
          >
            <Building2 className="size-3" />
            Location
            {activeLocationFilters > 0 && (
              <span className="
                ml-0.5 rounded-full bg-(--cic-cyan) px-1 text-[7px]
                text-(--cic-void)
              ">
                {activeLocationFilters}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowQueues(!showQueues)}
            className={`
              flex items-center gap-1 rounded-sm border px-2 py-1 text-[9px]
              font-semibold tracking-wider uppercase transition-all
              ${
              showQueues
                ? `
                  border-(--cic-amber-dim)/30 bg-(--cic-amber-glow)
                  text-(--cic-amber)
                `
                : `
                  border-transparent text-muted-foreground/50
                  hover:text-muted-foreground/70
                `
            }
            `}
          >
            <ListFilter className="size-3" />
            Queues
          </button>
        </div>
      </div>

      {/* Location filter panel */}
      {locationFilterOpen && (
        <div className="
          shrink-0 space-y-2 border-b border-(--cic-panel-edge)
          bg-(--cic-panel)/60 px-4 py-2
        ">
          <div className="flex items-center justify-between">
            <span className="
              text-[8px] font-semibold tracking-wider text-muted-foreground/50
              uppercase
            ">
              Filter by Location
            </span>
            <button
              className={`
                text-[8px] text-muted-foreground
                ${activeLocationFilters > 0 ? `visible` : `invisible`}
              `}
              onClick={() => {
                setFilterSystems(null)
                setFilterColonies(null)
              }}
            >
              Clear all
            </button>
          </div>

          {/* Systems */}
          {systems.length > 0 && (
            <div>
              <p className="mb-1 text-[8px] text-(--cic-cyan-dim)">Systems ({systems.length})</p>
              <div className="flex flex-wrap gap-1">
                {systems.map(([sys, count]) => {
                  const active = filterSystems?.has(sys) ?? false
                  return (
                    <button
                      key={sys}
                      onClick={() => {
                        setFilterSystems((prev) => {
                          if (!prev) return new Set([sys])
                          const next = new Set(prev)
                          if (next.has(sys)) next.delete(sys)
                          else next.add(sys)
                          return next.size === 0 ? null : next
                        })
                      }}
                      className={`
                        rounded-sm border px-2 py-0.5 text-[8px] transition-all
                        ${
                        active
                          ? `
                            border-(--cic-cyan-dim) bg-(--cic-cyan-glow)
                            text-(--cic-cyan)
                          `
                          : `
                            border-(--cic-panel-edge) text-muted-foreground/60
                            hover:text-foreground/70
                          `
                      }
                      `}
                    >
                      {sys}
                      <span className="ml-1 text-[7px] opacity-60">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Colonies */}
          {colonies.length > 0 && (
            <div>
              <p className="mb-1 text-[8px] text-(--cic-amber-dim)">
                Colonies ({colonies.length})
                {filterSystems && <span className="text-muted-foreground/40"> in selected systems</span>}
              </p>
              <div className="
                flex max-h-[100px] flex-wrap gap-1 overflow-y-auto
              ">
                {colonies.map(([col, info]) => {
                  const active = filterColonies?.has(col) ?? false
                  return (
                    <button
                      key={col}
                      onClick={() => {
                        setFilterColonies((prev) => {
                          if (!prev) return new Set([col])
                          const next = new Set(prev)
                          if (next.has(col)) next.delete(col)
                          else next.add(col)
                          return next.size === 0 ? null : next
                        })
                      }}
                      className={`
                        rounded-sm border px-2 py-0.5 text-[8px] transition-all
                        ${
                        active
                          ? `
                            border-(--cic-amber-dim) bg-(--cic-amber-glow)
                            text-(--cic-amber)
                          `
                          : `
                            border-(--cic-panel-edge) text-muted-foreground/50
                            hover:text-foreground/60
                          `
                      }
                      `}
                    >
                      {col}
                      <span className="ml-1 text-[7px] opacity-50">{info.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
        </div>
      ) : entries.length === 0 ? (
        <div className="
          flex flex-1 items-center justify-center text-[10px]
          text-muted-foreground
        ">
          No production data found
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {/* Summary cards */}
          <div className="px-4 pt-3 pb-2">
            <SummaryCards entries={filtered} />
          </div>

          {/* Recap view (sortable table) */}
          {viewMode === 'recap' && (
            <div className="px-4 pb-4">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-(--cic-panel)">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="
                      border-b border-(--cic-panel-edge)
                      hover:bg-transparent
                    ">
                      {hg.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={`
                            h-7 px-2 text-[8px] tracking-wider
                            text-muted-foreground/60 uppercase
                            ${
                            header.id === 'type' ? 'w-28 pl-3' : header.id === 'remainingDays' ? `
                              w-28
                            ` : header.id === 'system' ? `w-20` : header.id === 'colony' ? `
                              w-28
                            ` : header.id === 'annualRate' ? `w-40` : ''
                          }
                            ${header.column.getCanSort() ? `
                              cursor-pointer select-none
                              hover:text-muted-foreground
                            ` : ''}
                          `}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="
                                  size-2.5 text-(--cic-cyan)
                                " />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="
                                  size-2.5 text-(--cic-cyan)
                                " />
                              ) : (
                                <ArrowUpDown className="size-2.5 opacity-30" />
                              )
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="
                        border-b border-(--cic-panel-edge)/50
                        hover:bg-(--cic-panel)/50
                      "
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={`
                          px-2 py-1.5
                          ${cell.column.id === 'type' ? `pl-3` : ''}
                        `}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Colony view (grouped) */}
          {viewMode === 'colony' && <ColonyView entries={filtered} />}
        </div>
      )}
    </div>
  )
}
