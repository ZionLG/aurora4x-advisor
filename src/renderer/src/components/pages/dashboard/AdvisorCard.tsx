import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@components/ui/sheet'
import { PersonalityMatcher } from '@components/advisor'
import { useGame } from '@renderer/hooks/use-game'
import { toast } from 'sonner'
import type { GameSession } from '@shared/types'

interface AdvisorCardProps {
  game: GameSession
}

function formatArchetype(archetype: string): string {
  return archetype
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function AdvisorInfo({ game }: { game: GameSession }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const { updateGamePersonality } = useGame()

  const handleSelectAdvisor = (archetype: string, personalityName: string): void => {
    // Update current game with new advisor
    updateGamePersonality(archetype, personalityName)

    toast.success('Advisor updated', {
      description: `${personalityName} is now your advisor`
    })

    setIsOpen(false)
  }

  if (!game.personalityName) {
    return (
      <>
        <div className="text-center py-6 text-muted-foreground">
          <p>No advisor assigned yet.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsOpen(true)}>
            Select Advisor
          </Button>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Select Your Advisor</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <PersonalityMatcher onComplete={handleSelectAdvisor} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className="font-medium">{game.personalityName}</p>
          <p className="text-sm text-muted-foreground">
            Archetype: {formatArchetype(game.personalityArchetype || '')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          Change Advisor
        </Button>
      </div>

      <div className="bg-muted/50 p-3 rounded-lg mt-2">
        <p className="text-sm italic">
          &quot;Greetings, Commander. I stand ready to provide strategic guidance for your
          empire.&quot;
        </p>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Change Your Advisor</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <PersonalityMatcher onComplete={handleSelectAdvisor} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function AdvisorCard({ game }: AdvisorCardProps): React.JSX.Element {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">Strategic Advisor</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col justify-between">
        <AdvisorInfo game={game} />
      </CardContent>
    </Card>
  )
}
