import { useState } from 'react'
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useGameLog, useEventTypes } from '@/app/hooks/data'
import { DataSettingsButton } from '@/app/components/DataSettingsPanel'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Switch } from '@/app/components/ui/switch'
import { Label } from '@/app/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table'
import {
  Loader2,
  ScrollText,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Eye,
  Swords,
  FlaskConical,
  Factory,
  Ship,
  Medal,
  User,
  Globe,
  AlertTriangle,
  Pickaxe,
  Building2,
  Radio,
  Crosshair,
  Shield,
  Gem,
  Fuel,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'

const PAGE_SIZE = 100

function getEventIcon(description: string): LucideIcon {
  const d = description.toLowerCase()
  if (
    d.includes('attack') ||
    d.includes('combat') ||
    d.includes('damage') ||
    d.includes('hit') ||
    d.includes('destroyed') ||
    d.includes('bombardment') ||
    d.includes('boarding')
  )
    return Swords
  if (d.includes('research') || d.includes('scientist') || d.includes('tech')) return FlaskConical
  if (
    d.includes('shipyard') ||
    d.includes('construction') ||
    d.includes('production') ||
    d.includes('built') ||
    d.includes('refit')
  )
    return Factory
  if (d.includes('fleet') || d.includes('ship') || d.includes('naval') || d.includes('launch') || d.includes('transit'))
    return Ship
  if (d.includes('medal') || d.includes('award')) return Medal
  if (
    d.includes('commander') ||
    d.includes('officer') ||
    d.includes('administrator') ||
    d.includes('promotion') ||
    d.includes('retire') ||
    d.includes('experience') ||
    d.includes('training')
  )
    return User
  if (d.includes('contact') || d.includes('alien') || d.includes('diplomatic') || d.includes('communication'))
    return Radio
  if (d.includes('survey') || d.includes('mineral') || d.includes('accessibility') || d.includes('deposit')) return Gem
  if (d.includes('colony') || d.includes('population') || d.includes('civilian') || d.includes('terraform'))
    return Globe
  if (d.includes('missile') || d.includes('amm') || d.includes('point defence')) return Crosshair
  if (
    d.includes('shield') ||
    d.includes('armour') ||
    d.includes('armor') ||
    d.includes('defence') ||
    d.includes('defense')
  )
    return Shield
  if (d.includes('fuel') || d.includes('sorium')) return Fuel
  if (d.includes('ground') || d.includes('formation') || d.includes('unit')) return Shield
  if (d.includes('mine') || d.includes('mining')) return Pickaxe
  if (d.includes('wealth') || d.includes('economic') || d.includes('trade')) return Building2
  if (d.includes('sensor') || d.includes('detect') || d.includes('spotted')) return Eye
  if (d.includes('message') || d.includes('interrupt')) return MessageSquare
  if (d.includes('warning') || d.includes('danger') || d.includes('critical')) return AlertTriangle
  return ScrollText
}

interface EventTypeInfo {
  id: number
  description: string
  isCustomized: boolean
  isHidden: boolean
  hasEntries: boolean
  textColor: string | null
  alertColor: string | null
}

interface GameLogEntry {
  incrementId: number
  time: number
  formattedDate: string
  eventType: number
  eventTypeName: string
  message: string
  systemId: number
  textColor: string | null
  isCustomized: boolean
}

interface GameLogResult {
  entries: GameLogEntry[]
  totalCount: number
}

const columns: ColumnDef<GameLogEntry>[] = [
  {
    accessorKey: 'formattedDate',
    header: 'Date',
    size: 80,
    cell: ({ row }) => (
      <span
        className="
          font-mono text-[9px] whitespace-nowrap text-muted-foreground/60
        "
      >
        {row.original.formattedDate}
      </span>
    ),
  },
  {
    id: 'icon',
    header: '',
    size: 20,
    cell: ({ row }) => {
      const Icon = getEventIcon(row.original.eventTypeName)
      return (
        <span style={{ color: row.original.textColor ?? 'var(--muted-foreground)' }}>
          <Icon className="size-3" />
        </span>
      )
    },
  },
  {
    accessorKey: 'eventTypeName',
    header: 'Type',
    size: 140,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="
          h-4 border-(--cic-panel-edge) px-1.5 py-0 text-[7px] whitespace-nowrap
        "
        style={
          row.original.textColor
            ? { color: row.original.textColor, borderColor: row.original.textColor + '40' }
            : { color: 'var(--cic-amber-dim)' }
        }
      >
        {row.original.eventTypeName}
      </Badge>
    ),
  },
  {
    accessorKey: 'message',
    header: 'Message',
    cell: ({ row }) => (
      <span
        className="text-[10px] leading-relaxed whitespace-normal"
        style={{
          color: row.original.textColor ?? 'var(--foreground)',
          opacity: row.original.textColor ? 1 : 0.7,
        }}
      >
        {row.original.message}
      </span>
    ),
  },
]

