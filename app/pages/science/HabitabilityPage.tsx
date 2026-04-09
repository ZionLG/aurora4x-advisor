import React, { useCallback, useMemo, useState } from 'react'
import { useHabitability } from '@/app/hooks/data'
import { DataSettingsButton } from '@/app/components/DataSettingsPanel'
import { Globe2, Loader2, Search, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { Input } from '@/app/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip'
import type { BodyHabitability, SpeciesRequirements } from '@/lib/habitability'
import { formatPopulation } from '@/lib/compute/utils'

type SortField = 'system' | 'body' | 'ground' | 'cost' | 'maxPop' | 'terraform' | 'time' | 'potential' | 'minerals'
type SortDir = 'asc' | 'desc'

function formatAmount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return Math.round(n).toLocaleString()
}

function formatPop(pop: number): string {
  if (pop >= 1000) return `${(pop / 1000).toFixed(1)}B`
  if (pop >= 1) return `${pop.toFixed(1)}M`
  if (pop >= 0.001) return `${(pop * 1000).toFixed(0)}K`
  return `${Math.round(pop * 1_000_000)}`
}

function costColor(cost: number): string {
  if (cost === 0) return 'var(--cic-green)'
  if (cost < 2) return 'var(--cic-cyan)'
  if (cost < 4) return 'var(--cic-amber)'
  return 'var(--cic-red)'
}

