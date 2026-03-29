import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/app/stores/session-store'
import { useTabStore } from '@/app/stores/tab-store'
import { useGameDate } from '@/app/hooks/data/use-empire'
import { Button } from '@/app/components/ui/button'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, CircleDot, Trash2 } from 'lucide-react'
import { CATEGORY_LIST, type CategoryId } from '@/app/modules/categories'
import { getModulesByCategory, findCategoryByRoute, type ModuleDefinition } from '@/app/modules/registry'

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function Sidebar() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const currentGame = useSessionStore((s) => s.currentGame)
  const connectionMode = useSessionStore((s) => s.connectionMode)
  const protocolMismatch = useSessionStore((s) => s.protocolMismatch)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true')

  const activeCategory = findCategoryByRoute(location.pathname)
  const [openCategories, setOpenCategories] = useState<Set<CategoryId>>(() => {
    const initial = new Set<CategoryId>()
    if (activeCategory) initial.add(activeCategory)
    initial.add('home')
    return initial
  })

  const modulesByCategory = getModulesByCategory()

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const toggleCategory = (catId: CategoryId) => {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const handleDeleteGame = async (id: string, name: string) => {
    if (!confirm(`Remove campaign "${name}"?`)) return
    await window.conveyor.session.removeGame(id)
    queryClient.invalidateQueries({ queryKey: ['session', 'games'] })
  }

  const { data: savedGames } = useQuery({
    queryKey: ['session', 'games'],
    queryFn: () => window.conveyor.session.listGames(),
  })

  const { data: gameDate } = useGameDate()

  const sortedGames = savedGames ? [...savedGames].sort((a, b) => b.lastAccessedAt - a.lastAccessedAt) : []

  const statusDotClass =
    connectionMode === 'bridge'
      ? protocolMismatch
        ? 'bg-[var(--cic-amber)] shadow-[0_0_4px_var(--cic-amber)]'
        : 'bg-[var(--cic-green)] shadow-[0_0_4px_var(--cic-green)]'
      : connectionMode === 'offline'
        ? 'bg-muted-foreground/60'
        : 'bg-[var(--cic-red)]'

  const statusLabel =
    connectionMode === 'bridge'
      ? protocolMismatch
        ? 'Mismatch'
        : 'Bridge'
      : connectionMode === 'offline'
        ? 'Offline'
        : 'Disconnected'

  // ── Collapsed sidebar ──────────────────────────────
  if (collapsed) {
    return (
      <aside className="
        flex w-12 flex-col items-center border-r border-(--cic-panel-edge)
        bg-(--cic-panel) py-2 transition-all duration-200
      ">
        <button
          onClick={toggleCollapsed}
          className="
            mb-2 rounded-sm p-1.5 text-muted-foreground transition-colors
            hover:bg-(--cic-cyan-glow) hover:text-foreground/50
          "
          title="Expand sidebar"
        >
          <PanelLeftOpen className="size-3.5" />
        </button>

        <div className="flex flex-col gap-1.5">
          {CATEGORY_LIST.map((cat) => {
            const modules = modulesByCategory[cat.id] ?? []
            if (modules.length === 0) return null
            const isActive = activeCategory === cat.id
            const Icon = cat.icon
            return (
              <div key={cat.id} className="group/fly relative">
                <button
                  className={`
                    flex size-8 items-center justify-center rounded-sm
                    transition-colors
                    ${
                    isActive
                      ? 'bg-(--cic-cyan-glow) text-(--cic-cyan)'
                      : `
                        text-muted-foreground/60
                        hover:bg-(--cic-cyan-glow) hover:text-foreground/70
                      `
                  }
                  `}
                  title={cat.label}
                >
                  <Icon className="size-3.5" />
                </button>
                {/* Flyout — padding-left creates a hover bridge between button and menu */}
                <div className="
                  absolute top-0 left-full z-50 hidden pl-1
                  group-hover/fly:block
                ">
                  <div className="
                    min-w-[160px] rounded-md border border-(--cic-panel-edge)
                    bg-(--cic-panel) py-1 shadow-lg
                  ">
                    <p className="
                      px-3 py-1 text-[8px] font-semibold tracking-wider
                      text-(--cic-amber-dim) uppercase
                    ">
                      {cat.label}
                    </p>
                    {modules.map((mod) => (
                      <NavLink
                        key={mod.id}
                        to={mod.route}
                        className={({ isActive: active }) =>
                          `flex items-center gap-2 px-3 py-1.5 text-[10px] transition-colors ${
                            active
                              ? 'text-[var(--cic-cyan)] bg-[var(--cic-cyan-glow)]'
                              : 'text-foreground/60 hover:text-foreground/80 hover:bg-[var(--cic-cyan-glow)]'
                          } ${mod.status === 'coming-soon' ? 'opacity-40' : ''}`
                        }
                      >
                        <mod.icon className="size-3" />
                        {mod.name}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-auto pt-2 pb-4" title={statusLabel}>
          <div className={`
            size-1.5 shrink-0 rounded-full
            ${statusDotClass}
          `} />
        </div>
      </aside>
    )
  }

  // ── Expanded sidebar ───────────────────────────────
  return (
    <aside className="
      flex h-full w-52 flex-col overflow-hidden border-r
      border-(--cic-panel-edge) bg-(--cic-panel) transition-all duration-200
    ">
      {/* Collapse button */}
      <div className="flex justify-end px-2 pt-2">
        <button
          onClick={toggleCollapsed}
          className="
            rounded-sm p-1 text-muted-foreground/50 transition-colors
            hover:bg-(--cic-cyan-glow) hover:text-foreground/40
          "
          title="Collapse sidebar"
        >
          <PanelLeftClose className="size-3" />
        </button>
      </div>

      {/* Module categories */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 pb-2">
          {CATEGORY_LIST.map((cat) => {
            const modules = modulesByCategory[cat.id] ?? []
            if (modules.length === 0) return null
            const isOpen = openCategories.has(cat.id)
            const Icon = cat.icon
            return (
              <div key={cat.id} className="mb-1">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="
                    flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5
                    text-[9px] font-semibold tracking-[0.12em]
                    text-(--cic-amber-dim) uppercase transition-colors
                    hover:bg-(--cic-amber-glow) hover:text-(--cic-amber)
                  "
                >
                  <Icon className="size-3" />
                  <span className="flex-1 text-left">{cat.label}</span>
                  {isOpen ? <ChevronDown className="size-2.5" /> : <ChevronRight className="
                    size-2.5
                  " />}
                </button>
                {/* Module links */}
                {isOpen && (
                  <div className="mt-0.5 ml-2 space-y-0.5">
                    {modules.map((mod) => (
                      <ModuleLink key={mod.id} mod={mod} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Campaigns */}
        {sortedGames.length > 0 && (
          <div className="border-t border-(--cic-panel-edge) p-2">
            <p className="
              mb-1 px-2 text-[8px] font-semibold tracking-[0.12em]
              text-muted-foreground/40 uppercase
            ">
              Campaigns
            </p>
            {sortedGames.map((game) => {
              const isActive = currentGame?.id === game.id
              const canSelect = connectionMode === 'offline'
              return (
                <div
                  key={game.id}
                  onClick={() => canSelect && !isActive && window.conveyor.session.selectGame(game.id)}
                  className={`
                    group/card rounded-sm px-2 py-1.5
                    ${
                    isActive
                      ? `border border-(--cic-cyan-dim)/30 bg-(--cic-cyan-glow)`
                      : canSelect
                        ? `
                          cursor-pointer border border-transparent opacity-60
                          hover:bg-(--cic-cyan-glow) hover:opacity-90
                        `
                        : 'border border-transparent opacity-40'
                  }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`
                        truncate text-[10px] font-medium
                        ${isActive ? `text-(--cic-cyan)` : `text-foreground/70`}
                      `}
                    >
                      {game.gameInfo.gameName}
                    </span>
                    <div className="flex items-center gap-1">
                      {isActive && <CircleDot className="
                        size-2 shrink-0 text-(--cic-green)
                      " />}
                      {!isActive && (
                        <button
                          className="
                            text-muted-foreground opacity-0 transition-opacity
                            group-hover/card:opacity-100
                            hover:text-(--cic-red)
                          "
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteGame(game.id, game.gameInfo.gameName)
                          }}
                        >
                          <Trash2 className="size-2" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-0.5 text-[8px] text-muted-foreground/40">
                    {isActive && gameDate
                      ? ((gameDate as Record<string, unknown>).formatted as string)
                      : (game.lastGameDate ?? `Year ${game.gameInfo.startingYear}`)}
                    {' — '}
                    {formatRelativeTime(game.lastAccessedAt)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Connection status */}
      <div className="shrink-0 border-t border-(--cic-panel-edge) px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`
              size-1.5 shrink-0 rounded-full
              ${statusDotClass}
            `} />
            <span className="font-mono text-[9px] text-muted-foreground/60">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            {connectionMode === 'disconnected' && (
              <>
                <Button
                  size="xs"
                  variant="ghost"
                  className="
                    h-5 px-1.5 text-[8px] text-muted-foreground
                    hover:text-foreground/60
                  "
                  onClick={() => window.conveyor.session.goOffline()}
                >
                  Offline
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  className="
                    h-5 px-1.5 text-[8px] text-(--cic-cyan-dim)
                    hover:text-(--cic-cyan)
                  "
                  onClick={() => window.conveyor.session.reconnect()}
                >
                  Retry
                </Button>
              </>
            )}
            {connectionMode === 'offline' && (
              <Button
                size="xs"
                variant="ghost"
                className="
                  h-5 px-1.5 text-[8px] text-(--cic-cyan-dim)
                  hover:text-(--cic-cyan)
                "
                onClick={() => window.conveyor.session.goOnline()}
              >
                Reconnect
              </Button>
            )}
            {connectionMode === 'bridge' && protocolMismatch && (
              <Button
                size="xs"
                variant="ghost"
                className="
                  h-5 px-1.5 text-[8px] text-(--cic-cyan-dim)
                  hover:text-(--cic-cyan)
                "
                onClick={() => window.conveyor.session.reconnect()}
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

function ModuleLink({ mod }: { mod: ModuleDefinition }) {
  const navigate = useNavigate()
  const connectionMode = useSessionStore((s) => s.connectionMode)
  const currentGame = useSessionStore((s) => s.currentGame)
  const openTab = useTabStore((s) => s.openTab)
  const disabled = (mod.requiresGame && !currentGame) || (mod.requiresBridge && connectionMode !== 'bridge')

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (disabled) return
    // Don't open tabs for home/setup — they're transient pages
    if (mod.category !== 'home') {
      openTab(mod)
    }
    navigate(mod.route)
  }

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1 && !disabled && mod.category !== 'home') {
      e.preventDefault()
      openTab(mod)
      // Middle-click opens in background (don't navigate)
    }
  }

  return (
    <NavLink
      to={disabled ? '#' : mod.route}
      onClick={handleClick}
      onMouseDown={handleMiddleClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded px-2 py-1 text-[10px] transition-colors ${
          disabled
            ? 'text-muted-foreground/20 cursor-not-allowed'
            : isActive
              ? 'bg-[var(--cic-cyan-glow)] text-[var(--cic-cyan)] border border-[var(--cic-cyan-dim)]/20'
              : 'text-foreground/50 hover:bg-[var(--cic-cyan-glow)] hover:text-foreground/70 border border-transparent'
        } ${mod.status === 'coming-soon' ? 'opacity-50' : ''}`
      }
    >
      <mod.icon className="size-3 shrink-0" />
      <span className="truncate">{mod.name}</span>
      {mod.status === 'coming-soon' && <span className="
        ml-auto text-[6px] text-muted-foreground/30
      ">SOON</span>}
    </NavLink>
  )
}
