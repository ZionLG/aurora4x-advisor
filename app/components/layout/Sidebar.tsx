import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/app/stores/session-store'
import { useGameDate } from '@/app/hooks/data/use-empire'
import { Button } from '@/app/components/ui/button'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import {
  Home,
  LayoutDashboard,
  Map,
  MessageSquare,
  Settings,
  Plus,
  CircleDot,
  Trash2,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/planning', icon: Map, label: 'Planning' },
  { to: '/advisor', icon: MessageSquare, label: 'Advisor' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentGame = useSessionStore((s) => s.currentGame)
  const isConnected = useSessionStore((s) => s.isConnected)
  const protocolMismatch = useSessionStore((s) => s.protocolMismatch)

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

  const sortedGames = savedGames
    ? [...savedGames].sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
    : []

  return (
    <aside className="flex w-52 flex-col border-r border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]">
      {/* Nav links */}
      <div className="flex flex-col gap-0.5 p-2">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors ${
                isActive
                  ? 'bg-[var(--cic-cyan-glow)] text-[var(--cic-cyan)] border border-[var(--cic-cyan-dim)]/20'
                  : 'text-muted-foreground hover:bg-[var(--cic-cyan-glow)] hover:text-foreground border border-transparent'
              }`
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Campaigns section */}
      <div className="mt-2 border-t border-[var(--cic-panel-edge)]">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--cic-amber-dim)]">
            Campaigns
          </span>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-[var(--cic-amber-dim)] hover:text-[var(--cic-amber)]"
            onClick={() => navigate('/setup')}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 pb-2 space-y-0.5">
            {!isConnected && sortedGames.length > 0 && (
              <p className="text-[9px] text-[var(--cic-amber-dim)]/60 text-center py-2 px-2 font-mono">
                Connect to Aurora to select a campaign
              </p>
            )}
            {sortedGames.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/40 text-center py-4 px-2">
                No campaigns yet
              </p>
            ) : (
              sortedGames.map((game) => {
                const isActive = currentGame?.id === game.id
                return (
                  <div
                    key={game.id}
                    className={`group/card rounded px-2.5 py-2 ${
                      isActive
                        ? 'bg-[var(--cic-cyan-glow)] border border-[var(--cic-cyan-dim)]/30'
                        : 'border border-transparent opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-medium truncate ${
                          isActive ? 'text-[var(--cic-cyan)]' : 'text-foreground/80'
                        }`}
                      >
                        {game.gameInfo.gameName}
                      </span>
                      <div className="flex items-center gap-1">
                        {isActive && (
                          <CircleDot className="h-2.5 w-2.5 shrink-0 text-[var(--cic-green)]" />
                        )}
                        {!isActive && (
                          <button
                            className="opacity-0 group-hover/card:opacity-100 transition-opacity text-foreground/20 hover:text-[var(--cic-red)]"
                            onClick={() => handleDeleteGame(game.id, game.gameInfo.gameName)}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[9px] text-muted-foreground/50 mt-0.5">
                      {game.gameInfo.empireName} — {game.gameInfo.techLevel}
                    </div>
                    <div className="text-[9px] text-muted-foreground/30 mt-0.5">
                      {isActive && gameDate
                        ? (gameDate as Record<string, unknown>).formatted as string
                        : game.lastGameDate ?? `Year ${game.gameInfo.startingYear}`}
                      {' — '}
                      {formatRelativeTime(game.lastAccessedAt)}
                    </div>
                    {game.personalityName && (
                      <div className="text-[9px] text-[var(--cic-amber-dim)]/60 mt-0.5">
                        Advisor: {game.personalityName}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Connection status */}
      <div className="mt-auto border-t border-[var(--cic-panel-edge)] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isConnected
                  ? protocolMismatch
                    ? 'bg-[var(--cic-amber)] shadow-[0_0_4px_var(--cic-amber)]'
                    : 'bg-[var(--cic-green)] shadow-[0_0_4px_var(--cic-green)]'
                  : 'bg-[var(--cic-red)]'
              }`}
            />
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {isConnected
                ? protocolMismatch
                  ? 'Version Mismatch'
                  : 'Bridge Active'
                : 'Disconnected'}
            </span>
          </div>
          {(!isConnected || protocolMismatch) && (
            <Button
              size="xs"
              variant="ghost"
              className="text-[9px] text-[var(--cic-cyan-dim)] hover:text-[var(--cic-cyan)]"
              onClick={() => window.conveyor.session.reconnect()}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}
