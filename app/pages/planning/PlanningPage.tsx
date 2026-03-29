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
      <div className="flex h-full items-center justify-center bg-(--cic-void)">
        <div className="space-y-2 text-center">
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
    <div className="flex h-full flex-col bg-(--cic-void)">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="
        flex h-full flex-col
      ">
        {/* Tab bar */}
        <div className="
          shrink-0 border-b border-(--cic-panel-edge) bg-(--cic-panel)
        ">
          <div className="flex items-center justify-between px-4">
            <TabsList className="h-auto gap-0 bg-transparent p-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="
                    relative rounded-none border-b-2 border-transparent px-3
                    py-2.5 text-[10px] font-medium tracking-wider
                    text-muted-foreground/60 uppercase transition-colors
                    hover:bg-(--cic-panel)/50 hover:text-foreground/70
                    data-[state=active]:border-(--cic-cyan)
                    data-[state=active]:bg-(--cic-cyan-glow)
                    data-[state=active]:text-(--cic-cyan)
                    data-[state=active]:shadow-none
                  "
                >
                  <Icon className="mr-1.5 size-3" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="
              flex items-center gap-2 font-mono text-[9px]
              text-muted-foreground/50
            ">
              <span>{currentGame.gameInfo.gameName}</span>
              <span className="text-[7px]">·</span>
              <span
                className={
                  connectionMode === 'bridge'
                    ? 'text-(--cic-green)'
                    : connectionMode === 'offline'
                      ? 'text-muted-foreground'
                      : 'text-(--cic-red)'
                }
              >
                {connectionMode === 'bridge' ? 'LIVE' : connectionMode === 'offline' ? 'OFFLINE' : 'NO DATA'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab content — each tab is absolutely positioned to fill the container */}
        <div className="relative flex-1">
          <TabsContent value="overview" className="
            absolute inset-0 m-0 overflow-auto
          ">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="fleet" className="
            absolute inset-0 m-0 overflow-auto
          ">
            <FleetTab />
          </TabsContent>
          <TabsContent value="routes" className="
            absolute inset-0 m-0 overflow-auto
          ">
            <RoutesTab />
          </TabsContent>
          <TabsContent value="minerals" className="
            absolute inset-0 m-0 overflow-auto
          ">
            <MineralsTab />
          </TabsContent>
          <TabsContent value="research" className="
            absolute inset-0 m-0 overflow-auto
          ">
            <ResearchTab />
          </TabsContent>
          <TabsContent value="shipyard" className="
            absolute inset-0 m-0 overflow-auto
          ">
            <ShipyardTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
