import React from 'react'
import { Card, CardContent } from '@components/ui/card'
import { TutorialCard } from './TutorialCard'
import { ObservationCard } from './ObservationCard'

interface TutorialAdvice {
  id: string
  conditions: Record<string, unknown>
  body: string
}

interface Observation {
  id: string
  data: Record<string, unknown>
  message?: string
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
  observations: Observation[]
  analyzedAt: number
}

interface AdviceSectionProps {
  advice: AdvicePackage | null | undefined
  profileId: string | null | undefined
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

  const hasTutorials = advice.tutorials.length > 0
  const hasObservations = advice.observations.length > 0

  return (
    <div className="space-y-4">
      {/* Observations */}
      {hasObservations && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Observations ({advice.observations.length})</h3>
          {advice.observations.map((observation) => (
            <ObservationCard key={observation.id} observation={observation} />
          ))}
        </div>
      )}

      {/* Tutorials */}
      {hasTutorials && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Tutorials ({advice.tutorials.length})</h3>
          {advice.tutorials.map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} />
          ))}
        </div>
      )}

      {/* No content */}
      {!hasTutorials && !hasObservations && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No advice or observations for current game state</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
