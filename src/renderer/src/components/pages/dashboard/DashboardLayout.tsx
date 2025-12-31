import React, { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useGame } from '@renderer/hooks/use-game'
import { GameCard } from './GameCard'
import { AdvisorCard } from './AdvisorCard'

export function DashboardLayout(): React.JSX.Element {
  const navigate = useNavigate()
  const { currentGame } = useGame()

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
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Game Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GameCard game={currentGame} />
          <AdvisorCard game={currentGame} />
        </div>

        {/* Phase-specific content */}
        <Outlet />
      </div>
    </div>
  )
}
