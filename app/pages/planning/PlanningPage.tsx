import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { useSessionStore } from '@/app/stores/session-store'
import { LayoutDashboard, Ship, Route, Gem, FlaskConical, Factory } from 'lucide-react'
import { OverviewTab } from './tabs/OverviewTab'
import { FleetTab } from './tabs/FleetTab'
import { RoutesTab } from './tabs/RoutesTab'
import { MineralsTab } from './tabs/MineralsTab'
import { ResearchTab } from './tabs/ResearchTab'
import { ShipyardTab } from './tabs/ShipyardTab'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'fleet', label: 'Fleet', icon: Ship },
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'minerals', label: 'Minerals', icon: Gem },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'shipyard', label: 'Shipyard', icon: Factory },
]

export function PlanningPage() {
  const currentGame = useSessionStore((s) => s.currentGame)
  const connectionMode = useSessionStore((s) => s.connectionMode)
  const [activeTab, setActiveTab] = useState('overview')

  if (!currentGame) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--cic-void)]">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">No active campaign</p>
          <p className="text-[10px] text-muted-foreground/60">
            {connectionMode === 'disconnected'
              ? 'Connect to Aurora or go offline to access planning tools'
              : 'Select a campaign to begin planning'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[var(--cic-void)]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Tab bar */}
        <div className="shrink-0 border-b border-[var(--cic-panel-edge)] bg-[var(--cic-panel)]">
          <div className="flex items-center justify-between px-4">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="relative rounded-none border-b-2 border-transparent px-3 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 data-[state=active]:border-[var(--cic-cyan)] data-[state=active]:text-[var(--cic-cyan)] data-[state=active]:bg-[var(--cic-cyan-glow)] data-[state=active]:shadow-none hover:text-foreground/70 hover:bg-[var(--cic-panel)]/50 transition-colors"
                >
                  <Icon className="h-3 w-3 mr-1.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/50">
              <span>{currentGame.gameInfo.gameName}</span>
              <span className="text-[7px]">·</span>
              <span className={connectionMode === 'bridge' ? 'text-[var(--cic-green)]' : connectionMode === 'offline' ? 'text-muted-foreground' : 'text-[var(--cic-red)]'}>
                {connectionMode === 'bridge' ? 'LIVE' : connectionMode === 'offline' ? 'OFFLINE' : 'NO DATA'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab content — each tab is absolutely positioned to fill the container */}
        <div className="flex-1 relative">
          <TabsContent value="overview" className="absolute inset-0 m-0 overflow-auto"><OverviewTab /></TabsContent>
          <TabsContent value="fleet" className="absolute inset-0 m-0 overflow-auto"><FleetTab /></TabsContent>
          <TabsContent value="routes" className="absolute inset-0 m-0 overflow-auto"><RoutesTab /></TabsContent>
          <TabsContent value="minerals" className="absolute inset-0 m-0 overflow-auto"><MineralsTab /></TabsContent>
          <TabsContent value="research" className="absolute inset-0 m-0 overflow-auto"><ResearchTab /></TabsContent>
          <TabsContent value="shipyard" className="absolute inset-0 m-0 overflow-auto"><ShipyardTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
