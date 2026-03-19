import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '@renderer/hooks/use-game'
import { GameCard } from './GameCard'
import { AdvisorCard } from './AdvisorCard'
import { DashboardOverview } from './DashboardOverview'
import { SystemMapTab } from './SystemMapTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { BridgeStatusIndicator } from '../../system-map/BridgeStatusIndicator'

export function DashboardLayout(): React.JSX.Element {
  const navigate = useNavigate()
  const { currentGame } = useGame()
  const [activeTab, setActiveTab] = useState('advisor')

  // Redirect to welcome screen if no game is selected
  useEffect(() => {
    if (!currentGame) {
      navigate('/')
    }
  }, [currentGame, navigate])

  if (!currentGame) {
    return <div />
  }

  return (
    <div className="min-h-screen p-8 pl-28">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Game Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GameCard game={currentGame} />
          <AdvisorCard game={currentGame} />
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="advisor">Advisor</TabsTrigger>
              <TabsTrigger value="map">System Map</TabsTrigger>
            </TabsList>
            {activeTab === 'map' && <BridgeStatusIndicator />}
          </div>

          <TabsContent value="advisor">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <SystemMapTab game={currentGame} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
