import React, { useState, useEffect } from 'react'
import { useGame } from '@renderer/hooks/use-game'
import { AdviceSection } from './AdviceSection'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'

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

export function DashboardOverview(): React.JSX.Element {
  const { currentGame } = useGame()
  const [advice, setAdvice] = useState<AdvicePackage | null>(null)
  const [greeting, setGreeting] = useState<string>('')

  // Load greeting on mount
  useEffect(() => {
    const loadGreeting = async (): Promise<void> => {
      if (!currentGame?.personalityArchetype) return

      try {
        const profiles = await window.api.advisor.loadAllProfiles()
        const matchingProfile = profiles.find(
          (p: { archetype: string }) => p.archetype === currentGame.personalityArchetype
        )
        if (!matchingProfile?.id) return

        const greetingText = await window.api.advisor.getGreeting(matchingProfile.id, false)
        setGreeting(greetingText)
      } catch (error) {
        console.error('Failed to load greeting:', error)
      }
    }

    loadGreeting()
  }, [currentGame])

  // Listen for advice updates
  useEffect(() => {
    if (!currentGame) return

    const unsubscribe = window.api.advisor.onAdviceUpdate((adviceData: unknown) => {
      console.log('Received advice update:', adviceData)
      setAdvice(adviceData as AdvicePackage)
    })

    return unsubscribe
  }, [currentGame])

  if (!currentGame) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No game selected</p>
          <p className="text-xs mt-2">Create a new game or select one from the sidebar</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Greeting Card */}
      {greeting && (
        <Card>
          <CardHeader>
            <CardTitle>
              {currentGame.personalityName || currentGame.personalityArchetype || 'Advisor'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{greeting}</p>
          </CardContent>
        </Card>
      )}

      {/* Advice Section */}
      <AdviceSection advice={advice} profileId={currentGame.personalityArchetype} />
    </div>
  )
}
