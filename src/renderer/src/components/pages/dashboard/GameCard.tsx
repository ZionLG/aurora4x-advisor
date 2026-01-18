import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardContent, CardTitle } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@components/ui/hover-card'
import { InfoIcon } from 'lucide-react'
import type { GameSession } from '@shared/types'

interface GameCardProps {
  game: GameSession
}

interface GameState {
  gameYear: number
  hasTNTech: boolean
  alienContact: boolean
  atWar: boolean
  hasBuiltFirstShip: boolean
  hasSurveyedHomeSystem: boolean
}

interface Observation {
  id: string
  data: Record<string, unknown>
  message?: string
}

interface AdvicePackage {
  gameState: GameState
  tutorials: unknown[]
  observations: Observation[]
  analyzedAt: number
}

function GameStateHover({
  advice
}: {
  advice: AdvicePackage | null | undefined
}): React.JSX.Element {
  if (!advice) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <InfoIcon className="h-4 w-4" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Game State</h4>
            <p className="text-sm text-muted-foreground">
              No game state data available yet. Save your game in Aurora to trigger analysis.
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  const { gameState, analyzedAt } = advice

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <InfoIcon className="h-4 w-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-2">Current Game State</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Game Year:</span>
                <span className="ml-2 font-medium">{gameState.gameYear}</span>
              </div>
              <div>
                <span className="text-muted-foreground">TN Tech:</span>
                <span className="ml-2 font-medium">{gameState.hasTNTech ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Alien Contact:</span>
                <span className="ml-2 font-medium">{gameState.alienContact ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">At War:</span>
                <span className="ml-2 font-medium">{gameState.atWar ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">First Ship:</span>
                <span className="ml-2 font-medium">
                  {gameState.hasBuiltFirstShip ? 'Built' : 'Not Built'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Home System:</span>
                <span className="ml-2 font-medium">
                  {gameState.hasSurveyedHomeSystem ? 'Surveyed' : 'Not Surveyed'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Last analyzed:{' '}
            {new Date(analyzedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

function GameInfo({
  game,
  advice
}: {
  game: GameSession
  advice: AdvicePackage | null | undefined
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <CardTitle className="text-xl">{game.gameInfo.gameName}</CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">
          {game.gameInfo.empireName} • Year {game.gameInfo.startingYear}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm">
          {game.gameInfo.techLevel}
        </Badge>
        <GameStateHover advice={advice} />
      </div>
    </div>
  )
}

function GameOverviewDetails({ game }: { game: GameSession }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
      <div>
        <p className="text-muted-foreground text-xs">Tech Level</p>
        <p className="font-medium">{game.gameInfo.techLevel}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">Starting Year</p>
        <p className="font-medium">{game.gameInfo.startingYear}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">Created</p>
        <p className="font-medium">{new Date(game.createdAt).toLocaleDateString()}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">Last Played</p>
        <p className="font-medium">{new Date(game.lastAccessedAt).toLocaleDateString()}</p>
      </div>
    </div>
  )
}

export function GameCard({ game }: GameCardProps): React.JSX.Element {
  // Fetch advice data to show game state in hover card
  const { data: advice } = useQuery({
    queryKey: ['advice', game.id],
    queryFn: async () => {
      if (!game.personalityArchetype) return null

      const profiles = await window.api.advisor.loadAllProfiles()
      const matchingProfile = profiles.find(
        (p: { archetype: string }) => p.archetype === game.personalityArchetype
      )
      if (!matchingProfile?.id) return null

      const settings = await window.api.settings.load()
      if (!settings.auroraDbPath) return null

      const initialAdvice = await window.api.advisor.triggerInitialAnalysis(
        settings.auroraDbPath,
        matchingProfile.id
      )
      return initialAdvice as AdvicePackage
    },
    enabled: !!game.personalityArchetype,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  return (
    <Card>
      <CardHeader>
        <GameInfo game={game} advice={advice} />
      </CardHeader>
      <CardContent className="pt-0">
        <GameOverviewDetails game={game} />
      </CardContent>
    </Card>
  )
}
