import React from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import type { GameSession } from '@shared/types'

interface GameCardProps {
  game: GameSession
}

function GameInfo({ game }: { game: GameSession }): React.JSX.Element {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <CardTitle className="text-xl">{game.gameInfo.gameName}</CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">
          {game.gameInfo.empireName} • Year {game.gameInfo.startingYear}
        </p>
      </div>
      <Badge variant="secondary" className="text-sm">
        {game.gameInfo.techLevel}
      </Badge>
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
  return (
    <Card>
      <CardHeader>
        <GameInfo game={game} />
      </CardHeader>
      <CardContent className="pt-0">
        <GameOverviewDetails game={game} />
      </CardContent>
    </Card>
  )
}
