import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'

interface AdvisorGreetingProps {
  personalityName: string
  greeting: string
  gameName: string
  techLevel: 'TN' | 'Industrial'
  onBegin: () => void
}

export function AdvisorGreeting({
  personalityName,
  greeting,
  gameName,
  techLevel,
  onBegin
}: AdvisorGreetingProps): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Your Strategic Advisor</CardTitle>
          <CardDescription>Ready to guide you through {gameName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👤</span>
              <div>
                <div className="font-semibold text-lg">{personalityName}</div>
                <Badge variant="secondary" className="mt-1">
                  {techLevel} Start
                </Badge>
              </div>
            </div>

            <div className="border-l-2 border-primary pl-4 py-2">
              <p className="text-sm leading-relaxed whitespace-pre-line">{greeting}</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-background rounded-lg p-3 border">
            <strong>Tutorial Phase Active:</strong> Your advisor will provide guidance during the
            first 5 years of your campaign, focusing on infrastructure development, research
            priorities, and expansion strategies.
          </div>

          <div className="flex justify-center pt-4">
            <Button onClick={onBegin} size="lg" className="text-base px-8">
              Begin Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