function terraformColor(status: string): string {
  if (status === 'Done') return 'var(--cic-green)'
  if (status === 'Yes') return 'var(--cic-green)'
  if (status.startsWith('Partial')) return 'var(--cic-cyan)'
  if (status.startsWith('Near')) return 'var(--cic-cyan)'
  if (status.startsWith('Limited')) return 'var(--cic-amber)'
  if (status.startsWith('Insufficient')) return 'var(--cic-amber-dim)'
  return 'var(--cic-red)'
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
    <button onClick={() => onSort(field)} className={`
      flex items-center gap-0.5
      ${className ?? ''}
    `}>
      <span className={active ? 'text-foreground/80' : ''}>{label}</span>
      {active && (currentDir === 'asc' ? <ChevronUp className="size-2.5" /> : <ChevronDown className="
        size-2.5
      " />)}
    </button>
  )
}

export function HabitabilityPage() {
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number>(0)
  const [terraformers, setTerraformers] = useState(10)
  const { data: rawData, isLoading, isFetching } = useHabitability(selectedSpeciesId, terraformers)

  const species = useMemo(() => (rawData?.species ?? []) as SpeciesRequirements[], [rawData])
  const allBodies = useMemo(() => (rawData?.bodies ?? []) as BodyHabitability[], [rawData])
  const selectedSpecies = species.find((s) => s.speciesId === selectedSpeciesId)

  // Auto-select first species
  if (selectedSpeciesId === 0 && species.length > 0) {
    setSelectedSpeciesId(species[0].speciesId)
  }

  const [searchText, setSearchText] = useState('')
  const [sortField, setSortField] = useState<SortField>('cost')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedSystems, setSelectedSystems] = useState<Set<string> | null>(null)

  // Filters
  const [hideNonTerraformable, setHideNonTerraformable] = useState(false)
  const [hideColonized, setHideColonized] = useState(false)
  const [hideNoMinerals, setHideNoMinerals] = useState(false)
  const [hideTerraformed, setHideTerraformed] = useState(false)
  const [hideUninhabited, setHideUninhabited] = useState(false)
  const [expandedBody, setExpandedBody] = useState<number | null>(null)
  const [toxicsExpanded, setToxicsExpanded] = useState(false)

  const availableSystems = useMemo(() => {
    const systems = new Set<string>()
    for (const body of allBodies) {
      if (body.systemName) systems.add(body.systemName)
    }
    return Array.from(systems).sort()
  }, [allBodies])

  const handleSort = useCallback((field: SortField) => {
    setSortDir((prev) => (sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : field === 'cost' ? 'asc' : 'desc'))
    setSortField(field)
  }, [sortField])

  const filtered = useMemo(() => {
    const query = searchText.toLowerCase().trim()
    return allBodies.filter((body) => {
      if (query && !body.systemName.toLowerCase().includes(query) && !body.bodyName.toLowerCase().includes(query))
        return false
      if (selectedSystems && !selectedSystems.has(body.systemName)) return false
      if (hideNonTerraformable && body.terraformable.startsWith('No')) return false
      if (hideColonized && body.hasColony) return false
      if (hideNoMinerals && body.totalMinerals === 0) return false
      if (hideTerraformed && body.colonyCost === 0) return false
      if (hideUninhabited && body.population <= 0) return false
      return true
    })
  }, [allBodies, searchText, selectedSystems, hideNonTerraformable, hideColonized, hideNoMinerals, hideTerraformed, hideUninhabited])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'system': cmp = a.systemName.localeCompare(b.systemName); break
        case 'body': cmp = a.planetNumber - b.planetNumber || a.orbitNumber - b.orbitNumber; break
        case 'ground': cmp = a.groundSurvey - b.groundSurvey; break
        case 'cost': cmp = a.colonyCost - b.colonyCost; break
        case 'maxPop': cmp = a.maxPopulation - b.maxPopulation; break
        case 'terraform': cmp = a.terraformable.localeCompare(b.terraformable); break
        case 'time': {
          const aInf = a.terraformTime < 0
          const bInf = b.terraformTime < 0
          if (aInf !== bInf) return aInf ? 1 : -1
          cmp = a.terraformTime - b.terraformTime
          break
        }
        case 'potential': cmp = a.miningPotential - b.miningPotential; break
        case 'minerals': cmp = a.totalMinerals - b.totalMinerals; break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [filtered, sortField, sortDir])

  const activeFilterCount = [hideNonTerraformable, hideColonized, hideNoMinerals, hideTerraformed, hideUninhabited].filter(Boolean).length
  const thClass = 'px-3 py-2.5 text-xs font-semibold text-muted-foreground/60 whitespace-nowrap'

  return (
    <div className="flex h-full flex-col bg-(--cic-void)">
      {/* Header */}
      <div className="
        flex shrink-0 items-center justify-between border-b
        border-(--cic-panel-edge) bg-(--cic-panel) px-4 py-2.5
      ">
        <div className="flex items-center gap-3">
          <Globe2 className="size-4 text-(--cic-cyan)" />
          <span className="text-sm font-semibold text-foreground/80">Habitability</span>
          <span className="font-mono text-xs text-muted-foreground/50">{sorted.length} bodies</span>
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
        <DataSettingsButton invalidateKey={['empire', 'habitability']} />
      </div>

      {/* Controls bar */}
      <div className="
        flex shrink-0 flex-wrap items-center gap-3 border-b
        border-(--cic-panel-edge) bg-(--cic-panel)/40 px-4 py-2
      ">
        <Select value={String(selectedSpeciesId)} onValueChange={(val) => setSelectedSpeciesId(Number(val))}>
          <SelectTrigger size="sm" className="h-7 w-44 text-xs">
            <SelectValue placeholder="Select species..." />
          </SelectTrigger>
          <SelectContent>
            {species.map((sp) => (
              <SelectItem key={sp.speciesId} value={String(sp.speciesId)}>{sp.speciesName} ({formatPopulation(sp.totalPopulation ?? 0)})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="
          flex items-center gap-1.5 text-xs text-muted-foreground/60
        ">
          <span>Terraformers:</span>
          <Input
            type="number"
            value={terraformers}
            onChange={(e) => setTerraformers(Math.max(1, Number(e.target.value) || 1))}
            className="h-7! min-h-0! w-16 px-1.5! py-0! text-xs! shadow-none!"
          />
          {selectedSpecies && (
            <span className="text-muted-foreground/40">@ {selectedSpecies.terraformingRate} rate</span>
          )}
        </div>

        <div className="
          flex items-center gap-1.5 rounded-sm border border-(--cic-panel-edge)
          bg-(--cic-void)/40 px-2 py-1
        ">
          <Search className="size-3 text-muted-foreground/40" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search..."
            className="
              w-28 bg-transparent text-xs text-foreground/70
              placeholder:text-muted-foreground/30
              focus:outline-none
            "
          />
        </div>

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
              <button onClick={() => setSelectedSystems(null)} className="
                flex-1 rounded-sm bg-foreground/5 px-2 py-1 text-[10px]
                hover:bg-foreground/10
              ">All</button>
              <button onClick={() => setSelectedSystems(new Set())} className="
                flex-1 rounded-sm bg-foreground/5 px-2 py-1 text-[10px]
                hover:bg-foreground/10
              ">None</button>
            </div>
            <div className="max-h-48 overflow-auto">
              {availableSystems.map((sys) => (
                <label key={sys} className="
                  flex cursor-pointer items-center gap-2 rounded-sm p-1
                  hover:bg-foreground/5
                ">
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

        <Popover>
          <PopoverTrigger asChild>
            <button className="
              flex h-7 items-center gap-1.5 rounded-md border border-input
              bg-transparent px-2.5 text-xs shadow-xs
              hover:bg-accent
            ">
              <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <label className="
              flex cursor-pointer items-center gap-2 rounded-sm p-1.5
              hover:bg-foreground/5
            ">
              <Switch checked={hideNonTerraformable} onCheckedChange={setHideNonTerraformable} />
              <span className="text-xs">Hide non-terraformable</span>
            </label>
            <label className="
              flex cursor-pointer items-center gap-2 rounded-sm p-1.5
              hover:bg-foreground/5
            ">
              <Switch checked={hideNoMinerals} onCheckedChange={setHideNoMinerals} />
              <span className="text-xs">Hide without minerals</span>
            </label>
            <div className="my-1 border-t border-(--cic-panel-edge)" />
            <label className="
              flex cursor-pointer items-center gap-2 rounded-sm p-1.5
              hover:bg-foreground/5
            ">
              <Switch checked={hideColonized} onCheckedChange={setHideColonized} />
              <span className="text-xs">Hide own populations</span>
            </label>
            <label className="
              flex cursor-pointer items-center gap-2 rounded-sm p-1.5
              hover:bg-foreground/5
            ">
              <Switch checked={hideUninhabited} onCheckedChange={setHideUninhabited} />
              <span className="text-xs">Hide uninhabited</span>
            </label>
            <div className="my-1 border-t border-(--cic-panel-edge)" />
            <label className="
              flex cursor-pointer items-center gap-2 rounded-sm p-1.5
              hover:bg-foreground/5
            ">
              <Switch checked={hideTerraformed} onCheckedChange={setHideTerraformed} />
              <span className="text-xs">Hide terraformed</span>
            </label>
          </PopoverContent>
        </Popover>
      </div>

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
          <Globe2 className="size-6 text-muted-foreground/20" />
          <span className="text-xs">{selectedSpeciesId ? 'No bodies match filters' : 'Select a species to analyze habitability'}</span>
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
                  <SortHeader label="Ground" field="ground" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <SortHeader label="Colony Cost" field="cost" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <SortHeader label="Max Pop (M)" field="maxPop" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <SortHeader label="Terraform" field="terraform" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <SortHeader label="Time (Y)" field="time" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <SortHeader label="Potential" field="potential" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
                <th className={`
                  ${thClass}
                  text-center
                `}>
                  <SortHeader label="Minerals" field="minerals" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="
                    w-full justify-center
                  " />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((body) => {
                const isExpanded = expandedBody === body.systemBodyId
                const plan = body.terraformPlan
                return (
                <React.Fragment key={body.systemBodyId}>
                <tr
                  className="
                    cursor-pointer border-b border-(--cic-panel-edge)/20
                    transition-colors
                    hover:bg-foreground/3
                  "
                  onClick={() => setExpandedBody(isExpanded ? null : body.systemBodyId)}
                >
                  <td className="p-3 text-foreground/60">{body.systemName}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {body.hasColony && <MapPin className="
                        size-2.5 text-(--cic-cyan-dim)
                      " />}
                      <span className="text-foreground/70">{body.bodyName || `${body.planetNumber}-${body.orbitNumber}`}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {body.groundSurvey > 0
                      ? <span className="text-(--cic-green)">M{body.groundSurvey}</span>
                      : <span className="text-(--cic-red)">✗</span>}
                  </td>
                  <td className="p-3 text-center font-mono font-medium" style={{ color: costColor(body.colonyCost) }}>
                    {body.colonyCost.toFixed(2)}{body.lowGravity && <span className="
                      ml-1 text-[10px] text-muted-foreground/50
                    ">(LG)</span>}
                  </td>
                  <td className="p-3 text-center font-mono text-foreground/60">
                    {body.population > 0 && (
                      <span className="text-(--cic-cyan-dim)">{formatPopulation(body.population)} / </span>
                    )}
                    {formatPop(body.maxPopulation)}
                  </td>
                  <td className="p-3 text-center font-semibold" style={{ color: terraformColor(body.terraformable) }}>
                    {body.terraformable}
                    {body.terraformPlan && (
                      <ChevronDown className={`
                        ml-0.5 inline size-3 transition-transform
                        ${isExpanded ? `rotate-180` : ''}
                      `} />
                    )}
                  </td>
                  <td className="p-3 text-center font-mono text-foreground/60">
                    {body.terraformTime === 0 ? '—' : body.terraformTime > 0 ? body.terraformTime.toFixed(1) : '∞'}
                  </td>
                  <td className="p-3 text-center font-mono text-foreground/60">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>{Math.round(body.miningPotential)}</TooltipTrigger>
                        <TooltipContent>{body.miningPotential.toFixed(3)}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="p-3 text-center font-mono text-foreground/50">
                    {body.totalMinerals > 0 ? formatAmount(body.totalMinerals) : '—'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="
                    border-b border-(--cic-panel-edge)/20 bg-(--cic-panel)/40
                  ">
                    <td colSpan={10} className="p-4">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        <div className="
                          col-span-2 mb-2 text-sm font-semibold
                          text-foreground/70
                        ">
                          Terraforming Blueprint — {body.bodyName || `${body.planetNumber}-${body.orbitNumber}`}
                        </div>

                        <div className="text-muted-foreground/50">Current Temperature</div>
                        <div className="font-mono">{Math.round(body.surfaceTemp)} K ({(body.surfaceTemp - 273.15).toFixed(1)}°C)</div>

                        <div className="text-muted-foreground/50">Current Gravity</div>
                        <div className="font-mono">{body.gravity.toFixed(2)} g</div>

                        <div className="text-muted-foreground/50">Current Atmosphere</div>
                        <div className="font-mono">{body.atmosPress.toFixed(3)} atm</div>

                        <div className="text-muted-foreground/50">Current Hydro Coverage</div>
                        <div className="font-mono">{body.hydroExt.toFixed(1)}%</div>

                        {plan && (
                          <>
                            <div className="
                              col-span-2 mt-3 mb-1 border-t
                              border-(--cic-panel-edge)/30 pt-2 font-semibold
                              text-foreground/60
                            ">
                              Target State {plan.isPartial && <span className="
                                text-(--cic-amber)
                              ">(Partial)</span>}
                            </div>

                            <div className="text-muted-foreground/50">Target Temperature</div>
                            <div className="font-mono">{Math.round(plan.targetTemp)} K ({(plan.targetTemp - 273.15).toFixed(1)}°C)</div>

                            <div className="text-muted-foreground/50">Target Pressure</div>
                            <div className="font-mono">{plan.targetPressure.toFixed(3)} atm</div>

                            <div className="text-muted-foreground/50">Target Hydro Coverage</div>
                            <div className="font-mono">{plan.targetHydroExt.toFixed(1)}%</div>

                            <div className="
                              col-span-2 mt-3 mb-1 border-t
                              border-(--cic-panel-edge)/30 pt-2 font-semibold
                              text-foreground/60
                            ">
                              Terraforming Instructions
                            </div>

                            {plan.toxicTime > 0 && (
                              <>
                                <div
                                  className="cursor-pointer text-(--cic-red)"
                                  onClick={(e) => { e.stopPropagation(); setToxicsExpanded(!toxicsExpanded) }}
                                >
                                  Remove all toxic gases {plan.toxics.length > 0 && <ChevronDown className={`
                                    inline size-3 transition-transform
                                    ${toxicsExpanded ? `rotate-180` : ''}
                                  `} />}
                                </div>
                                <div className="font-mono text-foreground/60">~{plan.toxicTime.toFixed(1)} years</div>
                                {toxicsExpanded && plan.toxics.map(({ gasName, atm, time }) => (
                                  <React.Fragment key={gasName}>
                                    <div className="pl-4 text-foreground/50">Set <span className="
                                      font-semibold text-(--cic-red)
                                    ">{gasName}</span> to <span className="
                                      font-mono font-semibold
                                    ">0</span> maximum atm.</div>
                                    <div className="
                                      pl-4 font-mono text-foreground/40
                                    ">~{time.toFixed(1)} years (current: {atm.toFixed(3)} atm)</div>
                                  </React.Fragment>
                                ))}
                              </>
                            )}
                            {plan.waterVapourTime > 0 && (
                              <>
                                <div>Set <span className="
                                  font-semibold text-blue-300
                                ">Water Vapour</span> to <span className="
                                  font-mono font-semibold
                                ">{plan.waterVapourTarget.toFixed(2)}</span> maximum atm.</div>
                                <div className="font-mono text-foreground/60">~{plan.waterVapourTime.toFixed(1)} years</div>
                              </>
                            )}
                            {plan.hydroExtTime > 0 && (
                              <>
                                <div className="text-foreground/60">Then wait for natural condensation to adjust hydrosphere to {plan.targetHydroExt.toFixed(0)}%.</div>
                                <div className="font-mono text-foreground/60">~{plan.hydroExtTime.toFixed(1)} years</div>
                              </>
                            )}
                            {plan.breathableTime > 0 && (
                              <>
                                <div>Set <span className="
                                  font-semibold text-(--cic-cyan)
                                ">{plan.breathableName}</span> to <span className="
                                  font-mono font-semibold
                                ">{plan.breathableTarget.toFixed(2)}</span> maximum atm.</div>
                                <div className="font-mono text-foreground/60">~{plan.breathableTime.toFixed(1)} years</div>
                              </>
                            )}
                            {plan.greenhouseTime > 0 && (
                              <>
                                <div>Set <span className="
                                  font-semibold text-(--cic-amber)
                                ">{plan.greenhouseName}</span> to <span className="
                                  font-mono font-semibold
                                ">{plan.greenhouseTarget.toFixed(2)}</span> maximum atm.</div>
                                <div className="font-mono text-foreground/60">~{plan.greenhouseTime.toFixed(1)} years</div>
                              </>
                            )}
                            {plan.antiGreenhouseTime > 0 && (
                              <>
                                <div>Set <span className="
                                  font-semibold text-blue-400
                                ">{plan.antiGreenhouseName}</span> to <span className="
                                  font-mono font-semibold
                                ">{plan.antiGreenhouseTarget.toFixed(2)}</span> maximum atm.</div>
                                <div className="font-mono text-foreground/60">~{plan.antiGreenhouseTime.toFixed(1)} years</div>
                              </>
                            )}
                            {plan.neutralTime > 0 && (
                              <>
                                <div>Set <span className="
                                  font-semibold text-foreground/70
                                ">{plan.neutralName}</span> to <span className="
                                  font-mono font-semibold
                                ">{plan.neutralTarget.toFixed(2)}</span> maximum atm.</div>
                                <div className="font-mono text-foreground/60">~{plan.neutralTime.toFixed(1)} years</div>
                              </>
                            )}
                          </>
                        )}

                        {!plan && body.colonyCost > 0 && (
                          <div className="
                            col-span-2 mt-2 text-muted-foreground/40
                          ">
                            No viable terraforming plan — body cannot be made habitable for this species.
                          </div>
                        )}

                        {body.colonyCost === 0 && (
                          <div className="col-span-2 mt-2 text-(--cic-green)">
                            Already habitable — no terraforming needed.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
