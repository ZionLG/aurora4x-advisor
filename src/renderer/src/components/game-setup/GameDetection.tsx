import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import type { GameInfo } from '@shared/types'

interface GameDetectionProps {
  gameName: string
  onGameDetected: (gameInfo: GameInfo) => void
  onBack: () => void
}

export function GameDetection({
  gameName,
  onGameDetected,
  onBack
}: GameDetectionProps): React.JSX.Element {
  const {
    data: gameInfo,
    isLoading: isDetecting,
    error,
    refetch
  } = useQuery({
    queryKey: ['game-detection', gameName],
    queryFn: () => window.api.game.detectGame(gameName),
    retry: false
  })

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isDetecting ? 'Detecting Game...' : error ? 'Detection Failed' : 'Game Detected'}
          </CardTitle>
          <CardDescription>
            {isDetecting
              ? 'Searching Aurora database for your game'
              : error
                ? 'Unable to find your game in the database'
                : 'Successfully found your game settings'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDetecting && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <p className="text-sm text-destructive">
                  {error instanceof Error ? error.message : 'Failed to detect game'}
                </p>
              </div>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  <strong>Troubleshooting:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Make sure you saved the game in Aurora 4X</li>
                  <li>Check that the game name matches exactly (case-sensitive)</li>
                  <li>Verify Aurora database is accessible</li>
                </ul>
              </div>
            </div>
          )}

          {gameInfo && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-2xl">✅</span>
                <span className="font-semibold">Found: {gameInfo.gameName}</span>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Starting Year:</span>
                  <span className="font-medium">{gameInfo.startingYear}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tech Level:</span>
                  <span className="font-medium">{gameInfo.techLevel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Empire:</span>
                  <span className="font-medium">{gameInfo.empireName}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            {error && <Button onClick={() => refetch()}>Try Again</Button>}
            {gameInfo && <Button onClick={() => onGameDetected(gameInfo)}>Continue</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
