import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useGame } from '@renderer/hooks/use-game'
import { GameNameInput, SaveGamePrompt, GameDetection } from '@components/game-setup'
import { PersonalityMatcher } from '@components/advisor'
import type { GameInfo, GameSession } from '@shared/types'

type SetupStep = 'game-name' | 'save-prompt' | 'detection' | 'personality'

export function SetupWizard(): React.JSX.Element {
  const navigate = useNavigate()
  const { addGame } = useGame()
  const [step, setStep] = useState<SetupStep>('game-name')
  const [tempGameName, setTempGameName] = useState('')
  const [tempGameInfo, setTempGameInfo] = useState<GameInfo | null>(null)

  const handleGameDetected = (info: GameInfo): void => {
    setTempGameInfo(info)
    setStep('personality')
  }

  const handlePersonalityComplete = async (
    archetype: string,
    personalityName: string
  ): Promise<void> => {
    if (!tempGameInfo) return

    // Create complete game session with all data
    const newGame: GameSession = {
      id: `${tempGameInfo.gameName}-${Date.now()}`,
      gameInfo: tempGameInfo,
      personalityArchetype: archetype,
      personalityName: personalityName,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    }

    // Add game via provider (handles backend save and sets as current)
    await addGame(newGame)

    // Trigger initial analysis to get advice immediately
    try {
      const settings = await window.api.settings.load()
      if (settings.auroraDbPath) {
        // Get profile ID from archetype
        const profiles = await window.api.advisor.loadAllProfiles()
        const matchingProfile = profiles.find(
          (p: { archetype: string }) => p.archetype === archetype
        )

        if (matchingProfile?.id) {
          console.log('Triggering initial analysis...')
          await window.api.advisor.triggerInitialAnalysis(settings.auroraDbPath, matchingProfile.id)
          console.log('Initial analysis complete!')
        }
      }
    } catch (error) {
      console.error('Failed to trigger initial analysis:', error)
      // Don't block navigation on analysis failure
    }

    toast.success('Game created', {
      description: `${tempGameInfo.gameName} is ready!`
    })

    // Navigate to dashboard after game is added and set as current
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen">
      {step === 'game-name' && (
        <GameNameInput
          onNext={(name) => {
            setTempGameName(name)
            setStep('save-prompt')
          }}
          onBack={() => navigate('/')}
        />
      )}

      {step === 'save-prompt' && (
        <SaveGamePrompt
          gameName={tempGameName}
          onSaved={() => {
            setStep('detection')
          }}
          onBack={() => setStep('game-name')}
        />
      )}

      {step === 'detection' && (
        <GameDetection
          gameName={tempGameName}
          onGameDetected={handleGameDetected}
          onBack={() => setStep('save-prompt')}
        />
      )}

      {step === 'personality' && <PersonalityMatcher onComplete={handlePersonalityComplete} />}
    </div>
  )
}
