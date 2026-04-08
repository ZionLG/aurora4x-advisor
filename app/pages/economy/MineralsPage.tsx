import { useCallback, useMemo, useState } from 'react'
import { useMinerals } from '@/app/hooks/data'
import { DataSettingsButton } from '@/app/components/DataSettingsPanel'
import { Gem, Loader2, Search, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Input } from '@/app/components/ui/input'
import { Switch } from '@/app/components/ui/switch'
import { Slider } from '@/app/components/ui/slider'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip'
import { Checkbox } from '@/app/components/ui/checkbox'
import { MINERAL_NAMES, MINERAL_IDS, type BodyMinerals } from '@/lib/minerals'

type SortField = 'system' | 'body' | 'potential' | 'ground' | 'total' | 'totalAcc' | number
type SortDir = 'asc' | 'desc'

interface FilterRule {
  material: 'any' | 'all-present' | number
  accRange: [number, number] // 0-100 scale
  minQty: number
}


function accColor(acc: number): string {
  if (acc > 0.7) return 'var(--cic-green)'
  if (acc > 0.4) return 'var(--cic-amber)'
  if (acc > 0.2) return 'var(--cic-amber-dim)'
  return 'var(--cic-red)'
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return Math.round(amount).toLocaleString()
}

function matchesRule(body: BodyMinerals, rule: FilterRule): boolean {
  const minAcc = rule.accRange[0] / 100
  const maxAcc = rule.accRange[1] / 100
  const inRange = (dep: { accessibility: number; amount: number }) =>
    dep.accessibility >= minAcc && dep.accessibility <= maxAcc && dep.amount >= rule.minQty

  if (rule.material === 'any') {
    for (const [, dep] of body.minerals) {
      if (inRange(dep)) return true
    }
    return minAcc === 0 && maxAcc >= 1 && rule.minQty === 0
  }
  if (rule.material === 'all-present') {
    for (const [, dep] of body.minerals) {
      if (!inRange(dep)) return false
    }
    return body.minerals.size > 0
  }
  const dep = body.minerals.get(rule.material)
  if (!dep) return false
  return inRange(dep)
}

function SortHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string
  field: SortField
  currentSort: SortField
  currentDir: SortDir
  onSort: (field: SortField) => void
  className?: string
}) {
  const active = currentSort === field
  return (
    <button
      onClick={() => onSort(field)}
      className={`
        flex items-center gap-0.5
        ${className ?? ''}
      `}
    >
      <span className={active ? 'text-foreground/80' : ''}>{label}</span>
      {active && (currentDir === 'asc' ? <ChevronUp className="size-2.5" /> : <ChevronDown className="
        size-2.5
      " />)}
    </button>
  )
}

export function MineralsPage() {
  const { data: rawData, isLoading, isFetching } = useMinerals()

  // Deserialize: Map doesn't survive IPC, comes as plain object
  const allBodies = useMemo(() => {
    if (!rawData) return [] as BodyMinerals[]
    return (rawData as BodyMinerals[]).map((body) => ({
      ...body,
      minerals: body.minerals instanceof Map
        ? body.minerals
        : new Map(Object.entries(body.minerals as Record<string, unknown>).map(
            ([k, v]) => [Number(k), v as BodyMinerals['minerals'] extends Map<number, infer V> ? V : never]
          )),
    }))
  }, [rawData])

  const [searchText, setSearchText] = useState('')
  const [filterRules, setFilterRules] = useState<FilterRule[]>([
    { material: 'any', accRange: [0, 100], minQty: 0 },
  ])
  const [sortField, setSortField] = useState<SortField>('total')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showColonized, setShowColonized] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<number>>(new Set(MINERAL_IDS))
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [selectedSystems, setSelectedSystems] = useState<Set<string> | null>(null) // null = all
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [isolateSelected, setIsolateSelected] = useState(false)

  // Unique systems from data
  const availableSystems = useMemo(() => {
    const systems = new Set<string>()
    for (const body of allBodies) {
      if (body.systemName) systems.add(body.systemName)
    }
    return Array.from(systems).sort()
  }, [allBodies])

  const toggleRow = useCallback((bodyId: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(bodyId)) next.delete(bodyId)
      else next.add(bodyId)
      return next
    })
  }, [])

  const toggleColumn = useCallback((id: number) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const addRule = useCallback(() => {
    setFilterRules((prev) => [...prev, { material: 'any', accRange: [0, 100], minQty: 0 }])
  }, [])

  const removeRule = useCallback((index: number) => {
    setFilterRules((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)
  }, [])

  const updateRule = useCallback((index: number, update: Partial<FilterRule>) => {
    setFilterRules((prev) => prev.map((rule, i) => i === index ? { ...rule, ...update } : rule))
  }, [])

  const handleSort = useCallback((field: SortField) => {
    setSortDir((prev) => (sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'))
    setSortField(field)
  }, [sortField])

  const filtered = useMemo(() => {
    const query = searchText.toLowerCase().trim()
    return allBodies.filter((body) => {
      if (query && !body.systemName.toLowerCase().includes(query) && !body.bodyName.toLowerCase().includes(query))
        return false

      if (showColonized && !body.hasColony) return false

      if (selectedSystems && !selectedSystems.has(body.systemName)) return false

      if (isolateSelected && !selectedRows.has(body.systemBodyId)) return false

      for (const rule of filterRules) {
        if (!matchesRule(body, rule)) return false
      }

      return true
    })
  }, [allBodies, searchText, filterRules, showColonized, selectedSystems, isolateSelected, selectedRows])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === 'system') {
        cmp = a.systemName.localeCompare(b.systemName)
      } else if (sortField === 'body') {
        cmp = a.planetNumber - b.planetNumber || a.orbitNumber - b.orbitNumber
      } else if (sortField === 'potential') {
        cmp = a.potential - b.potential
      } else if (sortField === 'ground') {
        cmp = a.groundSurvey - b.groundSurvey
      } else if (sortField === 'total') {
        cmp = a.totalAmount - b.totalAmount
      } else if (sortField === 'totalAcc') {
        cmp = a.totalAccessibility - b.totalAccessibility
      } else {
        // Sort by specific mineral amount
        const aVal = a.minerals.get(sortField)?.amount ?? 0
        const bVal = b.minerals.get(sortField)?.amount ?? 0
        cmp = aVal - bVal
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [filtered, sortField, sortDir])

  const thClass = 'px-3 py-2.5 text-xs font-semibold text-muted-foreground/60 whitespace-nowrap'

  return (
    <div className="flex h-full flex-col bg-(--cic-void)">
      {/* Header */}
      <div className="
        flex shrink-0 items-center justify-between border-b
        border-(--cic-panel-edge) bg-(--cic-panel) px-4 py-2.5
      ">
        <div className="flex items-center gap-3">
          <Gem className="size-4 text-(--cic-cyan)" />
          <span className="text-sm font-semibold text-foreground/80">Minerals</span>
          <span className="font-mono text-xs text-muted-foreground/50">
            {sorted.length} bodies
          </span>
          <span className="
            rounded-sm bg-(--cic-amber)/10 px-1.5 py-0.5 text-[9px]
            text-(--cic-amber-dim)
          ">
            Offline — save game to refresh
          </span>
          {isFetching && !isLoading && <Loader2 className="
            size-3 animate-spin text-(--cic-cyan-dim)
          " />}
        </div>
        <DataSettingsButton invalidateKey={['empire', 'minerals']} />
      </div>

      {/* Collapsible Filters Panel */}
      <div className="
        shrink-0 border-b border-(--cic-panel-edge) bg-(--cic-panel)/60
      ">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="
            flex w-full items-center justify-between px-4 py-2 text-xs
            font-semibold text-foreground/70 transition-colors
            hover:bg-foreground/3
          "
        >
          <span>Filters</span>
          <ChevronDown className={`
            size-3.5 transition-transform
            ${filtersOpen ? '' : `-rotate-90`}
          `} />
        </button>

        {filtersOpen && (
          <div className="space-y-3 px-4 pt-1 pb-4">
            {/* Mineral toggle pills */}
            <div className="flex flex-wrap gap-1.5 py-1">
              {MINERAL_IDS.map((id) => {
                const active = visibleColumns.has(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleColumn(id)}
                    className={`
                      rounded-sm px-2 py-0.5 text-[10px] font-semibold
                      tracking-wide uppercase transition-all
                      ${active
                        ? `
                          border border-(--cic-cyan)/30 bg-(--cic-cyan)/15
                          text-(--cic-cyan)
                        `
                        : `
                          border border-transparent bg-foreground/5
                          text-muted-foreground/40
                          hover:bg-foreground/8
                        `}
                    `}
                  >
                    {MINERAL_NAMES[id]}
                  </button>
                )
              })}
            </div>

            {/* Filter rules */}
            <div className="space-y-1.5">
              {filterRules.map((rule, index) => (
                <div key={index} className="
                  flex items-center gap-2 rounded-md border
                  border-(--cic-panel-edge) bg-(--cic-void)/30 px-2.5 py-1.5
                ">
                  {filterRules.length > 1 && (
                    <button
                      onClick={() => removeRule(index)}
                      className="
                        text-muted-foreground/30
                        hover:text-(--cic-red)
                      "
                    >
                      <span className="text-base leading-none">−</span>
                    </button>
                  )}

                  <Select
                    value={String(rule.material)}
                    onValueChange={(val) => updateRule(index, {
                      material: val === 'any' || val === 'all-present' ? val : Number(val),
                    })}
                  >
                    <SelectTrigger size="sm" className="h-6 w-28 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="all-present">All present</SelectItem>
                      {MINERAL_IDS.map((id) => (
                        <SelectItem key={id} value={String(id)}>{MINERAL_NAMES[id]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-[10px] text-muted-foreground/40">acc</span>
                  <span className="w-6 text-center font-mono text-[10px]">{(rule.accRange[0] / 100).toFixed(1)}</span>
                  <Slider
                    value={rule.accRange}
                    onValueChange={(val) => updateRule(index, { accRange: val as [number, number] })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-24"
                  />
                  <span className="w-6 text-center font-mono text-[10px]">{(rule.accRange[1] / 100).toFixed(1)}</span>

                  <span className="text-[10px] text-muted-foreground/40">qty ≥</span>
                  <Input
                    type="number"
                    value={rule.minQty || ''}
                    onChange={(e) => updateRule(index, { minQty: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="
                      h-6! min-h-0! w-16 px-1.5! py-0! text-[11px]! shadow-none!
                    "
                  />
                </div>
              ))}
              <button
                onClick={addRule}
                className="
                  flex size-6 items-center justify-center rounded-md border
                  border-(--cic-cyan-dim)/30 text-(--cic-cyan-dim)
                  transition-colors
                  hover:bg-(--cic-cyan-glow) hover:text-(--cic-cyan)
                "
              >
                <span className="text-base leading-none">+</span>
              </button>
            </div>

            {/* System filter + search + options */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="
                flex items-center gap-1.5 rounded-sm border
                border-(--cic-panel-edge) bg-(--cic-void)/40 px-2 py-1
              ">
                <Search className="size-3 text-muted-foreground/40" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search system or body..."
                  className="
                    w-36 bg-transparent text-xs text-foreground/70
                    placeholder:text-muted-foreground/30
                    focus:outline-none
                  "
                />
              </div>

              {/* System multi-select */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="
                    flex h-7 items-center gap-1.5 rounded-md border border-input
                    bg-transparent px-2.5 text-xs shadow-xs
                    hover:bg-accent
                  ">
                    <MapPin className="size-3 text-muted-foreground" />
                    <span>{selectedSystems ? `${selectedSystems.size} systems` : 'All systems'}</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="mb-2 flex gap-1">
                    <button
                      onClick={() => setSelectedSystems(null)}
                      className="
                        flex-1 rounded-sm bg-foreground/5 px-2 py-1 text-[10px]
                        hover:bg-foreground/10
                      "
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedSystems(new Set())}
                      className="
                        flex-1 rounded-sm bg-foreground/5 px-2 py-1 text-[10px]
                        hover:bg-foreground/10
                      "
                    >
                      None
                    </button>
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {availableSystems.map((sys) => (
                      <label
                        key={sys}
                        className="
                          flex cursor-pointer items-center gap-2 rounded-sm p-1
                          hover:bg-foreground/5
                        "
                      >
                        <Checkbox
                          checked={!selectedSystems || selectedSystems.has(sys)}
                          onCheckedChange={() => {
                            setSelectedSystems((prev) => {
                              const current = prev ?? new Set(availableSystems)
                              const next = new Set(current)
                              if (next.has(sys)) next.delete(sys)
                              else next.add(sys)
                              return next.size === availableSystems.length ? null : next
                            })
                          }}
                        />
                        <span className="text-xs">{sys}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <label className="
                flex items-center gap-1.5 text-xs text-muted-foreground/60
              ">
                <Switch checked={showColonized} onCheckedChange={setShowColonized} />
                Colonized only
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Selection bar */}
      {selectedRows.size > 0 && (
        <div className="
          flex shrink-0 items-center gap-3 border-b border-(--cic-panel-edge)
          bg-(--cic-panel)/80 px-4 py-1.5
        ">
          <span className="text-xs text-foreground/60">{selectedRows.size} selected</span>
          <button
            onClick={() => setIsolateSelected(!isolateSelected)}
            className={`
              rounded-sm border px-2.5 py-1 text-[11px] font-semibold
              transition-colors
              ${isolateSelected
                ? 'border-(--cic-cyan)/30 bg-(--cic-cyan)/10 text-(--cic-cyan)'
                : `
                  border-input text-foreground/60
                  hover:bg-accent
                `}
            `}
          >
            {isolateSelected ? 'Showing selected' : 'Isolate'}
          </button>
          <button
            onClick={() => { setSelectedRows(new Set()); setIsolateSelected(false) }}
            className="
              text-[11px] text-muted-foreground/50
              hover:text-foreground/60
            "
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="
          flex flex-1 flex-col items-center justify-center gap-2
          text-muted-foreground
        ">
          <Gem className="size-6 text-muted-foreground/20" />
          <span className="text-xs">No mineral deposits match filters</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-(--cic-panel)">
              <tr className="border-b border-(--cic-panel-edge)">
                <th className={`
                  ${thClass}
                  w-0
                `}>
                  <Checkbox
                    checked={sorted.length > 0 && sorted.every((b) => selectedRows.has(b.systemBodyId))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRows(new Set(sorted.map((b) => b.systemBodyId)))
                      } else {
                        setSelectedRows(new Set())
                      }
                    }}
                  />
                </th>
                <th className={`
                  ${thClass}
                  w-0
                `}>
                  <SortHeader label="System" field="system" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className={`
                  ${thClass}
                  w-0
                `}>
                  <SortHeader label="Body" field="body" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </th>
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <SortHeader label="Potential⁽ˀ⁾" field="potential" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                            w-full justify-center
                          " />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Potential calculated for all listed minerals, including empty columns.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </th>
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <SortHeader label="Ground" field="ground" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
                {MINERAL_IDS.filter((id) => visibleColumns.has(id)).map((id) => (
                  <th key={id} className={`
                    ${thClass}
                    text-center
                  `} title={MINERAL_NAMES[id]}>
                    <SortHeader
                      label={MINERAL_NAMES[id]}
                      field={id}
                      currentSort={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="w-full justify-center"
                    />
                  </th>
                ))}
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <SortHeader label="Total" field="total" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <SortHeader label="Total Acc" field="totalAcc" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((body) => (
                <tr
                  key={body.systemBodyId}
                  className="
                    border-b border-(--cic-panel-edge)/20 transition-colors
                    hover:bg-foreground/3
                  "
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selectedRows.has(body.systemBodyId)}
                      onCheckedChange={() => toggleRow(body.systemBodyId)}
                    />
                  </td>
                  <td className="p-3 text-foreground/60">
                    {body.systemName}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {body.hasColony && <MapPin className="
                        size-2.5 text-(--cic-cyan-dim)
                      " />}
                      <span className="text-foreground/70">{body.bodyName || `${body.planetNumber}-${body.orbitNumber}`}</span>
                    </div>
                  </td>
                  <td className="
                    p-3 text-center font-mono text-xs font-medium
                    text-foreground/70
                  ">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>{Math.round((body.potential * 10) / ((Math.PI / 2) * 11))}</TooltipTrigger>
                        <TooltipContent>{body.potential.toFixed(3)}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="p-3 text-center">
                    {body.groundSurvey > 0
                      ? <span className="text-(--cic-green)">M{body.groundSurvey}</span>
                      : <span className="text-(--cic-red)">✗</span>}
                  </td>
                  {MINERAL_IDS.filter((id) => visibleColumns.has(id)).map((id) => {
                    const dep = body.minerals.get(id)
                    if (!dep || dep.amount < 1) {
                      return <td key={id} className="
                        p-3 text-center text-muted-foreground/15
                      ">—</td>
                    }
                    return (
                      <td key={id} className="p-3 text-center">
                        <div className="text-xs font-medium text-foreground/70">
                          {formatAmount(dep.amount)}
                        </div>
                        <div className="font-mono text-[10px]" style={{ color: accColor(dep.accessibility) }}>
                          {dep.accessibility.toFixed(2)}
                        </div>
                      </td>
                    )
                  })}
                  <td className="
                    p-3 text-center font-mono text-xs font-medium
                    text-foreground/70
                  ">
                    {formatAmount(body.totalAmount)}
                  </td>
                  <td className="
                    p-3 text-center font-mono text-xs font-medium
                    text-foreground/70
                  ">
                    {body.totalAccessibility.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
