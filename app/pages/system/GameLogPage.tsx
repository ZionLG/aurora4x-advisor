import { useState } from 'react'
import { useGameLog, useEventTypes } from '@/app/hooks/data'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Switch } from '@/app/components/ui/switch'
import { Label } from '@/app/components/ui/label'
import {
  Loader2, ScrollText, Filter, ChevronLeft, ChevronRight, EyeOff,
  Swords, FlaskConical, Factory, Ship, Medal, User, Globe,
  AlertTriangle, Pickaxe, Building2, Radio, Crosshair, Shield,
  Gem, Fuel, MessageSquare, Eye, type LucideIcon,
} from 'lucide-react'

const PAGE_SIZE = 100

/** Map event type descriptions to icons by keyword matching */
function getEventIcon(description: string): LucideIcon {
  const d = description.toLowerCase()
  if (d.includes('attack') || d.includes('combat') || d.includes('damage') || d.includes('hit') || d.includes('destroyed') || d.includes('bombardment') || d.includes('boarding')) return Swords
  if (d.includes('research') || d.includes('scientist') || d.includes('tech')) return FlaskConical
  if (d.includes('shipyard') || d.includes('construction') || d.includes('production') || d.includes('built') || d.includes('refit')) return Factory
  if (d.includes('fleet') || d.includes('ship') || d.includes('naval') || d.includes('launch') || d.includes('transit')) return Ship
  if (d.includes('medal') || d.includes('award')) return Medal
  if (d.includes('commander') || d.includes('officer') || d.includes('administrator') || d.includes('promotion') || d.includes('retire') || d.includes('experience') || d.includes('training')) return User
  if (d.includes('contact') || d.includes('alien') || d.includes('diplomatic') || d.includes('communication')) return Radio
  if (d.includes('survey') || d.includes('mineral') || d.includes('accessibility') || d.includes('deposit')) return Gem
  if (d.includes('colony') || d.includes('population') || d.includes('civilian') || d.includes('terraform')) return Globe
  if (d.includes('missile') || d.includes('amm') || d.includes('point defence')) return Crosshair
  if (d.includes('shield') || d.includes('armour') || d.includes('armor') || d.includes('defence') || d.includes('defense')) return Shield
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

export function GameLogPage() {
  const [page, setPage] = useState(0)
  const [selectedTypes, setSelectedTypes] = useState<number[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [hideNonCustomized, setHideNonCustomized] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [tagSearch, setTagSearch] = useState('')

  const { data: eventTypes } = useEventTypes()
  const { data: logData, isLoading } = useGameLog(
    PAGE_SIZE,
    page * PAGE_SIZE,
    selectedTypes.length > 0 ? selectedTypes : undefined,
    hideNonCustomized || undefined,
  )

  const result = logData as GameLogResult | undefined
  const allEntries = result?.entries ?? []
  const totalCount = result?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const typeList = (eventTypes ?? []) as EventTypeInfo[]

  // Client-side search filter only (hide non-customized is now server-side)
  const entries = searchText
    ? allEntries.filter((entry) => entry.message.toLowerCase().includes(searchText.toLowerCase()))
    : allEntries

  // Group event types: customized first, then with entries, then rest
  // Apply tag search filter
  const tagFilter = tagSearch.toLowerCase()
  const filteredTypes = tagFilter
    ? typeList.filter((t) => t.description.toLowerCase().includes(tagFilter))
    : typeList
  const customizedTypes = filteredTypes.filter((t) => t.isCustomized)
  const withEntries = filteredTypes.filter((t) => !t.isCustomized && t.hasEntries)
  const noEntries = filteredTypes.filter((t) => !t.isCustomized && !t.hasEntries)

  const toggleType = (id: number) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
    setPage(0)
  }

  const clearFilters = () => {
    setSelectedTypes([])
    setHideNonCustomized(false)
    setSearchText('')
    setPage(0)
  }

  return (
    <div className="flex h-full flex-col bg-[var(--cic-void)]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]">
        <div className="flex items-center gap-3">
          <ScrollText className="h-4 w-4 text-[var(--cic-amber)]" />
          <span className="text-xs font-semibold text-foreground/80">Game Log</span>
          <span className="text-[9px] font-mono text-muted-foreground">
            {totalCount.toLocaleString()} events
            {entries.length !== allEntries.length && ` (${entries.length} shown)`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <Input
            className="h-7 w-40 text-[9px] bg-[var(--cic-void)] border-[var(--cic-panel-edge)]"
            placeholder="Search messages..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {/* Filter toggle */}
          <Button
            size="xs"
            variant={filterOpen ? 'default' : 'ghost'}
            className={filterOpen ? 'bg-[var(--cic-cyan-glow)] text-[var(--cic-cyan)] border border-[var(--cic-cyan-dim)]/30' : 'text-muted-foreground'}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter className="h-3 w-3" />
            {selectedTypes.length > 0 && (
              <span className="ml-1 text-[8px] bg-[var(--cic-cyan)] text-[var(--cic-void)] rounded-full px-1">
                {selectedTypes.length}
              </span>
            )}
          </Button>
          {/* Pagination */}
          <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <Button size="icon-xs" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span>{page + 1}/{Math.max(totalPages, 1)}</span>
            <Button size="icon-xs" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="shrink-0 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]/80 px-4 py-2.5 space-y-2">
          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <EyeOff className="h-3 w-3 text-muted-foreground/60" />
                <Label className="text-[9px] text-muted-foreground">Hide non-customized</Label>
                <Switch checked={hideNonCustomized} onCheckedChange={(v) => { setHideNonCustomized(v); setPage(0) }} />
              </div>
            </div>
            {(selectedTypes.length > 0 || hideNonCustomized || searchText) && (
              <Button size="xs" variant="ghost" className="text-[8px] text-muted-foreground" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>

          {/* Tag search */}
          <Input
            className="h-7 text-[9px] bg-[var(--cic-void)] border-[var(--cic-panel-edge)]"
            placeholder="Search event types..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
          />

          {/* Customized event types */}
          {customizedTypes.length > 0 && (
            <div>
              <p className="text-[8px] text-[var(--cic-amber-dim)] mb-1">
                Customized ({customizedTypes.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {customizedTypes.map((t) => {
                  const active = selectedTypes.includes(t.id)
                  return (
                    <Badge
                      key={t.id}
                      variant="outline"
                      className="cursor-pointer text-[8px] px-2 py-0.5 h-5 transition-all"
                      style={{
                        borderColor: active ? (t.textColor ?? 'var(--cic-cyan-dim)') : 'var(--cic-panel-edge)',
                        color: active ? (t.textColor ?? 'var(--cic-cyan)') : undefined,
                        backgroundColor: active ? 'var(--cic-cyan-glow)' : undefined,
                      }}
                      onClick={() => toggleType(t.id)}
                    >
                      {t.textColor && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.textColor }} />}
                      {t.description}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Event types with log entries */}
          {withEntries.length > 0 && (
            <div>
              <p className="text-[8px] text-[var(--cic-cyan-dim)] mb-1">
                Active in Log ({withEntries.length})
              </p>
              <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
                {withEntries.map((t) => {
                  const active = selectedTypes.includes(t.id)
                  return (
                    <Badge
                      key={t.id}
                      variant="outline"
                      className={`cursor-pointer text-[8px] px-2 py-0.5 h-5 transition-all ${
                        active
                          ? 'border-[var(--cic-cyan-dim)] text-[var(--cic-cyan)] bg-[var(--cic-cyan-glow)]'
                          : 'border-[var(--cic-panel-edge)] text-muted-foreground/60 hover:text-foreground/70'
                      }`}
                      onClick={() => toggleType(t.id)}
                    >
                      {t.description}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* All other event types (no entries yet) */}
          {noEntries.length > 0 && (
            <div>
              <p className="text-[8px] text-muted-foreground/40 mb-1">
                All Types ({noEntries.length})
              </p>
              <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                {noEntries.map((t) => {
                  const active = selectedTypes.includes(t.id)
                  return (
                    <Badge
                      key={t.id}
                      variant="outline"
                      className={`cursor-pointer text-[7px] px-1.5 py-0 h-4 transition-all ${
                        active
                          ? 'border-[var(--cic-cyan-dim)] text-[var(--cic-cyan)] bg-[var(--cic-cyan-glow)]'
                          : 'border-[var(--cic-panel-edge)] text-muted-foreground/30 hover:text-muted-foreground/50'
                      }`}
                      onClick={() => toggleType(t.id)}
                    >
                      {t.description}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log entries */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--cic-cyan-dim)]" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {entries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-[10px]">
              {allEntries.length > 0 ? 'All entries hidden by filters' : 'No log entries found'}
            </div>
          ) : (
            <div className="divide-y divide-[var(--cic-panel-edge)]">
              {entries.map((entry, i) => {
                const Icon = getEventIcon(entry.eventTypeName)
                return (
                  <div
                    key={`${entry.incrementId}-${i}`}
                    className="flex items-start gap-2.5 px-4 py-2 hover:bg-[var(--cic-panel)]/50 transition-colors"
                  >
                    {/* Date */}
                    <span className="shrink-0 text-[9px] font-mono text-muted-foreground/60 w-[70px] pt-0.5">
                      {entry.formattedDate}
                    </span>
                    {/* Icon */}
                    <span className="shrink-0 pt-0.5" style={{ color: entry.textColor ?? 'var(--muted-foreground)' }}>
                      <Icon className="h-3 w-3" />
                    </span>
                    {/* Type badge */}
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[7px] px-1.5 py-0 h-4 border-[var(--cic-panel-edge)]"
                      style={entry.textColor ? { color: entry.textColor, borderColor: entry.textColor + '40' } : { color: 'var(--cic-amber-dim)' }}
                    >
                      {entry.eventTypeName}
                    </Badge>
                    {/* Message */}
                    <span
                      className="text-[10px] leading-relaxed"
                      style={{ color: entry.textColor ?? 'var(--foreground)', opacity: entry.textColor ? 1 : 0.7 }}
                    >
                      {entry.message}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
