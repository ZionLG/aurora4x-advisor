import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card'
import { TutorialCard } from './TutorialCard'

interface TutorialAdvice {
  id: string
  conditions: Record<string, unknown>
  body: string
}

interface GameState {
  gameYear: number
  hasTNTech: boolean
  alienContact: boolean
  warStatus: 'peace' | 'active'
  hasBuiltFirstShip: boolean
  hasSurveyedHomeSystem: boolean
}

interface AdvicePackage {
  gameState: GameState
  tutorials: TutorialAdvice[]
  analyzedAt: number
}

interface AdviceSectionProps {
  advice: AdvicePackage | null
  profileId: string | null
}

export function AdviceSection({ advice, profileId }: AdviceSectionProps): React.JSX.Element {
  if (!profileId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No personality profile selected</p>
        </CardContent>
      </Card>
    )
  }

  if (!advice) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Waiting for game state analysis...</p>
          <p className="text-xs mt-2">Save your game in Aurora to trigger analysis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Game State Info */}
      <Card>
        <CardHeader>
          <CardTitle>Game State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Game Year:</span>
              <span className="ml-2 font-medium">{advice.gameState.gameYear}</span>
            </div>
            <div>
              <span className="text-muted-foreground">TN Tech:</span>
              <span className="ml-2 font-medium">{advice.gameState.hasTNTech ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Alien Contact:</span>
              <span className="ml-2 font-medium">
                {advice.gameState.alienContact ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">War Status:</span>
              <span className="ml-2 font-medium capitalize">{advice.gameState.warStatus}</span>
            </div>
            <div>
              <span className="text-muted-foreground">First Ship:</span>
              <span className="ml-2 font-medium">
                {advice.gameState.hasBuiltFirstShip ? 'Built' : 'Not Built'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Home System:</span>
              <span className="ml-2 font-medium">
                {advice.gameState.hasSurveyedHomeSystem ? 'Surveyed' : 'Not Surveyed'}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Last analyzed:{' '}
            {new Date(advice.analyzedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </CardContent>
      </Card>

      {/* Tutorials */}
      {advice.tutorials.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Applicable Tutorials ({advice.tutorials.length})</h3>
          {advice.tutorials.map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No tutorials available for current game state</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
