import { useCallback, useMemo, useState } from 'react'
import { useWarnings } from '@/app/hooks/data'
import { DataSettingsButton } from '@/app/components/DataSettingsPanel'
import {
  AlertTriangle,
  Loader2,
  ChevronDown,
  Building2,
  Users,
  Landmark,
  Ship,
  CircleDot,
  Search,
  Radar,
} from 'lucide-react'
import type { Warning, WarningCategory, WarningSeverity } from '@/lib/warnings/types'

const CATEGORY_CONFIG: Record<WarningCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  contacts: { label: 'Contacts', icon: Radar },
  economy: { label: 'Economy', icon: Building2 },
  populations: { label: 'Populations', icon: Users },
  administrations: { label: 'Administrations', icon: Landmark },
  ships: { label: 'Ships', icon: Ship },
  others: { label: 'Others', icon: CircleDot },
}

const SEVERITY_COLORS: Record<WarningSeverity, string> = {
  high: 'var(--cic-red)',
  medium: 'var(--cic-amber)',
  low: 'var(--cic-cyan-dim)',
  info: 'var(--muted-foreground)',
}

/** Human-readable group headers matching Electrons' style */
const TYPE_GROUP_LABELS: Record<string, string> = {
  'Stockpiling Minerals': 'stockpiling civilian mining colonies',
  'Wasted Mining': 'colonies with wasted mining capacity',
  'Wasted Terraforming': 'colonies with wasted terraforming capacity',
  'Free Research Labs': 'populations with free research lab capacity',
  'Free Construction Capacity': 'populations with free construction capacity',
  'Free Ordnance Capacity': 'populations with free ordnance production capacity',
  'Free Fighter Capacity': 'populations with free fighter production capacity',
  'Idle Research Labs': 'dead research projects',
  'Self-Sustaining': 'self-sustaining colonist destinations',
  'Low Efficiency': 'low efficiency populations',
  'No Governor': 'populations without governor',
  'Mismatched Research': 'researchers with mismatched projects',
  'No Commander': 'naval administrations without commander',
  'No Sector Commander': 'sectors without commander',
  'Obsolete Shipyard': 'obsolete shipyards',
  'Damaged Ship': 'damaged ships',
  'Armor Damage': 'armor-damaged ships',
  'Low Morale': 'low morale crews',
  'Low Maintenance': 'low maintenance ships',
  'Misconfigured Supply Ship': 'misconfigured supply ship classes',
  'Misconfigured Tanker': 'misconfigured tanker ship classes',
  'Obsolete Ship': 'active obsolete ships',
  'Fully Trained': 'fully trained ships in training fleets',
  'Active Fire Controls': 'active fire controls',
  'No Cargo Shuttles': 'transport ship classes without cargo shuttles',
  'Active Lifepod': 'active lifepods',
  'Known Wreck': 'wrecks in explored space',
  'Unexploited Construct': 'unexploited ancient constructs',
  'Dangerous Rift': 'dangerous rifts in occupied systems',
  'Intruders': 'intruders detected',
}

function SeverityDot({ severity }: { severity: WarningSeverity }) {
  return (
    <div
      className="mt-0.5 size-2 shrink-0 rounded-full"
      style={{
        background: SEVERITY_COLORS[severity],
        boxShadow: severity === 'high' ? `0 0 6px ${SEVERITY_COLORS[severity]}` : 'none',
      }}
    />
  )
}