export function GameLogPage() {
  const [page, setPage] = useState(0)
  const [selectedTypes, setSelectedTypes] = useState<number[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [hideNonCustomized, setHideNonCustomized] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['customized']))

  const { data: eventTypes } = useEventTypes()
  const {
    data: logData,
    isLoading,
    isFetching,
  } = useGameLog(
    PAGE_SIZE,
    page * PAGE_SIZE,
    selectedTypes.length > 0 ? selectedTypes : undefined,
    hideNonCustomized || undefined,
    showHidden || undefined
  )

  const result = logData as GameLogResult | undefined
  const allEntries = result?.entries ?? []
  const totalCount = result?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const typeList = (eventTypes ?? []) as EventTypeInfo[]

  const entries = searchText
    ? allEntries.filter((entry) => entry.message.toLowerCase().includes(searchText.toLowerCase()))
    : allEntries

  const tagFilter = tagSearch.toLowerCase()
  const filteredTypes = tagFilter ? typeList.filter((t) => t.description.toLowerCase().includes(tagFilter)) : typeList
  const customizedTypes = filteredTypes.filter((t) => t.isCustomized)
  const hiddenTypesList = filteredTypes.filter((t) => t.isHidden && !t.isCustomized)
  const withEntries = filteredTypes.filter((t) => !t.isCustomized && !t.isHidden && t.hasEntries)
  const noEntries = filteredTypes.filter((t) => !t.isCustomized && !t.isHidden && !t.hasEntries)

  const toggleType = (id: number) => {
    const isAdding = !selectedTypes.includes(id)
    setSelectedTypes((prev) => (isAdding ? [...prev, id] : prev.filter((t) => t !== id)))
    // Auto-enable showHidden when selecting a hidden event type
    if (isAdding) {
      const eventType = typeList.find((t) => t.id === id)
      if (eventType?.isHidden && !showHidden) {
        setShowHidden(true)
      }
    }
    setPage(0)
  }

  const clearFilters = () => {
    setSelectedTypes([])
    setHideNonCustomized(false)
    setShowHidden(false)
    setSearchText('')
    setTagSearch('')
    setPage(0)
  }

  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex h-full flex-col bg-(--cic-void)">
      {/* Header */}
      <div
        className="
          flex shrink-0 items-center justify-between border-b
          border-(--cic-panel-edge) bg-(--cic-panel) px-4 py-2.5
        "
      >
        <div className="flex items-center gap-3">
          <ScrollText className="size-4 text-(--cic-amber)" />
          <span className="text-xs font-semibold text-foreground/80">Game Log</span>
          <span className="font-mono text-[9px] text-muted-foreground">
            {totalCount.toLocaleString()} events
            {entries.length !== allEntries.length && ` (${entries.length} shown)`}
          </span>
          {isFetching && !isLoading && (
            <Loader2
              className="size-3 animate-spin text-(--cic-cyan-dim)"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="
              h-7 w-40 border-(--cic-panel-edge) bg-(--cic-void) text-[9px]
            "
            placeholder="Search messages..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button
            size="xs"
            variant={filterOpen ? 'default' : 'ghost'}
            className={
              filterOpen
                ? `
                  border border-(--cic-cyan-dim)/30 bg-(--cic-cyan-glow)
                  text-(--cic-cyan)
                `
                : 'text-muted-foreground'
            }
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter className="size-3" />
            {selectedTypes.length > 0 && (
              <span
                className="
                  ml-1 rounded-full bg-(--cic-cyan) px-1 text-[8px]
                  text-(--cic-void)
                "
              >
                {selectedTypes.length}
              </span>
            )}
          </Button>
          <div
            className="
              flex items-center gap-1 font-mono text-[9px] text-muted-foreground
            "
          >
            <Button size="icon-xs" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-3" />
            </Button>
            <span>
              {page + 1}/{Math.max(totalPages, 1)}
            </span>
            <Button
              size="icon-xs"
              variant="ghost"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
          <DataSettingsButton invalidateKey={['empire', 'gameLog']} />
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div
          className="
            shrink-0 space-y-2 border-b border-(--cic-panel-edge)
            bg-(--cic-panel)/80 px-4 py-2.5
          "
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <EyeOff className="size-3 text-muted-foreground/60" />
                <Label className="text-[9px] text-muted-foreground">Hide non-customized</Label>
                <Switch
                  checked={hideNonCustomized}
                  onCheckedChange={(v) => {
                    setHideNonCustomized(v)
                    setPage(0)
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="size-3 text-muted-foreground/60" />
                <Label className="text-[9px] text-muted-foreground">Show hidden</Label>
                <Switch
                  checked={showHidden}
                  onCheckedChange={(v) => {
                    setShowHidden(v)
                    setPage(0)
                  }}
                />
              </div>
            </div>
            <Button
              size="xs"
              variant="ghost"
              className={`
                text-[8px] text-muted-foreground
                ${
                  selectedTypes.length > 0 || hideNonCustomized || showHidden || searchText || tagSearch
                    ? 'visible'
                    : 'invisible'
                }
              `}
              onClick={clearFilters}
            >
              Clear all
            </Button>
          </div>

          <Input
            className="h-7 border-(--cic-panel-edge) bg-(--cic-void) text-[9px]"
            placeholder="Search event types..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
          />

          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            {customizedTypes.length > 0 && (
              <div className={expandedSections.has('customized') ? 'basis-full' : ''}>
                <button
                  className="
                    flex items-center gap-1 text-[8px] text-(--cic-amber-dim)
                    transition-colors
                    hover:text-(--cic-amber)
                  "
                  onClick={() =>
                    setExpandedSections((prev) => {
                      const next = new Set(prev)
                      if (next.has('customized')) next.delete('customized')
                      else next.add('customized')
                      return next
                    })
                  }
                >
                  <ChevronDown
                    className={`
                      size-2.5 transition-transform
                      ${expandedSections.has('customized') ? '' : `-rotate-90`}
                    `}
                  />
                  Customized ({customizedTypes.length})
                </button>
                {expandedSections.has('customized') && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {customizedTypes.map((t) => {
                      const active = selectedTypes.includes(t.id)
                      return (
                        <Badge
                          key={t.id}
                          variant="outline"
                          className="
                            h-5 cursor-pointer px-2 py-0.5 text-[8px]
                            transition-all
                          "
                          style={{
                            borderColor: active ? (t.textColor ?? 'var(--cic-cyan-dim)') : 'var(--cic-panel-edge)',
                            color: active ? (t.textColor ?? 'var(--cic-cyan)') : undefined,
                            backgroundColor: active ? 'var(--cic-cyan-glow)' : undefined,
                          }}
                          onClick={() => toggleType(t.id)}
                        >
                          {t.textColor && (
                            <span className="size-1.5 shrink-0 rounded-full" style={{ background: t.textColor }} />
                          )}
                          {t.description}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {withEntries.length > 0 && (
              <div className={expandedSections.has('active') ? 'basis-full' : ''}>
                <button
                  className="
                    flex items-center gap-1 text-[8px] text-(--cic-cyan-dim)
                    transition-colors
                    hover:text-(--cic-cyan)
                  "
                  onClick={() =>
                    setExpandedSections((prev) => {
                      const next = new Set(prev)
                      if (next.has('active')) next.delete('active')
                      else next.add('active')
                      return next
                    })
                  }
                >
                  <ChevronDown
                    className={`
                      size-2.5 transition-transform
                      ${expandedSections.has('active') ? '' : `-rotate-90`}
                    `}
                  />
                  Active in Log ({withEntries.length})
                </button>
                {expandedSections.has('active') && (
                  <div
                    className="
                      mt-1 flex max-h-[120px] flex-wrap gap-1 overflow-y-auto
                    "
                  >
                    {withEntries.map((t) => {
                      const active = selectedTypes.includes(t.id)
                      return (
                        <Badge
                          key={t.id}
                          variant="outline"
                          className={`
                            h-5 cursor-pointer px-2 py-0.5 text-[8px]
                            transition-all
                            ${
                              active
                                ? `
                                  border-(--cic-cyan-dim) bg-(--cic-cyan-glow)
                                  text-(--cic-cyan)
                                `
                                : `
                                  border-(--cic-panel-edge)
                                  text-muted-foreground/60
                                  hover:text-foreground/70
                                `
                            }
                          `}
                          onClick={() => toggleType(t.id)}
                        >
                          {t.description}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {hiddenTypesList.length > 0 && (
              <div className={expandedSections.has('hidden') ? 'basis-full' : ''}>
                <button
                  className="
                    flex items-center gap-1 text-[8px] text-(--cic-red)/60
                    transition-colors
                    hover:text-(--cic-red)
                  "
                  onClick={() =>
                    setExpandedSections((prev) => {
                      const next = new Set(prev)
                      if (next.has('hidden')) next.delete('hidden')
                      else next.add('hidden')
                      return next
                    })
                  }
                >
                  <ChevronDown
                    className={`
                      size-2.5 transition-transform
                      ${expandedSections.has('hidden') ? '' : `-rotate-90`}
                    `}
                  />
                  Hidden in Aurora ({hiddenTypesList.length})
                </button>
                {expandedSections.has('hidden') && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {hiddenTypesList.map((t) => {
                      const active = selectedTypes.includes(t.id)
                      return (
                        <Badge
                          key={t.id}
                          variant="outline"
                          className={`
                            h-5 cursor-pointer px-2 py-0.5 text-[8px]
                            transition-all
                            ${
                              active
                                ? `
                                  border-(--cic-red)/40 bg-(--cic-red)/5
                                  text-(--cic-red)
                                `
                                : `
                                  border-(--cic-panel-edge)
                                  text-muted-foreground/40 line-through
                                `
                            }
                          `}
                          onClick={() => toggleType(t.id)}
                        >
                          <EyeOff className="mr-0.5 size-2.5" />
                          {t.description}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {noEntries.length > 0 && (
              <div className={expandedSections.has('all') ? 'basis-full' : ''}>
                <button
                  className="
                    flex items-center gap-1 text-[8px] text-muted-foreground/40
                    transition-colors
                    hover:text-muted-foreground/60
                  "
                  onClick={() =>
                    setExpandedSections((prev) => {
                      const next = new Set(prev)
                      if (next.has('all')) next.delete('all')
                      else next.add('all')
                      return next
                    })
                  }
                >
                  <ChevronDown
                    className={`
                      size-2.5 transition-transform
                      ${expandedSections.has('all') ? '' : `-rotate-90`}
                    `}
                  />
                  All Types ({noEntries.length})
                </button>
                {expandedSections.has('all') && (
                  <div
                    className="
                      mt-1 flex max-h-[120px] flex-wrap gap-1 overflow-y-auto
                    "
                  >
                    {noEntries.map((t) => {
                      const active = selectedTypes.includes(t.id)
                      return (
                        <Badge
                          key={t.id}
                          variant="outline"
                          className={`
                            h-4 cursor-pointer px-1.5 py-0 text-[7px]
                            transition-all
                            ${
                              active
                                ? `
                                  border-(--cic-cyan-dim) bg-(--cic-cyan-glow)
                                  text-(--cic-cyan)
                                `
                                : `
                                  border-(--cic-panel-edge)
                                  text-muted-foreground/30
                                  hover:text-muted-foreground/50
                                `
                            }
                          `}
                          onClick={() => toggleType(t.id)}
                        >
                          {t.description}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Table */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
        </div>
      ) : entries.length === 0 ? (
        <div
          className="
            flex flex-1 items-center justify-center text-[10px]
            text-muted-foreground
          "
        >
          {allEntries.length > 0 ? 'All entries hidden by filters' : 'No log entries found'}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-(--cic-panel)">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="
                    border-b border-(--cic-panel-edge)
                    hover:bg-transparent
                  "
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="
                        h-7 px-2 text-[8px] tracking-wider
                        text-muted-foreground/60 uppercase
                      "
                      style={header.column.getSize() !== 150 ? { width: header.column.getSize() } : undefined}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                    border-b border-(--cic-panel-edge)
                    hover:bg-(--cic-panel)/50
                  "
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-2 py-1.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
