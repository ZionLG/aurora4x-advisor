import { useCallback, useMemo, useState } from 'react'
import { useTechTree } from '@/app/hooks/data'
import { DataSettingsButton } from '@/app/components/DataSettingsPanel'
import {
  FlaskConical,
  Loader2,
  Search,
  ChevronDown,
  Check,
  Clock,
  Zap,
  Lock,
  Sparkles,
} from 'lucide-react'
import type { Technology, ResearchField } from '@/lib/tech-tree/types'

const STATUS_CONFIG = {
  researched: { color: 'var(--cic-green)', label: 'Researched', icon: Check },
  'in-progress': { color: 'var(--cic-amber)', label: 'In Progress', icon: Clock },
  available: { color: 'var(--cic-cyan)', label: 'Available', icon: Zap },
  locked: { color: 'var(--muted-foreground)', label: 'Locked', icon: Lock },
} as const

const FIELD_COLORS: Record<string, string> = {
  PP: '#e06050',
  SC: '#50a0e0',
  EW: '#e0a040',
  MK: '#60c060',
  CP: '#c070d0',
  LG: '#e07080',
  DS: '#50c0a0',
  BG: '#a0b060',
  GC: '#d09050',
}

function formatCost(cost: number): string {
  if (cost >= 1_000_000) return `${(cost / 1_000_000).toFixed(1)}M`
  if (cost >= 1_000) return `${(cost / 1_000).toFixed(0)}K`
  return `${cost}`
}

// ── Field sidebar ───────────────────────────────────────────────────

function FieldTab({
  field,
  active,
  onClick,
}: {
  field: ResearchField
  active: boolean
  onClick: () => void
}) {
  const pct = field.total > 0 ? (field.researched / field.total) * 100 : 0
  const color = FIELD_COLORS[field.abbreviation] ?? 'var(--muted-foreground)'

  return (
    <button
      onClick={onClick}
      className={`
        flex w-full items-center gap-2 px-2.5 py-2 text-left transition-all
        ${active ? 'bg-foreground/8' : 'hover:bg-foreground/4'}
      `}
      style={{
        borderLeft: `3px solid ${active ? color : 'transparent'}`,
        background: active ? `color-mix(in srgb, ${color} 6%, transparent)` : undefined,
      }}
    >
      <span
        className="
          flex size-5 shrink-0 items-center justify-center rounded-sm text-[8px]
          font-bold text-white shadow-sm
        "
        style={{ background: color }}
      >
        {field.abbreviation}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-foreground/80">{field.name}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <div className="
            h-1 flex-1 overflow-hidden rounded-full bg-foreground/8
          ">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
          <span className="
            shrink-0 font-mono text-[9px] text-muted-foreground/60
          ">
            {field.researched}/{field.total}
          </span>
        </div>
      </div>
    </button>
  )
}

// ── Tech type group ─────────────────────────────────────────────────