function WarningTypeGroup({ type, warnings }: { type: string; warnings: Warning[] }) {
  const [open, setOpen] = useState(false)
  const label = TYPE_GROUP_LABELS[type] ?? type.toLowerCase()
  const maxSeverity = warnings.reduce<WarningSeverity>(
    (max, w) => {
      const order: WarningSeverity[] = ['info', 'low', 'medium', 'high']
      return order.indexOf(w.severity) > order.indexOf(max) ? w.severity : max
    },
    'info' as WarningSeverity
  )

  return (
    <div
      className="overflow-hidden rounded-sm border"
      style={{
        borderColor: `color-mix(in srgb, ${SEVERITY_COLORS[maxSeverity]} 20%, transparent)`,
        background: `color-mix(in srgb, ${SEVERITY_COLORS[maxSeverity]} 3%, transparent)`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="
          flex w-full items-center justify-between px-3 py-2 text-left
          transition-colors
          hover:bg-foreground/5
        "
      >
        <span className="text-[10px] font-semibold text-foreground/70">
          {warnings.length} {label}
        </span>
        <ChevronDown
          className={`
            size-3 text-muted-foreground/40 transition-transform
            ${open ? '' : '-rotate-90'}
          `}
        />
      </button>
      {open && (
        <div className="divide-y divide-(--cic-panel-edge)/30">
          {warnings.map((w) => (
            <div key={w.id} className="flex gap-2.5 px-3 py-2">
              <SeverityDot severity={w.severity} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-foreground/70">{w.title}</p>
                {w.detail && <p className="
                  mt-0.5 text-[9px] text-muted-foreground/50
                ">{w.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WarningCategoryPanel({
  category,
  warnings,
  defaultOpen,
}: {
  category: WarningCategory
  warnings: Warning[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon
  const highCount = warnings.filter((w) => w.severity === 'high').length
  const medCount = warnings.filter((w) => w.severity === 'medium').length

  // Group by warning type, preserving insertion order
  const typeGroups = useMemo(() => {
    const map = new Map<string, Warning[]>()
    for (const w of warnings) {
      const existing = map.get(w.type) ?? []
      existing.push(w)
      map.set(w.type, existing)
    }
    return map
  }, [warnings])

  return (
    <div
      className="
        overflow-hidden rounded-md border border-(--cic-panel-edge)
        bg-(--cic-panel)
      "
    >
      <button
        onClick={() => setOpen(!open)}
        className="
          flex w-full items-center justify-between bg-(--cic-void)/40 px-4
          py-2.5 transition-colors
          hover:bg-(--cic-void)/60
        "
      >
        <div className="flex items-center gap-2.5">
          <ChevronDown
            className={`
              size-3 text-muted-foreground/50 transition-transform
              ${open ? '' : '-rotate-90'}
            `}
          />
          <Icon className="size-3.5 text-(--cic-amber)" />
          <span className="text-[11px] font-semibold text-foreground/80">{config.label}</span>
          <span className="font-mono text-[8px] text-muted-foreground/40">{warnings.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {highCount > 0 && (
            <span
              className="
                rounded-sm bg-(--cic-red)/15 px-1.5 py-px text-[7px] font-bold
                text-(--cic-red)
              "
            >
              {highCount} critical
            </span>
          )}
          {medCount > 0 && (
            <span
              className="
                rounded-sm bg-(--cic-amber)/10 px-1.5 py-px text-[7px] font-bold
                text-(--cic-amber-dim)
              "
            >
              {medCount} warnings
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="space-y-1.5 p-2.5">
          {Array.from(typeGroups.entries()).map(([type, groupWarnings]) => (
            <WarningTypeGroup key={type} type={type} warnings={groupWarnings} />
          ))}
        </div>
      )}
    </div>
  )
}

const SEVERITY_ORDER: WarningSeverity[] = ['high', 'medium', 'low', 'info']
const SEVERITY_LABELS: Record<WarningSeverity, string> = {
  high: 'Critical',
  medium: 'Warning',
  low: 'Low',
  info: 'Info',
}

function SeverityToggle({
  severity,
  active,
  count,
  onClick,
}: {
  severity: WarningSeverity
  active: boolean
  count: number
  onClick: () => void
}) {
  if (count === 0) return null
  return (
    <button
      onClick={onClick}
      className="
        flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[8px]
        font-semibold transition-opacity
      "
      style={{
        color: active ? SEVERITY_COLORS[severity] : 'var(--muted-foreground)',
        borderColor: active
          ? `color-mix(in srgb, ${SEVERITY_COLORS[severity]} 40%, transparent)`
          : 'var(--cic-panel-edge)',
        background: active
          ? `color-mix(in srgb, ${SEVERITY_COLORS[severity]} 10%, transparent)`
          : 'transparent',
        opacity: active ? 1 : 0.5,
      }}
    >
      <span>{SEVERITY_LABELS[severity]}</span>
      <span className="font-mono">{count}</span>
    </button>
  )
}

export function WarningsPage() {
  const { data: warningsData, isLoading, isFetching } = useWarnings()
  const allWarnings = useMemo(() => (warningsData ?? []) as Warning[], [warningsData])

  const [searchText, setSearchText] = useState('')
  const [activeSeverities, setActiveSeverities] = useState<Set<WarningSeverity>>(
    new Set(['high', 'medium', 'low', 'info'])
  )

  const toggleSeverity = useCallback((severity: WarningSeverity) => {
    setActiveSeverities((prev) => {
      const next = new Set(prev)
      if (next.has(severity)) {
        if (next.size > 1) next.delete(severity)
      } else {
        next.add(severity)
      }
      return next
    })
  }, [])

  // Count per severity (unfiltered)
  const severityCounts = useMemo(() => {
    const counts: Record<WarningSeverity, number> = { high: 0, medium: 0, low: 0, info: 0 }
    for (const w of allWarnings) counts[w.severity]++
    return counts
  }, [allWarnings])

  // Filtered warnings
  const warnings = useMemo(() => {
    const q = searchText.toLowerCase().trim()
    return allWarnings.filter((w) => {
      if (!activeSeverities.has(w.severity)) return false
      if (q && !w.title.toLowerCase().includes(q) && !w.detail.toLowerCase().includes(q) && !(w.system ?? '').toLowerCase().includes(q) && !(w.colony ?? '').toLowerCase().includes(q) && !w.type.toLowerCase().includes(q))
        return false
      return true
    })
  }, [allWarnings, activeSeverities, searchText])

  const grouped = useMemo(() => {
    const map = new Map<WarningCategory, Warning[]>()
    for (const w of warnings) {
      const existing = map.get(w.category) ?? []
      existing.push(w)
      map.set(w.category, existing)
    }
    return map
  }, [warnings])

  const categoryOrder: WarningCategory[] = ['contacts', 'economy', 'ships', 'populations', 'administrations', 'others']

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
          <AlertTriangle className="size-4 text-(--cic-amber)" />
          <span className="text-xs font-semibold text-foreground/80">Warnings</span>
          <span className="font-mono text-[9px] text-muted-foreground">
            {warnings.length}{allWarnings.length !== warnings.length ? `/${allWarnings.length}` : ''} total
          </span>
          {isFetching && !isLoading && <Loader2 className="
            size-3 animate-spin text-(--cic-cyan-dim)
          " />}
        </div>
        <DataSettingsButton invalidateKey={['empire', 'warnings']} />
      </div>

      {/* Filter bar */}
      {allWarnings.length > 0 && (
        <div
          className="
            flex shrink-0 items-center gap-3 border-b border-(--cic-panel-edge)
            bg-(--cic-panel)/60 px-4 py-1.5
          "
        >
          <div
            className="
              flex items-center gap-1.5 rounded-sm border
              border-(--cic-panel-edge) bg-(--cic-void)/40 px-2 py-1
            "
          >
            <Search className="size-3 text-muted-foreground/40" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Filter warnings..."
              className="
                w-32 bg-transparent text-[9px] text-foreground/70
                placeholder:text-muted-foreground/30
                focus:outline-none
              "
            />
          </div>
          <div className="flex items-center gap-1">
            {SEVERITY_ORDER.map((s) => (
              <SeverityToggle
                key={s}
                severity={s}
                active={activeSeverities.has(s)}
                count={severityCounts[s]}
                onClick={() => toggleSeverity(s)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
        </div>
      ) : allWarnings.length === 0 ? (
        <div
          className="
            flex flex-1 flex-col items-center justify-center gap-2
            text-muted-foreground
          "
        >
          <AlertTriangle className="size-8 text-(--cic-green)/40" />
          <span className="text-[10px]">No warnings — everything looks good</span>
        </div>
      ) : warnings.length === 0 ? (
        <div
          className="
            flex flex-1 flex-col items-center justify-center gap-2
            text-muted-foreground
          "
        >
          <span className="text-[10px]">No warnings match current filters</span>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-auto p-4">
          {categoryOrder.map((cat) => {
            const catWarnings = grouped.get(cat)
            if (!catWarnings || catWarnings.length === 0) return null
            return (
              <WarningCategoryPanel
                key={cat}
                category={cat}
                warnings={catWarnings}
                defaultOpen={catWarnings.some((w) => w.severity === 'high' || w.severity === 'medium')}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
