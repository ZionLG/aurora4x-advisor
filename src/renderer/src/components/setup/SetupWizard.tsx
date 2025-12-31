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

  const handlePersonalityComplete = (archetype: string, personalityName: string): void => {
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
    addGame(newGame)

    toast.success('Game created', {
      description: `${tempGameInfo.gameName} is ready!`
    })

    // Navigate to dashboard
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
