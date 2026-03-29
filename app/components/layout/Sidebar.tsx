import { NavLink } from 'react-router-dom'
import { useSessionStore } from '@/app/stores/session-store'
import { Home, LayoutDashboard, Map, MessageSquare, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/planning', icon: Map, label: 'Planning' },
  { to: '/advisor', icon: MessageSquare, label: 'Advisor' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const currentGame = useSessionStore((s) => s.currentGame)
  const isConnected = useSessionStore((s) => s.isConnected)

  return (
    <aside className="flex w-48 flex-col border-r border-border bg-card">
      <div className="flex flex-col gap-1 p-2">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto border-t border-border p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        {currentGame && (
          <p className="mt-1 truncate text-xs font-medium">{currentGame.gameInfo.gameName}</p>
        )}
      </div>
    </aside>
  )
}