function TechTypeGroup({
  typeName,
  techs,
  techMap,
  fieldAbbrev,
  fieldColor,
}: {
  typeName: string
  techs: Technology[]
  techMap: Map<number, Technology>
  fieldAbbrev: string
  fieldColor: string
}) {
  const [open, setOpen] = useState(() => {
    return techs.some((t) => t.status === 'in-progress' || t.status === 'available')
  })
  const researchedCount = techs.filter((t) => t.status === 'researched').length
  const inProgressCount = techs.filter((t) => t.status === 'in-progress').length
  const availableCount = techs.filter((t) => t.status === 'available').length
  const allResearched = researchedCount === techs.length
  const pct = techs.length > 0 ? (researchedCount / techs.length) * 100 : 0

  return (
    <div
      className="overflow-hidden rounded-sm border border-(--cic-panel-edge)/60"
      style={{ opacity: allResearched ? 0.5 : 1 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="
          flex w-full items-center gap-1.5 bg-(--cic-panel)/80 px-2.5 py-2
          text-left transition-colors
          hover:bg-(--cic-panel)
        "
      >
        <ChevronDown
          className={`
            size-3 shrink-0 text-muted-foreground/40 transition-transform
            ${open ? '' : '-rotate-90'}
          `}
        />
        <span
          className="
            flex size-4 shrink-0 items-center justify-center rounded-[2px]
            text-[6px] font-bold text-white/80
          "
          style={{ background: fieldColor }}
        >
          {fieldAbbrev}
        </span>
        <span className="flex-1 text-xs font-semibold text-foreground/75">{typeName}</span>
        <div className="flex items-center gap-1.5">
          {inProgressCount > 0 && (
            <span className="
              size-1.5 animate-pulse rounded-full bg-(--cic-amber)
            " />
          )}
          {availableCount > 0 && (
            <span
              className="font-mono text-[9px] font-bold"
              style={{ color: STATUS_CONFIG.available.color }}
            >
              {availableCount}
            </span>
          )}
          <div className="h-1 w-10 overflow-hidden rounded-full bg-foreground/8">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: fieldColor, opacity: 0.6 }}
            />
          </div>
          <span className="font-mono text-[8px] text-muted-foreground/40">
            {researchedCount}/{techs.length}
          </span>
        </div>
      </button>
      {open && (
        <div>
          {techs.map((tech) => (
            <TechRow key={tech.id} tech={tech} techMap={techMap} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Individual tech row ─────────────────────────────────────────────

function TechRow({ tech, techMap }: { tech: Technology; techMap: Map<number, Technology> }) {
  const config = STATUS_CONFIG[tech.status]
  const Icon = config.icon
  const isAvailable = tech.status === 'available'
  const isInProgress = tech.status === 'in-progress'
  const isResearched = tech.status === 'researched'
  const isLocked = tech.status === 'locked'
  const [expanded, setExpanded] = useState(false)

  const showDescriptionInline = isAvailable || isInProgress
  const hasExpandableDesc = isResearched && !!tech.description

  const prereqNames: string[] = []
  if (tech.prerequisite1) {
    const pre = techMap.get(tech.prerequisite1)
    prereqNames.push(pre?.name ?? `#${tech.prerequisite1}`)
  }
  if (tech.prerequisite2) {
    const pre = techMap.get(tech.prerequisite2)
    prereqNames.push(pre?.name ?? `#${tech.prerequisite2}`)
  }

  return (
    <div
      className="border-t border-(--cic-panel-edge)/20"
      style={{
        borderLeft: `2px solid ${config.color}`,
        opacity: isLocked ? 0.4 : 1,
        background: isAvailable
          ? 'color-mix(in srgb, var(--cic-cyan) 4%, transparent)'
          : isInProgress
            ? 'color-mix(in srgb, var(--cic-amber) 3%, transparent)'
            : tech.ruinOnly
              ? 'color-mix(in srgb, #a855f7 3%, transparent)'
              : 'transparent',
      }}
    >
      <div
        className={`
          flex items-center gap-2.5 px-3 py-2.5
          ${hasExpandableDesc ? `
            cursor-pointer
            hover:bg-foreground/3
          ` : ''}
        `}
        onClick={hasExpandableDesc ? () => setExpanded(!expanded) : undefined}
      >
        <Icon className="size-4 shrink-0" style={{ color: config.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-medium"
              style={{
                color: isInProgress
                  ? config.color
                  : isAvailable
                    ? 'var(--cic-cyan)'
                    : 'var(--foreground)',
                opacity: isLocked ? 0.8 : 0.9,
              }}
            >
              {tech.name}
            </span>
            {tech.ruinOnly && <Sparkles className="
              size-3 shrink-0 text-purple-400/70
            " />}
          </div>
          {showDescriptionInline && tech.description && (
            <p className="mt-0.5 text-[11px] text-muted-foreground/40">{tech.description}</p>
          )}
          {prereqNames.length > 0 && !isResearched && (
            <p className="mt-0.5 text-[11px] text-muted-foreground/30">
              Requires: {prereqNames.join(', ')}
            </p>
          )}
        </div>
        <span
          className="
            shrink-0 rounded-[3px] px-2 py-1 font-mono text-[10px] font-bold
          "
          style={{
            color: isAvailable || isInProgress ? config.color : 'var(--muted-foreground)',
            background:
              isAvailable || isInProgress
                ? `color-mix(in srgb, ${config.color} 12%, transparent)`
                : 'var(--cic-panel-edge)',
            opacity: isLocked ? 0.5 : 0.8,
          }}
        >
          {formatCost(tech.developCost)}
        </span>
      </div>
      {expanded && tech.description && (
        <p className="px-3 pb-2.5 pl-10 text-[11px] text-muted-foreground/40">{tech.description}</p>
      )}
    </div>
  )
}

// ── Status filter toggles ───────────────────────────────────────────

function StatusToggle({
  status,
  count,
  active,
  onClick,
}: {
  status: Technology['status']
  count: number
  active: boolean
  onClick: () => void
}) {
  const config = STATUS_CONFIG[status]
  return (
    <button
      onClick={onClick}
      className="
        flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px]
        font-semibold transition-all
      "
      style={{
        color: active ? config.color : 'var(--muted-foreground)',
        borderColor: active
          ? `color-mix(in srgb, ${config.color} 40%, transparent)`
          : 'var(--cic-panel-edge)',
        background: active
          ? `color-mix(in srgb, ${config.color} 10%, transparent)`
          : 'transparent',
        opacity: active ? 1 : 0.4,
      }}
    >
      {config.label}
      <span className="font-mono">{count}</span>
    </button>
  )
}

// ── Main page ───────────────────────────────────────────────────────

export function TechTreePage() {
  const { data, isLoading, isFetching } = useTechTree()
  const fields = useMemo(() => (data?.fields ?? []) as ResearchField[], [data])
  const allTechs = useMemo(() => (data?.techs ?? []) as Technology[], [data])

  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [activeStatuses, setActiveStatuses] = useState<Set<Technology['status']>>(
    new Set(['in-progress', 'available', 'locked'])
  )

  const toggleStatus = useCallback((status: Technology['status']) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) {
        if (next.size > 1) next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }, [])

  const techMap = useMemo(() => {
    const map = new Map<number, Technology>()
    for (const tech of allTechs) map.set(tech.id, tech)
    return map
  }, [allTechs])

  const effectiveFieldId = selectedFieldId ?? fields[0]?.id ?? null
  const activeField = fields.find((f) => f.id === effectiveFieldId)
  const activeFieldColor = activeField ? FIELD_COLORS[activeField.abbreviation] ?? '#888' : '#888'

  const filteredTechs = useMemo(() => {
    const query = searchText.toLowerCase().trim()
    return allTechs.filter((tech) => {
      if (!query && effectiveFieldId !== null && tech.fieldId !== effectiveFieldId) return false
      if (!activeStatuses.has(tech.status)) return false
      if (
        query &&
        !tech.name.toLowerCase().includes(query) &&
        !tech.description.toLowerCase().includes(query) &&
        !tech.techTypeName.toLowerCase().includes(query)
      )
        return false
      return true
    })
  }, [allTechs, effectiveFieldId, searchText, activeStatuses])

  const typeGroups = useMemo(() => {
    const map = new Map<string, Technology[]>()
    for (const tech of filteredTechs) {
      const existing = map.get(tech.techTypeName) ?? []
      existing.push(tech)
      map.set(tech.techTypeName, existing)
    }
    return map
  }, [filteredTechs])

  const statusCounts = useMemo(() => {
    const query = searchText.toLowerCase().trim()
    const fieldTechs = allTechs.filter((tech) => {
      if (!query && effectiveFieldId !== null && tech.fieldId !== effectiveFieldId) return false
      if (
        query &&
        !tech.name.toLowerCase().includes(query) &&
        !tech.description.toLowerCase().includes(query)
      )
        return false
      return true
    })
    const counts = { researched: 0, 'in-progress': 0, available: 0, locked: 0 }
    for (const tech of fieldTechs) counts[tech.status]++
    return counts
  }, [allTechs, effectiveFieldId, searchText])

  return (
    <div className="flex h-full bg-(--cic-void)">
      {/* Field sidebar */}
      <div className="
        flex w-44 shrink-0 flex-col border-r border-(--cic-panel-edge)
        bg-(--cic-panel)
      ">
        <div className="
          flex items-center gap-2 border-b border-(--cic-panel-edge) px-3 py-2.5
        ">
          <FlaskConical className="size-3.5 text-(--cic-cyan)" />
          <span className="text-[10px] font-semibold text-foreground/80">Research Fields</span>
        </div>
        <div className="flex-1 overflow-auto">
          {fields.map((field) => (
            <FieldTab
              key={field.id}
              field={field}
              active={effectiveFieldId === field.id && !searchText}
              onClick={() => {
                setSelectedFieldId(field.id)
                setSearchText('')
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header with field context */}
        <div
          className="
            flex shrink-0 items-center justify-between border-b px-4 py-2
          "
          style={{
            borderColor: `color-mix(in srgb, ${activeFieldColor} 20%, var(--cic-panel-edge))`,
            background: `color-mix(in srgb, ${activeFieldColor} 4%, var(--cic-panel))`,
          }}
        >
          <div className="flex items-center gap-3">
            {activeField && !searchText && (
              <span
                className="
                  flex size-6 items-center justify-center rounded-sm text-[9px]
                  font-bold text-white
                "
                style={{ background: activeFieldColor }}
              >
                {activeField.abbreviation}
              </span>
            )}
            <span className="text-sm font-semibold text-foreground/80">
              {searchText ? 'Search Results' : activeField?.name ?? 'Technologies'}
            </span>
            <span className="font-mono text-xs text-muted-foreground/50">
              {filteredTechs.length} techs
            </span>
            {isFetching && !isLoading && (
              <Loader2 className="size-3 animate-spin text-(--cic-cyan-dim)" />
            )}
          </div>
          <DataSettingsButton invalidateKey={['empire', 'techTree']} />
        </div>

        {/* Filter bar */}
        <div className="
          flex shrink-0 items-center gap-3 border-b border-(--cic-panel-edge)
          bg-(--cic-panel)/40 px-4 py-1.5
        ">
          <div className="
            flex items-center gap-1.5 rounded-sm border
            border-(--cic-panel-edge) bg-(--cic-void)/40 px-2 py-1
          ">
            <Search className="size-3 text-muted-foreground/40" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search all fields..."
              className="
                w-40 bg-transparent text-xs text-foreground/70
                placeholder:text-muted-foreground/30
                focus:outline-none
              "
            />
          </div>
          <div className="flex items-center gap-1">
            {(['researched', 'in-progress', 'available', 'locked'] as const).map((status) => (
              <StatusToggle
                key={status}
                status={status}
                count={statusCounts[status]}
                active={activeStatuses.has(status)}
                onClick={() => toggleStatus(status)}
              />
            ))}
          </div>
        </div>

        {/* Tech list */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
          </div>
        ) : filteredTechs.length === 0 ? (
          <div className="
            flex flex-1 flex-col items-center justify-center gap-2
            text-muted-foreground
          ">
            <FlaskConical className="size-6 text-muted-foreground/20" />
            <span className="text-[10px]">No technologies match current filters</span>
          </div>
        ) : (
          <div className="flex-1 space-y-1 overflow-auto p-2">
            {Array.from(typeGroups.entries()).map(([typeName, techs]) => (
              <TechTypeGroup
                key={typeName}
                typeName={typeName}
                techs={techs}
                techMap={techMap}
                fieldAbbrev={techs[0]?.fieldAbbreviation ?? ''}
                fieldColor={FIELD_COLORS[techs[0]?.fieldAbbreviation ?? ''] ?? '#888'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
