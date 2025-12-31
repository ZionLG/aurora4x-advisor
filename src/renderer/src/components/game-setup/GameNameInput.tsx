import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'

interface GameNameInputProps {
  onNext: (gameName: string) => void
  onBack: () => void
}

export function GameNameInput({ onNext, onBack }: GameNameInputProps): React.JSX.Element {
  const [gameName, setGameName] = useState('')

  const handleNext = (): void => {
    if (gameName.trim()) {
      onNext(gameName.trim())
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>New Game Setup</CardTitle>
          <CardDescription>Enter your game name as it will appear in Aurora 4X</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gameName" className="text-sm">
              Game Name
            </Label>
            <Input
              id="gameName"
              type="text"
              placeholder="My Aurora Campaign"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNext()
              }}
              autoFocus
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              This must match exactly with the game name you use in Aurora 4X
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={!gameName.trim()}>
              Next →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
