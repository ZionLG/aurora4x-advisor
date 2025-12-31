import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'

interface SaveGamePromptProps {
  gameName: string
  onSaved: () => void
  onBack: () => void
}

export function SaveGamePrompt({
  gameName,
  onSaved,
  onBack
}: SaveGamePromptProps): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Save Your Game in Aurora</CardTitle>
          <CardDescription>
            This allows the advisor to detect your game settings automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold">1.</span>
              <span>Switch to Aurora 4X</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold">2.</span>
              <div>
                <span>Save your game with this exact name:</span>
                <div className="mt-1 p-2 bg-background rounded border font-mono text-xs">
                  {gameName}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold">3.</span>
              <span>Return here and click below</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground p-3 border rounded-lg">
            <strong>Important:</strong> The game name must match exactly (case-sensitive) for
            auto-detection to work.
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onSaved}>I&apos;ve Saved My Game →</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
